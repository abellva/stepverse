import type { PausePoint } from '../data/curriculum';

export interface PausePointCompletionRecord {
  completedAt: string;
  skipped?: boolean;
  selectedOptionId?: string;
  isCorrect?: boolean;
}

export type MateriPausePointMap = Record<string, PausePointCompletionRecord>;

/** Kunci penyimpanan progres pause point per materi pada store answers siswa. */
export function getPausePointStorageKey(materiId: number): string {
  return `${materiId}-video-pause-points`;
}

/** Mengambil objek penyelesaian pause point secara aman dari map answers store. */
export function readPausePointCompletions(
  answers: Record<string, unknown>,
  materiId: number
): MateriPausePointMap {
  const raw = answers[getPausePointStorageKey(materiId)];
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {};
  }
  return raw as MateriPausePointMap;
}

/** Mengurutkan pause points menaik berdasarkan waktu kemunculan (detik). */
export function getSortedPausePoints(pausePoints?: PausePoint[]): PausePoint[] {
  if (!pausePoints || pausePoints.length === 0) return [];
  return [...pausePoints].sort((a, b) => a.time - b.time);
}

/** Mengecek apakah sebuah pause point telah diselesaikan atau dilewati oleh siswa. */
export function isPausePointCompleted(
  pausePoint: PausePoint,
  completions: MateriPausePointMap
): boolean {
  return Boolean(completions[pausePoint.id]);
}

/**
 * Mengembalikan pause point paling awal yang belum selesai dan waktunya sudah tercapai.
 * Mencegah siswa melompati aktivitas kinestetik/prediksi lewat scrubbing maju.
 */
export function findTriggeredPausePoint(
  currentTime: number,
  pausePoints: PausePoint[],
  completions: MateriPausePointMap
): PausePoint | null {
  for (const pp of getSortedPausePoints(pausePoints)) {
    if (!isPausePointCompleted(pp, completions) && currentTime >= pp.time) {
      return pp;
    }
  }
  return null;
}

/** Memeriksa apakah semua pause point wajib (non-opsional) telah diselesaikan. */
export function areRequiredPausePointsCompleted(
  pausePoints: PausePoint[],
  completions: MateriPausePointMap
): boolean {
  return pausePoints
    .filter((pp) => !pp.optional)
    .every((pp) => isPausePointCompleted(pp, completions));
}

/** Memformat detik menjadi label mm:ss untuk penanda video. */
export function formatPauseTime(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(safe / 60)
    .toString()
    .padStart(2, '0');
  const secs = (safe % 60).toString().padStart(2, '0');
  return `${mins}:${secs}`;
}
