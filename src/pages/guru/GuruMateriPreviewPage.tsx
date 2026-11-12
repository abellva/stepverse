import { useRef, useState } from 'react';
import { MATERI_LIST, STAGE_LABELS } from '../../data/curriculum';
import pretestQuestions from '../../data/pretest-questions.json';
import posttestQuestions from '../../data/posttest-questions.json';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { CT_COMPONENT_BY_KEY } from '../../utils/teacherAnalytics';
import { formatPauseTime, getSortedPausePoints } from '../../utils/videoPausePoints';

type PreviewTab = 'alur' | 'pretest' | 'posttest';

interface QuestionBankItem {
  id: string;
  ctComponent: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

const STAGE_GUIDE_ITEMS = [
  {
    key: 'video',
    badge: 'Tahap 1',
    title: STAGE_LABELS.video,
    summary:
      'Siswa menonton video pembelajaran konsep variabel & kotak memori (kasus Kantin Bu Ani) lengkap dengan jeda aktivitas otomatis.',
    rubric:
      'Jeda 1 (02:29): Aktivitas Kinestetik wajib (peran Memori & CPU, timer & ceklis). Jeda 2 (03:06): Prediksi nilai total_harga 16000 vs 24000 (opsional).',
  },
  {
    key: 'ipo',
    badge: 'Tahap 2',
    title: STAGE_LABELS.ipo,
    summary:
      'Siswa mengelompokkan komponen masalah kasir ke kolom Input, Proses, dan Output sambil menyaring item pengecoh.',
    rubric:
      'Input valid: Nama barang, Harga satuan (Rp), Jumlah beli. Proses valid: Hitung total = harga_satuan × jumlah, Cetak struk belanja. Output valid: Total harga (Rp), Struk belanja tercetak. Pengecoh: Nama toko Bu Ani, Simpan ke database.',
  },
  {
    key: 'dekomposisi',
    badge: 'Tahap 3',
    title: STAGE_LABELS.dekomposisi,
    summary:
      'Siswa menyusun 4 langkah algoritma kasir secara berurutan (drag-and-drop) dan mengabaikan langkah pengecoh.',
    rubric:
      'Urutan benar: (1) Terima input nama, harga, & jumlah → (2) Hitung total = harga_satuan × jumlah → (3) Susun format teks struk belanja → (4) Cetak nota / struk ke layar. Pengecoh: Simpan ke database server, Minta login password kasir.',
  },
  {
    key: 'parsons',
    badge: 'Tahap 4',
    title: STAGE_LABELS.parsons,
    summary:
      'Scaffolding bertahap dari menyusun blok kode Python utuh (Level 1), melengkapi bagian kosong/fading (Level 2), menuju penulisan bebas di Lab (Level 3).',
    rubric:
      'Siswa wajib menuntaskan Level 1 sebelum Level 2 terbuka agar memahami sintaks penugasan variabel Python secara berurutan.',
  },
  {
    key: 'lab',
    badge: 'Tahap 5',
    title: STAGE_LABELS.lab,
    summary:
      'Siswa melengkapi kode Python di editor browser (Pyodide) dan menguji program dengan test case otomatis.',
    rubric:
      'Skor awal 100. Penggunaan bantuan (Hint Ladder Level 1–3) mengurangi skor (-10 / -25 / -50, skor minimum 50) yang langsung terekam ke Dasbor Guru.',
  },
];

function QuestionBankSection({
  title,
  subtitle,
  questions,
  showAnswerKey,
}: {
  title: string;
  subtitle: string;
  questions: QuestionBankItem[];
  showAnswerKey: boolean;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-0.5">
        <h2 className="text-lg font-bold text-[#121c2c]">{title}</h2>
        <p className="text-xs text-[#464555]">{subtitle}</p>
      </div>

      {questions.map((item, idx) => {
        const ctMeta = CT_COMPONENT_BY_KEY[item.ctComponent];
        return (
          <Card key={item.id} className="flex flex-col gap-3 border border-[#bce0fd]">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#eaf6ff] text-[#253f8a] border border-[#bce0fd]">
                  Soal {idx + 1}
                </span>
                {ctMeta && (
                  <span className="text-xs font-semibold text-[#464555]">
                    {ctMeta.icon} Indikator: {ctMeta.label}
                  </span>
                )}
              </div>
              <span className="text-[11px] font-mono text-[#64748b]">{item.id}</span>
            </div>

            <div className="text-sm font-semibold text-[#121c2c] whitespace-pre-line leading-relaxed">
              {item.question}
            </div>

            <div className="grid gap-2">
              {item.options.map((opt, optIdx) => {
                const isCorrect = optIdx === item.correctIndex;
                const letter = String.fromCharCode(65 + optIdx);
                const highlightCorrect = showAnswerKey && isCorrect;

                return (
                  <div
                    key={optIdx}
                    className={`px-3.5 py-2.5 rounded-2xl border text-xs flex items-start justify-between gap-3 ${
                      highlightCorrect
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-semibold'
                        : 'bg-[#f8fbff] border-[#e2effc] text-[#334155]'
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <span
                        className={`size-5 shrink-0 rounded-full flex items-center justify-center text-[11px] font-bold ${
                          highlightCorrect
                            ? 'bg-emerald-600 text-white'
                            : 'bg-white border border-[#c0d8ef] text-[#253f8a]'
                        }`}
                      >
                        {letter}
                      </span>
                      <span className="leading-relaxed">{opt}</span>
                    </div>
                    {highlightCorrect && (
                      <span className="shrink-0 text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                        ✓ Kunci Jawaban
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {showAnswerKey && (
              <div className="p-3 rounded-2xl bg-[#f4fbff] border border-[#d0ecff] text-xs text-[#253f8a] leading-relaxed">
                <span className="font-bold block mb-0.5">💡 Pembahasan Guru:</span>
                {item.explanation}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}

export default function GuruMateriPreviewPage() {
  const [activeTab, setActiveTab] = useState<PreviewTab>('alur');
  const [showAnswerKey, setShowAnswerKey] = useState(true);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const materi1 = MATERI_LIST[0];
  const pausePoints = getSortedPausePoints(materi1?.pausePoints);

  function jumpToTimestamp(seconds: number) {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = seconds;
    void video.play().catch(() => {
      // Abaikan jika browser menahan autoplay; posisi waktu sudah berpindah
    });
  }

  return (
    <div className="max-w-5xl mx-auto flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <div className="text-xs text-[#464555] mb-1 uppercase tracking-widest font-semibold">
            Tinjauan Kurikulum Guru
          </div>
          <h1 className="text-2xl font-bold text-[#121c2c]">
            Pratinjau Materi & Bank Soal (Read-Only)
          </h1>
          <p className="text-xs text-[#464555] mt-1">
            Tinjau struktur pembelajaran, video materi, rubrik latihan, serta soal & kunci jawaban Pretest–Posttest tanpa memengaruhi data siswa.
          </p>
        </div>

        <Badge variant="info">🔒 Mode Hanya Lihat</Badge>
      </div>

      {/* Info Banner */}
      <div className="p-4 rounded-2xl bg-[#f4fbff] border border-[#bce0fd] text-xs text-[#253f8a] flex items-start gap-3 shadow-xs">
        <span className="text-lg leading-none select-none">ℹ️</span>
        <div className="leading-relaxed">
          <strong>Khusus Akun Guru:</strong> Halaman pengerjaan siswa (Pretest, aktivitas interaktif, Lab Python, dan Posttest) dinonaktifkan untuk akun guru agar guru tidak tercatat mengerjakan tes sebagai peserta didik. Gunakan tab di bawah untuk persiapan mengajar atau presentasi di kelas.
        </div>
      </div>

      {/* Tabs + Show/Hide Answer Key Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: 'alur' as const, label: '📖 Alur Materi & Video' },
            { id: 'pretest' as const, label: `📝 Bank Soal Pretest (${pretestQuestions.length})` },
            { id: 'posttest' as const, label: `🏆 Bank Soal Posttest (${posttestQuestions.length})` },
          ].map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  active
                    ? 'text-white shadow-sm'
                    : 'bg-white text-[#253f8a] border border-[#c0d8ef] hover:bg-[#eaf6ff]'
                }`}
                style={
                  active
                    ? {
                        background: 'linear-gradient(to bottom, #68b6f7, #3d6b91)',
                        boxShadow:
                          '0 8px 14px -4px rgba(61,107,145,0.4), inset 0 1px 2px rgba(255,255,255,0.6), inset 0 -2px 0 #253f8a',
                      }
                    : undefined
                }
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {activeTab !== 'alur' && (
          <button
            type="button"
            onClick={() => setShowAnswerKey((prev) => !prev)}
            className="px-3.5 py-2 rounded-full text-xs font-semibold bg-white border border-[#c0d8ef] text-[#253f8a] hover:bg-[#eaf6ff] transition cursor-pointer"
          >
            {showAnswerKey ? '🙈 Sembunyikan Kunci Jawaban' : '👁️ Tampilkan Kunci Jawaban'}
          </button>
        )}
      </div>

      {/* Tab Content */}
      {activeTab === 'alur' && (
        <div className="flex flex-col gap-6">
          {/* Alur Belajar Utama */}
          <Card className="border border-[#bce0fd] flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="font-bold text-base text-[#121c2c]">
                  Alur Belajar Wajib Siswa
                </h2>
                <p className="text-xs text-[#464555]">
                  Urutan aktivitas yang harus dilalui siswa secara berurutan pada Materi 1.
                </p>
              </div>
              <Badge variant="active">Materi 1 Aktif</Badge>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              {[
                '1. Pretest CT (Wajib Awal)',
                '2. Orientasi Video + Jeda',
                '3. Analisis IPO',
                '4. Dekomposisi',
                '5. Parsons (L1→L2)',
                '6. Lab Python',
                '7. Posttest CT (Akhir)',
              ].map((step) => (
                <span
                  key={step}
                  className="px-3 py-1.5 rounded-full bg-[#eaf6ff] text-[#253f8a] font-semibold border border-[#bce0fd]"
                >
                  {step}
                </span>
              ))}
            </div>
          </Card>

          {/* Pratinjau Video Materi 1 (bebas navigasi untuk guru) */}
          {materi1?.videoSrc && (
            <Card className="border border-[#bce0fd] flex flex-col gap-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="font-bold text-base text-[#121c2c]">
                    Pratinjau Video — Materi 1: {materi1.judul}
                  </h2>
                  <p className="text-xs text-[#464555]">
                    Khusus guru: pemutaran video bebas tanpa kunci jeda sehingga mudah dipresentasikan di kelas.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {pausePoints.map((pp) => (
                    <button
                      key={pp.id}
                      type="button"
                      onClick={() => jumpToTimestamp(pp.time)}
                      className="px-3 py-1.5 rounded-full text-xs font-semibold bg-[#eaf6ff] text-[#253f8a] border border-[#a6d7ff] hover:bg-[#d0ecff] transition cursor-pointer"
                    >
                      ⏱ Lompat ke {formatPauseTime(pp.time)} ({pp.type === 'kinesthetic' ? 'Simulasi' : 'Prediksi'})
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl overflow-hidden bg-black aspect-video border border-[#c0d8ef]">
                <video
                  ref={videoRef}
                  src={materi1.videoSrc}
                  controls
                  preload="metadata"
                  className="w-full h-full object-contain"
                />
              </div>

              {pausePoints.length > 0 && (
                <div className="grid gap-2 sm:grid-cols-2">
                  {pausePoints.map((pp) => (
                    <div
                      key={pp.id}
                      className="p-3 rounded-2xl bg-[#f8fbff] border border-[#d0ecff] text-xs flex flex-col gap-1"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-[#121c2c]">
                          {pp.title ?? (pp.type === 'kinesthetic' ? 'Aktivitas Kinestetik' : 'Pertanyaan Prediksi')}
                        </span>
                        <span className="font-mono font-bold text-[#253f8a]">
                          {formatPauseTime(pp.time)}
                        </span>
                      </div>
                      <span className="text-[#464555]">
                        Sifat: <strong>{pp.optional ? 'Opsional (bisa dilewati siswa)' : 'Wajib diselesaikan sebelum video lanjut'}</strong>
                      </span>
                      {pp.prediction && (
                        <span className="text-[#253f8a]">
                          Pertanyaan: “{pp.prediction.question}” (Jawaban benar:{' '}
                          <strong>{pp.prediction.options.find((o) => o.isCorrect)?.label}</strong>)
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}

          {/* Panduan & Kunci Referensi Tiap Tahap */}
          <div>
            <h2 className="text-xs font-bold uppercase tracking-widest text-[#464555] mb-3">
              Rincian Tahap & Kunci Referensi Materi 1
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              {STAGE_GUIDE_ITEMS.map((stage) => (
                <Card key={stage.key} className="border border-[#bce0fd] flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-bold text-sm text-[#121c2c]">{stage.title}</h3>
                    <Badge variant="info">{stage.badge}</Badge>
                  </div>
                  <p className="text-xs text-[#464555] leading-relaxed">{stage.summary}</p>
                  <div className="mt-auto p-3 rounded-2xl bg-[#f4fbff] border border-[#d0ecff] text-xs text-[#253f8a] leading-relaxed">
                    <span className="font-bold block mb-0.5">Kunci / Rubrik Guru:</span>
                    {stage.rubric}
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Peta Modul Keseluruhan */}
          <div>
            <h2 className="text-xs font-bold uppercase tracking-widest text-[#464555] mb-3">
              Peta Kurikulum Modul StepVerse
            </h2>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {MATERI_LIST.map((m) => (
                <Card key={m.id} className="flex flex-col gap-2 border border-[#e2effc]">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-[#464555]">Materi {m.id}</span>
                    <Badge variant={m.locked ? 'locked' : 'active'}>
                      {m.locked ? 'Segera Hadir' : 'Aktif'}
                    </Badge>
                  </div>
                  <div className="font-bold text-sm text-[#121c2c]">{m.judul}</div>
                  <p className="text-xs text-[#464555]">{m.deskripsi}</p>
                </Card>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'pretest' && (
        <QuestionBankSection
          title="Bank Soal Pretest CT"
          subtitle="Dikerjakan siswa sebelum membuka Materi 1 untuk mengukur pemahaman awal mengenai konsep variabel Python."
          questions={pretestQuestions as QuestionBankItem[]}
          showAnswerKey={showAnswerKey}
        />
      )}

      {activeTab === 'posttest' && (
        <QuestionBankSection
          title="Bank Soal Posttest CT"
          subtitle="Dikerjakan siswa setelah menuntaskan seluruh tahapan Materi 1 hingga Lab Python."
          questions={posttestQuestions as QuestionBankItem[]}
          showAnswerKey={showAnswerKey}
        />
      )}
    </div>
  );
}

