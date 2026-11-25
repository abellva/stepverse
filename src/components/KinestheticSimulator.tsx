import { useState, useEffect, useRef, useCallback } from 'react';
import { Card } from './ui/Card';
import { useAppStore } from '../store/useAppStore';
import { logEvent } from '../services/logger';

const TIMER_SECONDS = 5 * 60; // 5 menit

const CHECKLIST_ITEMS = [
  { id: 'c1', role: 'Programmer', text: 'Programmer merumuskan nama variabel kasir dan jenis tipe data (String, Integer)' },
  { id: 'c2', role: 'Programmer', text: 'Programmer memberikan kartu instruksi secara lisan/tertulis ke rekan Komputer' },
  { id: 'c3', role: 'Komputer',   text: 'Komputer menerima instruksi dan menyimpan data ke wadah memori persis tanpa asumsi' },
  { id: 'c4', role: 'Komputer',   text: 'Komputer menghitung perkalian harga × jumlah secara manual dan mencetak total belanja' },
  { id: 'c5', role: 'Bersama',    text: 'Kedua siswa berdiri/bergerak melakukan peragaan fisik dan merekam foto bukti aktivitas' },
];

interface SimulasiSavedState {
  role1Done: boolean;
  role2Done: boolean;
  programmerName?: string;
  komputerName?: string;
  groupId?: string;
  photoProof?: string;
  programmerInstruction?: {
    variabelNama: string;
    variabelHarga: string;
    variabelJumlah: string;
    rumusTotal: string;
  };
  komputerMemory?: {
    kotakNama: string;
    kotakHarga: string;
    kotakJumlah: string;
    kotakTotal: string;
    reportedAmbiguity?: boolean;
  };
}

