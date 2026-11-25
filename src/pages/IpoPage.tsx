import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { MATERI_LIST, STAGE_LABELS } from '../data/curriculum';
import { Card } from '../components/ui/Card';
import { useAppStore } from '../store/useAppStore';
import { logEvent } from '../services/logger';

export interface IpoItem {
  id: string;
  label: string;
  category: 'input' | 'process' | 'output';
  isDistractor?: boolean;
  correctExplanation: string;
}

export const IPO_ITEMS: IpoItem[] = [
  {
    id: 'nama_barang',
    label: 'Nama barang (Tipe String)',
    category: 'input',
    correctExplanation: 'Nama barang adalah data masukan awal (Input) bertipe teks (String) yang diketikkan kasir.',
  },
  {
    id: 'harga_satuan',
    label: 'Harga satuan (Tipe Integer)',
    category: 'input',
    correctExplanation: 'Harga satuan adalah data numerik awal (Input) bertipe Integer yang dimasukkan kasir.',
  },
  {
    id: 'jumlah',
    label: 'Jumlah beli / porsi (Tipe Integer)',
    category: 'input',
    correctExplanation: 'Jumlah beli adalah data kuantitas awal (Input) bertipe Integer yang diinputkan pengguna.',
  },
  {
    id: 'hitung_total',
    label: 'total = harga_satuan × jumlah',
    category: 'process',
    correctExplanation: 'Formula total = harga_satuan * jumlah adalah instruksi pengolahan (Proses) matematika oleh CPU.',
  },
  {
    id: 'cetak_struk',
    label: 'Susun instruksi cetak (print)',
    category: 'process',
    correctExplanation: 'Perintah pemanggilan print() adalah instruksi Proses yang memerintahkan komputer menyajikan data.',
  },
  {
    id: 'total_harga',
    label: 'Total nominal bayar (Rp)',
    category: 'output',
    correctExplanation: 'Total nominal bayar adalah informasi hasil akhir (Output) dari kalkulasi yang disajikan ke pembeli.',
  },
  {
    id: 'struk',
    label: 'Struk nota belanja tercetak',
    category: 'output',
    correctExplanation: 'Struk belanja adalah bentuk keluaran fisik/layar (Output) yang diterima oleh pembeli kasir.',
  },
  // Distractors
  {
    id: 'nama_toko',
    label: 'Nama toko Bu Ani (Detail ekstra)',
    category: 'input',
    isDistractor: true,
    correctExplanation: 'Nama toko adalah detail statis yang tidak perlu diinput berulang kali dalam perhitungan kasir (abstraksi).',
  },
  {
    id: 'simpan_db',
    label: 'Kirim transaksi ke database cloud',
    category: 'process',
    isDistractor: true,
    correctExplanation: 'Penyimpanan database cloud belum dipelajari di Materi 1 dan bukan bagian inti kasir dasar.',
  },
];

const COLUMNS: { key: 'input' | 'process' | 'output'; label: string; icon: string; color: string }[] = [
  { key: 'input',   label: 'Input (Masukan)',   icon: '📥', color: '#eaf6ff' },
  { key: 'process', label: 'Proses (Pengolahan)', icon: '⚙️', color: '#fff8e6' },
  { key: 'output',  label: 'Output (Keluaran)',  icon: '📤', color: '#edfff4' },
];

export interface ItemEvaluation {
  placedCol: 'input' | 'process' | 'output';
  reason: string;
  status: 'bener' | 'mendekati' | 'salah';
  badgeLabel: string;
  feedback: string;
}

function evaluateItemReason(
  item: IpoItem,
  targetCol: 'input' | 'process' | 'output',
  reasonText: string
): ItemEvaluation {
  const clean = reasonText.trim().toLowerCase();
  const isColCorrect = item.category === targetCol;

  if (item.isDistractor) {
    return {
      placedCol: targetCol,
      reason: reasonText.trim(),
      status: 'mendekati',
      badgeLabel: '⚠️ Informasi Pengecoh (Distractor)',
      feedback: `Kartu ini merupakan informasi pengecoh: ${item.correctExplanation}`,
    };
  }

  // Jika kolom salah ditempatkan
  if (!isColCorrect) {
    const colName = targetCol === 'input' ? 'Input' : targetCol === 'process' ? 'Proses' : 'Output';
    const trueColName = item.category === 'input' ? 'Input' : item.category === 'process' ? 'Proses' : 'Output';
    return {
      placedCol: targetCol,
      reason: reasonText.trim(),
      status: 'salah',
      badgeLabel: '❌ Penempatan Salah',
      feedback: `Belum tepat! Kamu menempatkan "${item.label}" ke kolom ${colName}. Seharusnya masuk ke ${trueColName} karena: ${item.correctExplanation}`,
    };
  }

  // Kolom benar, cek kedalaman alasan logis
  if (clean.length < 8 || clean.includes('asal') || clean.includes('tebak') || clean.includes('gatau')) {
    return {
      placedCol: targetCol,
      reason: reasonText.trim(),
      status: 'mendekati',
      badgeLabel: '⚠️ Alasan Mendekati (Perlu Diperjelas)',
      feedback: `Penempatan kolommu sudah benar, tetapi alasan logismu masih terlalu singkat. Ingat: ${item.correctExplanation}`,
    };
  }

  return {
    placedCol: targetCol,
    reason: reasonText.trim(),
    status: 'bener',
    badgeLabel: '✅ Tepat & Logis (Bener)',
    feedback: `Luar biasa! Penempatan dan alasan logismu tepat: ${item.correctExplanation}`,
  };
}

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

