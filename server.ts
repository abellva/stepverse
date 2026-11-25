import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import express from 'express';

const PORT = 3000;
const HOST = '0.0.0.0';
const DATA_DIR = path.resolve(import.meta.dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'stepverse-research-db.json');

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

export interface ResearchLogEntry {
  id: string;
  timestamp: string;
  studentId: string;
  studentName?: string;
  groupId?: string;
  materi: number;
  stage: string;
  componentId: string;
  ctComponent: string;
  result: string;
  attemptNo: number;
  payload: Record<string, unknown>;
}

interface DatabaseSchema {
  chatMessages: ChatMessageRecord[];
  monitoring: Record<string, MonitoringEntry>;
  researchLogs: ResearchLogEntry[];
  posttestLockedByGuru: boolean;
}

function createInitialSeed(): DatabaseSchema {
  const now = Date.now();
  return {
    posttestLockedByGuru: false,
    chatMessages: [
      {
        id: 'chat-seed-1',
        timestamp: new Date(now - 9 * 60 * 1000).toISOString(),
        groupId: 'Kelompok 1',
        senderId: 'siswa-001',
        senderName: 'Budi Santoso',
        senderRole: 'siswa',
        stage: 'ipo',
        message: 'Teman-teman, harga_satuan dan jumlah itu masuk Input karena harus dimasukkan kasir dulu kan?',
      },
      {
        id: 'chat-seed-2',
        timestamp: new Date(now - 8 * 60 * 1000).toISOString(),
        groupId: 'Kelompok 1',
        senderId: 'siswa-002',
        senderName: 'Siti Rahayu',
        senderRole: 'siswa',
        stage: 'ipo',
        message: 'Setuju! Lalu total = harga_satuan * jumlah masuk ke Proses karena dihitung komputer.',
      },
      {
        id: 'chat-seed-3',
        timestamp: new Date(now - 5 * 60 * 1000).toISOString(),
        groupId: 'Kelompok 3',
        senderId: 'siswa-003',
        senderName: 'Ahmad Fauzi',
        senderRole: 'siswa',
        stage: 'lab',
        message: 'Kami masih bingung kenapa total di Lab Python tidak berubah saat harga diubah, error terus di baris 12.',
      },
    ],
    monitoring: {
      'siswa-001': {
        studentId: 'siswa-001',
        studentName: 'Budi Santoso',
        nisn: '0071234567',
        kelas: 'X MIPA 1',
        groupId: 'Kelompok 1',
        currentStage: 'lab',
        stageEnteredAt: now - 4 * 60 * 1000,
        stageDurationsMs: {
          video: 260000,
          ipo: 210000,
          dekomposisi: 190000,
          parsons: 240000,
          lab: 240000,
        },
        videoReplayCount: 1,
        failedAttemptsInStage: { lab: 1 },
        lastInteractionAt: now - 45 * 1000,
        progress: {
          '1-video': 'done',
          '1-simulasi': 'done',
          '1-ipo': 'done',
          '1-dekomposisi': 'done',
          '1-parsons': 'done',
          '1-lab': 'done',
        },
        scores: { pretest: 80, ipo: 100, dekomposisi: 100, parsons: 100, lab: 100, posttest: 100 },
        kinestheticPair: { programmerName: 'Budi Santoso', komputerName: 'Siti Rahayu' },
      },
      'siswa-002': {
        studentId: 'siswa-002',
        studentName: 'Siti Rahayu',
        nisn: '0071234568',
        kelas: 'X MIPA 1',
        groupId: 'Kelompok 2',
        currentStage: 'parsons',
        stageEnteredAt: now - 7 * 60 * 1000,
        stageDurationsMs: {
          video: 310000,
          ipo: 250000,
          dekomposisi: 290000,
          parsons: 420000,
        },
        videoReplayCount: 3,
        failedAttemptsInStage: { parsons: 3 },
        lastInteractionAt: now - 90 * 1000,
        progress: {
          '1-video': 'done',
          '1-simulasi': 'done',
          '1-ipo': 'done',
          '1-dekomposisi': 'done',
          '1-parsons': 'active',
        },
        scores: { pretest: 60, ipo: 100, dekomposisi: 100 },
        kinestheticPair: { programmerName: 'Siti Rahayu', komputerName: 'Rina Putri' },
      },
      'siswa-003': {
        studentId: 'siswa-003',
        studentName: 'Ahmad Fauzi',
        nisn: '0071234569',
        kelas: 'X MIPA 1',
        groupId: 'Kelompok 3',
        currentStage: 'lab',
        stageEnteredAt: now - 12 * 60 * 1000,
        stageDurationsMs: {
          video: 380000,
          ipo: 300000,
          dekomposisi: 340000,
          parsons: 410000,
          lab: 720000,
        },
        videoReplayCount: 4,
        failedAttemptsInStage: { lab: 5 },
        lastInteractionAt: now - 2 * 60 * 1000,
        progress: {
          '1-video': 'done',
          '1-simulasi': 'done',
          '1-ipo': 'done',
          '1-dekomposisi': 'done',
          '1-parsons': 'done',
          '1-lab': 'active',
        },
        scores: { pretest: 40, ipo: 100, dekomposisi: 100, parsons: 100 },
        kinestheticPair: { programmerName: 'Ahmad Fauzi', komputerName: 'Dimas Pratama' },
      },
      'siswa-004': {
        studentId: 'siswa-004',
        studentName: 'Dewi Lestari',
        nisn: '0071234570',
        kelas: 'X MIPA 1',
        groupId: 'Kelompok 4',
        currentStage: 'dekomposisi',
        stageEnteredAt: now - 3 * 60 * 1000,
        stageDurationsMs: {
          video: 220000,
          ipo: 180000,
          dekomposisi: 180000,
        },
        videoReplayCount: 0,
        failedAttemptsInStage: { dekomposisi: 1 },
        lastInteractionAt: now - 25 * 1000,
        progress: {
          '1-video': 'done',
          '1-simulasi': 'done',
          '1-ipo': 'done',
          '1-dekomposisi': 'active',
        },
        scores: { pretest: 100, ipo: 100 },
        kinestheticPair: { programmerName: 'Dewi Lestari', komputerName: 'Bagas Adi' },
      },
      'siswa-005': {
        studentId: 'siswa-005',
        studentName: 'Rizky Pratama',
        nisn: '0071234571',
        kelas: 'X MIPA 1',
        groupId: 'Kelompok 5',
        currentStage: 'video',
        stageEnteredAt: now - 11 * 60 * 1000,
        stageDurationsMs: {
          video: 660000,
        },
        videoReplayCount: 5,
        failedAttemptsInStage: {},
        lastInteractionAt: now - 5 * 60 * 1000,
        progress: {
          '1-video': 'active',
        },
        scores: { pretest: 60 },
      },
    },
    researchLogs: [],
  };
}

