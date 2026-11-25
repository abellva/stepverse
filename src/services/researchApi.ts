// Client API service for real-time classroom monitoring, group chat logs, and Post-test lock
// Persists to Express backend (/api/*) with safe localStorage fallback for offline/tests

export interface ChatMessageRecord {
  id: string;
  timestamp: string;
  groupId: string;
  senderId: string;
  senderName: string;
  senderRole: 'siswa' | 'guru';
  stage: string;
  message: string;
}

export interface MonitoringEntry {
  studentId: string;
  studentName: string;
  nisn: string;
  kelas: string;
  groupId: string;
  currentStage: string;
  stageEnteredAt: number;
  stageDurationsMs: Record<string, number>;
  videoReplayCount: number;
  failedAttemptsInStage: Record<string, number>;
  lastInteractionAt: number;
  progress: Record<string, string>;
  scores: Record<string, number | undefined>;
  kinestheticPair?: {
    programmerName: string;
    komputerName: string;
  };
  acknowledgedStuckAt?: number;
}

export interface MonitoringSnapshot {
  monitoring: MonitoringEntry[];
  chatMessages: ChatMessageRecord[];
  posttestLockedByGuru: boolean;
  serverNow: number;
}

const CHAT_STORAGE_KEY = 'stepverse-chat-logs';
const TELEMETRY_STORAGE_KEY = 'stepverse-telemetry-local';
const POSTTEST_LOCK_STORAGE_KEY = 'stepverse-posttest-lock';

function canUseStorage(): boolean {
  return typeof localStorage !== 'undefined';
}

export function getLocalChatMessages(): ChatMessageRecord[] {
  if (!canUseStorage()) return [];
  try {
    const raw = localStorage.getItem(CHAT_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveLocalChatMessages(messages: ChatMessageRecord[]) {
  if (!canUseStorage()) return;
  try {
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages));
  } catch {
    // ignore storage quota errors
  }
}

export function getLocalMonitoringMap(): Record<string, MonitoringEntry> {
  if (!canUseStorage()) return {};
  try {
    const raw = localStorage.getItem(TELEMETRY_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function saveLocalMonitoringEntry(entry: MonitoringEntry) {
  if (!canUseStorage()) return;
  try {
    const map = getLocalMonitoringMap();
    map[entry.studentId] = entry;
    localStorage.setItem(TELEMETRY_STORAGE_KEY, JSON.stringify(map));
  } catch {
    // ignore
  }
}

export async function fetchGroupChat(groupId: string): Promise<ChatMessageRecord[]> {
  try {
    const res = await fetch(`/api/chat?groupId=${encodeURIComponent(groupId)}`);
    if (res.ok) {
      const data = (await res.json()) as { messages?: ChatMessageRecord[] };
      if (Array.isArray(data.messages)) {
        if (groupId === 'all') {
          saveLocalChatMessages(data.messages);
        }
        return data.messages;
      }
    }
  } catch {
    // Fallback to localStorage
  }
  const local = getLocalChatMessages();
  return groupId === 'all' ? local : local.filter((m) => m.groupId === groupId);
}

export async function sendChatMessage(input: {
  groupId: string;
  senderId: string;
  senderName: string;
  senderRole: 'siswa' | 'guru';
  stage: string;
  message: string;
}): Promise<ChatMessageRecord> {
  const optimistic: ChatMessageRecord = {
    id: `chat-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp: new Date().toISOString(),
    ...input,
    message: input.message.trim(),
  };

  // Save locally first so chat works even offline
  const existing = getLocalChatMessages();
  saveLocalChatMessages([...existing, optimistic]);

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(optimistic),
    });
    if (res.ok) {
      const data = (await res.json()) as { message?: ChatMessageRecord };
      if (data.message) return data.message;
    }
  } catch {
    // Keep optimistic local record
  }
  return optimistic;
}

export async function sendMonitoringHeartbeat(entry: MonitoringEntry): Promise<void> {
  saveLocalMonitoringEntry(entry);
  if (typeof fetch === 'undefined') return;
  try {
    await fetch('/api/monitoring/heartbeat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry),
    });
  } catch {
    // Ignore network failures in offline/test environments
  }
}

export async function fetchMonitoringSnapshot(): Promise<MonitoringSnapshot> {
  try {
    const res = await fetch('/api/monitoring');
    if (res.ok) {
      const data = (await res.json()) as MonitoringSnapshot;
      if (Array.isArray(data.monitoring)) {
        return data;
      }
    }
  } catch {
    // Fallback to local snapshot
  }

  return {
    monitoring: Object.values(getLocalMonitoringMap()),
    chatMessages: getLocalChatMessages(),
    posttestLockedByGuru: getLocalPosttestLock(),
    serverNow: Date.now(),
  };
}

export async function acknowledgeStuckAlert(studentId: string): Promise<void> {
  const map = getLocalMonitoringMap();
  if (map[studentId]) {
    map[studentId].acknowledgedStuckAt = Date.now();
    saveLocalMonitoringEntry(map[studentId]);
  }
  try {
    await fetch('/api/monitoring/acknowledge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId }),
    });
  } catch {
    // ignore
  }
}

export function getLocalPosttestLock(): boolean {
  if (!canUseStorage()) return false;
  return localStorage.getItem(POSTTEST_LOCK_STORAGE_KEY) === 'true';
}

export async function fetchPosttestLockState(): Promise<boolean> {
  try {
    const res = await fetch('/api/assessment/lock');
    if (res.ok) {
      const data = (await res.json()) as { posttestLockedByGuru?: boolean };
      const locked = Boolean(data.posttestLockedByGuru);
      if (canUseStorage()) {
        localStorage.setItem(POSTTEST_LOCK_STORAGE_KEY, String(locked));
      }
      return locked;
    }
  } catch {
    // fallback
  }
  return getLocalPosttestLock();
}

export async function setPosttestLockState(locked: boolean): Promise<boolean> {
  if (canUseStorage()) {
    localStorage.setItem(POSTTEST_LOCK_STORAGE_KEY, String(locked));
  }
  try {
    const res = await fetch('/api/assessment/lock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ locked }),
    });
    if (res.ok) {
      const data = (await res.json()) as { posttestLockedByGuru?: boolean };
      return Boolean(data.posttestLockedByGuru);
    }
  } catch {
    // fallback
  }
  return locked;
}

export async function syncLogToServer(record: Record<string, unknown>): Promise<void> {
  if (typeof fetch === 'undefined') return;
  try {
    await fetch('/api/logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record),
    });
  } catch {
    // Offline/test safe
  }
}
