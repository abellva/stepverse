import { useState, useEffect, useRef, useCallback } from 'react';
import { Card } from './ui/Card';
import { useAppStore } from '../store/useAppStore';
import { logEvent } from '../services/logger';

const TIMER_SECONDS = 5 * 60; // 5 menit per peran

const CHECKLIST_PROGRAMMER = [
  { id: 'p1', text: 'Menuliskan algoritma/pseudocode langkah kasir (input nama, harga, jumlah)' },
  { id: 'p2', text: 'Menentukan nama variabel dan rumus total (total = harga × jumlah)' },
  { id: 'p3', text: 'Memberikan instruksi satu per satu secara lisan/tertulis kepada Komputer' },
  { id: 'p4', text: 'Memverifikasi apakah hasil perhitungan yang dibuat Komputer sudah akurat' },
];

const CHECKLIST_KOMPUTER = [
  { id: 'k1', text: 'Menerima lembar/kartu instruksi dari rekan Programmer tanpa menambah asumsi' },
  { id: 'k2', text: 'Menyimpan nilai ke wadah variabel kertas sesuai instruksi persis' },
  { id: 'k3', text: 'Menghitung total belanja secara manual dan menuliskan hasil struk' },
  { id: 'k4', text: 'Melaporkan "Error/Bingung" jika ada instruksi yang ambigu atau kurang jelas' },
];

