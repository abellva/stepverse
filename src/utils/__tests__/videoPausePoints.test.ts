import { describe, it, expect, beforeEach } from 'vitest';
import { MATERI_LIST, type PausePoint } from '../../data/curriculum';
import {
  areRequiredPausePointsCompleted,
  findTriggeredPausePoint,
  formatPauseTime,
  getPausePointStorageKey,
  getSortedPausePoints,
  isPausePointCompleted,
  readPausePointCompletions,
  type MateriPausePointMap,
} from '../videoPausePoints';
import { getStudentRecord, syncActiveUserProgress } from '../../services/studentStorage';

function createMemoryStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => {
      map.set(k, String(v));
    },
    removeItem: (k: string) => {
      map.delete(k);
    },
    clear: () => map.clear(),
  };
}

describe('Video Pause Points', () => {
  beforeEach(() => {
    const store = createMemoryStorage();
    Object.defineProperty(globalThis, 'localStorage', {
      value: store,
      configurable: true,
      writable: true,
    });
  });

  it('defines Materi 1 pause points in curriculum with kinesthetic (S1-15 + 2s) and optional prediction (S2-05 + 2s)', () => {
    const materi1 = MATERI_LIST.find((m) => m.id === 1);
    expect(materi1).toBeDefined();
    expect(materi1?.videoSrc).toBe('/video/materi fiks.mp4');
    expect(materi1?.pausePoints).toHaveLength(2);

    const [kinesthetic, prediction] = getSortedPausePoints(materi1?.pausePoints);
    expect(kinesthetic.type).toBe('kinesthetic');
    expect(kinesthetic.time).toBe(149);
    expect(kinesthetic.optional).toBeUndefined();

    expect(prediction.type).toBe('prediction');
    expect(prediction.time).toBe(186.5);
    expect(prediction.optional).toBe(true);
    expect(prediction.prediction?.options).toHaveLength(2);
  });

  it('triggers the earliest uncompleted pause point and prevents skipping ahead', () => {
    const pausePoints = getSortedPausePoints(MATERI_LIST[0].pausePoints);
    let completions: MateriPausePointMap = {};

    expect(findTriggeredPausePoint(148.9, pausePoints, completions)).toBeNull();

    // Tepat saat mencapai detik 149 (02:29)
    expect(findTriggeredPausePoint(149, pausePoints, completions)?.id).toBe('m1-kinesthetic');
    // Bahkan bila siswa menggeser slider jauh melewati kedua titik jeda
    expect(findTriggeredPausePoint(210, pausePoints, completions)?.id).toBe('m1-kinesthetic');

    // Setelah kinesthetic selesai, pemutaran lanjut hingga titik prediksi
    completions = {
      'm1-kinesthetic': { completedAt: '2026-11-12T00:00:00.000Z' },
    };
    expect(findTriggeredPausePoint(149.5, pausePoints, completions)).toBeNull();
    expect(findTriggeredPausePoint(186.4, pausePoints, completions)).toBeNull();
    expect(findTriggeredPausePoint(186.5, pausePoints, completions)?.id).toBe('m1-prediction');

    // Setelah prediksi dijawab atau dilewati (opsional / demo skip), tidak memicu jeda lagi
    completions = {
      ...completions,
      'm1-prediction': {
        completedAt: '2026-11-12T00:01:00.000Z',
        selectedOptionId: '16000',
        isCorrect: true,
      },
    };
    expect(findTriggeredPausePoint(250, pausePoints, completions)).toBeNull();
  });

  it('treats unsorted pause points cleanly and checks required vs optional gates', () => {
    const unsorted: PausePoint[] = [
      { id: 'later', time: 180, type: 'prediction', optional: true },
      { id: 'earlier', time: 60, type: 'kinesthetic' },
    ];
    expect(getSortedPausePoints(unsorted).map((p) => p.id)).toEqual(['earlier', 'later']);

    expect(areRequiredPausePointsCompleted(unsorted, {})).toBe(false);
    expect(
      areRequiredPausePointsCompleted(unsorted, {
        earlier: { completedAt: '2026-11-12T00:00:00.000Z' },
      })
    ).toBe(true);
    expect(isPausePointCompleted(unsorted[1], {})).toBe(false);
    expect(isPausePointCompleted(unsorted[0], {})).toBe(false);
    // Akun lama tanpa completion record pada pause point tetap memicu jeda kinestetik
    expect(findTriggeredPausePoint(149, getSortedPausePoints(MATERI_LIST[0].pausePoints), {})?.id).toBe(
      'm1-kinesthetic'
    );
  });

  it('persists completed pause points per student via studentStorage', () => {
    const key = getPausePointStorageKey(1);
    const alice = { id: 'nisn-alice', nama: 'Alice', peran: 'siswa' as const, kelas: 'X MIPA 1' };
    const bob = { id: 'nisn-bob', nama: 'Bob', peran: 'siswa' as const, kelas: 'X MIPA 1' };

    syncActiveUserProgress(
      alice,
      { '1-video': 'active', '1-simulasi': 'done' },
      {
        [key]: {
          'm1-kinesthetic': { completedAt: '2026-11-12T01:00:00.000Z' },
          'm1-prediction': {
            completedAt: '2026-11-12T01:02:00.000Z',
            selectedOptionId: '16000',
            isCorrect: true,
          },
        },
      },
      {}
    );

    syncActiveUserProgress(
      bob,
      { '1-video': 'active' },
      {
        [key]: {
          'm1-kinesthetic': { completedAt: '2026-11-12T02:00:00.000Z', skipped: true },
        },
      },
      {}
    );

    const aliceRecord = getStudentRecord('nisn-alice');
    const bobRecord = getStudentRecord('nisn-bob');
    const aliceMap = readPausePointCompletions(aliceRecord?.answers ?? {}, 1);
    const bobMap = readPausePointCompletions(bobRecord?.answers ?? {}, 1);

    expect(aliceMap['m1-kinesthetic']?.completedAt).toBe('2026-11-12T01:00:00.000Z');
    expect(aliceMap['m1-prediction']?.selectedOptionId).toBe('16000');
    expect(bobMap['m1-kinesthetic']?.skipped).toBe(true);
    expect(bobMap['m1-prediction']).toBeUndefined();
  });

  it('formats pause timestamps as mm:ss', () => {
    expect(formatPauseTime(149)).toBe('02:29');
    expect(formatPauseTime(186.5)).toBe('03:06');
    expect(formatPauseTime(-3)).toBe('00:00');
  });
});