function loadDb(): DatabaseSchema {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(DB_FILE)) {
      const seed = createInitialSeed();
      fs.writeFileSync(DB_FILE, JSON.stringify(seed, null, 2), 'utf-8');
      return seed;
    }
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<DatabaseSchema>;
    return {
      chatMessages: Array.isArray(parsed.chatMessages) ? parsed.chatMessages : [],
      monitoring: parsed.monitoring && typeof parsed.monitoring === 'object' ? parsed.monitoring : {},
      researchLogs: Array.isArray(parsed.researchLogs) ? parsed.researchLogs : [],
      posttestLockedByGuru: Boolean(parsed.posttestLockedByGuru),
    };
  } catch (err) {
    console.warn('[Server DB] Fallback to initial seed:', err);
    return createInitialSeed();
  }
}

let db: DatabaseSchema = loadDb();

function saveDb() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[Server DB] Could not persist to disk:', err);
  }
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '2mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, timestamp: new Date().toISOString() });
  });

  // ── Chat Kelompok Endpoints ───────────────────────────────────────────
  app.get('/api/chat', (req, res) => {
    const groupId = typeof req.query.groupId === 'string' ? req.query.groupId : '';
    const messages =
      groupId && groupId !== 'all'
        ? db.chatMessages.filter((m) => m.groupId === groupId)
        : db.chatMessages;
    res.json({ messages });
  });

  app.post('/api/chat', (req, res) => {
    const body = req.body as Partial<ChatMessageRecord>;
    if (!body?.message?.trim() || !body?.groupId) {
      res.status(400).json({ error: 'groupId dan message wajib diisi.' });
      return;
    }
    const record: ChatMessageRecord = {
      id: body.id || `chat-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: body.timestamp || new Date().toISOString(),
      groupId: body.groupId,
      senderId: body.senderId || 'anon',
      senderName: body.senderName || 'Siswa',
      senderRole: body.senderRole === 'guru' ? 'guru' : 'siswa',
      stage: body.stage || 'umum',
      message: body.message.trim(),
    };
    db.chatMessages.push(record);
    if (db.monitoring[record.senderId]) {
      db.monitoring[record.senderId].lastInteractionAt = Date.now();
    }
    saveDb();
    res.status(201).json({ message: record });
  });

  // ── Research Log Endpoints ────────────────────────────────────────────
  app.get('/api/logs', (req, res) => {
    const studentId = typeof req.query.studentId === 'string' ? req.query.studentId : '';
    const groupId = typeof req.query.groupId === 'string' ? req.query.groupId : '';
    let logs = db.researchLogs;
    if (studentId) logs = logs.filter((l) => l.studentId === studentId);
    if (groupId) logs = logs.filter((l) => l.groupId === groupId);
    res.json({ logs });
  });

  app.post('/api/logs', (req, res) => {
    const body = req.body as Partial<ResearchLogEntry>;
    if (!body?.componentId || !body?.stage) {
      res.status(400).json({ error: 'stage dan componentId wajib diisi.' });
      return;
    }
    const entry: ResearchLogEntry = {
      id: body.id || `evt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: body.timestamp || new Date().toISOString(),
      studentId: body.studentId || 'tamu',
      studentName: body.studentName,
      groupId: body.groupId,
      materi: typeof body.materi === 'number' ? body.materi : 1,
      stage: body.stage,
      componentId: body.componentId,
      ctComponent: body.ctComponent || 'abstraction',
      result: body.result || 'info',
      attemptNo: typeof body.attemptNo === 'number' ? body.attemptNo : 1,
      payload: body.payload && typeof body.payload === 'object' ? body.payload : {},
    };
    db.researchLogs.push(entry);
    saveDb();
    res.status(201).json({ log: entry });
  });

  // ── Real-Time Monitoring & Telemetry Endpoints ────────────────────────
  app.get('/api/monitoring', (_req, res) => {
    res.json({
      monitoring: Object.values(db.monitoring),
      chatMessages: db.chatMessages,
      posttestLockedByGuru: db.posttestLockedByGuru,
      serverNow: Date.now(),
    });
  });

  app.post('/api/monitoring/heartbeat', (req, res) => {
    const body = req.body as Partial<MonitoringEntry>;
    if (!body?.studentId) {
      res.status(400).json({ error: 'studentId wajib diisi.' });
      return;
    }
    const existing = db.monitoring[body.studentId];
    const now = Date.now();
    const nextEntry: MonitoringEntry = {
      studentId: body.studentId,
      studentName: body.studentName ?? existing?.studentName ?? 'Siswa',
      nisn: body.nisn ?? existing?.nisn ?? '-',
      kelas: body.kelas ?? existing?.kelas ?? 'X MIPA 1',
      groupId: body.groupId ?? existing?.groupId ?? 'Kelompok 1',
      currentStage: body.currentStage ?? existing?.currentStage ?? 'video',
      stageEnteredAt: body.stageEnteredAt ?? existing?.stageEnteredAt ?? now,
      stageDurationsMs: {
        ...(existing?.stageDurationsMs ?? {}),
        ...(body.stageDurationsMs ?? {}),
      },
      videoReplayCount: Math.max(existing?.videoReplayCount ?? 0, body.videoReplayCount ?? 0),
      failedAttemptsInStage: {
        ...(existing?.failedAttemptsInStage ?? {}),
        ...(body.failedAttemptsInStage ?? {}),
      },
      lastInteractionAt: body.lastInteractionAt ?? now,
      progress: {
        ...(existing?.progress ?? {}),
        ...(body.progress ?? {}),
      },
      scores: {
        ...(existing?.scores ?? {}),
        ...(body.scores ?? {}),
      },
      kinestheticPair: body.kinestheticPair ?? existing?.kinestheticPair,
      acknowledgedStuckAt: existing?.acknowledgedStuckAt,
    };
    db.monitoring[body.studentId] = nextEntry;
    saveDb();
    res.json({ entry: nextEntry });
  });

  app.post('/api/monitoring/acknowledge', (req, res) => {
    const { studentId } = req.body as { studentId?: string };
    if (!studentId || !db.monitoring[studentId]) {
      res.status(404).json({ error: 'Data siswa tidak ditemukan.' });
      return;
    }
    db.monitoring[studentId].acknowledgedStuckAt = Date.now();
    saveDb();
    res.json({ ok: true, acknowledgedStuckAt: db.monitoring[studentId].acknowledgedStuckAt });
  });

  // ── Post-test Lock Endpoints ──────────────────────────────────────────
  app.get('/api/assessment/lock', (_req, res) => {
    res.json({ posttestLockedByGuru: db.posttestLockedByGuru });
  });

  app.post('/api/assessment/lock', (req, res) => {
    const { locked } = req.body as { locked?: boolean };
    db.posttestLockedByGuru = Boolean(locked);
    saveDb();
    res.json({ posttestLockedByGuru: db.posttestLockedByGuru });
  });

  // ── Research Export Endpoint ──────────────────────────────────────────
  app.get('/api/export/research', (_req, res) => {
    res.json({
      exportedAt: new Date().toISOString(),
      posttestLockedByGuru: db.posttestLockedByGuru,
      chatMessages: db.chatMessages,
      monitoring: Object.values(db.monitoring),
      researchLogs: db.researchLogs,
    });
  });

  // ── Downloadable Full Project Zip Endpoint ────────────────────────────
  app.get('/api/export/project-zip', (_req, res) => {
    const zipPath = '/tmp/stepverse-project.zip';
    const rootDir = import.meta.dirname;
    try {
      const pyScript = [
        'import os, sys, zipfile',
        "root_dir = sys.argv[1]",
        "out_path = sys.argv[2]",
        "exclude = {'node_modules', 'dist', '.figma', '.git'}",
        'with zipfile.ZipFile(out_path, "w", zipfile.ZIP_DEFLATED) as zf:',
        '    for r, dirs, files in os.walk(root_dir):',
        '        dirs[:] = [d for d in dirs if d not in exclude]',
        '        for fn in files:',
        '            full = os.path.join(r, fn)',
        '            rel = os.path.relpath(full, root_dir)',
        '            zf.write(full, rel)',
      ].join('\n');
      execFileSync('python3', ['-c', pyScript, rootDir, zipPath], { timeout: 20000 });
      res.download(zipPath, 'stepverse-updated.zip');
    } catch (err) {
      if (fs.existsSync(zipPath)) {
        res.download(zipPath, 'stepverse-updated.zip');
        return;
      }
      res.status(500).json({
        error: 'Gagal membuat arsip zip proyek.',
        detail: err instanceof Error ? err.message : String(err),
      });
    }
  });

  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(import.meta.dirname, 'dist');
    app.use(express.static(distDir));
    app.get('/{*splat}', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, HOST, () => {
    console.log(`StepVerse server ready:`);
    console.log(`  > Local:   http://localhost:${PORT}`);
    console.log(`  > Network: http://${HOST}:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start StepVerse server:', err);
  process.exit(1);
});
