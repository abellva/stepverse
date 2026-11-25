import { syncLogToServer } from './researchApi';

// Event Logging System for StepVerse
// Stores {timestamp, studentId, materi, stage, componentId, ctComponent, result, attemptNo, payload}
// Persists in localStorage and syncs to server DB for research analysis

export type CtComponent =
  | 'decomposition'
  | 'abstraction'
  | 'algorithm_design'
  | 'debugging'
  | 'iteration'
  | 'generalization';

export type EventResult = 'pass' | 'fail' | 'in_progress' | 'info';

export interface LogEventRecord {
  id: string;
  timestamp: string; // ISO 8601
  studentId: string;
  studentName?: string;
  groupId?: string;
  materi: number;
  stage: string;
  componentId: string;
  ctComponent: CtComponent;
  result: EventResult;
  attemptNo: number;
  payload: Record<string, unknown>;
}

export interface ILogRepository {
  save(event: LogEventRecord): Promise<void>;
  getAll(): Promise<LogEventRecord[]>;
  getByStudent(studentId: string): Promise<LogEventRecord[]>;
  clear(): Promise<void>;
}

const STORAGE_KEY = 'stepverse-event-logs';

export class LocalStorageLogRepository implements ILogRepository {
  async save(event: LogEventRecord): Promise<void> {
    try {
      const existing = await this.getAll();
      existing.push(event);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
    } catch (e) {
      console.warn('[Logger] Failed to save event to localStorage', e);
    }
  }

  async getAll(): Promise<LogEventRecord[]> {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      return JSON.parse(raw) as LogEventRecord[];
    } catch {
      return [];
    }
  }

  async getByStudent(studentId: string): Promise<LogEventRecord[]> {
    const all = await this.getAll();
    return all.filter((e) => e.studentId === studentId);
  }

  async clear(): Promise<void> {
    localStorage.removeItem(STORAGE_KEY);
  }
}

// Default singleton repository
export const defaultLogRepository: ILogRepository = new LocalStorageLogRepository();

const attemptCounters: Record<string, number> = {};

/** Helper to log an event with active user session */
export function logEvent(params: {
  materi?: number;
  stage: string;
  componentId: string;
  ctComponent: CtComponent;
  result: EventResult;
  payload?: Record<string, unknown>;
  attemptNo?: number;
}): void {
  try {
    let studentId = 'tamu';
    let studentName: string | undefined;
    let groupId: string | undefined;

    if (typeof localStorage !== 'undefined') {
      const storeRaw = localStorage.getItem('stepverse-store');
      if (storeRaw) {
        const parsed = JSON.parse(storeRaw);
        if (parsed?.state?.user?.id) {
          studentId = parsed.state.user.id;
          studentName = parsed.state.user.nama;
          groupId = parsed.state.user.kelompok;
        }
      }
    }

    const materi = params.materi ?? 1;
    const counterKey = `${studentId}-${materi}-${params.stage}-${params.componentId}`;
    const calculatedAttempt =
      params.attemptNo ?? (attemptCounters[counterKey] = (attemptCounters[counterKey] || 0) + 1);

    const record: LogEventRecord = {
      id: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      studentId,
      studentName,
      groupId,
      materi,
      stage: params.stage,
      componentId: params.componentId,
      ctComponent: params.ctComponent,
      result: params.result,
      attemptNo: calculatedAttempt,
      payload: params.payload ?? {},
    };

    void defaultLogRepository.save(record);
    void syncLogToServer(record as unknown as Record<string, unknown>);
  } catch (err) {
    console.warn('[Logger] Error creating log event', err);
  }
}

