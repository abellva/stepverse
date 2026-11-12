import { useState, useEffect, useCallback } from 'react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { UserRecord, KELAS_OPTIONS } from '../data/users';
import { defaultLogRepository, LogEventRecord } from '../services/logger';
import {
  getUnifiedStudentSummaries,
  StudentRecord,
  FeatureScores,
} from '../services/studentStorage';
import {
  computeScoredAverage,
  downloadCsvFile,
  generateStudentsCsv,
} from '../utils/teacherAnalytics';

export interface StudentSummary {
  user: UserRecord;
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
}

const SEED_STUDENTS: StudentSummary[] = [
  {
    user: {
      id: 'siswa-001',
      nisn: '0071234567',
      nama: 'Budi Santoso',
      password: 'KantinPython2025',
      peran: 'siswa',
      kelas: 'X MIPA 1',
      sekolah: 'SMAN 1 Nusantara',
    },
    videoDone: true,
    ipoDone: true,
    dekomDone: true,
    parsonsLevel: 3,
    labDone: true,
    simulasiDone: true,
    attempts: 4,
    testPassRate: 100,
    timeOnTaskMinutes: 28,
    lastActivity: '5 menit lalu',
    scores: {
      pretest: 80,
      ipo: 100,
      dekomposisi: 100,
      parsons: 100,
      lab: 90,
      posttest: 100,
      average: 95,
    },
    ctScores: {
      decomposition: 90,
      abstraction: 85,
      algorithm_design: 95,
      debugging: 80,
      iteration: 90,
      generalization: 85,
    },
  },
  {
    user: {
      id: 'siswa-002',
      nisn: '0071234568',
      nama: 'Siti Rahayu',
      password: 'KantinPython2025',
      peran: 'siswa',
      kelas: 'X MIPA 1',
      sekolah: 'SMAN 1 Nusantara',
    },
    videoDone: true,
    ipoDone: true,
    dekomDone: true,
    parsonsLevel: 2,
    labDone: true,
    simulasiDone: false,
    attempts: 6,
    testPassRate: 80,
    timeOnTaskMinutes: 22,
    lastActivity: '12 menit lalu',
    scores: {
      pretest: 60,
      ipo: 100,
      dekomposisi: 90,
      parsons: 90,
      lab: 75,
      posttest: 80,
      average: 83,
    },
    ctScores: {
      decomposition: 85,
      abstraction: 80,
      algorithm_design: 75,
      debugging: 65,
      iteration: 80,
      generalization: 70,
    },
  },
  {
    user: {
      id: 'siswa-003',
      nisn: '0071234569',
      nama: 'Ahmad Fauzi',
      password: 'KantinPython2025',
      peran: 'siswa',
      kelas: 'X MIPA 1',
      sekolah: 'SMAN 1 Nusantara',
    },
    videoDone: true,
    ipoDone: true,
    dekomDone: false,
    parsonsLevel: 1,
    labDone: false,
    simulasiDone: false,
    attempts: 5,
    testPassRate: 40,
    timeOnTaskMinutes: 14,
    lastActivity: '30 menit lalu',
    scores: {
      pretest: 40,
      ipo: 100,
      dekomposisi: 70,
      parsons: undefined,
      lab: undefined,
      posttest: undefined,
      average: 70,
    },
    ctScores: {
      decomposition: 60,
      abstraction: 70,
      algorithm_design: 50,
      debugging: 45,
      iteration: 60,
      generalization: 50,
    },
  },
  {
    user: {
      id: 'siswa-004',
      nisn: '0071234570',
      nama: 'Dewi Lestari',
      password: 'KantinPython2025',
      peran: 'siswa',
      kelas: 'X MIPA 1',
      sekolah: 'SMAN 1 Nusantara',
    },
    videoDone: true,
    ipoDone: true,
    dekomDone: true,
    parsonsLevel: 3,
    labDone: true,
    simulasiDone: true,
    attempts: 3,
    testPassRate: 100,
    timeOnTaskMinutes: 20,
    lastActivity: '1 jam lalu',
    scores: {
      pretest: 100,
      ipo: 100,
      dekomposisi: 100,
      parsons: 100,
      lab: 100,
      posttest: 100,
      average: 100,
    },
    ctScores: {
      decomposition: 95,
      abstraction: 90,
      algorithm_design: 100,
      debugging: 90,
      iteration: 95,
      generalization: 95,
    },
  },
  {
    user: {
      id: 'siswa-005',
      nisn: '0071234571',
      nama: 'Rizky Pratama',
      password: 'KantinPython2025',
      peran: 'siswa',
      kelas: 'X MIPA 1',
      sekolah: 'SMAN 1 Nusantara',
    },
    videoDone: true,
    ipoDone: false,
    dekomDone: false,
    parsonsLevel: 1,
    labDone: false,
    simulasiDone: false,
    attempts: 2,
    testPassRate: 20,
    timeOnTaskMinutes: 9,
    lastActivity: 'Kemarin',
    scores: {
      pretest: 60,
      ipo: 80,
      dekomposisi: undefined,
      parsons: undefined,
      lab: undefined,
      posttest: undefined,
      average: 70,
    },
    ctScores: {
      decomposition: 50,
      abstraction: 55,
      algorithm_design: 45,
      debugging: 40,
      iteration: 50,
      generalization: 40,
    },
  },
];

