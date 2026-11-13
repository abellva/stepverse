import { Link } from 'react-router';
import { MATERI_LIST } from '../data/curriculum';
import { useAppStore } from '../store/useAppStore';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { ProgressBar } from '../components/ui/ProgressBar';

export default function BerandaPage() {
  const { user, progress, answers } = useAppStore();

  const pretestResult = answers['pretest_result'] as { score: number; total: number } | undefined;
  const isPretestDone = !!pretestResult;

  const posttestResult = answers['posttest_result'] as { score: number; total: number } | undefined;
  const isPosttestDone = !!posttestResult;

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-[#121c2c] mb-1">
          Selamat datang, {user?.nama ?? 'Siswa'}! 👋
        </h1>
        <p className="text-sm text-[#464555]">
          Ikuti alur pembelajaran berpikir komputasional dengan kasus kasir Kantin Bu Ani.
        </p>
      </div>

      {/* Collaborative Group Status Banner */}
      <div className="mb-6 p-4 rounded-3xl bg-white border border-[#bce0fd] flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-full bg-[#eaf6ff] border border-[#a6d7ff] flex items-center justify-center text-lg shrink-0">
            👥
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase font-extrabold tracking-wider text-[#253f8a]">
                Kolaborasi Kelompok PBL
              </span>
              {user?.kelompok ? (
                <span className="text-[10px] bg-green-100 text-green-800 font-bold px-2 py-0.5 rounded-full border border-green-200">
                  Kelompok {user.kelompok} Terpilih
                </span>
              ) : (
                <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full border border-amber-200">
                  Belum Ada Kelompok
                </span>
              )}
            </div>
            <p className="text-xs text-[#555] mt-0.5 leading-relaxed">
              {user?.kelompok
                ? `Kamu terdaftar di Kelompok ${user.kelompok}. Gunakan widget chat di pojok kanan bawah untuk berdiskusi real-time bersama tim.`
                : 'Pilih kelompok belajar (kuota ganjil maks 5 siswa) untuk berbagi peran Programmer & Komputer.'}
            </p>
          </div>
        </div>

        <Link
          to="/pilih-kelompok"
          className="px-4 py-2 rounded-full text-xs font-bold text-[#253f8a] bg-[#eaf6ff] hover:bg-[#d0ecff] border border-[#a6d7ff] transition active:scale-95 whitespace-nowrap shadow-xs"
        >
          {user?.kelompok ? '⚙️ Kelola Kelompok →' : '👉 Pilih Kelompok (1-5) →'}
        </Link>
      </div>

      {/* Pretest Banner Flow */}
      {!isPretestDone ? (
        <div className="mb-8 p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-[#eaf6ff] to-[#f4fbff] border border-[#a6d7ff] flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
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
              <h2 className="text-base font-bold text-[#121c2c]">Kerjakan Pretest CT Terlebih Dahulu</h2>
              <p className="text-xs text-[#555] mt-0.5 leading-relaxed">
                Sebelum memulai modul Materi 1 (Orientasi Video), silakan kerjakan 5 soal tes awal untuk mengukur pemahaman berpikir komputasionalmu.
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
        <div className="mb-6 p-3.5 rounded-2xl bg-green-50 border border-green-200 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-green-900 shadow-xs">
          <div className="flex items-center gap-2.5">
            <span className="text-lg">✅</span>
            <span>
              <strong>Pretest CT Selesai:</strong> Skor Awalmu <strong>{pretestResult.score}/100</strong>. Kamu telah membuka akses ke seluruh tahapan Materi 1.
            </span>
          </div>
          <Link to="/tes/awal" className="text-green-700 underline hover:text-green-900 font-medium whitespace-nowrap">
            Tinjau Jawaban Pretest →
          </Link>
        </div>
      )}

      {/* Posttest Banner Flow if Materi 1 completed */}
      {isPretestDone && progress['1-lab'] === 'done' && !isPosttestDone && (
        <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-purple-900 shadow-xs">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🏆</span>
            <div>
              <span className="font-bold text-sm block">Materi 1 Telah Selesai! Saatnya Evaluasi Akhir</span>
              <span className="text-[#666]">Uji kembali peningkatan pemahaman berpikir komputasionalmu melalui Posttest CT.</span>
            </div>
          </div>
          <Link
            to="/tes/akhir"
            className="px-5 py-2.5 rounded-full text-xs font-bold text-white bg-purple-700 hover:bg-purple-800 transition whitespace-nowrap shadow-sm"
          >
            Kerjakan Posttest CT →
          </Link>
        </div>
      )}

      {/* Daftar Materi Grid */}
      <h2 className="text-xs font-bold uppercase tracking-widest text-[#464555] mb-3">
        Daftar Modul Materi
      </h2>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {MATERI_LIST.map((m) => {
          const doneCount = m.stages.filter(
            (s) => progress[`${m.id}-${s}`] === 'done'
          ).length;
          const pct = (doneCount / m.stages.length) * 100;

          // Target link: if pretest not done, direct to pretest
          const targetLink = !isPretestDone && m.id === 1 ? '/tes/awal' : `/materi/${m.id}/video`;
          const buttonLabel = !isPretestDone && m.id === 1
            ? 'Kerjakan Pretest Dulu'
            : pct > 0
            ? 'Lanjutkan'
            : 'Mulai Belajar';

          return (
            <Card key={m.id} className="flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-xs text-[#464555] mb-1">Materi {m.id}</div>
                  <h2 className="font-bold text-[#121c2c] text-base leading-snug">
                    {m.judul}
                  </h2>
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
    </div>
  );
}
