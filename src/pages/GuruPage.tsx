import { useState, useEffect, useCallback, useRef } from 'react';
import { Card } from '../components/ui/Card';
import { UserRecord, KELAS_OPTIONS, KELOMPOK_OPTIONS } from '../data/users';
import { defaultLogRepository, LogEventRecord } from '../services/logger';
import {
  getUnifiedStudentSummaries,
  StudentRecord,
  FeatureScores,
} from '../services/studentStorage';
import {
  fetchMonitoringSnapshot,
  acknowledgeStuckAlert,
  setPosttestLockState,
  sendChatMessage,
  MonitoringEntry,
  ChatMessageRecord,
} from '../services/researchApi';
import {
  aggregateGroupMonitoring,
  assessStuckStatus,
  formatDurationCompact,
  getStageDisplayLabel,
  GroupMonitoringSummary,
  StuckAssessment,
} from '../utils/stuckDetector';
import {
  computeScoredAverage,
  downloadCsvFile,
  generateChatLogsCsv,
  generateStudentsCsv,
} from '../utils/teacherAnalytics';
import { useAppStore } from '../store/useAppStore';

export interface StudentSummary {
  user: UserRecord;
  rawAnswers: Record<string, unknown>;
  kelompok: string;
  videoDone: boolean;
  ipoDone: boolean;
  dekomDone: boolean;
  parsonsLevel: number;
  labDone: boolean;
  simulasiDone: boolean;
  attempts: number;
  testPassRate: number;
  timeOnTaskMinutes: number;
  lastActivity: string;
  scores: FeatureScores;
  ctScores: {
    decomposition: number;
    abstraction: number;
    algorithm_design: number;
    debugging: number;
    iteration: number;
    generalization: number;
  };
  monitoring?: MonitoringEntry;
  stuck?: StuckAssessment;
}

function getStuckBadgeStyle(level: 'normal' | 'warning' | 'stuck', label: string) {
  if (level === 'stuck') {
    return 'bg-red-100 text-red-800 border-red-300';
  }
  if (level === 'warning' || label === 'Perlu Perhatian') {
    return 'bg-amber-100 text-amber-900 border-amber-300';
  }
  if (label === 'Belum Mulai') {
    return 'bg-slate-100 text-slate-600 border-slate-200';
  }
  return 'bg-emerald-50 text-emerald-800 border-emerald-200';
}