export default function IpoPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const materiId = Number(id);
  const materi = MATERI_LIST.find((m) => m.id === materiId);
  const {
    setProgress,
    setAnswer,
    answers,
    demoMode,
    progress,
    enterStage,
  } = useAppStore();

  const savedAnswers = answers[`${materiId}-ipo`] as Record<string, 'input' | 'process' | 'output'> | undefined;
  const savedEvaluations = answers[`${materiId}-ipo-evaluations`] as Record<string, ItemEvaluation> | undefined;

  const [placed, setPlaced] = useState<Record<string, 'input' | 'process' | 'output'>>(savedAnswers ?? {});
  const [evaluations, setEvaluations] = useState<Record<string, ItemEvaluation>>(savedEvaluations ?? {});
  const [shuffled] = useState(() => shuffle(IPO_ITEMS));

  // Dialog Alasan tiap memilih blok
  const [activePrompt, setActivePrompt] = useState<{
    item: IpoItem;
    targetCol: 'input' | 'process' | 'output';
  } | null>(null);
  const [promptReason, setPromptReason] = useState('');
  const [viewingFeedbackItem, setViewingFeedbackItem] = useState<IpoItem | null>(null);

  useEffect(() => {
    enterStage('ipo');
  }, [enterStage, materiId]);

  if (!materi) return <div className="p-6 text-red-500">Materi tidak ditemukan.</div>;

  const unplaced = shuffled.filter((item) => !(item.id in placed));

  // Evaluasi kelayakan lanjut
  const requiredItems = IPO_ITEMS.filter((i) => !i.isDistractor);
  const allRequiredPlacedCorrectly = requiredItems.every(
    (i) => placed[i.id] === i.category && evaluations[i.id]?.status !== 'salah'
  );
  const placedDistractors = IPO_ITEMS.filter((i) => i.isDistractor && i.id in placed);
  const canProceed = progress[`${materiId}-ipo`] === 'done' || (allRequiredPlacedCorrectly && placedDistractors.length === 0);

  function handleInitiatePlace(item: IpoItem, col: 'input' | 'process' | 'output') {
    const existingReason = evaluations[item.id]?.reason ?? '';
    setPromptReason(existingReason);
    setActivePrompt({ item, targetCol: col });
  }

  function handleSaveReasonAndPlace() {
    if (!activePrompt || promptReason.trim().length < 4) return;
    const { item, targetCol } = activePrompt;
    const evalResult = evaluateItemReason(item, targetCol, promptReason);

    const nextPlaced = { ...placed, [item.id]: targetCol };
    const nextEvals = { ...evaluations, [item.id]: evalResult };

    setPlaced(nextPlaced);
    setEvaluations(nextEvals);
    setActivePrompt(null);
    setViewingFeedbackItem(item);

    setAnswer(`${materiId}-ipo`, nextPlaced);
    setAnswer(`${materiId}-ipo-evaluations`, nextEvals);

    // Cek apakah semua sudah tuntas dan tidak ada pengecoh tersisa di kolom
    const requiredDone = requiredItems.every(
      (req) => nextPlaced[req.id] === req.category && nextEvals[req.id]?.status !== 'salah'
    );
    const hasDistractor = Object.keys(nextPlaced).some((id) => IPO_ITEMS.find((it) => it.id === id)?.isDistractor);

    if (requiredDone && !hasDistractor) {
      setProgress(materiId, 'ipo', 'done');
      setProgress(materiId, 'dekomposisi', 'active');
      setAnswer(`${materiId}-ipo-score`, 100);
      logEvent({
        stage: 'ipo',
        componentId: 'ipo-complete',
        ctComponent: 'abstraction',
        result: 'pass',
        payload: { placed: nextPlaced, evals: nextEvals },
      });
    }
  }

  function handleRemoveItem(itemId: string) {
    const nextPlaced = { ...placed };
    delete nextPlaced[itemId];
    const nextEvals = { ...evaluations };
    delete nextEvals[itemId];

    setPlaced(nextPlaced);
    setEvaluations(nextEvals);
    setAnswer(`${materiId}-ipo`, nextPlaced);
    setAnswer(`${materiId}-ipo-evaluations`, nextEvals);

    const requiredDone = requiredItems.every(
      (req) => nextPlaced[req.id] === req.category && nextEvals[req.id]?.status !== 'salah'
    );
    const hasDistractor = Object.keys(nextPlaced).some((id) => IPO_ITEMS.find((it) => it.id === id)?.isDistractor);

    if (requiredDone && !hasDistractor) {
      setProgress(materiId, 'ipo', 'done');
      setProgress(materiId, 'dekomposisi', 'active');
      setAnswer(`${materiId}-ipo-score`, 100);
    }
  }

  function handleProceedToDekomposisi() {
    setProgress(materiId, 'ipo', 'done');
    setProgress(materiId, 'dekomposisi', 'active');
    setAnswer(`${materiId}-ipo-score`, 100);
    navigate(`/materi/${materiId}/dekomposisi`);
  }

  function handleDemoSkip() {
    setProgress(materiId, 'ipo', 'done');
    setProgress(materiId, 'dekomposisi', 'active');
    setAnswer(`${materiId}-ipo-score`, 100);
    navigate(`/materi/${materiId}/dekomposisi`);
  }

  const placedInColumn = (col: 'input' | 'process' | 'output') =>
    Object.entries(placed)
      .filter(([, v]) => v === col)
      .map(([k]) => IPO_ITEMS.find((i) => i.id === k)!)
      .filter(Boolean);

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-5">
      <div>
        <div className="text-xs text-[#464555] mb-1 uppercase tracking-widest font-semibold">
          Materi {materiId} · {STAGE_LABELS.ipo}
        </div>
        <h1 className="text-2xl font-bold text-[#121c2c]">{materi.judul}</h1>
        <p className="text-xs sm:text-sm text-[#464555] mt-1 leading-relaxed">
          Pilihlah kolom <strong>Input</strong>, <strong>Proses</strong>, atau <strong>Output</strong> untuk setiap kartu kasir di bawah.
          <strong> Setiap kali kamu memilih satu blok</strong>, tuliskan alasan logismu. Program akan langsung memeriksa alasan dan memberikan umpan balik adaptif!
        </p>
      </div>

      {/* Kartu yang belum ditempatkan */}
      <Card className="border border-[#bce0fd] p-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xs font-bold uppercase tracking-widest text-[#253f8a]">
            📦 Kartu Komponen Kasir yang Belum Ditempatkan ({unplaced.length} tersisa)
          </h2>
          <span className="text-[11px] text-slate-500">Klik kartu untuk memilih kolom &amp; isi alasan</span>
        </div>

        <div className="flex flex-wrap gap-2.5 min-h-[48px]">
          {unplaced.length === 0 ? (
            <span className="text-xs text-emerald-700 font-semibold italic bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
              🎉 Semua kartu sudah ditempatkan dan dianalisis alasan logisnya!
            </span>
          ) : (
            unplaced.map((item) => (
              <UnplacedCard
                key={item.id}
                item={item}
                onSelectCol={(col) => handleInitiatePlace(item, col)}
              />
            ))
          )}
        </div>
      </Card>

      {/* MODAL / PROMPT ALASAN TIAP KALI MEMILIH 1 BLOK */}
      {activePrompt && (
        <div className="fixed inset-0 z-50 bg-black/45 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border-2 border-[#68b6f7] shadow-2xl max-w-lg w-full p-5 flex flex-col gap-3.5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-[#eaf6ff] pb-2">
              <div className="flex items-center gap-2">
                <span className="text-xl">✍️</span>
                <h3 className="font-bold text-sm text-[#121c2c]">
                  Alasan Logis Penempatan Blok
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActivePrompt(null)}
                className="size-7 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 text-xs font-bold flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <div className="p-3 rounded-2xl bg-[#f4fbff] border border-[#a6d7ff] flex flex-col gap-1">
              <span className="text-[11px] text-[#253f8a] uppercase font-bold tracking-wide">
                Kartu yang Dipilih:
              </span>
              <span className="font-bold text-sm text-[#121c2c]">{activePrompt.item.label}</span>
              <span className="text-xs text-[#464555]">
                Ditempatkan ke Kolom:{' '}
                <strong className="text-[#253f8a] uppercase font-bold">
                  {activePrompt.targetCol}
                </strong>
              </span>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="prompt-reason-input" className="text-xs font-bold text-[#121c2c]">
                Mengapa kamu memilih kolom {activePrompt.targetCol.toUpperCase()} untuk blok ini? *
              </label>
              <textarea
                id="prompt-reason-input"
                rows={3}
                value={promptReason}
                onChange={(e) => setPromptReason(e.target.value)}
                placeholder="Tuliskan alasan logismu mengapa memilih kategori tersebut..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#bce0fd] text-xs text-[#121c2c] bg-white focus:outline-none focus:ring-2 focus:ring-[#68b6f7] resize-none"
              />
              <span className="text-[10px] text-slate-500">
                Wajib diisi minimal 4 karakter agar program dapat memeriksa ketepatan analisismu.
              </span>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1 border-t border-[#eaf6ff]">
              <button
                type="button"
                onClick={() => setActivePrompt(null)}
                className="px-4 py-2 rounded-full text-xs font-semibold text-[#464555] hover:bg-slate-100 transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveReasonAndPlace}
                disabled={promptReason.trim().length < 4}
                className="px-5 py-2 rounded-full text-xs font-bold text-white bg-[#253f8a] hover:brightness-110 disabled:opacity-40 transition shadow-sm"
              >
                ✓ Simpan &amp; Periksa Alasan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* POPUP TINJAUAN FEEDBACK ADAPTIF SAAT INI */}
      {viewingFeedbackItem && evaluations[viewingFeedbackItem.id] && (
        <div
          role="status"
          className={`p-4 rounded-2xl border-2 flex flex-col gap-1.5 transition ${
            evaluations[viewingFeedbackItem.id].status === 'bener'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
              : evaluations[viewingFeedbackItem.id].status === 'mendekati'
              ? 'bg-amber-50 border-amber-300 text-amber-950'
              : 'bg-red-50 border-red-300 text-red-950'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="font-bold text-xs uppercase tracking-wide">
              {evaluations[viewingFeedbackItem.id].badgeLabel} · {viewingFeedbackItem.label}
            </span>
            <button
              type="button"
              onClick={() => setViewingFeedbackItem(null)}
              className="text-xs font-bold hover:underline opacity-70"
            >
              ✕ Tutup Umpan Balik
            </button>
          </div>
          <p className="text-xs leading-relaxed font-medium">
            {evaluations[viewingFeedbackItem.id].feedback}
          </p>
        </div>
      )}

      {/* 3 Kolom IPO */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {COLUMNS.map((col) => {
          const itemsInCol = placedInColumn(col.key);
          return (
            <div key={col.key} className="flex flex-col gap-2">
              <div
                className="text-center font-bold text-xs sm:text-sm py-2 rounded-2xl border border-black/5"
                style={{ background: col.color }}
              >
                {col.icon} {col.label} ({itemsInCol.length})
              </div>

              <div
                className="min-h-[220px] rounded-2xl border-2 border-dashed border-[#c0d8ef] p-2.5 flex flex-col gap-2 transition"
                style={{ background: col.color + '55' }}
              >
                {itemsInCol.length === 0 ? (
                  <span className="text-[11px] text-slate-400 italic text-center my-auto">
                    Belum ada kartu di kolom {col.label}
                  </span>
                ) : (
                  itemsInCol.map((item) => {
                    const ev = evaluations[item.id];
                    const isCorrect = ev?.status === 'bener';
                    const isMendekati = ev?.status === 'mendekati';
                    return (
                      <div
                        key={item.id}
                        className={`p-3 rounded-2xl border shadow-xs flex flex-col gap-1.5 transition ${
                          isCorrect
                            ? 'bg-emerald-50/90 border-emerald-300'
                            : isMendekati
                            ? 'bg-amber-50/90 border-amber-300'
                            : 'bg-red-50/90 border-red-300'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-1">
                          <span className="font-bold text-xs text-[#121c2c] leading-snug">
                            {item.label}
                          </span>
                          <div className="flex items-center gap-1 shrink-0">
                            <span className="text-xs">
                              {isCorrect ? '✅' : isMendekati ? '⚠️' : '❌'}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(item.id)}
                              className="text-slate-400 hover:text-red-500 text-xs px-1"
                              title="Hapus dan tempatkan ulang"
                            >
                              ✕
                            </button>
                          </div>
                        </div>

                        {ev && (
                          <div className="text-[11px] text-[#464555] bg-white/80 p-2 rounded-xl border border-current/20 leading-relaxed">
                            <span className="font-bold block text-[10px] text-[#253f8a]">
                              Alasanmu: &ldquo;{ev.reason}&rdquo;
                            </span>
                            <span className="block mt-0.5 font-medium">{ev.feedback}</span>
                          </div>
                        )}

                        <div className="flex justify-end gap-1 pt-0.5">
                          <button
                            type="button"
                            onClick={() => handleInitiatePlace(item, col.key)}
                            className="text-[10px] font-semibold text-[#253f8a] hover:underline"
                          >
                            ✎ Edit Alasan / Pindah
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Alert jika kartu pengecoh masih ditaruh di kolom */}
      {placedDistractors.length > 0 && (
        <div className="p-3.5 rounded-2xl bg-amber-50 border-2 border-amber-300 text-xs text-amber-950 flex items-start gap-2.5 shadow-xs">
          <span className="text-xl shrink-0">💡</span>
          <div className="flex flex-col gap-1">
            <strong className="font-bold text-amber-900">Perhatian Abstraksi Berpikir Komputasional:</strong>
            <p className="leading-relaxed">
              Kamu menempatkan kartu pengecoh (<strong>{placedDistractors.map((d) => d.label).join(', ')}</strong>) ke dalam kolom kasir.
              Sesuai prinsip <em>Abstraksi</em>, informasi yang tidak dibutuhkan dalam perhitungan kasir harus disaring dan dikeluarkan.
              Silakan klik tanda silang (✕) pada kartu tersebut untuk mengeluarkannya dari kolom.
            </p>
          </div>
        </div>
      )}

      {/* Ringkasan & Tombol Aksi */}
      <Card className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 border border-[#bce0fd]">
        <div className="text-xs text-[#464555] flex flex-col gap-0.5">
          <span>
            Kartu inti teranalisis:{' '}
            <strong>
              {requiredItems.filter((i) => placed[i.id] === i.category && evaluations[i.id]?.status !== 'salah').length}
            </strong>{' '}
            / {requiredItems.length} kartu
          </span>
          {!canProceed && (
            <span className="text-amber-800 font-semibold text-[11px]">
              {placedDistractors.length > 0
                ? '⚠️ Keluarkan kartu pengecoh dari kolom untuk menuntaskan tahap Abstraksi.'
                : '⚠️ Pastikan seluruh kartu inti ditempatkan di kolom yang tepat dan alasan logisnya sudah terisi.'}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {demoMode && (
            <button
              type="button"
              onClick={handleDemoSkip}
              className="px-3.5 py-2 rounded-full text-xs font-semibold text-amber-900 bg-amber-200 hover:bg-amber-300 transition"
            >
              🎬 Demo: Lewati IPO
            </button>
          )}

          <button
            type="button"
            onClick={handleProceedToDekomposisi}
            disabled={!canProceed}
            className="px-6 py-2.5 rounded-full font-bold text-xs sm:text-sm text-white transition hover:brightness-110 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed shadow-md"
            style={{
              background: canProceed ? 'linear-gradient(to bottom, #68b6f7, #253f8a)' : '#94a3b8',
            }}
          >
            Lanjut ke Dekomposisi →
          </button>
        </div>
      </Card>
    </div>
  );
}

// Komponen kartu belum ditempatkan dengan menu pilih kolom
function UnplacedCard({
  item,
  onSelectCol,
}: {
  item: IpoItem;
  onSelectCol: (col: 'input' | 'process' | 'output') => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="px-3 py-2 rounded-xl text-xs font-bold text-[#253f8a] bg-[#eaf6ff] border border-[#a6d7ff] hover:bg-[#d0ecff] transition flex items-center gap-1.5 shadow-2xs"
      >
        <span>{item.label}</span>
        <span className="text-[10px] opacity-70">▼</span>
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 z-20 bg-white rounded-2xl shadow-xl border-2 border-[#a6d7ff] flex flex-col overflow-hidden min-w-[150px] animate-in fade-in duration-100">
          <span className="px-3 py-1 bg-slate-100 text-[10px] font-bold text-slate-600">
            Pilih Kolom:
          </span>
          {(['input', 'process', 'output'] as const).map((col) => (
            <button
              key={col}
              type="button"
              onClick={() => {
                setOpen(false);
                onSelectCol(col);
              }}
              className="px-3.5 py-2 text-xs font-semibold text-left hover:bg-[#eaf6ff] hover:text-[#253f8a] transition capitalize"
            >
              → {col === 'input' ? '📥 Input' : col === 'process' ? '⚙️ Proses' : '📤 Output'}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
