import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  syncActiveUserProgress,
  getStudentRecord,
  calculateFeatureScores,
} from '../services/studentStorage';
import {
  sendMonitoringHeartbeat,
  getLocalPosttestLock,
} from '../services/researchApi';

export type StageProgress = 'locked' | 'active' | 'done';

export interface UserSession {
  id: string;
  nama: string;
  peran: 'siswa' | 'guru';
  kelas: string;
  kelompok?: string;
}

export interface TelemetryState {
  currentStage: string;
  stageEnteredAt: number;
  stageDurationsMs: Record<string, number>;
  videoReplayCount: number;
  failedAttemptsInStage: Record<string, number>;
  lastInteractionAt: number;
}

export interface AppState {
  user: UserSession | null;
  progress: Record<string, StageProgress>; // key: `${materiId}-${stage}`
  answers: Record<string, unknown>;
  attempts: Record<string, number>;
  telemetry: TelemetryState;
  posttestLockedByGuru: boolean;
  demoMode: boolean;
  setUser: (user: UserSession | null) => void;
  setKelompok: (kelompok: string) => void;
  setProgress: (materiId: number, stage: string, status: StageProgress) => void;
  setAnswer: (key: string, value: unknown) => void;
  incrementAttempt: (key: string) => void;
  enterStage: (stage: string) => void;
  recordVideoReplay: () => void;
  recordStageFailure: (stage: string) => void;
  touchInteraction: () => void;
  syncTelemetryNow: () => void;
  setPosttestLockedByGuru: (locked: boolean) => void;
  setDemoMode: (val: boolean) => void;
  reset: () => void;
}

const createInitialTelemetry = (): TelemetryState => ({
  currentStage: 'beranda',
  stageEnteredAt: Date.now(),
  stageDurationsMs: {},
  videoReplayCount: 0,
  failedAttemptsInStage: {},
  lastInteractionAt: Date.now(),
});

const initialState = {
  user: null as UserSession | null,
  progress: { '1-video': 'active' } as Record<string, StageProgress>,
  answers: {} as Record<string, unknown>,
  attempts: {} as Record<string, number>,
  telemetry: createInitialTelemetry(),
  posttestLockedByGuru: getLocalPosttestLock(),
  demoMode: false,
};