export default function GuruPage() {
  const [rawRecords, setRawRecords] = useState<StudentRecord[]>([]);
  const [allStudents, setAllStudents] = useState<StudentSummary[]>([]);
  const [selectedKelas, setSelectedKelas] = useState<string>('Semua');
  const [selectedStudent, setSelectedStudent] = useState<StudentSummary | null>(null);
  const [studentLogs, setStudentLogs] = useState<LogEventRecord[]>([]);

  const loadData = useCallback(() => {
    // 1. Get unified persistent records
    const unifiedRecords = getUnifiedStudentSummaries();
    setRawRecords(unifiedRecords);

    // 2. Map StudentRecord to StudentSummary
    const mapped: StudentSummary[] = unifiedRecords.map((rec) => {
      const isLabDone = rec.progress['1-lab'] === 'done' || rec.scores.lab !== undefined;
      const isParsonsDone = rec.progress['1-parsons'] === 'done' || rec.scores.parsons !== undefined;
      const isDekomDone = rec.progress['1-dekomposisi'] === 'done' || rec.scores.dekomposisi !== undefined;
      const isIpoDone = rec.progress['1-ipo'] === 'done' || rec.scores.ipo !== undefined;
      const isVideoDone = rec.progress['1-video'] === 'done';

      const parsonsLvl = isParsonsDone ? 3 : rec.progress['1-parsons'] === 'active' ? 2 : 1;

      return {
        user: {
          id: rec.userId,
          nisn: rec.nisn,
          nama: rec.nama,
          password: '***',
          peran: 'siswa',
          kelas: rec.kelas || 'X MIPA 1',
          sekolah: rec.sekolah || 'SMAN 1 Nusantara',
        },
        videoDone: isVideoDone,
        ipoDone: isIpoDone,
        dekomDone: isDekomDone,
        parsonsLevel: parsonsLvl,
        labDone: isLabDone,
        simulasiDone: rec.progress['1-simulasi'] === 'done',
        attempts: rec.attempts['1-lab'] || (isLabDone ? 2 : 0),
        testPassRate: rec.scores.posttest ?? rec.scores.pretest ?? (isLabDone ? 85 : 0),
        timeOnTaskMinutes: rec.timeOnTaskMinutes || (isLabDone ? 25 : 5),
        lastActivity: rec.lastActivity || 'Belum Mulai',
        scores: rec.scores,
        ctScores: rec.ctScores,
      };
    });

    setAllStudents(mapped);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filter students by selected class
  const filteredRecords = selectedKelas === 'Semua'
    ? rawRecords
    : rawRecords.filter((r) => (r.kelas || 'X MIPA 1') === selectedKelas);

  const filteredStudents = selectedKelas === 'Semua'
    ? allStudents
    : allStudents.filter((s) => s.user.kelas === selectedKelas);

  // If a student is currently logged in, make sure their real-time state is synced
  const students = filteredStudents;
  const pretestStats = computeScoredAverage(students.map((s) => s.scores.pretest));
  const posttestStats = computeScoredAverage(students.map((s) => s.scores.posttest));

  async function handleDrillDown(student: StudentSummary) {
    setSelectedStudent(student);
    const logs = await defaultLogRepository.getByStudent(student.user.id);
    setStudentLogs(logs);
  }

  function handleExportCsv() {
    const csvContent = generateStudentsCsv(filteredRecords, 'nilai');
    downloadCsvFile(
      `stepverse_rekap_nilai_guru_${new Date().toISOString().slice(0, 10)}.csv`,
      csvContent
    );
  }

  function handleRefreshData() {
    loadData();
  }

  return (
    <div className="max-w-6xl mx-auto flex flex-col gap-6">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-xs text-[#464555] mb-1 uppercase tracking-widest font-semibold">
            Modul Monitoring & Penilaian Formatif
          </div>
          <h1 className="text-2xl font-bold text-[#121c2c]">Dasbor Guru (Teacher Dashboard)</h1>
          <p className="text-xs text-[#464555] mt-0.5">
            Rekapitulasi perolehan nilai setiap fitur dan indikator Computational Thinking siswa Kelas X SMA.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Kelas Selector Filter */}
          <div className="flex items-center gap-1.5 bg-white border border-[#c0d8ef] rounded-full px-3 py-1.5 text-xs text-[#253f8a] font-semibold shadow-xs">
            <span>🏫 Filter Kelas:</span>
            <select
              value={selectedKelas}
              onChange={(e) => setSelectedKelas(e.target.value)}
              className="bg-transparent font-bold text-[#121c2c] outline-none cursor-pointer"
            >
              <option value="Semua">Semua Kelas ({allStudents.length})</option>
              {KELAS_OPTIONS.map((k) => (
                <option key={k} value={k}>
                  {k} ({allStudents.filter((s) => s.user.kelas === k).length})
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={handleRefreshData}
            className="px-4 py-2.5 rounded-full text-xs font-semibold text-[#253f8a] transition-all hover:brightness-105 active:scale-95 flex items-center gap-1.5"
            style={{
              background: '#eaf6ff',
              border: '1.5px solid #a6d7ff',
              boxShadow:
                'inset 2px 2px 4px rgba(61,107,145,0.18), inset -2px -2px 4px rgba(255,255,255,0.85), 0 3px 6px rgba(61,107,145,0.1)',
            }}
          >
            <span>🔄</span>
            <span>Segarkan Data</span>
          </button>
          <button
            type="button"
            onClick={handleExportCsv}
            className="px-5 py-2.5 rounded-full text-xs font-bold text-white transition-all hover:brightness-110 active:scale-95 shadow-sm"
            style={{
              background: 'linear-gradient(to bottom, #68b6f7, #3d6b91)',
              boxShadow:
                '0 12px 18px -4px rgba(61,107,145,0.45), inset 0 2px 3px rgba(255,255,255,0.7), inset 0 -3px 0 #253f8a',
            }}
          >
            📥 Ekspor Rekap Nilai CSV
          </button>
        </div>
      </div>

      {/* Overview Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 border border-[#bce0fd] bg-gradient-to-br from-white to-[#f4fbff]">
          <span className="text-xs text-[#464555] block mb-1">Total Siswa Terpantau</span>
          <span className="text-2xl font-bold text-[#121c2c]">{students.length} Siswa</span>
          <span className="text-[10px] text-green-700 block mt-1 font-semibold">
            {selectedKelas === 'Semua' ? 'Seluruh Kelas X' : `Filter: ${selectedKelas}`}
          </span>
        </Card>
        <Card className="p-4 border border-[#bce0fd] bg-gradient-to-br from-white to-[#f4fbff]">
          <span className="text-xs text-[#464555] block mb-1">Rata-Rata Nilai Pretest</span>
          <span className="text-2xl font-bold text-[#253f8a]">
            {pretestStats.average !== null ? `${pretestStats.average} / 100` : '-'}
          </span>
          <span className="text-[10px] text-slate-500 block mt-1">
            {pretestStats.count > 0
              ? `Dari ${pretestStats.count}/${students.length} siswa`
              : 'Belum ada yang mengerjakan'}
          </span>
        </Card>
        <Card className="p-4 border border-[#bce0fd] bg-gradient-to-br from-white to-[#f4fbff]">
          <span className="text-xs text-[#464555] block mb-1">Rata-Rata Nilai Posttest</span>
          <span className="text-2xl font-bold text-green-700">
            {posttestStats.average !== null ? `${posttestStats.average} / 100` : '-'}
          </span>
          <span className="text-[10px] text-green-700 font-semibold block mt-1">
            {posttestStats.count > 0
              ? `Dari ${posttestStats.count}/${students.length} siswa`
              : 'Belum ada yang mengerjakan'}
          </span>
        </Card>
        <Card className="p-4 border border-[#bce0fd] bg-gradient-to-br from-white to-[#f4fbff]">
          <span className="text-xs text-[#464555] block mb-1">Tuntas Lab Python</span>
          <span className="text-2xl font-bold text-green-700">
            {students.filter((s) => s.labDone).length}/{students.length} Siswa
          </span>
          <span className="text-[10px] text-slate-500 block mt-1">Scaffolding Faded</span>
        </Card>
      </div>

      {/* Main Student Monitoring Table with Feature Scores */}
      <Card className="p-0 overflow-hidden border border-[#bce0fd]">
        <div className="p-4 border-b border-[#eaf6ff] flex items-center justify-between">
          <h2 className="font-bold text-sm text-[#121c2c] uppercase tracking-wider">
            Tabel Rekap Nilai Siswa per Fitur (Materi 1: Variabel & Penugasan)
          </h2>
          <span className="text-xs text-[#888]">
            Klik baris siswa untuk rincian indikator CT & jejak aktivitas
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-[#f4fbff] text-[#253f8a] uppercase font-bold text-[11px] border-b border-[#d0ecff]">
              <tr>
                <th className="py-3 px-3">Nama Siswa / NISN</th>
                <th className="py-3 px-2 text-center">Pretest</th>
                <th className="py-3 px-2 text-center">IPO</th>
                <th className="py-3 px-2 text-center">Dekomposisi</th>
                <th className="py-3 px-2 text-center">Parsons</th>
                <th className="py-3 px-2 text-center">Lab Python</th>
                <th className="py-3 px-2 text-center">Posttest</th>
                <th className="py-3 px-2 text-center font-extrabold bg-[#eaf6ff]">Rata-Rata</th>
                <th className="py-3 px-2 text-center">Waktu</th>
                <th className="py-3 px-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#eaf6ff]">
              {students.map((st) => (
                <tr
                  key={st.user.id}
                  className="hover:bg-[#f8fbff] transition cursor-pointer"
                  onClick={() => handleDrillDown(st)}
                >
                  <td className="py-3 px-3">
                    <span className="font-bold text-[#121c2c] block text-xs">{st.user.nama}</span>
                    <span className="text-[10px] text-[#888] font-mono">{st.user.nisn} · {st.user.kelas}</span>
                  </td>
                  <td className="py-3 px-2 text-center font-mono">
                    {st.scores.pretest !== undefined ? (
                      <span className="font-bold text-[#253f8a]">{st.scores.pretest}</span>
                    ) : (
                      <span className="text-gray-300">-</span>
                    )}
                  </td>
                  <td className="py-3 px-2 text-center font-mono">
                    {st.scores.ipo !== undefined ? (
                      <span className="font-bold text-green-700">{st.scores.ipo}</span>
                    ) : (
                      <span className="text-gray-300">-</span>
                    )}
                  </td>
                  <td className="py-3 px-2 text-center font-mono">
                    {st.scores.dekomposisi !== undefined ? (
                      <span className="font-bold text-green-700">{st.scores.dekomposisi}</span>
                    ) : (
                      <span className="text-gray-300">-</span>
                    )}
                  </td>
                  <td className="py-3 px-2 text-center font-mono">
                    {st.scores.parsons !== undefined ? (
                      <span className="font-bold text-green-700">{st.scores.parsons}</span>
                    ) : (
                      <span className="text-gray-300">-</span>
                    )}
                  </td>
                  <td className="py-3 px-2 text-center font-mono">
                    {st.scores.lab !== undefined ? (
                      <span className="font-bold text-green-700">{st.scores.lab}</span>
                    ) : (
                      <span className="text-gray-300">-</span>
                    )}
                  </td>
                  <td className="py-3 px-2 text-center font-mono">
                    {st.scores.posttest !== undefined ? (
                      <span className="font-bold text-purple-700">{st.scores.posttest}</span>
                    ) : (
                      <span className="text-gray-300">-</span>
                    )}
                  </td>
                  <td className="py-3 px-2 text-center font-mono font-bold bg-[#f8fbff] text-green-800">
                    {st.scores.average !== undefined ? `${st.scores.average}` : '-'}
                  </td>
                  <td className="py-3 px-2 text-center font-mono text-[#888]">
                    {st.timeOnTaskMinutes}m
                  </td>
                  <td className="py-3 px-3 text-center">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDrillDown(st);
                      }}
                      className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#eaf6ff] text-[#253f8a] hover:bg-[#d0ecff] transition"
                    >
                      Detail 🔎
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Drill-Down Modal / Detail View */}
      {selectedStudent && (
        <Card className="border-2 border-[#253f8a] p-6 shadow-xl bg-white flex flex-col gap-5">
          <div className="flex items-center justify-between border-b border-[#eaf6ff] pb-3">
            <div className="flex items-center gap-3">
              <span className="text-3xl">👤</span>
              <div>
                <h3 className="font-bold text-base text-[#121c2c]">
                  Rincian Nilai & Perkembangan CT: {selectedStudent.user.nama}
                </h3>
                <span className="text-xs text-[#464555]">
                  NISN: {selectedStudent.user.nisn} · Kelas: {selectedStudent.user.kelas} · {selectedStudent.user.sekolah}
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

          {/* Feature Scores Breakdown Card */}
          <div className="p-4 rounded-2xl bg-[#f4fbff] border border-[#d0ecff]">
            <span className="font-bold text-xs uppercase tracking-wider text-[#253f8a] block mb-2.5">
              📊 Perolehan Nilai per Fitur Pembelajaran
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
              <div className="bg-white p-2.5 rounded-xl border border-slate-200 text-center">
                <span className="text-[#666] block text-[10px] uppercase font-semibold">Pretest CT</span>
                <span className="font-bold text-base text-[#253f8a]">{selectedStudent.scores.pretest ?? '-'}</span>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-slate-200 text-center">
                <span className="text-[#666] block text-[10px] uppercase font-semibold">Analisis IPO</span>
                <span className="font-bold text-base text-[#253f8a]">{selectedStudent.scores.ipo ?? '-'}</span>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-slate-200 text-center">
                <span className="text-[#666] block text-[10px] uppercase font-semibold">Dekomposisi</span>
                <span className="font-bold text-base text-[#253f8a]">{selectedStudent.scores.dekomposisi ?? '-'}</span>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-slate-200 text-center">
                <span className="text-[#666] block text-[10px] uppercase font-semibold">Parsons L1-L2</span>
                <span className="font-bold text-base text-[#253f8a]">{selectedStudent.scores.parsons ?? '-'}</span>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-slate-200 text-center">
                <span className="text-[#666] block text-[10px] uppercase font-semibold">Lab Python</span>
                <span className="font-bold text-base text-[#253f8a]">{selectedStudent.scores.lab ?? '-'}</span>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-slate-200 text-center">
                <span className="text-[#666] block text-[10px] uppercase font-semibold">Posttest CT</span>
                <span className="font-bold text-base text-[#253f8a]">{selectedStudent.scores.posttest ?? '-'}</span>
              </div>
            </div>

            <div className="mt-3 pt-2.5 border-t border-[#d0ecff] flex items-center justify-between text-xs">
              <span className="font-bold text-[#121c2c]">Nilai Rata-Rata Akhir:</span>
              <span className="font-mono font-bold text-base text-green-700 bg-white px-3 py-1 rounded-full border border-green-200">
                {selectedStudent.scores.average ?? '-'} / 100
              </span>
            </div>
          </div>

          {/* 6 CT Indicator Bars */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-xs uppercase tracking-wider text-[#253f8a]">
                Estimasi 6 Komponen Computational Thinking (Shute et al., 2017)
              </span>
              <span className="text-[10px] bg-green-100 text-green-800 px-2 py-0.5 rounded-full font-semibold">
                Indikator Terintegrasi
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                { label: 'Dekomposisi (Decomposition)', val: selectedStudent.ctScores.decomposition, desc: 'Kemampuan memecah masalah kasir ke dalam 4 tahapan berurutan.' },
                { label: 'Abstraksi (Abstraction)', val: selectedStudent.ctScores.abstraction, desc: 'Pemilahan data penting (nama, harga, jumlah) dari variabel pengecoh.' },
                { label: 'Desain Algoritma (Algorithm Design)', val: selectedStudent.ctScores.algorithm_design, desc: 'Penguasaan logika urutan pada Parsons Problem (Level 1 & 2).' },
                { label: 'Debugging', val: selectedStudent.ctScores.debugging, desc: 'Kemampuan mengenali dan memperbaiki error eksekusi di Lab Python.' },
                { label: 'Iterasi (Iteration)', val: selectedStudent.ctScores.iteration, desc: 'Frekuensi pengujian dan penyempurnaan kode hingga berhasil.' },
                { label: 'Generalisasi (Generalization)', val: selectedStudent.ctScores.generalization, desc: 'Keberhasilan formula program pada hidden test cases dan posttest.' },
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
                  <span className="text-[10px] text-[#666] leading-tight">{ct.desc}</span>
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
                  Siswa ini menggunakan data simulasi default. Event interaksi baru akan tercatat saat siswa aktif mengerjakan aktivitas.
                </div>
              )}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
