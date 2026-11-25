import { MATERI_LIST, STAGE_LABELS } from '../data/curriculum';
import { KELOMPOK_OPTIONS } from '../data/users';
import type { ChatMessageRecord, MonitoringEntry } from '../services/researchApi';
import type { StageProgress } from '../store/useAppStore';

export type StuckLevel = 'normal' | 'warning' | 'stuck';

export interface StuckAssessment {
  level: StuckLevel;
  label: string;
  reasons: string[];
  needsIntervention: boolean;
}

export interface GroupMonitoringSummary {
  groupId: string;
  members: MonitoringEntry[];
  activeStage: string;
  activeStageLabel: string;
  currentDurationMs: number;
  videoReplayCount: number;
  failedAttemptsCurrentStage: number;
  progressPct: number;
  completedStagesCount: number;
  totalStagesCount: number;
  stuck: StuckAssessment;
  chatCount: number;
  lastMessage?: ChatMessageRecord;
  kinestheticPair?: { programmerName: string; komputerName: string };
}

const HELP_KEYWORDS = ['bingung', 'stuck', 'error', 'tolong', 'bantu', 'gagal', 'tidak bisa', 'susah'];

const FORMATIVE_STAGES = MATERI_LIST[0]?.stages ?? ['video', 'ipo', 'dekomposisi', 'parsons', 'lab'];

export function getStageDisplayLabel(stage: string): string {
  if (stage in STAGE_LABELS) {
    return STAGE_LABELS[stage as keyof typeof STAGE_LABELS];
  }
  if (stage === 'pretest') return 'Pretest CT';
  if (stage === 'posttest') return 'Posttest CT';
  if (stage === 'simulasi' || stage === 'kinesthetic') return 'Simulasi Kinestetik';
  return stage;
}

export function formatDurationCompact(ms: number): string {
  const safeSeconds = Math.max(0, Math.floor(ms / 1000));
  const mins = Math.floor(safeSeconds / 60);
  const secs = safeSeconds % 60;
  if (mins === 0) return `${secs} dtk`;
  return `${mins} mnt ${secs.toString().padStart(2, '0')} dtk`;
}

/**
 * Mengevaluasi apakah siswa/kelompok mengalami stuck sehingga guru perlu intervensi.
 */
export function assessStuckStatus(
  entry: MonitoringEntry,
  nowMs: number = Date.now(),
  recentMessages: ChatMessageRecord[] = []
): StuckAssessment {
  const reasons: string[] = [];
  let level: StuckLevel = 'normal';

  const stageKey = entry.currentStage || 'video';
  const isCurrentStageDone = entry.progress[`1-${stageKey}`] === 'done';
  const allFormativeDone = FORMATIVE_STAGES.every((s) => entry.progress[`1-${s}`] === 'done');

  // Jika semua formatif sudah selesai atau guru baru saja menandai sudah dibantu (< 3 menit lalu)
  const recentlyAcknowledged =
    typeof entry.acknowledgedStuckAt === 'number' && nowMs - entry.acknowledgedStuckAt < 3 * 60 * 1000;

  if (allFormativeDone || recentlyAcknowledged) {
    return {
      level: 'normal',
      label: recentlyAcknowledged ? 'Sudah Dibantu Guru' : 'Lancar / Tuntas',
      reasons: [],
      needsIntervention: false,
    };
  }

  const storedStageMs = entry.stageDurationsMs[stageKey] ?? 0;
  const liveElapsedMs = entry.stageEnteredAt > 0 ? Math.max(0, nowMs - entry.stageEnteredAt) : 0;
  const stageDurationMs = Math.max(storedStageMs, liveElapsedMs);
  const stageMinutes = stageDurationMs / 60000;

  const failedAttempts = entry.failedAttemptsInStage[stageKey] ?? 0;
  const replays = entry.videoReplayCount ?? 0;
  const idleMinutes = entry.lastInteractionAt > 0 ? Math.max(0, nowMs - entry.lastInteractionAt) / 60000 : 0;

  // Signal 1: Durasi terlalu lama di satu sub-bab yang belum selesai
  if (!isCurrentStageDone && stageMinutes >= 10) {
    level = 'stuck';
    reasons.push(`Bertahan ${Math.floor(stageMinutes)} menit di ${getStageDisplayLabel(stageKey)} tanpa selesai`);
  } else if (!isCurrentStageDone && stageMinutes >= 6) {
    level = 'warning';
    reasons.push(`Sudah ${Math.floor(stageMinutes)} menit di ${getStageDisplayLabel(stageKey)}`);
  }

  // Signal 2: Percobaan salah / error berulang di sub-bab saat ini
  if (failedAttempts >= 5) {
    level = 'stuck';
    reasons.push(`${failedAttempts}× percobaan gagal / error di ${getStageDisplayLabel(stageKey)}`);
  } else if (failedAttempts >= 3) {
    if (level !== 'stuck') level = 'warning';
    reasons.push(`${failedAttempts}× percobaan gagal di ${getStageDisplayLabel(stageKey)}`);
  }

  // Signal 3: Frekuensi pemutaran ulang video tinggi
  if (replays >= 5 && entry.progress['1-ipo'] !== 'done') {
    level = 'stuck';
    reasons.push(`Memutar ulang video ${replays}× (indikasi hambatan konsep)`);
  } else if (replays >= 3) {
    if (level !== 'stuck') level = 'warning';
    reasons.push(`Memutar ulang video ${replays}×`);
  }

  // Signal 4: Idle terlalu lama saat sub-bab aktif
  if (!isCurrentStageDone && idleMinutes >= 4) {
    if (level === 'normal') level = 'warning';
    reasons.push(`Tidak ada aktivitas selama ${Math.floor(idleMinutes)} menit`);
  }

  // Signal 5: Permintaan bantuan eksplisit di chat kelompok (10 menit terakhir)
  const helpMsg = recentMessages.find((m) => {
    if (m.senderRole !== 'siswa') return false;
    const msgTime = Date.parse(m.timestamp);
    if (!Number.isFinite(msgTime) || nowMs - msgTime > 10 * 60 * 1000) return false;
    const lower = m.message.toLowerCase();
    return HELP_KEYWORDS.some((kw) => lower.includes(kw));
  });
  if (helpMsg) {
    level = 'stuck';
    reasons.push(`Meminta bantuan di chat: "${helpMsg.message.slice(0, 55)}${helpMsg.message.length > 55 ? '…' : ''}"`);
  }

  const label =
    level === 'stuck'
      ? 'STUCK — Intervensi Sekarang'
      : level === 'warning'
      ? 'Perlu Perhatian'
      : 'Lancar';

  return {
    level,
    label,
    reasons,
    needsIntervention: level === 'stuck',
  };
}