export default function GuruPage() {
  const guruUser = useAppStore((s) => s.user);
  const setStorePosttestLock = useAppStore((s) => s.setPosttestLockedByGuru);

  const [rawRecords, setRawRecords] = useState<StudentRecord[]>([]);
  const [monitoringEntries, setMonitoringEntries] = useState<MonitoringEntry[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessageRecord[]>([]);
  const [posttestLocked, setPosttestLocked] = useState<boolean>(false);
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  const [selectedKelas, setSelectedKelas] = useState<string>('Semua');
  const [selectedChatGroup, setSelectedChatGroup] = useState<string>(KELOMPOK_OPTIONS[0]);
  const [guruChatDraft, setGuruChatDraft] = useState('');
  const [sendingChat, setSendingChat] = useState(false);

  const [selectedStudent, setSelectedStudent] = useState<StudentSummary | null>(null);
  const [studentLogs, setStudentLogs] = useState<LogEventRecord[]>([]);

  const chatPanelRef = useRef<HTMLDivElement | null>(null);

  const loadData = useCallback(async () => {
    const unifiedRecords = getUnifiedStudentSummaries();
    setRawRecords(unifiedRecords);

    const snapshot = await fetchMonitoringSnapshot();
    setMonitoringEntries(snapshot.monitoring);
    setChatMessages(snapshot.chatMessages);
    setPosttestLocked(snapshot.posttestLockedByGuru);
    setStorePosttestLock(snapshot.posttestLockedByGuru);
  }, [setStorePosttestLock]);

  useEffect(() => {
    void loadData();
    const poll = setInterval(() => {
      void loadData();
    }, 3000);
    return () => clearInterval(poll);
  }, [loadData]);

  useEffect(() => {
    const ticker = setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => clearInterval(ticker);
  }, []);

  // Gabungkan StudentRecord lokal dengan live monitoring telemetry
  const allStudents: StudentSummary[] = rawRecords.map((rec) => {
    const mon = monitoringEntries.find(
      (m) =>
        m.studentId === rec.userId ||
        m.nisn === rec.nisn ||
        m.studentName.toLowerCase() === rec.nama.toLowerCase()
    );
    const mergedProgress = { ...rec.progress, ...(mon?.progress ?? {}) };
    const isLabDone = mergedProgress['1-lab'] === 'done' || rec.scores.lab !== undefined;
    const isParsonsDone = mergedProgress['1-parsons'] === 'done' || rec.scores.parsons !== undefined;
    const isDekomDone = mergedProgress['1-dekomposisi'] === 'done' || rec.scores.dekomposisi !== undefined;
    const isIpoDone = mergedProgress['1-ipo'] === 'done' || rec.scores.ipo !== undefined;
    const isVideoDone = mergedProgress['1-video'] === 'done';

    const parsonsLvl = isParsonsDone ? 3 : mergedProgress['1-parsons'] === 'active' ? 2 : 1;
    const kelompok = mon?.groupId || rec.kelompok || 'Kelompok 1';
    const groupChats = chatMessages.filter((c) => c.groupId === kelompok);
    const stuck = mon ? assessStuckStatus(mon, nowMs, groupChats) : undefined;

    return {
      user: {
        id: rec.userId,
        nisn: rec.nisn,
        nama: rec.nama,
        password: '***',
        peran: 'siswa',
        kelas: rec.kelas || 'X MIPA 1',
        sekolah: rec.sekolah || 'SMAN 1 Nusantara',
        kelompok,
      },
      rawAnswers: rec.answers,
      kelompok,
      videoDone: isVideoDone,
      ipoDone: isIpoDone,
      dekomDone: isDekomDone,
      parsonsLevel: parsonsLvl,
      labDone: isLabDone,
      simulasiDone: mergedProgress['1-simulasi'] === 'done',
      attempts: rec.attempts['1-lab'] || (isLabDone ? 2 : 0),
      testPassRate: rec.scores.posttest ?? rec.scores.pretest ?? (isLabDone ? 85 : 0),
      timeOnTaskMinutes: rec.timeOnTaskMinutes || (isLabDone ? 25 : 5),
      lastActivity: rec.lastActivity || 'Belum Mulai',
      scores: {
        ...rec.scores,
        pretest: rec.scores.pretest ?? mon?.scores?.pretest,
        ipo: rec.scores.ipo ?? mon?.scores?.ipo,
        dekomposisi: rec.scores.dekomposisi ?? mon?.scores?.dekomposisi,
        parsons: rec.scores.parsons ?? mon?.scores?.parsons,
        lab: rec.scores.lab ?? mon?.scores?.lab,
        posttest: rec.scores.posttest ?? mon?.scores?.posttest,
      },
      ctScores: rec.ctScores,
      monitoring: mon,
      stuck,
    };
  });

  // Also include monitoring entries for seeded/active students not in rawRecords
  const groupSummaries: GroupMonitoringSummary[] = aggregateGroupMonitoring(
    monitoringEntries,
    chatMessages,
    nowMs
  );

  const stuckGroups = groupSummaries.filter(
    (g) => g.stuck.level === 'stuck' || g.stuck.level === 'warning'
  );

  const filteredRecords =
    selectedKelas === 'Semua'
      ? rawRecords
      : rawRecords.filter((r) => (r.kelas || 'X MIPA 1') === selectedKelas);

  const filteredStudents =
    selectedKelas === 'Semua'
      ? allStudents
      : allStudents.filter((s) => s.user.kelas === selectedKelas);

  const pretestStats = computeScoredAverage(filteredStudents.map((s) => s.scores.pretest));
  const posttestStats = computeScoredAverage(filteredStudents.map((s) => s.scores.posttest));
  const totalReplays = monitoringEntries.reduce((sum, m) => sum + (m.videoReplayCount || 0), 0);

  async function handleDrillDown(student: StudentSummary) {
    setSelectedStudent(student);
    const logs = await defaultLogRepository.getByStudent(student.user.id);
    setStudentLogs(logs);
  }

  async function handleTogglePosttestLock() {
    const nextLocked = await setPosttestLockState(!posttestLocked);
    setPosttestLocked(nextLocked);
    setStorePosttestLock(nextLocked);
  }

  async function handleAcknowledgeGroup(group: GroupMonitoringSummary) {
    for (const member of group.members) {
      await acknowledgeStuckAlert(member.studentId);
    }
    await loadData();
  }

  function handleOpenGroupChat(groupId: string) {
    setSelectedChatGroup(groupId);
    chatPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  async function handleSendGuruChat(e: React.FormEvent) {
    e.preventDefault();
    const text = guruChatDraft.trim();
    if (!text || sendingChat) return;
    setSendingChat(true);
    try {
      const saved = await sendChatMessage({
        groupId: selectedChatGroup,
        senderId: guruUser?.id || 'guru-001',
        senderName: guruUser?.nama || 'Bu Sari',
        senderRole: 'guru',
        stage: 'fasilitasi',
        message: text,
      });
      setChatMessages((prev) => (prev.some((m) => m.id === saved.id) ? prev : [...prev, saved]));
      setGuruChatDraft('');
    } finally {
      setSendingChat(false);
    }
  }

  function handleExportCsv() {
    const csvContent = generateStudentsCsv(filteredRecords, 'nilai');
    downloadCsvFile(
      `stepverse_rekap_nilai_guru_${new Date().toISOString().slice(0, 10)}.csv`,
      csvContent
    );
  }

  function handleExportChatCsv() {
    const csvContent = generateChatLogsCsv(chatMessages);
    downloadCsvFile(
      `stepverse_log_chat_kelompok_${new Date().toISOString().slice(0, 10)}.csv`,
      csvContent
    );
  }

  const activeGroupChats = chatMessages.filter((c) => c.groupId === selectedChatGroup);

  return (
    <div className="max-w-6xl mx-auto flex flex-col gap-6">
      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs text-[#464555] uppercase tracking-widest font-semibold">
              Monitoring Real-Time &amp; Asesmen Guru
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
              <span className="size-1.5 rounded-full bg-emerald-600 animate-pulse" />
              Live 3 dtk
            </span>
          </div>
          <h1 className="text-2xl font-bold text-[#121c2c]">Dasbor Monitoring Guru</h1>
          <p className="text-xs text-[#464555] mt-0.5">
            Pantau progres kelompok kecil, durasi di sub-bab, frekuensi putar ulang video, deteksi kelompok stuck, serta kunci Post-test.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Toggle Kunci Post-test (Req #6) */}
          <button
            type="button"
            onClick={() => void handleTogglePosttestLock()}
            className={`px-4 py-2 rounded-full text-xs font-bold border transition active:scale-95 cursor-pointer ${
              posttestLocked
                ? 'bg-red-50 text-red-800 border-red-300 hover:bg-red-100'
                : 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
            }`}
          >
            {posttestLocked ? '🔒 Post-test Dikunci Guru' : '🔓 Post-test Terbuka (Setelah Formatif)'}
          </button>

          {/* Kelas Selector Filter */}
          <div className="flex items-center gap-1.5 bg-white border border-[#c0d8ef] rounded-full px-3 py-1.5 text-xs text-[#253f8a] font-semibold shadow-xs">
            <span>🏫 Kelas:</span>
            <select
              value={selectedKelas}
              onChange={(e) => setSelectedKelas(e.target.value)}
              className="bg-transparent font-bold text-[#121c2c] outline-none cursor-pointer"
            >
              <option value="Semua">Semua ({allStudents.length})</option>
              {KELAS_OPTIONS.map((k) => (
                <option key={k} value={k}>
                  {k} ({allStudents.filter((s) => s.user.kelas === k).length})
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={() => void loadData()}
            className="px-3.5 py-2 rounded-full text-xs font-semibold text-[#253f8a] bg-[#eaf6ff] border border-[#a6d7ff] hover:brightness-95 transition active:scale-95"
          >
            🔄 Segarkan
          </button>

          <button
            type="button"
            onClick={handleExportCsv}
            className="px-4 py-2 rounded-full text-xs font-bold text-white transition-all hover:brightness-110 active:scale-95 shadow-sm"
            style={{
              background: 'linear-gradient(to bottom, #68b6f7, #3d6b91)',
              boxShadow:
                '0 8px 14px -4px rgba(61,107,145,0.4), inset 0 1px 2px rgba(255,255,255,0.6), inset 0 -2px 0 #253f8a',
            }}
          >
            📥 Ekspor Nilai CSV
          </button>
        </div>
      </div>

      {/* STUCK DETECTION INTERVENTION BANNER (Req #8) */}
      {stuckGroups.length > 0 && (
        <Card className="border-2 border-red-300 bg-red-50/75 p-4 flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xl">🚨</span>
              <div>
                <h2 className="text-sm font-bold text-red-950">
                  Deteksi Intervensi Kelas: {stuckGroups.length} Kelompok Terindikasi Stuck / Perlu Bantuan
                </h2>
                <p className="text-xs text-red-800">
                  Segera hampiri kelompok berikut di kelas atau kirim arahan melalui chat kelompok.
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-2.5 md:grid-cols-2">
            {stuckGroups.map((g) => (
              <div
                key={g.groupId}
                className={`p-3 rounded-2xl border bg-white flex flex-col gap-2 ${
                  g.stuck.level === 'stuck' ? 'border-red-300' : 'border-amber-300'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-[#121c2c]">{g.groupId}</span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getStuckBadgeStyle(
                        g.stuck.level,
                        g.stuck.label
                      )}`}
                    >
                      {g.stuck.label}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-[#464555]">
                    {g.activeStageLabel} · {formatDurationCompact(g.currentDurationMs)}
                  </span>
                </div>

                <ul className="text-[11px] text-[#334155] space-y-0.5 pl-3 list-disc">
                  {g.stuck.reasons.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleOpenGroupChat(g.groupId)}
                    className="px-3 py-1 rounded-full text-[11px] font-bold bg-[#eaf6ff] text-[#253f8a] border border-[#a6d7ff] hover:bg-[#d0ecff] transition"
                  >
                    💬 Sapa di Chat
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleAcknowledgeGroup(g)}
                    className="px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition"
                  >
                    ✓ Tandai Sudah Dibantu
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Overview Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 border border-[#bce0fd] bg-gradient-to-br from-white to-[#f4fbff]">
          <span className="text-xs text-[#464555] block mb-1">Kelompok Terpantau</span>
          <span className="text-2xl font-bold text-[#121c2c]">
            {groupSummaries.filter((g) => g.members.length > 0).length} / {KELOMPOK_OPTIONS.length}
          </span>
          <span className="text-[10px] text-[#253f8a] block mt-1 font-semibold">
            {filteredStudents.length} Siswa · {chatMessages.length} Pesan Log
          </span>
        </Card>

        <Card className="p-4 border border-[#bce0fd] bg-gradient-to-br from-white to-[#f4fbff]">
          <span className="text-xs text-[#464555] block mb-1">Indikator Stuck Kelompok</span>
          <span
            className={`text-2xl font-bold ${
              stuckGroups.some((g) => g.stuck.level === 'stuck')
                ? 'text-red-700'
                : stuckGroups.length > 0
                ? 'text-amber-700'
                : 'text-emerald-700'
            }`}
          >
            {stuckGroups.length} Kelompok
          </span>
          <span className="text-[10px] text-[#464555] block mt-1">
            {stuckGroups.length === 0 ? 'Semua kelompok lancar' : 'Butuh fasilitasi guru'}
          </span>
        </Card>

        <Card className="p-4 border border-[#bce0fd] bg-gradient-to-br from-white to-[#f4fbff]">
          <span className="text-xs text-[#464555] block mb-1">Pretest vs Post-test</span>
          <span className="text-2xl font-bold text-[#253f8a]">
            {pretestStats.average ?? '-'} → {posttestStats.average ?? '-'}
          </span>
          <span className="text-[10px] text-slate-500 block mt-1">
            Evaluasi awal vs sumatif akhir
          </span>
        </Card>

        <Card className="p-4 border border-[#bce0fd] bg-gradient-to-br from-white to-[#f4fbff]">
          <span className="text-xs text-[#464555] block mb-1">Total Putar Ulang Video</span>
          <span className="text-2xl font-bold text-[#121c2c]">🔁 {totalReplays}×</span>
          <span className="text-[10px] text-slate-500 block mt-1">
            Tuntas Lab: {filteredStudents.filter((s) => s.labDone).length}/{filteredStudents.length} siswa
          </span>
        </Card>
      </div>

      {/* 5 SMALL-GROUP REAL-TIME MONITORING CARDS (Req #7 & #8) */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-bold uppercase tracking-widest text-[#464555]">
            Pemantauan Real-Time Kelompok Kecil (Kelompok 1–5)
          </h2>
          <span className="text-[11px] text-[#464555]">
            Menampilkan progres, durasi sub-bab aktif, dan frekuensi pemutaran ulang video
          </span>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {groupSummaries.map((g) => (
            <Card
              key={g.groupId}
              className={`flex flex-col gap-3 border ${
                g.stuck.level === 'stuck'
                  ? 'border-red-300 bg-red-50/30'
                  : g.stuck.level === 'warning'
                  ? 'border-amber-300 bg-amber-50/30'
                  : 'border-[#bce0fd]'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h3 className="font-bold text-sm text-[#121c2c]">{g.groupId}</h3>
                  <span className="text-[11px] text-[#464555]">
                    {g.members.length > 0
                      ? g.members.map((m) => m.studentName).join(', ')
                      : 'Belum ada anggota aktif'}
                  </span>
                </div>
                <span
                  className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border shrink-0 ${getStuckBadgeStyle(
                    g.stuck.level,
                    g.stuck.label
                  )}`}
                >
                  {g.stuck.label}
                </span>
              </div>

              {/* Progress Bar */}
              <div>
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span className="font-semibold text-[#253f8a]">Progres Formatif</span>
                  <span className="font-mono font-bold text-[#121c2c]">
                    {g.completedStagesCount}/{g.totalStagesCount} ({g.progressPct}%)
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-[#e2e8f0] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#68b6f7] to-[#253f8a]"
                    style={{ width: `${g.progressPct}%` }}
                  />
                </div>
              </div>

              {/* Live Metrics */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2 rounded-xl bg-[#f8fbff] border border-[#d0ecff]">
                  <span className="text-[10px] text-[#464555] block">Sub-bab</span>
                  <span className="text-[11px] font-bold text-[#121c2c] block truncate">
                    {g.activeStageLabel}
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-[#f8fbff] border border-[#d0ecff]">
                  <span className="text-[10px] text-[#464555] block">Durasi</span>
                  <span className="text-[11px] font-mono font-bold text-[#253f8a] block">
                    {formatDurationCompact(g.currentDurationMs)}
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-[#f8fbff] border border-[#d0ecff]">
                  <span className="text-[10px] text-[#464555] block">Replay Video</span>
                  <span className="text-[11px] font-mono font-bold text-[#121c2c] block">
                    🔁 {g.videoReplayCount}×
                  </span>
                </div>
              </div>

              {g.kinestheticPair && (
                <div className="text-[11px] px-2.5 py-1.5 rounded-xl bg-[#eaf6ff] text-[#253f8a] border border-[#bce0fd]">
                  🎭 Kinestetik: <strong>{g.kinestheticPair.programmerName}</strong> (Prog) &amp;{' '}
                  <strong>{g.kinestheticPair.komputerName}</strong> (Komp)
                </div>
              )}

              <div className="mt-auto pt-1 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => handleOpenGroupChat(g.groupId)}
                  className="flex-1 px-3 py-1.5 rounded-full text-xs font-bold bg-[#eaf6ff] text-[#253f8a] border border-[#a6d7ff] hover:bg-[#d0ecff] transition"
                >
                  💬 Chat Kelompok ({g.chatCount})
                </button>
                {g.stuck.needsIntervention && (
                  <button
                    type="button"
                    onClick={() => void handleAcknowledgeGroup(g)}
                    className="px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition"
                  >
                    ✓ Dibantu
                  </button>
                )}
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* INTERACTIVE GROUP CHAT & RESEARCH LOG PANEL (Req #4) */}
      <div ref={chatPanelRef}>
        <Card className="border border-[#bce0fd] p-0 overflow-hidden">
          <div className="p-4 bg-[#f4fbff] border-b border-[#d0ecff] flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-bold text-sm text-[#121c2c]">
                💬 Log Diskusi Kelompok Kecil &amp; Fasilitasi Guru
              </h2>
              <p className="text-[11px] text-[#464555]">
                Seluruh riwayat percakapan antar siswa &amp; guru otomatis tersimpan di basis data untuk analisis penelitian.
              </p>
            </div>
            <button
              type="button"
              onClick={handleExportChatCsv}
              className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-white text-[#253f8a] border border-[#a6d7ff] hover:bg-[#eaf6ff] transition"
            >
              📥 Ekspor Log Chat CSV ({chatMessages.length})
            </button>
          </div>

          {/* Group Selector Tabs */}
          <div className="px-4 py-2.5 bg-white border-b border-[#eaf6ff] flex flex-wrap gap-2">
            {KELOMPOK_OPTIONS.map((groupId) => {
              const summary = groupSummaries.find((s) => s.groupId === groupId);
              const isSelected = selectedChatGroup === groupId;
              return (
                <button
                  key={groupId}
                  type="button"
                  onClick={() => setSelectedChatGroup(groupId)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold border transition flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-[#253f8a] text-white border-[#253f8a]'
                      : 'bg-[#f4fbff] text-[#253f8a] border-[#bce0fd] hover:bg-[#eaf6ff]'
                  }`}
                >
                  <span>{groupId}</span>
                  <span className="text-[10px] opacity-80">({summary?.chatCount ?? 0})</span>
                  {summary?.stuck.needsIntervention && (
                    <span className="size-2 rounded-full bg-red-500" title="Butuh intervensi" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Chat Feed */}
          <div className="p-4 max-h-[260px] overflow-y-auto bg-[#fbfdff] flex flex-col gap-2.5">
            {activeGroupChats.length === 0 ? (
              <div className="text-xs text-[#64748b] text-center py-6">
                Belum ada log percakapan di {selectedChatGroup}.
              </div>
            ) : (
              activeGroupChats.map((msg) => {
                const isGuru = msg.senderRole === 'guru';
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col max-w-[85%] ${
                      isGuru ? 'self-end items-end' : 'self-start items-start'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-0.5 px-1 text-[10px] text-[#464555]">
                      <span className="font-bold">
                        {isGuru ? `👩‍🏫 ${msg.senderName} (Guru)` : msg.senderName}
                      </span>
                      <span className="font-mono">{msg.timestamp.slice(11, 19)}</span>
                      <span className="px-1.5 rounded bg-[#eaf6ff] text-[#253f8a]">
                        {getStageDisplayLabel(msg.stage)}
                      </span>
                    </div>
                    <div
                      className={`px-3.5 py-2 rounded-2xl text-xs leading-relaxed ${
                        isGuru
                          ? 'bg-amber-50 border border-amber-300 text-amber-950'
                          : 'bg-white border border-[#d0ecff] text-[#121c2c]'
                      }`}
                    >
                      {msg.message}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Guru Facilitator Reply Form */}
          <form
            onSubmit={(e) => void handleSendGuruChat(e)}
            className="p-3 bg-white border-t border-[#eaf6ff] flex items-center gap-2"
          >
            <input
              type="text"
              value={guruChatDraft}
              onChange={(e) => setGuruChatDraft(e.target.value)}
              placeholder={`Kirim arahan fasilitator ke ${selectedChatGroup}...`}
              className="flex-1 px-4 py-2 rounded-full text-xs bg-[#f4fbff] border border-[#bce0fd] text-[#121c2c] outline-none focus:border-[#3d6b91]"
            />
            <button
              type="submit"
              disabled={!guruChatDraft.trim() || sendingChat}
              className="px-4 py-2 rounded-full text-xs font-bold text-white bg-[#253f8a] hover:brightness-110 disabled:opacity-40 transition"
            >
              Kirim ke {selectedChatGroup}
            </button>
          </form>
        </Card>
      </div>

      {/* SEPARATED FORMATIF VS SUMATIF STUDENT TABLE */}
      <Card className="p-0 overflow-hidden border border-[#bce0fd]">
        <div className="p-4 border-b border-[#eaf6ff] flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-bold text-sm text-[#121c2c] uppercase tracking-wider">
            Rekap Nilai &amp; Telemetri Siswa (Diagnostik · Latihan Formatif · Evaluasi Sumatif)
          </h2>
          <span className="text-xs text-[#64748b]">
            Klik baris siswa untuk melihat Alasan Logis, 6 Indikator CT, dan Audit Log
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-[#f4fbff] text-[#253f8a] uppercase font-bold text-[10px] border-b border-[#d0ecff]">
              <tr className="bg-[#eaf6ff]/70 border-b border-[#d0ecff]">
                <th className="py-1.5 px-3" colSpan={2}>Identitas &amp; Kelompok</th>
                <th className="py-1.5 px-2 text-center border-l border-[#d0ecff]">Diagnostik</th>
                <th className="py-1.5 px-2 text-center border-l border-[#d0ecff]" colSpan={6}>
                  Latihan Formatif (Materi 1)
                </th>
                <th className="py-1.5 px-2 text-center border-l border-[#d0ecff]">Sumatif</th>
                <th className="py-1.5 px-2 text-center border-l border-[#d0ecff]" colSpan={2}>
                  Deteksi &amp; Aksi
                </th>
              </tr>
              <tr>
                <th className="py-2.5 px-3">Nama Siswa / NISN</th>
                <th className="py-2.5 px-2">Kelompok</th>
                <th className="py-2.5 px-2 text-center border-l border-[#d0ecff]">Pretest</th>
                <th className="py-2.5 px-2 text-center border-l border-[#d0ecff]">IPO</th>
                <th className="py-2.5 px-2 text-center">Dekom</th>
                <th className="py-2.5 px-2 text-center">Parsons</th>
                <th className="py-2.5 px-2 text-center">Lab</th>
                <th className="py-2.5 px-2 text-center">Durasi Sub-bab</th>
                <th className="py-2.5 px-2 text-center">Replay</th>
                <th className="py-2.5 px-2 text-center border-l border-[#d0ecff] bg-purple-50/70">
                  Post-test
                </th>
                <th className="py-2.5 px-2 text-center border-l border-[#d0ecff]">Status</th>
                <th className="py-2.5 px-3 text-center">Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#eaf6ff]">
              {filteredStudents.map((st) => {
                const mon = st.monitoring;
                const activeStage = mon?.currentStage || 'video';
                const durMs = mon
                  ? Math.max(
                      mon.stageDurationsMs[activeStage] ?? 0,
                      mon.stageEnteredAt > 0 ? Math.max(0, nowMs - mon.stageEnteredAt) : 0
                    )
                  : 0;
                return (
                  <tr
                    key={st.user.id}
                    className="hover:bg-[#f8fbff] transition cursor-pointer"
                    onClick={() => void handleDrillDown(st)}
                  >
                    <td className="py-3 px-3">
                      <span className="font-bold text-[#121c2c] block text-xs">{st.user.nama}</span>
                      <span className="text-[10px] text-[#64748b] font-mono">
                        {st.user.nisn} · {st.user.kelas}
                      </span>
                    </td>
                    <td className="py-3 px-2">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#eaf6ff] text-[#253f8a]">
                        {st.kelompok}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-center font-mono border-l border-[#eaf6ff]">
                      {st.scores.pretest !== undefined ? (
                        <span className="font-bold text-[#253f8a]">{st.scores.pretest}</span>
                      ) : (
                        <span className="text-gray-300">-</span>
                      )}
                    </td>
                    <td className="py-3 px-2 text-center font-mono border-l border-[#eaf6ff]">
                      {st.scores.ipo ?? <span className="text-gray-300">-</span>}
                    </td>
                    <td className="py-3 px-2 text-center font-mono">
                      {st.scores.dekomposisi ?? <span className="text-gray-300">-</span>}
                    </td>
                    <td className="py-3 px-2 text-center font-mono">
                      {st.scores.parsons ?? <span className="text-gray-300">-</span>}
                    </td>
                    <td className="py-3 px-2 text-center font-mono">
                      {st.scores.lab ?? <span className="text-gray-300">-</span>}
                    </td>
                    <td className="py-3 px-2 text-center font-mono text-[11px] text-[#253f8a]">
                      {mon ? `${getStageDisplayLabel(activeStage)} (${formatDurationCompact(durMs)})` : `${st.timeOnTaskMinutes}m`}
                    </td>
                    <td className="py-3 px-2 text-center font-mono">
                      {mon ? `🔁 ${mon.videoReplayCount}×` : '-'}
                    </td>
                    <td className="py-3 px-2 text-center font-mono border-l border-[#eaf6ff] bg-purple-50/30">
                      {st.scores.posttest !== undefined ? (
                        <span className="font-bold text-purple-800">{st.scores.posttest}</span>
                      ) : (
                        <span className="text-gray-300">-</span>
                      )}
                    </td>
                    <td className="py-3 px-2 text-center border-l border-[#eaf6ff]">
                      {st.stuck ? (
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getStuckBadgeStyle(
                            st.stuck.level,
                            st.stuck.label
                          )}`}
                        >
                          {st.stuck.level === 'stuck'
                            ? 'STUCK'
                            : st.stuck.level === 'warning'
                            ? 'Perhatian'
                            : 'Lancar'}
                        </span>
                      ) : (
                        <span className="text-[10px] text-[#64748b]">Offline</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          void handleDrillDown(st);
                        }}
                        className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#eaf6ff] text-[#253f8a] hover:bg-[#d0ecff] transition"
                      >
                        Detail 🔎
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* DRILL-DOWN MODAL / DETAIL VIEW */}
      {selectedStudent && (
        <Card className="border-2 border-[#253f8a] p-6 shadow-xl bg-white flex flex-col gap-5">
          <div className="flex items-center justify-between border-b border-[#eaf6ff] pb-3">
            <div className="flex items-center gap-3">
              <span className="text-3xl">👤</span>
              <div>
                <h3 className="font-bold text-base text-[#121c2c]">
                  Rincian Nilai, Alasan Logis &amp; Perkembangan CT: {selectedStudent.user.nama}
                </h3>
                <span className="text-xs text-[#464555]">
                  NISN: {selectedStudent.user.nisn} · {selectedStudent.user.kelas} · {selectedStudent.kelompok}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSelectedStudent(null)}
              className="size-7 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center font-bold text-sm"
            >
              ✕
            </button>
          </div>

          {/* Feature Scores Breakdown */}
          <div className="p-4 rounded-2xl bg-[#f4fbff] border border-[#d0ecff]">
            <span className="font-bold text-xs uppercase tracking-wider text-[#253f8a] block mb-2.5">
              📊 Perolehan Nilai per Fitur (Diagnostik · Formatif · Sumatif)
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
              {[
                { label: 'Pretest (Diagnostik)', val: selectedStudent.scores.pretest },
                { label: 'Analisis IPO', val: selectedStudent.scores.ipo },
                { label: 'Dekomposisi', val: selectedStudent.scores.dekomposisi },
                { label: 'Parsons L1-L2', val: selectedStudent.scores.parsons },
                { label: 'Lab Python', val: selectedStudent.scores.lab },
                { label: 'Post-test (Sumatif)', val: selectedStudent.scores.posttest },
              ].map((cell) => (
                <div key={cell.label} className="bg-white p-2.5 rounded-xl border border-slate-200 text-center">
                  <span className="text-[#666] block text-[10px] uppercase font-semibold">{cell.label}</span>
                  <span className="font-bold text-base text-[#253f8a]">{cell.val ?? '-'}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Alasan Logis Siswa (Req #2) */}
          <StudentReasoningViewer answers={selectedStudent.rawAnswers} />

          {/* 6 CT Indicator Bars */}
          <div>
            <span className="font-bold text-xs uppercase tracking-wider text-[#253f8a] block mb-2">
              Estimasi 6 Komponen Computational Thinking (Shute et al., 2017)
            </span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                { label: 'Dekomposisi', val: selectedStudent.ctScores.decomposition },
                { label: 'Abstraksi', val: selectedStudent.ctScores.abstraction },
                { label: 'Desain Algoritma', val: selectedStudent.ctScores.algorithm_design },
                { label: 'Debugging', val: selectedStudent.ctScores.debugging },
                { label: 'Iterasi', val: selectedStudent.ctScores.iteration },
                { label: 'Generalisasi', val: selectedStudent.ctScores.generalization },
              ].map((ct) => (
                <div key={ct.label} className="p-3 rounded-2xl bg-[#f8fbff] border border-[#d0ecff] flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-[#121c2c]">{ct.label}</span>
                    <span className="font-mono font-bold text-[#253f8a]">{ct.val}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-[#e2e8f0] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#68b6f7] to-[#253f8a]"
                      style={{ width: `${ct.val}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Activity Log Audit Trail */}
          <div>
            <span className="font-bold text-xs uppercase tracking-wider text-[#253f8a] block mb-2">
              Jejak Aktivitas Belajar (Audit Log Interaksi Sesi)
            </span>
            <div className="p-3 bg-[#f8fafc] rounded-2xl border border-gray-200 max-h-[160px] overflow-y-auto font-mono text-[11px] text-[#464555] space-y-1">
              {studentLogs.length > 0 ? (
                studentLogs.map((log) => (
                  <div key={log.id} className="flex items-center justify-between border-b border-gray-100 py-0.5">
                    <span>
                      [{log.timestamp.slice(11, 19)}] {log.stage.toUpperCase()} · {log.componentId} ({log.ctComponent})
                    </span>
                    <span className={`font-bold ${log.result === 'pass' ? 'text-green-600' : 'text-amber-600'}`}>
                      {log.result.toUpperCase()}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-gray-400 italic py-2 text-center font-sans">
                  Event interaksi akan muncul saat siswa aktif mengerjakan aktivitas pada sesi ini.
                </div>
              )}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

function StudentReasoningViewer({ answers }: { answers: Record<string, unknown> }) {
  const pausePoints = answers['1-video-pause-points'] as
    | Record<string, { reason?: string }>
    | undefined;
  const predReason = pausePoints?.['m1-prediction']?.reason;

  const ipoReasons = answers['1-ipo-reasons'] as
    | { input?: string; process?: string; output?: string }
    | undefined;

  const dekomReason =
    typeof answers['1-dekomposisi-reason'] === 'string' ? answers['1-dekomposisi-reason'] : undefined;

  const simPair = answers['1-simulasi'] as
    | { programmerName?: string; komputerName?: string }
    | undefined;

  const pretestReasons = (answers['pretest_result'] as { reasons?: Record<string, string> } | undefined)
    ?.reasons;
  const posttestReasons = (answers['posttest_result'] as { reasons?: Record<string, string> } | undefined)
    ?.reasons;

  const hasAny =
    Boolean(predReason) ||
    Boolean(ipoReasons?.input || ipoReasons?.process || ipoReasons?.output) ||
    Boolean(dekomReason) ||
    Boolean(simPair?.programmerName) ||
    Boolean(pretestReasons && Object.keys(pretestReasons).length > 0) ||
    Boolean(posttestReasons && Object.keys(posttestReasons).length > 0);

  return (
    <div className="p-4 rounded-2xl bg-[#fbfdff] border border-[#d0ecff] flex flex-col gap-2.5">
      <span className="font-bold text-xs uppercase tracking-wider text-[#253f8a]">
        💭 Alasan Logis &amp; Peran Siswa
      </span>

      {!hasAny ? (
        <span className="text-xs text-[#64748b] italic">
          Belum ada alasan logis yang tercatat dari siswa ini.
        </span>
      ) : (
        <div className="grid gap-2 md:grid-cols-2 text-xs">
          {simPair?.programmerName && (
            <div className="p-2.5 rounded-xl bg-white border border-slate-200">
              <strong className="text-[#253f8a] block">🎭 Peran Kinesthetic Break:</strong>
              <span>
                Programmer: {simPair.programmerName} · Komputer: {simPair.komputerName}
              </span>
            </div>
          )}
          {predReason && (
            <div className="p-2.5 rounded-xl bg-white border border-slate-200">
              <strong className="text-[#253f8a] block">🔮 Alasan Prediksi Video:</strong>
              <span>{predReason}</span>
            </div>
          )}
          {(ipoReasons?.input || ipoReasons?.process || ipoReasons?.output) && (
            <div className="p-2.5 rounded-xl bg-white border border-slate-200 md:col-span-2">
              <strong className="text-[#253f8a] block mb-1">🔭 Alasan Pengelompokan IPO:</strong>
              <ul className="space-y-0.5 text-[#334155]">
                {ipoReasons.input && <li>• <strong>Input:</strong> {ipoReasons.input}</li>}
                {ipoReasons.process && <li>• <strong>Proses:</strong> {ipoReasons.process}</li>}
                {ipoReasons.output && <li>• <strong>Output:</strong> {ipoReasons.output}</li>}
              </ul>
            </div>
          )}
          {dekomReason && (
            <div className="p-2.5 rounded-xl bg-white border border-slate-200 md:col-span-2">
              <strong className="text-[#253f8a] block">🧩 Alasan Urutan Dekomposisi:</strong>
              <span>{dekomReason}</span>
            </div>
          )}
          {pretestReasons && Object.keys(pretestReasons).length > 0 && (
            <div className="p-2.5 rounded-xl bg-white border border-slate-200">
              <strong className="text-[#253f8a] block mb-1">📝 Alasan Pretest:</strong>
              <ul className="space-y-0.5 text-[#334155]">
                {Object.entries(pretestReasons).map(([k, v]) => (
                  <li key={k}>• Soal {Number(k) + 1}: {v}</li>
                ))}
              </ul>
            </div>
          )}
          {posttestReasons && Object.keys(posttestReasons).length > 0 && (
            <div className="p-2.5 rounded-xl bg-white border border-slate-200">
              <strong className="text-purple-800 block mb-1">🏆 Alasan Post-test:</strong>
              <ul className="space-y-0.5 text-[#334155]">
                {Object.entries(posttestReasons).map(([k, v]) => (
                  <li key={k}>• Soal {Number(k) + 1}: {v}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
