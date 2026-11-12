import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  syncActiveUserProgress,
  getStudentRecord,
} from '../services/studentStorage';

export type StageProgress = 'locked' | 'active' | 'done';

export interface UserSession {
  id: string;
  nama: string;
  peran: 'siswa' | 'guru';
  kelas: string;
}

export interface AppState {
  user: UserSession | null;
  progress: Record<string, StageProgress>; // key: `${materiId}-${stage}`
  answers: Record<string, unknown>;
  attempts: Record<string, number>;
  demoMode: boolean;
  setUser: (user: UserSession | null) => void;
  setProgress: (materiId: number, stage: string, status: StageProgress) => void;
  setAnswer: (key: string, value: unknown) => void;
  incrementAttempt: (key: string) => void;
  setDemoMode: (val: boolean) => void;
  reset: () => void;
}

const initialState = {
  user: null,
  progress: { '1-video': 'active' } as Record<string, StageProgress>,
  answers: {},
  attempts: {},
  demoMode: false,
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      ...initialState,
      setUser: (user) => {
        if (user && user.peran === 'siswa') {
          // Restore student's existing progress if available
          const existing = getStudentRecord(user.id) || getStudentRecord(user.nama);
          if (existing && existing.progress && Object.keys(existing.progress).length > 0) {
            set({
              user,
              progress: { ...get().progress, ...existing.progress },
              answers: { ...get().answers, ...existing.answers },
              attempts: { ...get().attempts, ...existing.attempts },
            });
            return;
          }
        }
        set({ user });
      },
      setProgress: (materiId, stage, status) => {
        set((s) => {
          const nextProgress = { ...s.progress, [`${materiId}-${stage}`]: status };
          if (s.user) {
            syncActiveUserProgress(s.user, nextProgress, s.answers, s.attempts);
          }
          return { progress: nextProgress };
        });
      },
      setAnswer: (key, value) => {
        set((s) => {
          const nextAnswers = { ...s.answers, [key]: value };
          if (s.user) {
            syncActiveUserProgress(s.user, s.progress, nextAnswers, s.attempts);
          }
          return { answers: nextAnswers };
        });
      },
      incrementAttempt: (key) => {
        set((s) => {
          const nextAttempts = { ...s.attempts, [key]: (s.attempts[key] ?? 0) + 1 };
          if (s.user) {
            syncActiveUserProgress(s.user, s.progress, s.answers, nextAttempts);
          }
          return { attempts: nextAttempts };
        });
      },
      setDemoMode: (val) => set({ demoMode: val }),
      reset: () => {
        const currentUser = get().user;
        if (currentUser) {
          syncActiveUserProgress(currentUser, get().progress, get().answers, get().attempts);
        }
        set(initialState);
      },
    }),
    { name: 'stepverse-store' }
  )
);