/**
 * Mengagregasi data pemantauan siswa ke dalam ringkasan per kelompok kecil (Kelompok 1–5).
 */
export function aggregateGroupMonitoring(
  entries: MonitoringEntry[],
  chatMessages: ChatMessageRecord[],
  nowMs: number = Date.now()
): GroupMonitoringSummary[] {
  return KELOMPOK_OPTIONS.map((groupId) => {
    const members = entries.filter((e) => (e.groupId || 'Kelompok 1') === groupId);
    const groupChats = chatMessages.filter((c) => c.groupId === groupId);
    const lastMessage = groupChats[groupChats.length - 1];

    if (members.length === 0) {
      return {
        groupId,
        members: [],
        activeStage: 'video',
        activeStageLabel: 'Belum Aktif',
        currentDurationMs: 0,
        videoReplayCount: 0,
        failedAttemptsCurrentStage: 0,
        progressPct: 0,
        completedStagesCount: 0,
        totalStagesCount: FORMATIVE_STAGES.length,
        stuck: {
          level: 'normal',
          label: 'Belum Mulai',
          reasons: [],
          needsIntervention: false,
        },
        chatCount: groupChats.length,
        lastMessage,
      };
    }

    // Ambil anggota paling aktif terbaru sebagai representasi sub-bab aktif kelompok
    const lead = [...members].sort((a, b) => b.lastInteractionAt - a.lastInteractionAt)[0];
    const activeStage = lead.currentStage || 'video';
    const storedMs = lead.stageDurationsMs[activeStage] ?? 0;
    const liveMs = lead.stageEnteredAt > 0 ? Math.max(0, nowMs - lead.stageEnteredAt) : 0;
    const currentDurationMs = Math.max(storedMs, liveMs);

    const videoReplayCount = members.reduce((sum, m) => Math.max(sum, m.videoReplayCount ?? 0), 0);
    const failedAttemptsCurrentStage = members.reduce(
      (max, m) => Math.max(max, m.failedAttemptsInStage[activeStage] ?? 0),
      0
    );

    const completedStagesCount = FORMATIVE_STAGES.filter((s) =>
      members.some((m) => m.progress[`1-${s}`] === 'done')
    ).length;
    const progressPct = Math.round((completedStagesCount / FORMATIVE_STAGES.length) * 100);

    // Evaluasi stuck terburuk di kelompok
    const assessments = members.map((m) => assessStuckStatus(m, nowMs, groupChats));
    const worstStuck =
      assessments.find((a) => a.level === 'stuck') ??
      assessments.find((a) => a.level === 'warning') ??
      assessments[0];

    const pair = members.find((m) => m.kinestheticPair)?.kinestheticPair;

    return {
      groupId,
      members,
      activeStage,
      activeStageLabel: getStageDisplayLabel(activeStage),
      currentDurationMs,
      videoReplayCount,
      failedAttemptsCurrentStage,
      progressPct,
      completedStagesCount,
      totalStagesCount: FORMATIVE_STAGES.length,
      stuck: worstStuck,
      chatCount: groupChats.length,
      lastMessage,
      kinestheticPair: pair,
    };
  });
}

/**
 * Memeriksa apakah siswa boleh membuka Post-test:
 * Wajib menuntaskan seluruh latihan formatif Materi 1 DAN tidak dikunci oleh Guru.
 */
export function checkPosttestAccess(params: {
  progress: Record<string, StageProgress>;
  lockedByGuru: boolean;
  demoMode?: boolean;
  answers?: Record<string, unknown>;
}): {
  unlocked: boolean;
  reason?: string;
  missingStages: string[];
} {
  if (params.demoMode) {
    return { unlocked: true, missingStages: [] };
  }

  const missingStages = FORMATIVE_STAGES.filter((s) => {
    if (params.progress[`1-${s}`] === 'done') return false;
    // Fallback: jika score tersimpan 100 di answers, anggap tuntas
    if (params.answers && params.answers[`1-${s}-score`] === 100) return false;
    return true;
  });

  if (missingStages.length > 0) {
    return {
      unlocked: false,
      reason: 'Selesaikan seluruh latihan formatif Materi 1 terlebih dahulu sebelum membuka Post-test.',
      missingStages,
    };
  }

  if (params.lockedByGuru) {
    return {
      unlocked: false,
      reason: 'Post-test sedang dikunci oleh Guru. Tunggu instruksi Guru untuk membukanya.',
      missingStages: [],
    };
  }

  return { unlocked: true, missingStages: [] };
}
