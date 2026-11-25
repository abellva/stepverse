import { useEffect } from 'react';
import { Link } from 'react-router';
import { MATERI_LIST } from '../data/curriculum';
import { useAppStore } from '../store/useAppStore';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { ProgressBar } from '../components/ui/ProgressBar';
import { fetchPosttestLockState } from '../services/researchApi';
import { checkPosttestAccess, getStageDisplayLabel } from '../utils/stuckDetector';
 
export default function BerandaPage() {
  const {
    user,
    progress,
    answers,
    posttestLockedByGuru,
    setPosttestLockedByGuru,
    demoMode,
    enterStage,
  } = useAppStore();

  useEffect(() => {
    enterStage('beranda');
    void fetchPosttestLockState().then((locked) => {
      setPosttestLockedByGuru(locked);
    });
  }, [enterStage, setPosttestLockedByGuru]);

  const pretestResult = answers['pretest_result'] as { score: number; total: number } | undefined;
  const isPretestDone = !!pretestResult;

  const posttestResult = answers['posttest_result'] as { score: number; total: number } | undefined;
  const isPosttestDone = !!posttestResult;

  const posttestAccess = checkPosttestAccess({
    progress,
    lockedByGuru: posttestLockedByGuru,
    demoMode,
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <h1 className="text-2xl font-bold text-[#121c2c]">
            Selamat datang, {user?.nama ?? 'Siswa'}! 👋
          </h1>
          {user?.kelompok && (
            <span className="text-xs px-3 py-1 rounded-full font-bold bg-[#dcfce7] text-emerald-900 border border-emerald-300">
              👥 {user.kelompok}
            </span>
          )}
        </div>
        <p className="text-sm text-[#464555]">
          Ikuti alur pembelajaran berpikir komputasional dengan kasus kasir Kantin Bu Ani.
        </p>
      </div>

      {/* SECTION 1: EVALUASI DIAGNOSTIK (PRETEST) */}
      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-bold uppercase tracking-widest text-[#464555]">
          1. Evaluasi Awal (Diagnostik)
        </h2>

        {!isPretestDone ? (
          <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-[#eaf6ff] to-[#f4fbff] border border-[#a6d7ff] flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
            <div className="flex items-center gap-4">
              <span className="text-4xl select-none">📝</span>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs uppercase font-extrabold tracking-wider text-[#253f8a]">
                    Langkah Awal Pembelajaran
                  </span>
                  <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2.5 py-0.5 rounded-full border border-amber-200">
                    Wajib Di Awal
                  </span>
                </div>
                <h3 className="text-base font-bold text-[#121c2c]">Kerjakan Pretest CT Terlebih Dahulu</h3>
                <p className="text-xs text-[#555] mt-0.5 leading-relaxed">
                  Sebelum memulai latihan formatif Materi 1 (Orientasi Video), kerjakan 5 soal tes awal dan tuliskan alasan logismu.
                </p>
              </div>
            </div>
            <Link
              to="/tes/awal"
              className="px-6 py-3 rounded-full text-xs font-bold text-white transition-all hover:brightness-110 active:scale-95 whitespace-nowrap"
              style={{
                background: 'linear-gradient(to bottom, #68b6f7, #3d6b91)',
                boxShadow:
                  '0 12px 18px -4px rgba(61,107,145,0.45), inset 0 2px 3px rgba(255,255,255,0.7), inset 0 -3px 0 #253f8a',
              }}
            >
              Mulai Pretest Sekarang →
            </Link>
          </div>
        ) : (
          <div className="p-3.5 rounded-2xl bg-green-50 border border-green-200 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-green-900 shadow-xs">
            <div className="flex items-center gap-2.5">
              <span className="text-lg">✅</span>
              <span>
                <strong>Pretest CT Selesai:</strong> Skor Awalmu <strong>{pretestResult.score}/100</strong>. Seluruh latihan formatif Materi 1 sudah terbuka.
              </span>
            </div>
            <Link to="/tes/awal" className="text-green-700 underline hover:text-green-900 font-medium whitespace-nowrap">
              Tinjau Pretest →
            </Link>
          </div>
        )}
      </section>

      {/* SECTION 2: LATIHAN FORMATIF & DISKUSI KELOMPOK */}
      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xs font-bold uppercase tracking-widest text-[#464555]">
            2. Latihan Formatif &amp; Kolaborasi Kelompok Kecil
          </h2>
          <Link
            to="/diskusi"
            className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-[#eaf6ff] text-[#253f8a] border border-[#a6d7ff] hover:bg-[#d0ecff] transition"
          >
            💬 Buka Ruang Diskusi {user?.kelompok || 'Kelompok'} →
          </Link>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {MATERI_LIST.map((m) => {
            const doneCount = m.stages.filter(
              (s) => progress[`${m.id}-${s}`] === 'done'
            ).length;
            const pct = (doneCount / m.stages.length) * 100;

            const targetLink = !isPretestDone && m.id === 1 ? '/tes/awal' : `/materi/${m.id}/video`;
            const buttonLabel = !isPretestDone && m.id === 1
              ? 'Kerjakan Pretest Dulu'
              : pct > 0
              ? 'Lanjutkan Latihan'
              : 'Mulai Latihan';

            return (
              <Card key={m.id} className="flex flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-xs text-[#464555] mb-1">Materi {m.id} · Formatif</div>
                    <h3 className="font-bold text-[#121c2c] text-base leading-snug">
                      {m.judul}
                    </h3>
                  </div>
                  {m.locked ? (
                    <Badge variant="locked">Segera hadir</Badge>
                  ) : !isPretestDone && m.id === 1 ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                      Butuh Pretest
                    </span>
                  ) : pct === 100 ? (
                    <Badge variant="done">Selesai</Badge>
                  ) : pct > 0 ? (
                    <Badge variant="active">Sedang berjalan</Badge>
                  ) : (
                    <Badge variant="info">Mulai</Badge>
                  )}
                </div>
                <p className="text-sm text-[#464555]">{m.deskripsi}</p>
                <ProgressBar value={pct} label={`${doneCount}/${m.stages.length} tahap`} />
                {m.locked ? (
                  <span className="text-sm text-[#aaa] text-center py-2">🔒 Segera hadir</span>
                ) : (
                  <Link
                    to={targetLink}
                    className="mt-auto inline-flex items-center justify-center gap-2 font-bold rounded-full px-5 py-2.5 text-sm text-white transition-all hover:brightness-110 focus-visible:ring-2 focus-visible:ring-blue-400 outline-none active:scale-95"
                    style={{
                      background: 'linear-gradient(to bottom, #68b6f7, #3d6b91)',
                      boxShadow:
                        '0 12px 18px -4px rgba(61,107,145,0.45), inset 0 2px 3px rgba(255,255,255,0.7), inset 0 -3px 0 #253f8a',
                    }}
                  >
                    {buttonLabel} →
                  </Link>
                )}
              </Card>
            );
          })}
        </div>
      </section>

      {/* SECTION 3: EVALUASI SUMATIF (POST-TEST TERPISAH & TERKUNCI) */}
      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-bold uppercase tracking-widest text-[#464555]">
          3. Evaluasi Sumatif Akhir (Post-test Terpisah)
        </h2>

        {isPosttestDone ? (
          <div className="p-4 rounded-2xl bg-[#eaf6ff] border border-[#a6d7ff] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#253f8a]">
            <div className="flex items-center gap-3">
              <span className="text-2xl">✅</span>
              <div>
                <span className="font-bold text-sm text-[#121c2c] block">
                  Post-test Sumatif Telah Dikirim &amp; Terekam
                </span>
                <span>
                  Jawaban dan alasan logismu sudah tersimpan untuk evaluasi guru (kunci jawaban tidak ditampilkan di sisi siswa).
                </span>
              </div>
            </div>
            <Link
              to="/tes/akhir"
              className="px-4 py-2 rounded-full text-xs font-bold bg-white border border-[#a6d7ff] text-[#253f8a] hover:bg-[#f4fbff] whitespace-nowrap"
            >
              Lihat Status Post-test →
            </Link>
          </div>
        ) : posttestAccess.unlocked ? (
          <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-purple-900 shadow-xs">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🏆</span>
              <div>
                <span className="font-bold text-sm block">Latihan Formatif Tuntas! Post-test Sumatif Terbuka</span>
                <span className="text-[#555]">
                  Kerjakan Post-test secara mandiri beserta alasan logisnya. Tidak ada kunci jawaban instan setelah pengiriman.
                </span>
              </div>
            </div>
            <Link
              to="/tes/akhir"
              className="px-5 py-2.5 rounded-full text-xs font-bold text-white bg-purple-700 hover:bg-purple-800 transition whitespace-nowrap shadow-sm"
            >
              Kerjakan Post-test CT →
            </Link>
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-amber-950">
            <div className="flex items-start gap-3">
              <span className="text-2xl select-none">🔒</span>
              <div>
                <span className="font-bold text-sm block">Post-test Sumatif Masih Terkunci</span>
                <span className="text-amber-900 block mt-0.5">{posttestAccess.reason}</span>
                {posttestAccess.missingStages.length > 0 && (
                  <span className="text-[11px] text-amber-800 block mt-1">
                    Tahap belum selesai:{' '}
                    <strong>
                      {posttestAccess.missingStages.map((s) => getStageDisplayLabel(s)).join(', ')}
                    </strong>
                  </span>
                )}
              </div>
            </div>
            <Link
              to="/tes/akhir"
              className="px-4 py-2 rounded-full text-xs font-semibold bg-white border border-amber-300 text-amber-900 hover:bg-amber-100 whitespace-nowrap"
            >
              Cek Status Kunci
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