type Role = 'programmer' | 'komputer';

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
  const { setProgress, setAnswer, answers, demoMode, progress } = useAppStore();

  const savedState = answers[`${materiId}-simulasi`] as { role1Done: boolean; role2Done: boolean } | undefined;
  const savedRoles = answers[`${materiId}-simulasi-roles`] as { studentA: string; studentB: string } | undefined;

  const [studentA, setStudentA] = useState(savedRoles?.studentA || '');
  const [studentB, setStudentB] = useState(savedRoles?.studentB || '');

  const [phase, setPhase] = useState<'intro' | 'role1' | 'swap' | 'role2' | 'done'>(
    savedState?.role2Done ? 'done' : savedState?.role1Done ? 'swap' : 'intro'
  );
  const [currentRole, setCurrentRole] = useState<Role>('programmer');
  const [timeLeft, setTimeLeft] = useState(TIMER_SECONDS);
  const [running, setRunning] = useState(false);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const canProceed = progress[`${materiId}-simulasi`] === 'done' || phase === 'done';
  const currentChecklist = currentRole === 'programmer' ? CHECKLIST_PROGRAMMER : CHECKLIST_KOMPUTER;
  const allChecked = currentChecklist.every((item) => checked[item.id]);

  const stopTimer = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setRunning(false);
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
    };
  }, [running, stopTimer]);

  function startRole(role: Role) {
    if (role === 'programmer') {
      const nameA = studentA.trim() || 'Siswa 1';
      const nameB = studentB.trim() || 'Siswa 2';
      setAnswer(`${materiId}-simulasi-roles`, { studentA: nameA, studentB: nameB });
    }
    setCurrentRole(role);
    setTimeLeft(TIMER_SECONDS);
    setChecked({});
    setRunning(true);
    setPhase(role === 'programmer' ? 'role1' : 'role2');
    logEvent({
      stage: 'simulasi',
      componentId: `kinesthetic-${role}`,
      ctComponent: 'decomposition',
      result: 'in_progress',
      payload: {
        role,
        round: role === 'programmer' ? 1 : 2,
        activeStudent: role === 'programmer' ? studentA : studentB,
        partnerStudent: role === 'programmer' ? studentB : studentA,
      },
    });
  }

  function finishRole1() {
    stopTimer();
    setAnswer(`${materiId}-simulasi`, { role1Done: true, role2Done: false });
    setPhase('swap');
    logEvent({
      stage: 'simulasi',
      componentId: 'kinesthetic-round1',
      ctComponent: 'decomposition',
      result: 'pass',
      payload: { roleCompleted: 'programmer' },
    });
  }

  function finishRole2() {
    stopTimer();
    setAnswer(`${materiId}-simulasi`, { role1Done: true, role2Done: true });
    setProgress(materiId, 'simulasi', 'done');
    setPhase('done');
    logEvent({
      stage: 'simulasi',
      componentId: 'kinesthetic-round2',
      ctComponent: 'decomposition',
      result: 'pass',
      payload: { roleCompleted: 'komputer' },
    });
    if (onComplete) onComplete();
  }

  function handleDemoSkip() {
    setProgress(materiId, 'simulasi', 'done');
    setAnswer(`${materiId}-simulasi`, { role1Done: true, role2Done: true });
    setPhase('done');
    if (onComplete) onComplete();
  }

  function handleRestartSimulation() {
    stopTimer();
    setChecked({});
    setCurrentRole('programmer');
    setTimeLeft(TIMER_SECONDS);
    setAnswer(`${materiId}-simulasi`, { role1Done: false, role2Done: false });
    setPhase('intro');
  }

  const timerColor = timeLeft > 60 ? '#253f8a' : timeLeft > 30 ? '#d97706' : '#dc2626';

  return (
    <div className="w-full flex flex-col gap-4">
      {/* INTRO */}
      {phase === 'intro' && (
        <Card className="flex flex-col gap-4 border border-[#bce0fd]">
          <div className="text-center py-2">
            <span className="text-4xl mb-2 block">🤝</span>
            <h3 className="text-lg font-bold text-[#121c2c] mb-1">
              {isEmbedded ? 'Istirahat Kinestetik di Tengah Video' : 'Simulasi Berpasangan Unplugged'}
            </h3>
            <p className="text-xs sm:text-sm text-[#464555] max-w-lg mx-auto leading-relaxed">
              Dua siswa bekerja bersama selama <strong>5 menit per peran</strong>. Satu orang berperan sebagai
              <strong> Programmer</strong> dan satu lagi sebagai <strong>Komputer</strong>.
              Setelah ronde 1 selesai, lakukan tukar peran!
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3.5 rounded-2xl bg-[#eaf6ff] border border-[#a6d7ff] flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <span className="text-xl">💻</span>
                <span className="font-bold text-[#253f8a] text-sm">Ronde 1: Programmer</span>
              </div>
              <ul className="text-xs text-[#464555] space-y-1 list-disc list-inside">
                <li>Tulis instruksi variabel di secarik kertas</li>
                <li>Beri perintah langkah demi langkah</li>
                <li>Periksa kebenaran struk keluaran</li>
              </ul>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#f0fff4] border border-[#86efac] flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <span className="text-xl">🤖</span>
                <span className="font-bold text-[#15803d] text-sm">Ronde 2: Komputer</span>
              </div>
              <ul className="text-xs text-[#464555] space-y-1 list-disc list-inside">
                <li>Hanya jalankan yang diperintahkan</li>
                <li>Hitung perkalian total belanja</li>
                <li>Tulis dan serahkan struk belanja</li>
              </ul>
            </div>
          </div>

          {/* Form Otentikasi Peran Anggota Kelompok */}
          <div className="p-4 rounded-2xl bg-[#f4fbff] border border-[#bce0fd] flex flex-col gap-3">
            <div className="flex items-center gap-2 text-xs font-bold text-[#1b2f68] uppercase tracking-wider">
              <span>✍️ Otentikasi Pasangan Peran (Wajib Diisi):</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#121c2c] mb-1">
                  Nama Siswa 1 (Programmer Ronde 1)
                </label>
                <input
                  type="text"
                  value={studentA}
                  onChange={(e) => setStudentA(e.target.value)}
                  placeholder="Contoh: Budi Santoso"
                  className="w-full px-3.5 py-2 rounded-xl border border-[#c0d8ef] text-xs text-[#121c2c] bg-white focus:outline-none focus:border-[#253f8a]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#121c2c] mb-1">
                  Nama Siswa 2 (Komputer Ronde 1)
                </label>
                <input
                  type="text"
                  value={studentB}
                  onChange={(e) => setStudentB(e.target.value)}
                  placeholder="Contoh: Siti Rahayu"
                  className="w-full px-3.5 py-2 rounded-xl border border-[#c0d8ef] text-xs text-[#121c2c] bg-white focus:outline-none focus:border-[#253f8a]"
                />
              </div>
            </div>
            <p className="text-[11px] text-[#64748b]">
              *Identitas kedua siswa akan terekam sebagai bukti otentik pelaksanaan simulasi berpasangan di Dasbor Guru.
            </p>
          </div>

          <button
            type="button"
            disabled={!studentA.trim() || !studentB.trim()}
            onClick={() => startRole('programmer')}
            className="w-full py-3 rounded-full font-bold text-white text-sm transition hover:brightness-110 active:scale-98 disabled:opacity-40 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-blue-400 outline-none shadow-md"
            style={{
              background: 'linear-gradient(to bottom, #68b6f7, #3d6b91)',
            }}
          >
            🚀 Mulai Ronde 1 — {studentA.trim() ? `${studentA.trim()} sebagai Programmer` : 'Masukkan Nama Pasangan'}
          </button>
        </Card>
      )}

      {/* ACTIVE ROLE */}
      {(phase === 'role1' || phase === 'role2') && (
        <div className="flex flex-col gap-3">
          {/* Timer Card */}
          <Card className="text-center py-3 border border-[#bce0fd]">
            <div
              className="inline-block px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider mb-1"
              style={{
                background: currentRole === 'programmer' ? '#eaf6ff' : '#f0fff4',
                color: currentRole === 'programmer' ? '#253f8a' : '#15803d',
              }}
            >
              {currentRole === 'programmer' ? (
                <span>💻 Giliran: <strong>{studentA || 'Siswa 1'}</strong> (Programmer) ➔ Memberi Instruksi ke <strong>{studentB || 'Siswa 2'}</strong> (Komputer)</span>
              ) : (
                <span>🤖 Giliran: <strong>{studentB || 'Siswa 2'}</strong> (Programmer Baru) ➔ Memberi Instruksi ke <strong>{studentA || 'Siswa 1'}</strong> (Komputer Baru)</span>
              )}
            </div>

            <div
              className="text-4xl font-mono font-bold my-1 tracking-wider"
              style={{ color: timerColor }}
              aria-live="polite"
              aria-label={`Sisa waktu ${formatTime(timeLeft)}`}
            >
              {formatTime(timeLeft)}
            </div>

            <div className="flex justify-center items-center gap-2 mt-2">
              <button
                type="button"
                onClick={() => setRunning((v) => !v)}
                className="px-3.5 py-1 rounded-full text-xs font-semibold bg-[#eaf6ff] text-[#253f8a] border border-[#a6d7ff] hover:bg-[#d0ecff] transition"
              >
                {running ? '⏸ Jeda Waktu' : '▶ Lanjutkan'}
              </button>
              <button
                type="button"
                onClick={() => { setTimeLeft(0); stopTimer(); }}
                className="px-2.5 py-1 rounded-full text-[11px] font-semibold text-[#888] hover:text-[#464555] hover:bg-gray-100 transition"
                title="Percepat timer untuk pengujian"
              >
                ⏩ Selesaikan Waktu
              </button>
            </div>

            {timeLeft === 0 && (
              <div className="mt-2 text-xs font-semibold text-amber-700 bg-amber-50 py-1 px-3 rounded-lg border border-amber-200">
                ⏰ Waktu 5 menit telah selesai! Selesaikan seluruh checklist di bawah untuk melanjutkan.
              </div>
            )}
          </Card>

          {/* Checklist Card */}
          <Card className="border border-[#bce0fd]">
            <div className="flex items-center justify-between mb-2 border-b border-[#eaf6ff] pb-1.5">
              <h4 className="font-bold text-xs sm:text-sm text-[#121c2c]">
                📋 Checklist: {currentRole === 'programmer' ? 'Programmer' : 'Komputer'}
              </h4>
              <span className="text-xs text-[#253f8a] font-mono">
                {Object.values(checked).filter(Boolean).length}/{currentChecklist.length} selesai
              </span>
            </div>

            <div className="flex flex-col gap-2">
              {currentChecklist.map((item) => (
                <label
                  key={item.id}
                  className="flex items-start gap-2.5 p-2 rounded-xl transition hover:bg-[#f4fbff] cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={!!checked[item.id]}
                    onChange={(e) => setChecked((prev) => ({ ...prev, [item.id]: e.target.checked }))}
                    className="mt-0.5 w-4 h-4 rounded accent-[#3d6b91] cursor-pointer"
                  />
                  <span className={`text-xs leading-relaxed ${checked[item.id] ? 'line-through text-[#aaa]' : 'text-[#333]'}`}>
                    {item.text}
                  </span>
                </label>
              ))}
            </div>
          </Card>

          <button
            type="button"
            onClick={phase === 'role1' ? finishRole1 : finishRole2}
            disabled={!allChecked}
            className="w-full py-3 rounded-full font-bold text-white text-xs sm:text-sm transition hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-blue-400 outline-none shadow-md active:scale-98"
            style={{
              background: allChecked ? 'linear-gradient(to bottom, #68b6f7, #3d6b91)' : '#c0cfe0',
            }}
          >
            {phase === 'role1'
              ? '🔄 Ronde 1 Tuntas → Lanjut Tukar Peran'
              : '🏁 Ronde 2 Tuntas → Selesaikan Simulasi'}
          </button>
        </div>
      )}

      {/* SWAP SCREEN */}
      {phase === 'swap' && (
        <Card className="text-center flex flex-col gap-3 py-4 border border-[#bce0fd]">
          <span className="text-4xl">🔄</span>
          <h3 className="text-base font-bold text-[#121c2c]">Waktunya Bertukar Peran!</h3>
          <p className="text-xs sm:text-sm text-[#464555] max-w-md mx-auto leading-relaxed">
            Ronde 1 selesai! Rekan yang tadi menjadi <strong>Programmer</strong> kini menjadi <strong>Komputer</strong>, dan sebaliknya.
          </p>
          <button
            type="button"
            onClick={() => startRole('komputer')}
            className="w-full py-3 rounded-full font-bold text-white text-xs sm:text-sm transition hover:brightness-110 focus-visible:ring-2 focus-visible:ring-blue-400 outline-none shadow-md active:scale-98"
            style={{ background: 'linear-gradient(to bottom, #68b6f7, #3d6b91)' }}
          >
            🚀 Mulai Ronde 2 (Gantian Peran Komputer)
          </button>
        </Card>
      )}

      {/* COMPLETED SCREEN */}
      {(phase === 'done' || canProceed) && phase !== 'intro' && phase !== 'role1' && phase !== 'role2' && phase !== 'swap' && (
        <Card className="text-center flex flex-col gap-3 py-4 border border-green-200 bg-green-50/50">
          <span className="text-4xl">🎉</span>
          <h3 className="text-base font-bold text-[#121c2c]">Aktivitas Kinestetik Selesai!</h3>
          <p className="text-xs sm:text-sm text-[#464555] max-w-md mx-auto leading-relaxed">
            Kalian berdua telah menyelesaikan simulasi unplugged Programmer & Komputer.
            {isEmbedded ? ' Silakan lanjutkan menonton paruh akhir video untuk menuju tahap IPO.' : ''}
          </p>
          {onComplete && (
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={handleRestartSimulation}
                className="px-4 py-2.5 rounded-full font-semibold text-[#253f8a] text-xs bg-[#eaf6ff] border border-[#a6d7ff] hover:bg-[#d8eeff] transition"
              >
                🔄 Ulangi Simulasi
              </button>
              <button
                type="button"
                onClick={onComplete}
                className="flex-1 py-2.5 rounded-full font-bold text-white text-xs sm:text-sm transition hover:brightness-110 focus-visible:ring-2 focus-visible:ring-blue-400 outline-none shadow-md"
                style={{ background: 'linear-gradient(to bottom, #68b6f7, #3d6b91)' }}
              >
                ▶ Lanjutkan Video
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