function formatTime(secs: number) {
  const m = Math.floor(secs / 60).toString().padStart(2, '0');
  const s = (secs % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

interface KinestheticSimulatorProps {
  materiId: number;
  onComplete?: () => void;
  isEmbedded?: boolean;
}

export function KinestheticSimulator({
  materiId,
  onComplete,
  isEmbedded = false,
}: KinestheticSimulatorProps) {
  const { setProgress, setAnswer, answers, demoMode, progress, user, syncTelemetryNow } =
    useAppStore();

  const savedState = answers[`${materiId}-simulasi`] as SimulasiSavedState | undefined;

  const [programmerName, setProgrammerName] = useState(
    savedState?.programmerName ?? user?.nama ?? ''
  );
  const [komputerName, setKomputerName] = useState(savedState?.komputerName ?? '');
  const [nameError, setNameError] = useState('');

  const [phase, setPhase] = useState<'intro' | 'active' | 'done'>(
    savedState?.role1Done ? 'done' : 'intro'
  );

  const [timeLeft, setTimeLeft] = useState(TIMER_SECONDS);
  const [running, setRunning] = useState(false);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Active step in Tektokan (1-4)
  const [activeStep, setActiveStep] = useState<number>(1);

  // Kamera Bukti Aktivitas Fisik
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [photoProof, setPhotoProof] = useState<string | null>(savedState?.photoProof ?? null);

  // Form Programmer
  const [progInst, setProgInst] = useState(
    savedState?.programmerInstruction ?? {
      variabelNama: '',
      variabelHarga: '',
      variabelJumlah: '',
      rumusTotal: '',
    }
  );

  // Form Komputer
  const [kompMem, setKompMem] = useState(
    savedState?.komputerMemory ?? {
      kotakNama: '',
      kotakHarga: '',
      kotakJumlah: '',
      kotakTotal: '',
      reportedAmbiguity: false,
    }
  );
  const [ambiguityAlert, setAmbiguityAlert] = useState(false);

  // Attach video stream to videoRef when cameraActive becomes true
  useEffect(() => {
    if (cameraActive && streamRef.current && videoRef.current) {
      if (videoRef.current.srcObject !== streamRef.current) {
        videoRef.current.srcObject = streamRef.current;
        videoRef.current.play().catch(() => {});
      }
    }
  }, [cameraActive]);

  // Validasi Langkah 1: Variabel Nama Barang (String)
  function checkStep1() {
    const p = progInst.variabelNama.trim();
    const k = kompMem.kotakNama.trim();
    if (!p) return { valid: false, pErr: 'Instruksi nama barang wajib diisi.', kErr: '', okNote: '' };
    const m = p.match(/^([a-zA-Z_]\w*)\s*=\s*(.+)$/);
    if (!m) {
      if (!p.includes('=')) return { valid: false, pErr: 'Gunakan operator sama dengan (=), contoh: variabel = "nilai"', kErr: '', okNote: '' };
      return { valid: false, pErr: 'Nama variabel tidak boleh ada spasi atau diawali angka.', kErr: '', okNote: '' };
    }
    const right = m[2].trim().replace(/;\s*$/, '');
    const isQuoted = (right.startsWith('"') && right.endsWith('"') && right.length >= 2) ||
                     (right.startsWith("'") && right.endsWith("'") && right.length >= 2);
    if (!isQuoted) {
      return { valid: false, pErr: `Tipe data teks (String) wajib diapit tanda petik, contoh: ${m[1]} = "${right}"`, kErr: '', okNote: '' };
    }
    const strVal = right.slice(1, -1).trim();
    if (!strVal) return { valid: false, pErr: 'Teks nama barang di dalam tanda petik tidak boleh kosong.', kErr: '', okNote: '' };
    if (!k) return { valid: false, pErr: '', kErr: 'Kotak memori komputer masih kosong. Catat nama barang dari Programmer.', okNote: '' };
    const cleanK = k.replace(/['"]/g, '').trim().toLowerCase();
    if (cleanK !== strVal.toLowerCase()) {
      return { valid: false, pErr: '', kErr: `Kotak memori komputer harus mencatat "${strVal}" persis tanpa asumsi.`, okNote: '' };
    }
    return { valid: true, pErr: '', kErr: '', okNote: `✓ Variabel '${m[1]}' bertipe String ("${strVal}") tersimpan tepat!` };
  }

  // Validasi Langkah 2: Variabel Harga Satuan (Integer)
  function checkStep2() {
    const p = progInst.variabelHarga.trim();
    const k = kompMem.kotakHarga.trim();
    if (!p) return { valid: false, pErr: 'Instruksi harga satuan wajib diisi.', kErr: '', okNote: '' };
    const m = p.match(/^([a-zA-Z_]\w*)\s*=\s*(.+)$/);
    if (!m) {
      if (!p.includes('=')) return { valid: false, pErr: 'Gunakan operator penugasan sama dengan (=).', kErr: '', okNote: '' };
      return { valid: false, pErr: 'Format penulisan nama variabel tidak valid.', kErr: '', okNote: '' };
    }
    const right = m[2].trim().replace(/;\s*$/, '');
    if (right.startsWith('"') || right.startsWith("'")) {
      return { valid: false, pErr: 'Harga satuan bertipe Integer (angka), jangan diapit tanda petik!', kErr: '', okNote: '' };
    }
    if (/[a-zA-Z]/.test(right)) {
      return { valid: false, pErr: 'Harga harus berupa angka murni tanpa huruf atau teks "Rp".', kErr: '', okNote: '' };
    }
    const num = parseInt(right, 10);
    if (isNaN(num) || num <= 0) {
      return { valid: false, pErr: 'Harga satuan harus bilangan bulat positif lebih dari 0.', kErr: '', okNote: '' };
    }
    if (!k) return { valid: false, pErr: '', kErr: 'Kotak memori harga satuan pada komputer masih kosong.', okNote: '' };
    if (k.startsWith('"') || k.startsWith("'")) {
      return { valid: false, pErr: '', kErr: 'Jangan gunakan tanda petik pada kotak memori angka Integer.', okNote: '' };
    }
    const kNum = parseInt(k.replace(/\D/g, ''), 10);
    if (isNaN(kNum) || kNum !== num) {
      return { valid: false, pErr: '', kErr: `Kotak memori komputer harus mencatat angka ${num} sesuai Programmer.`, okNote: '' };
    }
    return { valid: true, pErr: '', kErr: '', okNote: `✓ Variabel '${m[1]}' bertipe Integer (${num}) tersimpan tepat!` };
  }

  // Validasi Langkah 3: Variabel Jumlah / Porsi (Integer)
  function checkStep3() {
    const p = progInst.variabelJumlah.trim();
    const k = kompMem.kotakJumlah.trim();
    if (!p) return { valid: false, pErr: 'Instruksi jumlah beli wajib diisi.', kErr: '', okNote: '' };
    const m = p.match(/^([a-zA-Z_]\w*)\s*=\s*(.+)$/);
    if (!m) {
      if (!p.includes('=')) return { valid: false, pErr: 'Gunakan operator penugasan sama dengan (=).', kErr: '', okNote: '' };
      return { valid: false, pErr: 'Format penulisan nama variabel tidak valid.', kErr: '', okNote: '' };
    }
    const right = m[2].trim().replace(/;\s*$/, '');
    if (right.startsWith('"') || right.startsWith("'")) {
      return { valid: false, pErr: 'Jumlah porsi bertipe Integer (angka), jangan gunakan tanda petik!', kErr: '', okNote: '' };
    }
    const num = parseInt(right, 10);
    if (isNaN(num) || num <= 0) {
      return { valid: false, pErr: 'Jumlah beli harus angka bulat positif minimal 1.', kErr: '', okNote: '' };
    }
    if (!k) return { valid: false, pErr: '', kErr: 'Kotak memori jumlah pada komputer masih kosong.', okNote: '' };
    const kNum = parseInt(k.replace(/\D/g, ''), 10);
    if (isNaN(kNum) || kNum !== num) {
      return { valid: false, pErr: '', kErr: `Kotak memori komputer harus mencatat angka ${num} sesuai Programmer.`, okNote: '' };
    }
    return { valid: true, pErr: '', kErr: '', okNote: `✓ Variabel '${m[1]}' bertipe Integer (${num}) tersimpan tepat!` };
  }

  // Validasi Langkah 4: Rumus Perkalian & Hitung Komputer
  function checkStep4() {
    const p = progInst.rumusTotal.trim();
    const k = kompMem.kotakTotal.trim();
    if (!p) return { valid: false, pErr: 'Rumus perhitungan total belanja wajib diisi.', kErr: '', okNote: '' };
    const m = p.match(/^([a-zA-Z_]\w*)\s*=\s*(.+)$/);
    if (!m) {
      if (!p.includes('=')) return { valid: false, pErr: 'Gunakan operator penugasan sama dengan (=).', kErr: '', okNote: '' };
      return { valid: false, pErr: 'Format penulisan rumus total tidak valid.', kErr: '', okNote: '' };
    }
    const expr = m[2].trim().replace(/;\s*$/, '');
    if (expr.includes('+')) {
      return { valid: false, pErr: 'Gunakan operator perkalian (*) untuk menghitung total, bukan penjumlahan (+).', kErr: '', okNote: '' };
    }
    if (/^\d+$/.test(expr)) {
      return { valid: false, pErr: 'Rumus total harus berupa perkalian antar-variabel, bukan angka konstan langsung!', kErr: '', okNote: '' };
    }
    if (!expr.includes('*')) {
      return { valid: false, pErr: 'Gunakan operator tanda bintang (*) untuk perkalian variabel.', kErr: '', okNote: '' };
    }

    const hargaMatch = progInst.variabelHarga.match(/=\s*(\d+)/);
    const jumlahMatch = progInst.variabelJumlah.match(/=\s*(\d+)/);
    const hVal = hargaMatch ? parseInt(hargaMatch[1], 10) : 0;
    const jVal = jumlahMatch ? parseInt(jumlahMatch[1], 10) : 0;
    const expected = hVal * jVal;

    if (!k) return { valid: false, pErr: '', kErr: 'Kotak memori total belanja pada komputer masih kosong.', okNote: '' };
    const cleanTotal = parseInt(k.replace(/\D/g, ''), 10);
    if (isNaN(cleanTotal) || (expected > 0 && cleanTotal !== expected)) {
      return {
        valid: false,
        pErr: '',
        kErr: `Hasil hitung keliru! Hitung kembali: ${hVal} × ${jVal} = Rp ${expected.toLocaleString('id-ID')}.`,
        okNote: '',
      };
    }
    return { valid: true, pErr: '', kErr: '', okNote: `✓ Rumus dan perhitungan total valid! (${hVal} × ${jVal} = ${expected})` };
  }

  const v1 = checkStep1();
  const v2 = checkStep2();
  const v3 = checkStep3();
  const v4 = checkStep4();

  const allStepsValid = v1.valid && v2.valid && v3.valid && v4.valid;
  const hasProof = Boolean(photoProof);
  const allChecklistDone = CHECKLIST_ITEMS.every((item) => checked[item.id]);

  // Tombol Selesai HANYA aktif jika seluruh form valid, foto bukti ada, dan checklist dicentang!
  const canFinish = allStepsValid && hasProof && allChecklistDone;

  const stopTimer = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setRunning(false);
  }, []);

  // Stop camera helper
  const stopCameraStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  }, []);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((t) => {
          if (t <= 1) {
            stopTimer();
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      stopCameraStream();
    };
  }, [running, stopTimer, stopCameraStream]);

  // Start Camera
  async function handleStartCamera() {
    setCameraError('');
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError('Browser tidak mendukung akses kamera langsung. Silakan gunakan opsi unggah foto.');
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setCameraActive(true);
    } catch (err) {
      setCameraError(
        'Tidak dapat mengakses kamera (izin ditolak atau kamera sedang digunakan aplikasi lain). Anda dapat mengunggah foto sebagai bukti.'
      );
      stopCameraStream();
    }
  }

  // Capture Photo from Camera
  function handleCapturePhoto() {
    if (!videoRef.current) return;
    try {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Cerminkan canvas secara horizontal agar foto bukti sama dengan pratinjau kamera selfie
        ctx.save();
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        ctx.restore();
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setPhotoProof(dataUrl);
        stopCameraStream();
      }
    } catch {
      setCameraError('Gagal mengambil tangkapan layar kamera. Silakan coba lagi.');
    }
  }

  // Handle Upload File Foto Bukti
  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setPhotoProof(reader.result);
      }
    };
    reader.readAsDataURL(file);
  }

  function handleStartSimulation() {
    const pClean = programmerName.trim();
    const kClean = komputerName.trim();
    if (!pClean || !kClean) {
      setNameError('Isi nama kedua siswa (Programmer dan Komputer) terlebih dahulu sebelum memulai.');
      return;
    }
    if (pClean.toLowerCase() === kClean.toLowerCase()) {
      setNameError('Nama siswa Programmer dan Komputer harus berasal dari dua orang yang berbeda.');
      return;
    }
    setNameError('');
    setAnswer(`${materiId}-simulasi`, {
      ...(savedState ?? { role1Done: false, role2Done: false }),
      programmerName: pClean,
      komputerName: kClean,
      groupId: user?.kelompok ?? 'Kelompok 1',
    });
    syncTelemetryNow();

    setTimeLeft(TIMER_SECONDS);
    setChecked({});
    setRunning(true);
    setPhase('active');

    logEvent({
      stage: 'simulasi',
      componentId: 'kinesthetic-start',
      ctComponent: 'decomposition',
      result: 'in_progress',
      payload: {
        programmerName: pClean,
        komputerName: kClean,
        groupId: user?.kelompok ?? 'Kelompok 1',
      },
    });
  }

  function handleFinishSimulation() {
    if (!canFinish) return;
    stopTimer();
    stopCameraStream();

    setAnswer(`${materiId}-simulasi`, {
      role1Done: true,
      role2Done: true,
      programmerName: programmerName.trim(),
      komputerName: komputerName.trim(),
      groupId: user?.kelompok ?? 'Kelompok 1',
      programmerInstruction: progInst,
      komputerMemory: kompMem,
      photoProof: photoProof ?? undefined,
    });
    setProgress(materiId, 'simulasi', 'done');
    setPhase('done');

    logEvent({
      stage: 'simulasi',
      componentId: 'kinesthetic-complete',
      ctComponent: 'decomposition',
      result: 'pass',
      payload: {
        programmerName: programmerName.trim(),
        komputerName: komputerName.trim(),
        progInst,
        kompMem,
        hasProof: Boolean(photoProof),
      },
    });

    if (onComplete) onComplete();
  }

  function handleReportAmbiguity() {
    setKompMem((prev) => ({ ...prev, reportedAmbiguity: true }));
    setAmbiguityAlert(true);
    logEvent({
      stage: 'simulasi',
      componentId: 'kinesthetic-ambiguity-report',
      ctComponent: 'debugging',
      result: 'info',
      payload: {
        reporter: komputerName.trim(),
        programmer: programmerName.trim(),
      },
    });
  }

  function handleDemoSkip() {
    const pName = programmerName.trim() || user?.nama || 'Siswa A';
    const kName = komputerName.trim() || 'Rekan B';
    setProgrammerName(pName);
    setKomputerName(kName);
    setProgress(materiId, 'simulasi', 'done');
    setAnswer(`${materiId}-simulasi`, {
      role1Done: true,
      role2Done: true,
      programmerName: pName,
      komputerName: kName,
      groupId: user?.kelompok ?? 'Kelompok 1',
    });
    setPhase('done');
    if (onComplete) onComplete();
  }

  const timerColor = timeLeft > 60 ? '#253f8a' : timeLeft > 30 ? '#d97706' : '#dc2626';

  return (
    <div className="w-full flex flex-col gap-4">
      {/* 1. INTRO & DAFTAR NAMA PASANGAN */}
      {phase === 'intro' && (
        <Card className="flex flex-col gap-4 border border-[#bce0fd]">
          <div className="text-center py-1">
            <span className="text-4xl mb-2 block">🤝</span>
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-[#eaf6ff] text-[#253f8a] border border-[#a6d7ff] mb-2">
              Aktivitas Kinestetik Berpasangan (Tektokan) · {user?.kelompok ?? 'Kelompok 1'}
            </div>
            <h3 className="text-lg font-bold text-[#121c2c] mb-1">
              Simulasi Fisik Interaktif: Programmer &amp; Komputer
            </h3>
            <p className="text-xs sm:text-sm text-[#464555] max-w-lg mx-auto leading-relaxed">
              Dua siswa bekerja sama secara bergantian (<strong>tektokan</strong>). 
              Siswa A bertindak sebagai <strong>Programmer</strong> (perancang variabel &amp; instruksi) 
              dan Siswa B bertindak sebagai <strong>Komputer</strong> (menyimpan ke wadah memori &amp; menghitung).
            </p>
          </div>

          {/* Form Input Nama Peran */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-4 rounded-2xl bg-[#eaf6ff] border border-[#a6d7ff] flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xl">💻</span>
                <label htmlFor="k-prog-name" className="font-bold text-[#253f8a] text-sm">
                  Siswa A — Programmer
                </label>
              </div>
              <input
                id="k-prog-name"
                type="text"
                value={programmerName}
                onChange={(e) => {
                  setProgrammerName(e.target.value);
                  setNameError('');
                }}
                placeholder="Ketik nama siswa Programmer..."
                className="w-full px-3.5 py-2 rounded-xl bg-white border border-[#93c5fd] text-xs sm:text-sm text-[#121c2c] font-semibold focus:outline-none focus:ring-2 focus:ring-[#68b6f7]"
              />
              <span className="text-[11px] text-[#464555]">
                Tugas: Menentukan nama variabel, tipe data (String/Integer), dan memberikan kartu instruksi.
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-[#f0fff4] border border-[#86efac] flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xl">🤖</span>
                <label htmlFor="k-komp-name" className="font-bold text-[#15803d] text-sm">
                  Siswa B — Komputer
                </label>
              </div>
              <input
                id="k-komp-name"
                type="text"
                value={komputerName}
                onChange={(e) => {
                  setKomputerName(e.target.value);
                  setNameError('');
                }}
                placeholder="Ketik nama siswa Komputer..."
                className="w-full px-3.5 py-2 rounded-xl bg-white border border-[#86efac] text-xs sm:text-sm text-[#121c2c] font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
              <span className="text-[11px] text-[#464555]">
                Tugas: Menerima instruksi persis, mencatat ke kotak memori, dan menghitung hasil total.
              </span>
            </div>
          </div>

          {nameError && (
            <div role="alert" className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-semibold text-center">
              ⚠️ {nameError}
            </div>
          )}

          <button
            type="button"
            onClick={handleStartSimulation}
            disabled={!programmerName.trim() || !komputerName.trim()}
            className="w-full py-3 rounded-full font-bold text-white text-sm transition hover:brightness-110 active:scale-98 disabled:opacity-45 disabled:cursor-not-allowed shadow-md"
            style={{
              background:
                programmerName.trim() && komputerName.trim()
                  ? 'linear-gradient(to bottom, #68b6f7, #3d6b91)'
                  : '#94a3b8',
            }}
          >
            🚀 Mulai Simulasi Tektokan Berpasangan ({programmerName.trim() || 'Siswa A'} &amp; {komputerName.trim() || 'Siswa B'})
          </button>
        </Card>
      )}

      {/* 2. SIMULASI AKTIF: TEKTOKAN BERPASANGAN + KAMERA BUKTI */}
      {phase === 'active' && (
        <div className="flex flex-col gap-4">
          {/* Header Identitas & Timer */}
          <Card className="border border-[#bce0fd] bg-[#f8fbff] py-3 text-center">
            <div className="flex flex-wrap items-center justify-center gap-2 mb-2">
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#eaf6ff] text-[#253f8a] border border-[#a6d7ff]">
                💻 Programmer: <strong>{programmerName}</strong>
              </span>
              <span className="text-slate-400 font-bold">⇄ TEKTOKAN ⇄</span>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#dcfce7] text-[#15803d] border border-[#86efac]">
                🤖 Komputer: <strong>{komputerName}</strong>
              </span>
            </div>

            <div
              className="text-3xl font-mono font-bold my-1 tracking-wider"
              style={{ color: timerColor }}
              aria-live="polite"
            >
              ⏱️ {formatTime(timeLeft)}
            </div>

            <div className="flex justify-center items-center gap-2 mt-1">
              <button
                type="button"
                onClick={() => setRunning((v) => !v)}
                className="px-3 py-1 rounded-full text-xs font-semibold bg-white border border-[#a6d7ff] text-[#253f8a] hover:bg-[#eaf6ff] transition"
              >
                {running ? '⏸ Jeda Waktu' : '▶ Lanjutkan Timer'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setTimeLeft(0);
                  stopTimer();
                }}
                className="px-2.5 py-1 rounded-full text-[11px] font-semibold text-[#888] hover:text-[#464555] hover:bg-gray-100 transition"
                title="Selesaikan waktu hitung mundur"
              >
                ⏩ Lewati Timer
              </button>
            </div>
          </Card>

          {/* Navigasi Langkah Tektokan (1-4) */}
          <div className="flex items-center justify-between gap-1 p-1 bg-white rounded-2xl border border-[#c0d8ef] shadow-xs overflow-x-auto">
            {[
              { step: 1, label: '1. Nama Barang (String)' },
              { step: 2, label: '2. Harga Satuan (Integer)' },
              { step: 3, label: '3. Jumlah Beli (Integer)' },
              { step: 4, label: '4. Hitung & Cetak Struk' },
            ].map((s) => (
              <button
                key={s.step}
                type="button"
                onClick={() => setActiveStep(s.step)}
                className={`flex-1 min-w-[130px] py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                  activeStep === s.step
                    ? 'bg-[#253f8a] text-white shadow-sm'
                    : 'text-[#464555] hover:bg-[#f4fbff]'
                }`}
              >
                <span>{s.label}</span>
              </button>
            ))}
          </div>

          {/* Area Interaksi Tektokan Berpasangan Berdasarkan Langkah */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {/* Sisi Programmer */}
            <Card className="border-2 border-[#a6d7ff] bg-white flex flex-col gap-2.5">
              <div className="flex items-center justify-between border-b border-[#eaf6ff] pb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xl">💻</span>
                  <div>
                    <h4 className="font-bold text-xs sm:text-sm text-[#253f8a]">
                      Giliran Programmer ({programmerName})
                    </h4>
                    <span className="text-[10px] text-[#464555]">Memberikan instruksi kartu variabel</span>
                  </div>
                </div>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#eaf6ff] text-[#253f8a]">
                  Langkah {activeStep} / 4
                </span>
              </div>

              {activeStep === 1 && (
                <div className="flex flex-col gap-2">
                  <span className="text-xs text-[#464555] leading-relaxed">
                    Tugaskan variabel nama barang dengan nilai teks (String). Jangan lupa tanda petik!
                  </span>
                  <label className="text-[11px] font-bold text-[#253f8a]">
                    Instruksi Variabel Nama Barang *
                  </label>
                  <input
                    type="text"
                    value={progInst.variabelNama}
                    onChange={(e) => setProgInst((p) => ({ ...p, variabelNama: e.target.value }))}
                    placeholder="Ketik instruksi variabel dan nilai teks..."
                    className="w-full px-3 py-2 rounded-xl bg-[#f8fbff] border border-[#a6d7ff] text-xs font-mono font-semibold focus:outline-none focus:ring-2 focus:ring-[#68b6f7]"
                  />
                  {v1.pErr ? (
                    <span className="text-[11px] text-red-600 font-medium">⚠️ {v1.pErr}</span>
                  ) : (
                    <span className="text-[10px] text-slate-500">
                      💡 Berikan instruksi ini secara lisan ke rekan Komputer ({komputerName}).
                    </span>
                  )}
                </div>
              )}

              {activeStep === 2 && (
                <div className="flex flex-col gap-2">
                  <span className="text-xs text-[#464555] leading-relaxed">
                    Tugaskan variabel harga satuan barang dengan nilai angka bulat (Integer tanpa tanda petik).
                  </span>
                  <label className="text-[11px] font-bold text-[#253f8a]">
                    Instruksi Variabel Harga Satuan *
                  </label>
                  <input
                    type="text"
                    value={progInst.variabelHarga}
                    onChange={(e) => setProgInst((p) => ({ ...p, variabelHarga: e.target.value }))}
                    placeholder="Ketik instruksi variabel dan nilai harga integer..."
                    className="w-full px-3 py-2 rounded-xl bg-[#f8fbff] border border-[#a6d7ff] text-xs font-mono font-semibold focus:outline-none focus:ring-2 focus:ring-[#68b6f7]"
                  />
                  {v2.pErr ? (
                    <span className="text-[11px] text-red-600 font-medium">⚠️ {v2.pErr}</span>
                  ) : (
                    <span className="text-[10px] text-slate-500">
                      💡 Beritahukan nominal harga ke Komputer ({komputerName}) untuk dicatat ke kotak memori.
                    </span>
                  )}
                </div>
              )}

              {activeStep === 3 && (
                <div className="flex flex-col gap-2">
                  <span className="text-xs text-[#464555] leading-relaxed">
                    Tugaskan variabel jumlah porsi / kuantitas beli dengan nilai Integer bulat.
                  </span>
                  <label className="text-[11px] font-bold text-[#253f8a]">
                    Instruksi Variabel Jumlah / Porsi *
                  </label>
                  <input
                    type="text"
                    value={progInst.variabelJumlah}
                    onChange={(e) => setProgInst((p) => ({ ...p, variabelJumlah: e.target.value }))}
                    placeholder="Ketik instruksi variabel dan nilai kuantitas integer..."
                    className="w-full px-3 py-2 rounded-xl bg-[#f8fbff] border border-[#a6d7ff] text-xs font-mono font-semibold focus:outline-none focus:ring-2 focus:ring-[#68b6f7]"
                  />
                  {v3.pErr ? (
                    <span className="text-[11px] text-red-600 font-medium">⚠️ {v3.pErr}</span>
                  ) : (
                    <span className="text-[10px] text-slate-500">
                      💡 Beritahukan berapa jumlah beli yang dipesan kepada Komputer ({komputerName}).
                    </span>
                  )}
                </div>
              )}

              {activeStep === 4 && (
                <div className="flex flex-col gap-2">
                  <span className="text-xs text-[#464555] leading-relaxed">
                    Instruksikan rumus penugasan perkalian: total = harga_satuan * jumlah.
                  </span>
                  <label className="text-[11px] font-bold text-[#253f8a]">
                    Rumus Perhitungan Total *
                  </label>
                  <input
                    type="text"
                    value={progInst.rumusTotal}
                    onChange={(e) => setProgInst((p) => ({ ...p, rumusTotal: e.target.value }))}
                    placeholder="Ketik rumus penugasan perkalian..."
                    className="w-full px-3 py-2 rounded-xl bg-[#f8fbff] border border-[#a6d7ff] text-xs font-mono font-semibold focus:outline-none focus:ring-2 focus:ring-[#68b6f7]"
                  />
                  {v4.pErr ? (
                    <span className="text-[11px] text-red-600 font-medium">⚠️ {v4.pErr}</span>
                  ) : (
                    <span className="text-[10px] text-slate-500">
                      💡 Minta Komputer ({komputerName}) menghitung perkalian dan mencatat struk belanja.
                    </span>
                  )}
                </div>
              )}
            </Card>

            {/* Sisi Komputer */}
            <Card className="border-2 border-[#86efac] bg-white flex flex-col gap-2.5">
              <div className="flex items-center justify-between border-b border-[#f0fff4] pb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🤖</span>
                  <div>
                    <h4 className="font-bold text-xs sm:text-sm text-[#15803d]">
                      Respon Komputer ({komputerName})
                    </h4>
                    <span className="text-[10px] text-[#464555]">Mencatat ke kotak memori kertas / layar</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleReportAmbiguity}
                  className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200 transition"
                >
                  ⚠️ Instruksi Bingung?
                </button>
              </div>

              {ambiguityAlert && (
                <div className="p-2 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-900">
                  📢 Laporan dikirim! Minta Programmer ({programmerName}) mengulang instruksi dengan jelas.
                </div>
              )}

              {activeStep === 1 && (
                <div className="flex flex-col gap-2">
                  <span className="text-xs text-[#464555] leading-relaxed">
                    Terima teks nama barang dari Programmer dan catat ke kotak memori bertipe String:
                  </span>
                  <label className="text-[11px] font-bold text-[#15803d]">
                    Isi Kotak Memori: nama_barang *
                  </label>
                  <input
                    type="text"
                    value={kompMem.kotakNama}
                    onChange={(e) => setKompMem((m) => ({ ...m, kotakNama: e.target.value }))}
                    placeholder="Ketik nilai teks barang yang diterima..."
                    className="w-full px-3 py-2 rounded-xl bg-[#f0fff4] border border-[#86efac] text-xs font-mono font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  />
                  {v1.kErr && <span className="text-[11px] text-red-600 font-medium">⚠️ {v1.kErr}</span>}
                  <div className="flex items-center justify-between pt-1">
                    <span className={`text-[11px] font-semibold ${v1.valid ? 'text-emerald-800' : 'text-amber-800'}`}>
                      {v1.valid ? v1.okNote : v1.kErr ? '❌ Perlu diperbaiki' : '⚠️ Masih kosong'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setActiveStep(2)}
                      disabled={!v1.valid}
                      className="px-3.5 py-1 rounded-full text-xs font-bold text-white bg-[#15803d] hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition"
                    >
                      Lanjut Langkah 2 →
                    </button>
                  </div>
                </div>
              )}

              {activeStep === 2 && (
                <div className="flex flex-col gap-2">
                  <span className="text-xs text-[#464555] leading-relaxed">
                    Terima harga satuan dan catat sebagai angka bulat Integer di kotak memori:
                  </span>
                  <label className="text-[11px] font-bold text-[#15803d]">
                    Isi Kotak Memori: harga_satuan *
                  </label>
                  <input
                    type="text"
                    value={kompMem.kotakHarga}
                    onChange={(e) => setKompMem((m) => ({ ...m, kotakHarga: e.target.value }))}
                    placeholder="Ketik nilai angka harga yang diterima..."
                    className="w-full px-3 py-2 rounded-xl bg-[#f0fff4] border border-[#86efac] text-xs font-mono font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  />
                  {v2.kErr && <span className="text-[11px] text-red-600 font-medium">⚠️ {v2.kErr}</span>}
                  <div className="flex items-center justify-between pt-1">
                    <span className={`text-[11px] font-semibold ${v2.valid ? 'text-emerald-800' : 'text-amber-800'}`}>
                      {v2.valid ? v2.okNote : v2.kErr ? '❌ Perlu diperbaiki' : '⚠️ Masih kosong'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setActiveStep(3)}
                      disabled={!v2.valid}
                      className="px-3.5 py-1 rounded-full text-xs font-bold text-white bg-[#15803d] hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition"
                    >
                      Lanjut Langkah 3 →
                    </button>
                  </div>
                </div>
              )}

              {activeStep === 3 && (
                <div className="flex flex-col gap-2">
                  <span className="text-xs text-[#464555] leading-relaxed">
                    Terima jumlah porsi dan catat ke kotak memori Integer:
                  </span>
                  <label className="text-[11px] font-bold text-[#15803d]">
                    Isi Kotak Memori: jumlah *
                  </label>
                  <input
                    type="text"
                    value={kompMem.kotakJumlah}
                    onChange={(e) => setKompMem((m) => ({ ...m, kotakJumlah: e.target.value }))}
                    placeholder="Ketik nilai angka jumlah yang diterima..."
                    className="w-full px-3 py-2 rounded-xl bg-[#f0fff4] border border-[#86efac] text-xs font-mono font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  />
                  {v3.kErr && <span className="text-[11px] text-red-600 font-medium">⚠️ {v3.kErr}</span>}
                  <div className="flex items-center justify-between pt-1">
                    <span className={`text-[11px] font-semibold ${v3.valid ? 'text-emerald-800' : 'text-amber-800'}`}>
                      {v3.valid ? v3.okNote : v3.kErr ? '❌ Perlu diperbaiki' : '⚠️ Masih kosong'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setActiveStep(4)}
                      disabled={!v3.valid}
                      className="px-3.5 py-1 rounded-full text-xs font-bold text-white bg-[#15803d] hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition"
                    >
                      Lanjut Langkah 4 →
                    </button>
                  </div>
                </div>
              )}

              {activeStep === 4 && (
                <div className="flex flex-col gap-2">
                  <span className="text-xs text-[#464555] leading-relaxed">
                    Hitung perkalian secara manual ({kompMem.kotakHarga || '0'} × {kompMem.kotakJumlah || '0'}) dan simpan ke kotak total:
                  </span>
                  <label className="text-[11px] font-bold text-[#15803d]">
                    Hasil Hitung Kotak Memori: total *
                  </label>
                  <input
                    type="text"
                    value={kompMem.kotakTotal}
                    onChange={(e) => setKompMem((m) => ({ ...m, kotakTotal: e.target.value }))}
                    placeholder="Ketik hasil perhitungan perkalian..."
                    className="w-full px-3 py-2 rounded-xl bg-[#ecfdf5] border-2 border-[#34d399] text-xs font-mono font-bold text-[#047857] focus:outline-none"
                  />
                  {v4.kErr && <span className="text-[11px] text-red-600 font-medium">⚠️ {v4.kErr}</span>}
                  <div className="pt-1">
                    <span className={`text-[11px] font-semibold ${v4.valid ? 'text-emerald-800' : 'text-amber-800'}`}>
                      {v4.valid ? v4.okNote : v4.kErr ? '❌ Perlu diperbaiki' : '⚠️ Masukkan hasil hitung'}
                    </span>
                  </div>
                </div>
              )}
            </Card>
          </div>

          {/* 3. KAMERA BUKTI GERAK KINESTETIK */}
          <Card className="border border-purple-200 bg-purple-50/50 flex flex-col gap-3 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-purple-200/80 pb-2">
              <div className="flex items-center gap-2">
                <span className="text-2xl">📸</span>
                <div>
                  <h4 className="font-bold text-xs sm:text-sm text-purple-950">
                    Bukti Kamera / Foto Gerak Kinestetik Pasangan *
                  </h4>
                  <p className="text-[11px] text-purple-900 leading-snug">
                    Siswa wajib menyertakan bukti fisik gerakan tektokan (menampilkan kedua siswa di depan kamera).
                  </p>
                </div>
              </div>

              {photoProof && (
                <span className="px-3 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-900 border border-green-300">
                  ✅ Bukti Fisik Tervalidasi
                </span>
              )}
            </div>

            {/* Video preview & Snapshot controls */}
            <div className="flex flex-col sm:flex-row items-center gap-4">
              {/* Box Preview */}
              <div className="w-full sm:w-64 h-44 bg-slate-900 rounded-2xl overflow-hidden relative border-2 border-purple-300 flex items-center justify-center shrink-0 shadow-inner">
                {photoProof ? (
                  <img
                    src={photoProof}
                    alt="Bukti simulasi kinestetik"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <>
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      style={{ transform: 'scaleX(-1)' }}
                      className={`w-full h-full object-cover ${cameraActive ? 'block' : 'hidden'}`}
                    />
                    {!cameraActive && (
                      <div className="text-center p-3 text-slate-300 flex flex-col items-center gap-1">
                        <span className="text-2xl">📷</span>
                        <span className="text-xs">Kamera belum aktif</span>
                        <span className="text-[10px] text-slate-400">Nyalakan kamera atau unggah foto bukti</span>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Controls */}
              <div className="flex-1 flex flex-col gap-2 w-full">
                {cameraError && (
                  <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
                    ⚠️ {cameraError}
                  </div>
                )}

                {!photoProof ? (
                  <div className="flex flex-wrap gap-2">
                    {!cameraActive ? (
                      <button
                        type="button"
                        onClick={handleStartCamera}
                        className="px-4 py-2 rounded-full text-xs font-bold text-white bg-purple-700 hover:bg-purple-800 transition flex items-center gap-1.5 shadow-sm"
                      >
                        🔴 Nyalakan Kamera Langsung
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={handleCapturePhoto}
                          className="px-4 py-2 rounded-full text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition flex items-center gap-1.5 shadow-sm"
                        >
                          📸 Ambil Foto Bukti Sekarang
                        </button>
                        <button
                          type="button"
                          onClick={stopCameraStream}
                          className="px-3 py-2 rounded-full text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 transition"
                        >
                          Matikan Kamera
                        </button>
                      </>
                    )}

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3.5 py-2 rounded-full text-xs font-semibold text-purple-900 bg-white border border-purple-300 hover:bg-purple-100 transition flex items-center gap-1.5"
                    >
                      📁 Unggah Foto Bukti
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      capture="user"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-green-800 font-semibold">
                      Foto bukti peragaan tersimpan pada sistem!
                    </span>
                    <button
                      type="button"
                      onClick={() => setPhotoProof(null)}
                      className="px-3 py-1 rounded-full text-xs font-semibold text-red-700 bg-white border border-red-200 hover:bg-red-50 transition"
                    >
                      ↺ Ambil Ulang Foto
                    </button>
                  </div>
                )}
                <span className="text-[11px] text-purple-900 leading-relaxed">
                  * Foto ini membuktikan kedua siswa ({programmerName} &amp; {komputerName}) benar-benar melakukan peragaan fisik berpasangan.
                </span>
              </div>
            </div>
          </Card>

          {/* 4. CHECKLIST VERIFIKASI TUGAS */}
          <Card className="border border-[#bce0fd] p-4 flex flex-col gap-2">
            <div className="flex items-center justify-between border-b border-[#eaf6ff] pb-1.5">
              <h4 className="font-bold text-xs sm:text-sm text-[#121c2c]">
                📋 Checklist Verifikasi Gerak ({Object.values(checked).filter(Boolean).length}/{CHECKLIST_ITEMS.length})
              </h4>
              <span className="text-xs text-[#253f8a] font-mono">
                {allChecklistDone ? '✅ Lengkap' : 'Belum Semua Dicentang'}
              </span>
            </div>

            <div className="flex flex-col gap-2 mt-1">
              {CHECKLIST_ITEMS.map((item) => (
                <label
                  key={item.id}
                  className="flex items-start gap-2.5 p-2 rounded-xl transition hover:bg-[#f4fbff] cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={!!checked[item.id]}
                    onChange={(e) => setChecked((prev) => ({ ...prev, [item.id]: e.target.checked }))}
                    className="mt-0.5 w-4 h-4 rounded accent-[#253f8a] cursor-pointer"
                  />
                  <span className={`text-xs leading-relaxed ${checked[item.id] ? 'line-through text-[#888]' : 'text-[#333]'}`}>
                    <strong>[{item.role}]</strong> {item.text}
                  </span>
                </label>
              ))}
            </div>
          </Card>

          {/* Status Validasi Sebelum Selesai */}
          {!canFinish && (
            <div className="p-3.5 rounded-2xl bg-amber-50 border-2 border-amber-300 text-xs text-amber-950 flex flex-col gap-1 shadow-xs">
              <span className="font-bold text-[11px] uppercase tracking-wider text-amber-900">
                ⚠️ Tombol Selesai Belum Dapat Diklik:
              </span>
              <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                {!allStepsValid && (
                  <li>
                    Langkah 1 s.d. 4 wajib valid seluruhnya (periksa pesan kesalahan merah pada instruksi variabel dan kotak memori).
                  </li>
                )}
                {!hasProof && <li>Bukti foto gerak berpasangan (kamera / unggahan) wajib disertakan.</li>}
                {!allChecklistDone && <li>Semua butir checklist di atas wajib dicentang setelah diperagakan.</li>}
              </ul>
            </div>
          )}

          {/* Tombol Selesai */}
          <button
            type="button"
            onClick={handleFinishSimulation}
            disabled={!canFinish}
            className="w-full py-3.5 rounded-full font-bold text-white text-xs sm:text-sm transition hover:brightness-110 active:scale-98 disabled:opacity-40 disabled:cursor-not-allowed shadow-md"
            style={{
              background: canFinish ? 'linear-gradient(to bottom, #68b6f7, #253f8a)' : '#94a3b8',
            }}
          >
            🏁 Selesaikan Simulasi Kinestetik Pasangan ({programmerName} &amp; {komputerName})
          </button>
        </div>
      )}

      {/* 5. SCREEN SELESAI */}
      {phase === 'done' && (
        <Card className="text-center flex flex-col gap-3 py-4 border border-green-200 bg-green-50/50">
          <span className="text-4xl">🎉</span>
          <h3 className="text-base font-bold text-[#121c2c]">Aktivitas Kinestetik Selesai!</h3>
          <p className="text-xs sm:text-sm text-[#464555] max-w-md mx-auto leading-relaxed">
            Pasangan <strong>{programmerName || 'Siswa A'}</strong> &amp;{' '}
            <strong>{komputerName || 'Siswa B'}</strong> telah menuntaskan simulasi unplugged tektokan
            Programmer &amp; Komputer beserta bukti fisik peragaannya.
            {isEmbedded
              ? ' Silakan lanjutkan menonton paruh akhir video untuk menuju tahap Analisis IPO.'
              : ''}
          </p>

          {photoProof && (
            <div className="w-40 h-28 mx-auto rounded-xl overflow-hidden border-2 border-green-300 shadow-sm">
              <img src={photoProof} alt="Bukti simulasi" className="w-full h-full object-cover" />
            </div>
          )}

          {onComplete && (
            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPhase('active')}
                className="px-4 py-2.5 rounded-full font-semibold text-[#253f8a] text-xs bg-[#eaf6ff] border border-[#a6d7ff] hover:bg-[#d8eeff] transition"
              >
                🔄 Tinjau / Edit Simulasi
              </button>
              <button
                type="button"
                onClick={onComplete}
                className="flex-1 py-2.5 rounded-full font-bold text-white text-xs sm:text-sm transition hover:brightness-110 shadow-md"
                style={{ background: 'linear-gradient(to bottom, #68b6f7, #253f8a)' }}
              >
                ▶ Lanjutkan Video Pembelajaran
              </button>
            </div>
          )}
        </Card>
      )}

      {/* Demo skip */}
      {demoMode && phase !== 'done' && (
        <div className="flex justify-start">
          <button
            type="button"
            onClick={handleDemoSkip}
            className="px-3 py-1.5 rounded-full text-[11px] font-semibold text-amber-900 bg-amber-200 hover:bg-amber-300 transition"
          >
            🎬 Demo: Lewati Simulasi
          </button>
        </div>
      )}
    </div>
  );
}