function pushTelemetry(state: {
  user: UserSession | null;
  progress: Record<string, StageProgress>;
  answers: Record<string, unknown>;
  telemetry: TelemetryState;
}) {
  if (!state.user || state.user.peran !== 'siswa') return;
  const now = Date.now();
  const stage = state.telemetry.currentStage || 'beranda';
  const prevStored = state.telemetry.stageDurationsMs[stage] ?? 0;
  const elapsed = Math.max(0, now - state.telemetry.stageEnteredAt);
  const scores = calculateFeatureScores(state.answers, state.progress);
  const simPair = state.answers['1-simulasi'] as
    | { programmerName?: string; komputerName?: string }
    | undefined;

  void sendMonitoringHeartbeat({
    studentId: state.user.id,
    studentName: state.user.nama,
    nisn: state.user.id,
    kelas: state.user.kelas || 'X MIPA 1',
    groupId: state.user.kelompok || 'Kelompok 1',
    currentStage: stage,
    stageEnteredAt: state.telemetry.stageEnteredAt,
    stageDurationsMs: {
      ...state.telemetry.stageDurationsMs,
      [stage]: Math.max(prevStored, elapsed),
    },
    videoReplayCount: state.telemetry.videoReplayCount,
    failedAttemptsInStage: state.telemetry.failedAttemptsInStage,
    lastInteractionAt: state.telemetry.lastInteractionAt,
    progress: state.progress,
    scores: { ...scores },
    kinestheticPair:
      simPair?.programmerName && simPair?.komputerName
        ? {
            programmerName: simPair.programmerName,
            komputerName: simPair.komputerName,
          }
        : undefined,
  });
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      ...initialState,
      setUser: (user) => {
        if (user && user.peran === 'siswa') {
          const normalizedUser: UserSession = {
            ...user,
            kelompok: user.kelompok || 'Kelompok 1',
          };
          const existing =
            getStudentRecord(normalizedUser.id) || getStudentRecord(normalizedUser.nama);
          if (existing && existing.progress && Object.keys(existing.progress).length > 0) {
            const nextProgress = { ...get().progress, ...existing.progress };
            const nextAnswers = { ...get().answers, ...existing.answers };
            const nextAttempts = { ...get().attempts, ...existing.attempts };
            const nextTelemetry = createInitialTelemetry();
            set({
              user: { ...normalizedUser, kelompok: normalizedUser.kelompok || existing.kelompok || 'Kelompok 1' },
              progress: nextProgress,
              answers: nextAnswers,
              attempts: nextAttempts,
              telemetry: nextTelemetry,
            });
            pushTelemetry({
              user: normalizedUser,
              progress: nextProgress,
              answers: nextAnswers,
              telemetry: nextTelemetry,
            });
            return;
          }
          const nextTelemetry = createInitialTelemetry();
          set({ user: normalizedUser, telemetry: nextTelemetry });
          pushTelemetry({
            user: normalizedUser,
            progress: get().progress,
            answers: get().answers,
            telemetry: nextTelemetry,
          });
          return;
        }
        set({ user });
      },
      setKelompok: (kelompok) => {
        set((s) => {
          if (!s.user) return {};
          const nextUser = { ...s.user, kelompok };
          if (nextUser.peran === 'siswa') {
            syncActiveUserProgress(nextUser, s.progress, s.answers, s.attempts);
            pushTelemetry({
              user: nextUser,
              progress: s.progress,
              answers: s.answers,
              telemetry: s.telemetry,
            });
          }
          return { user: nextUser };
        });
      },
      setProgress: (materiId, stage, status) => {
        set((s) => {
          const nextProgress = { ...s.progress, [`${materiId}-${stage}`]: status };
          const nextTelemetry = { ...s.telemetry, lastInteractionAt: Date.now() };
          if (s.user) {
            syncActiveUserProgress(s.user, nextProgress, s.answers, s.attempts);
            pushTelemetry({
              user: s.user,
              progress: nextProgress,
              answers: s.answers,
              telemetry: nextTelemetry,
            });
          }
          return { progress: nextProgress, telemetry: nextTelemetry };
        });
      },
      setAnswer: (key, value) => {
        set((s) => {
          const nextAnswers = { ...s.answers, [key]: value };
          const nextTelemetry = { ...s.telemetry, lastInteractionAt: Date.now() };
          if (s.user) {
            syncActiveUserProgress(s.user, s.progress, nextAnswers, s.attempts);
            pushTelemetry({
              user: s.user,
              progress: s.progress,
              answers: nextAnswers,
              telemetry: nextTelemetry,
            });
          }
          return { answers: nextAnswers, telemetry: nextTelemetry };
        });
      },
      incrementAttempt: (key) => {
        set((s) => {
          const nextAttempts = { ...s.attempts, [key]: (s.attempts[key] ?? 0) + 1 };
          const nextTelemetry = { ...s.telemetry, lastInteractionAt: Date.now() };
          if (s.user) {
            syncActiveUserProgress(s.user, s.progress, s.answers, nextAttempts);
          }
          return { attempts: nextAttempts, telemetry: nextTelemetry };
        });
      },
      enterStage: (stage) => {
        set((s) => {
          const now = Date.now();
          const prevStage = s.telemetry.currentStage;
          const prevDuration = s.telemetry.stageDurationsMs[prevStage] ?? 0;
          const elapsedInPrev =
            prevStage && s.telemetry.stageEnteredAt > 0
              ? Math.max(0, now - s.telemetry.stageEnteredAt)
              : 0;
          const updatedDurations = {
            ...s.telemetry.stageDurationsMs,
            ...(prevStage && prevStage !== stage
              ? { [prevStage]: prevDuration + elapsedInPrev }
              : {}),
          };
          const nextTelemetry: TelemetryState = {
            ...s.telemetry,
            currentStage: stage,
            stageEnteredAt: prevStage === stage ? s.telemetry.stageEnteredAt : now,
            stageDurationsMs: updatedDurations,
            lastInteractionAt: now,
          };
          pushTelemetry({
            user: s.user,
            progress: s.progress,
            answers: s.answers,
            telemetry: nextTelemetry,
          });
          return { telemetry: nextTelemetry };
        });
      },
      recordVideoReplay: () => {
        set((s) => {
          const nextTelemetry: TelemetryState = {
            ...s.telemetry,
            videoReplayCount: s.telemetry.videoReplayCount + 1,
            lastInteractionAt: Date.now(),
          };
          pushTelemetry({
            user: s.user,
            progress: s.progress,
            answers: s.answers,
            telemetry: nextTelemetry,
          });
          return { telemetry: nextTelemetry };
        });
      },
      recordStageFailure: (stage) => {
        set((s) => {
          const nextTelemetry: TelemetryState = {
            ...s.telemetry,
            failedAttemptsInStage: {
              ...s.telemetry.failedAttemptsInStage,
              [stage]: (s.telemetry.failedAttemptsInStage[stage] ?? 0) + 1,
            },
            lastInteractionAt: Date.now(),
          };
          pushTelemetry({
            user: s.user,
            progress: s.progress,
            answers: s.answers,
            telemetry: nextTelemetry,
          });
          return { telemetry: nextTelemetry };
        });
      },
      touchInteraction: () => {
        set((s) => ({
          telemetry: { ...s.telemetry, lastInteractionAt: Date.now() },
        }));
      },
      syncTelemetryNow: () => {
        const s = get();
        pushTelemetry({
          user: s.user,
          progress: s.progress,
          answers: s.answers,
          telemetry: s.telemetry,
        });
      },
      setPosttestLockedByGuru: (locked) => set({ posttestLockedByGuru: locked }),
      setDemoMode: (val) => set({ demoMode: val }),
      reset: () => {
        const currentUser = get().user;
        if (currentUser) {
          syncActiveUserProgress(currentUser, get().progress, get().answers, get().attempts);
        }
        set({
          ...initialState,
          telemetry: createInitialTelemetry(),
        });
      },
    }),
    { name: 'stepverse-store' }
  )
);
