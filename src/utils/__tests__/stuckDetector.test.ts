import { describe, it, expect } from 'vitest';
import {
  assessStuckStatus,
  aggregateGroupMonitoring,
  checkPosttestAccess,
  formatDurationCompact,
} from '../stuckDetector';
import type { ChatMessageRecord, MonitoringEntry } from '../../services/researchApi';

function makeEntry(overrides: Partial<MonitoringEntry> = {}): MonitoringEntry {
  const now = 1_700_000_000_000;
  return {
    studentId: 's-1',
    studentName: 'Budi',
    nisn: '0071234567',
    kelas: 'X MIPA 1',
    groupId: 'Kelompok 1',
    currentStage: 'lab',
    stageEnteredAt: now - 60_000,
    stageDurationsMs: { video: 120_000, ipo: 90_000 },
    videoReplayCount: 0,
    failedAttemptsInStage: {},
    lastInteractionAt: now - 10_000,
    progress: { '1-video': 'done', '1-ipo': 'done', '1-lab': 'active' },
    scores: {},
    ...overrides,
  };
}

describe('stuckDetector', () => {
  it('marks student as normal when duration, failures, and replays are low', () => {
    const now = 1_700_000_000_000;
    const result = assessStuckStatus(makeEntry(), now, []);
    expect(result.level).toBe('normal');
    expect(result.needsIntervention).toBe(false);
  });

  it('detects stuck when student stays >= 10 minutes in an incomplete sub-chapter', () => {
    const now = 1_700_000_000_000;
    const entry = makeEntry({ stageEnteredAt: now - 11 * 60_000 });
    const result = assessStuckStatus(entry, now, []);
    expect(result.level).toBe('stuck');
    expect(result.needsIntervention).toBe(true);
    expect(result.reasons.some((r) => r.includes('11 menit'))).toBe(true);
  });

  it('detects stuck when failed attempts in current stage >= 5', () => {
    const now = 1_700_000_000_000;
    const entry = makeEntry({ failedAttemptsInStage: { lab: 5 } });
    const result = assessStuckStatus(entry, now, []);
    expect(result.level).toBe('stuck');
    expect(result.reasons.some((r) => r.includes('5× percobaan gagal'))).toBe(true);
  });

  it('detects stuck when video replay count >= 5 before IPO is done', () => {
    const now = 1_700_000_000_000;
    const entry = makeEntry({
      currentStage: 'video',
      videoReplayCount: 5,
      progress: { '1-video': 'active' },
    });
    const result = assessStuckStatus(entry, now, []);
    expect(result.level).toBe('stuck');
    expect(result.reasons.some((r) => r.includes('Memutar ulang video 5×'))).toBe(true);
  });

  it('detects stuck when group chat has recent help keywords', () => {
    const now = 1_700_000_000_000;
    const msg: ChatMessageRecord = {
      id: 'c-1',
      timestamp: new Date(now - 60_000).toISOString(),
      groupId: 'Kelompok 1',
      senderId: 's-1',
      senderName: 'Budi',
      senderRole: 'siswa',
      stage: 'lab',
      message: 'Pak/Bu kami bingung error terus di total harga',
    };
    const result = assessStuckStatus(makeEntry(), now, [msg]);
    expect(result.level).toBe('stuck');
    expect(result.needsIntervention).toBe(true);
  });

  it('clears stuck flag temporarily right after teacher acknowledges intervention', () => {
    const now = 1_700_000_000_000;
    const entry = makeEntry({
      stageEnteredAt: now - 15 * 60_000,
      acknowledgedStuckAt: now - 30_000,
    });
    const result = assessStuckStatus(entry, now, []);
    expect(result.level).toBe('normal');
    expect(result.label).toBe('Sudah Dibantu Guru');
  });

  it('aggregates 5 small groups with duration, replay count, and progress percentage', () => {
    const now = 1_700_000_000_000;
    const entries = [
      makeEntry({ groupId: 'Kelompok 1', videoReplayCount: 3 }),
      makeEntry({ studentId: 's-2', studentName: 'Siti', groupId: 'Kelompok 3', videoReplayCount: 1 }),
    ];
    const summaries = aggregateGroupMonitoring(entries, [], now);
    expect(summaries).toHaveLength(5);
    const k1 = summaries.find((g) => g.groupId === 'Kelompok 1')!;
    expect(k1.videoReplayCount).toBe(3);
    expect(k1.completedStagesCount).toBe(2);
    expect(k1.progressPct).toBe(40);
  });

  it('locks Post-test until all 5 formative stages are done and teacher has not locked it', () => {
    const incomplete = checkPosttestAccess({
      progress: { '1-video': 'done', '1-ipo': 'done' },
      lockedByGuru: false,
    });
    expect(incomplete.unlocked).toBe(false);
    expect(incomplete.missingStages).toEqual(['dekomposisi', 'parsons', 'lab']);

    const fullProgress = {
      '1-video': 'done' as const,
      '1-ipo': 'done' as const,
      '1-dekomposisi': 'done' as const,
      '1-parsons': 'done' as const,
      '1-lab': 'done' as const,
    };

    const lockedByTeacher = checkPosttestAccess({
      progress: fullProgress,
      lockedByGuru: true,
    });
    expect(lockedByTeacher.unlocked).toBe(false);

    const open = checkPosttestAccess({
      progress: fullProgress,
      lockedByGuru: false,
    });
    expect(open.unlocked).toBe(true);
  });

  it('formats compact durations cleanly', () => {
    expect(formatDurationCompact(45_000)).toBe('45 dtk');
    expect(formatDurationCompact(125_000)).toBe('2 mnt 05 dtk');
  });
});
