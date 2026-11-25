import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  useDroppable,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { MATERI_LIST, STAGE_LABELS } from '../data/curriculum';
import { Card } from '../components/ui/Card';
import { useAppStore } from '../store/useAppStore';

interface DekomCard {
  id: string;
  label: string;
  hint: string;
  isDistractor?: boolean;
  correctSlot: number; // 1-4, 0 = distractor (should not be placed)
}

const CARDS: DekomCard[] = [
  { id: 'input-data',    label: 'Terima input nama, harga, & jumlah',        hint: 'Program harus menerima data barang yang dibeli terlebih dahulu.', correctSlot: 1 },
  { id: 'hitung',        label: 'Hitung total = harga_satuan × jumlah',      hint: 'Lakukan proses perkalian nilai harga dan kuantitas barang.', correctSlot: 2 },
  { id: 'format-struk',  label: 'Susun format teks struk belanja',            hint: 'Rangkum nama barang dan total belanja dalam teks rapi.', correctSlot: 3 },
  { id: 'cetak',         label: 'Cetak nota / struk ke layar (print)',       hint: 'Tampilkan struk final kepada pembeli kasir.', correctSlot: 4 },
  // Distractors
  { id: 'simpan-db',     label: 'Simpan transaksi ke database server',        hint: 'Pada program dasar Materi 1, kita belum memakai database.', isDistractor: true, correctSlot: 0 },
  { id: 'login',         label: 'Minta login password kasir',                 hint: 'Program kasir sederhana belum membutuhkan modul otentikasi login.', isDistractor: true, correctSlot: 0 },
];

const SLOT_LABELS = [
  'Langkah 1: Terima Input',
  'Langkah 2: Proses Hitung',
  'Langkah 3: Susun Format',
  'Langkah 4: Cetak Output',
];

export interface DekomEvaluation {
  status: 'bener' | 'mendekati' | 'salah';
  badgeLabel: string;
  badgeClass: string;
  feedback: string;
}

function evaluateDekomposisiReason(slots: (DekomCard | null)[], reasonText: string): DekomEvaluation {
  const allFilled = slots.every(Boolean);
  const allCorrect = allFilled && slots.every((card, i) => card && card.correctSlot === i + 1);
  const clean = reasonText.trim().toLowerCase();

  if (!allCorrect) {
    return {
      status: 'salah',
      badgeLabel: '❌ Urutan Langkah Belum Sesuai',
      badgeClass: 'bg-red-50 text-red-950 border-red-300',
      feedback:
        'Urutan langkah dekomposisi belum tepat atau terdapat kartu pengecoh yang keliru dimasukkan. Pastikan program menerima input sebelum menghitung, dan mencetak nota setelah kalkulasi selesai.',
    };
  }

  if (clean.length < 8 || clean.includes('gatau') || clean.includes('asal') || clean.includes('tebak')) {
    return {
      status: 'mendekati',
      badgeLabel: '⚠️ Alasan Mendekati (Perlu Diperjelas)',
      badgeClass: 'bg-amber-50 text-amber-950 border-amber-300',
      feedback:
        'Urutan langkah sudah benar! Namun alasan logismu masih terlalu singkat. Jelaskan mengapa input harus mendahului perhitungan dan mengapa kartu database/login diabaikan.',
    };
  }

  const hasSequenceConcept = /input|masuk|data|hitung|kali|proses|cetak|struk|nota|tampil|output|urut|sebelum|sesudah|awal|akhir/i.test(clean);
  const hasAbstractionConcept = /abstraksi|saring|filter|buang|tidak|pengecoh|distractor|database|login|belum/i.test(clean);

  if (hasSequenceConcept && hasAbstractionConcept) {
    return {
      status: 'bener',
      badgeLabel: '✅ Alasan Sangat Tepat & Logis (Bener)',
      badgeClass: 'bg-emerald-50 text-emerald-950 border-emerald-300',
      feedback:
        'Luar biasa! Pemikiran komputasionalmu lengkap: kamu memahami bahwa input data harus tersedia sebelum proses perkalian, struk dicetak di akhir, dan kartu database/login disaring melalui abstraksi karena belum diperlukan.',
    };
  }

  if (hasSequenceConcept) {
    return {
      status: 'bener',
      badgeLabel: '✅ Logika Urutan Tepat (Bener)',
      badgeClass: 'bg-emerald-50 text-emerald-950 border-emerald-300',
      feedback:
        'Tepat sekali! Kamu memahami urutan eksekusi logis program kasir: data diterima (input), dihitung totalnya (proses), lalu disajikan struknya (output).',
    };
  }

  return {
    status: 'mendekati',
    badgeLabel: '⚠️ Alasan Mendekati',
    badgeClass: 'bg-amber-50 text-amber-950 border-amber-300',
    feedback:
      'Urutan langkah sudah tepat! Alasanmu sudah cukup baik, namun ingat prinsip dekomposisi: data kasir harus ada terlebih dahulu sebelum dikalikan.',
  };
}

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

export default function DekomposisiPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const materiId = Number(id);
  const materi = MATERI_LIST.find((m) => m.id === materiId);
  const {
    setProgress,
    setAnswer,
    incrementAttempt,
    answers,
    demoMode,
    progress,
    enterStage,
    recordStageFailure,
  } = useAppStore();

  const savedSlots = answers[`${materiId}-dekomposisi`] as (string | null)[] | undefined;
  const savedReason = (answers[`${materiId}-dekomposisi-reason`] as string | undefined) ?? '';
  const savedReasonEval = answers[`${materiId}-dekomposisi-evaluation`] as DekomEvaluation | undefined;

  const [pool, setPool] = useState<DekomCard[]>(() => shuffle(CARDS));
  const [slots, setSlots] = useState<(DekomCard | null)[]>(
    savedSlots
      ? savedSlots.map((s) => (s ? CARDS.find((c) => c.id === s) ?? null : null))
      : [null, null, null, null]
  );
  const [reason, setReason] = useState<string>(savedReason);
  const [reasonEval, setReasonEval] = useState<DekomEvaluation | null>(savedReasonEval ?? null);
  const [feedback, setFeedback] = useState<('correct' | 'wrong' | null)[]>([null, null, null, null]);
  const [checked, setChecked] = useState(false);
  const [canProceed, setCanProceed] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  useEffect(() => {
    enterStage('dekomposisi');
  }, [enterStage, materiId]);

  useEffect(() => {
    if (progress[`${materiId}-dekomposisi`] === 'done') setCanProceed(true);
  }, [materiId, progress]);

  // Remove placed cards from pool on mount
  useEffect(() => {
    const placedIds = new Set(slots.filter(Boolean).map((c) => c!.id));
    setPool(shuffle(CARDS.filter((c) => !placedIds.has(c.id))));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!materi) return <div className="p-6 text-red-500">Materi tidak ditemukan.</div>;

  const isReasonValid = reason.trim().length >= 5;

  function placeCard(card: DekomCard, slotIndex: number) {
    const prev = slots[slotIndex];
    const newSlots = [...slots];
    newSlots[slotIndex] = card;
    setSlots(newSlots);
    setPool((p) => {
      const next = p.filter((c) => c.id !== card.id);
      if (prev) next.push(prev);
      return next;
    });
    setFeedback([null, null, null, null]);
    setChecked(false);
  }

  function removeFromSlot(slotIndex: number) {
    const card = slots[slotIndex];
    if (!card) return;
    const newSlots = [...slots];
    newSlots[slotIndex] = null;
    setSlots(newSlots);
    setPool((p) => [...p, card]);
    setFeedback([null, null, null, null]);
    setChecked(false);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;
    const overId = String(over.id);

    // Dropped on a slot
    if (overId.startsWith('slot-')) {
      const slotIdx = Number(overId.replace('slot-', ''));
      const card = pool.find((c) => c.id === active.id) ?? slots.find((c) => c?.id === active.id) ?? null;
      if (!card) return;

      const fromSlot = slots.findIndex((c) => c?.id === active.id);
      if (fromSlot !== -1 && fromSlot !== slotIdx) {
        const newSlots = [...slots];
        newSlots[fromSlot] = null;
        setSlots(newSlots);
      }
      placeCard(card, slotIdx);
      return;
    }

    // Reorder inside pool
    if (!overId.startsWith('slot-')) {
      const oldIdx = pool.findIndex((c) => c.id === active.id);
      const newIdx = pool.findIndex((c) => c.id === overId);
      if (oldIdx !== -1 && newIdx !== -1) {
        setPool(arrayMove(pool, oldIdx, newIdx));
      }
    }
  }

  function handleCheck() {
    incrementAttempt(`${materiId}-dekomposisi`);
    const fb: ('correct' | 'wrong' | null)[] = slots.map((card, i) => {
      if (!card) return null;
      return card.correctSlot === i + 1 ? 'correct' : 'wrong';
    });
    setFeedback(fb);
    setChecked(true);

    const evaluation = evaluateDekomposisiReason(slots, reason);
    setReasonEval(evaluation);
    setAnswer(`${materiId}-dekomposisi-evaluation`, evaluation);
    setAnswer(`${materiId}-dekomposisi-reason`, reason.trim());

    const allCorrect = slots.every((card, i) => card && card.correctSlot === i + 1);
    const isReasonAcceptable = evaluation.status !== 'salah';

    import('../services/logger').then(({ logEvent }) => {
      logEvent({
        stage: 'dekomposisi',
        componentId: 'dekomposisi-check',
        ctComponent: 'decomposition',
        result: allCorrect && isReasonAcceptable ? 'pass' : 'fail',
        payload: {
          slots: slots.map((c) => c?.id ?? null),
          reason: reason.trim(),
          evaluation,
        },
      });
    });

    if (allCorrect && isReasonAcceptable) {
      setCanProceed(true);
      setAnswer(`${materiId}-dekomposisi`, slots.map((c) => c?.id ?? null));
      setAnswer(`${materiId}-dekomposisi-score`, 100);
      setProgress(materiId, 'dekomposisi', 'done');
      setProgress(materiId, 'parsons', 'active');
    } else {
      setCanProceed(false);
      recordStageFailure('dekomposisi');
    }
  }

  function handleProceedToParsons() {
    setAnswer(`${materiId}-dekomposisi`, slots.map((c) => c?.id ?? null));
    setAnswer(`${materiId}-dekomposisi-score`, 100);
    setProgress(materiId, 'dekomposisi', 'done');
    setProgress(materiId, 'parsons', 'active');
    navigate(`/materi/${materiId}/parsons`);
  }

  function handleDemoSkip() {
    setAnswer(`${materiId}-dekomposisi`, slots.map((c) => c?.id ?? null));
    setAnswer(`${materiId}-dekomposisi-score`, 100);
    setProgress(materiId, 'dekomposisi', 'done');
    setProgress(materiId, 'parsons', 'active');
    navigate(`/materi/${materiId}/parsons`);
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="text-xs text-[#464555] mb-1 uppercase tracking-widest font-semibold">
        Materi {materiId} · {STAGE_LABELS.dekomposisi}
      </div>
      <h1 className="text-2xl font-bold text-[#121c2c] mb-2">{materi.judul}</h1>
      <p className="text-sm text-[#464555] mb-6 leading-relaxed">
        <strong>Komponen Berpikir Komputasional: Dekomposisi.</strong><br />
        Pecahlah persoalan kasir Bu Ani menjadi 4 langkah berurutan yang logis.
        Kamu bisa <strong>menyeret kartu (drag & drop)</strong> ke dalam slot, atau <strong>klik kartu</strong> lalu pilih langkah tujuannya.
        Waspadai 2 kartu pengecoh (distractor) yang tidak diperlukan!
      </p>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        {/* Pool of Cards */}
        <Card className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-bold uppercase tracking-widest text-[#464555]">
              Pilihan Kartu Masalah (Seret atau Klik)
            </h2>
            <span className="text-xs text-[#888] font-mono">
              Tersisa: {pool.length} kartu
            </span>
          </div>
          <SortableContext items={pool.map((c) => c.id)} strategy={verticalListSortingStrategy}>
            <div className="flex flex-wrap gap-2.5 min-h-[48px] p-2 bg-[#f4fbff] rounded-2xl border border-dashed border-[#c0d8ef]">
              {pool.map((card) => (
                <PoolCard key={card.id} card={card} slots={slots} onPlace={placeCard} />
              ))}
              {pool.length === 0 && (
                <div className="text-xs text-[#888] italic py-2 px-3">
                  Semua kartu telah ditempatkan ke dalam langkah di bawah.
                </div>
              )}
            </div>
          </SortableContext>
        </Card>

        {/* 4 Ordered Slots */}
        <div className="flex flex-col gap-3 mb-6">
          {SLOT_LABELS.map((label, i) => (
            <DroppableSlot
              key={i}
              index={i}
              label={label}
              card={slots[i]}
              feedback={feedback[i]}
              onRemove={() => removeFromSlot(i)}
            />
          ))}
        </div>
      </DndContext>

      {/* Kolom Alasan Logis */}
      <Card className="mb-5 border border-[#bce0fd]">
        <label
          htmlFor="dekomposisi-reason"
          className="text-xs font-bold text-[#253f8a] flex items-center justify-between gap-2 mb-1.5"
        >
          <span>✍️ Alasan Logis Penyusunan Urutan &amp; Penyaringan Kartu:</span>
          <span className="text-[11px] font-normal text-[#64748b]">Wajib diisi (min. 5 karakter)</span>
        </label>
        <textarea
          id="dekomposisi-reason"
          rows={2}
          value={reason}
          onChange={(e) => {
            setReason(e.target.value);
            setChecked(false);
          }}
          placeholder="Tuliskan alasan logismu mengenai urutan tahapan yang kamu susun..."
          className="w-full px-3.5 py-2.5 rounded-xl bg-[#f8fbff] border border-[#c0d8ef] text-xs sm:text-sm text-[#121c2c] focus:outline-none focus:ring-2 focus:ring-[#68b6f7] resize-none"
        />
      </Card>

      {/* Evaluasi Alasan Adaptif */}
      {checked && reasonEval && (
        <Card
          className={`mb-4 border-2 p-4 flex flex-col gap-2 ${
            reasonEval.status === 'bener'
              ? 'bg-emerald-50/70 border-emerald-300'
              : reasonEval.status === 'mendekati'
              ? 'bg-amber-50/70 border-amber-300'
              : 'bg-red-50/70 border-red-300'
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-bold text-[#121c2c]">Umpan Balik Logika Dekomposisi:</span>
            <span className={`px-3 py-0.5 rounded-full text-xs font-bold border ${reasonEval.badgeClass}`}>
              {reasonEval.badgeLabel}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[#334155] leading-relaxed">
            {reasonEval.feedback}
          </p>
        </Card>
      )}

      {/* Feedback Message */}
      {checked && !canProceed && !reasonEval && (
        <div role="alert" className="mb-4 p-4 rounded-2xl bg-red-50 border border-red-200 text-sm text-red-700 leading-relaxed shadow-sm">
          <strong>Perhatian:</strong> Masih ada langkah yang belum tepat urutannya atau kartu pengecoh yang keliru ditempatkan.
          Periksa kartu bertanda ❌ atau diskusikan di Chat Kelompok!
        </div>
      )}
      {canProceed && (
        <div role="alert" className="mb-4 p-4 rounded-2xl bg-green-50 border border-green-200 text-sm text-green-700 font-semibold shadow-sm flex items-center gap-2">
          <span className="text-xl">🎉</span>
          <span>Hebat! Dekomposisi masalah kasir dan alasan logismu sudah tepat. Siap lanjut ke Parsons Problem!</span>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between">
        {demoMode && (
          <button
            type="button"
            onClick={handleDemoSkip}
            className="px-4 py-2 rounded-full text-xs font-semibold text-amber-900 bg-amber-200 hover:bg-amber-300 transition"
          >
            🎬 Demo: Lewati Dekomposisi
          </button>
        )}
        <div className="ml-auto flex gap-3">
          {!canProceed && (
            <button
              type="button"
              onClick={handleCheck}
              disabled={slots.some((s) => !s) || !isReasonValid}
              className="px-6 py-3 rounded-full font-bold text-sm text-[#253f8a] transition-all disabled:opacity-40 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-[#68b6f7] outline-none active:scale-95"
              style={{
                background: '#eaf6ff',
                border: '1.5px solid #a6d7ff',
                boxShadow:
                  'inset 2px 2px 4px rgba(61,107,145,0.18), inset -2px -2px 4px rgba(255,255,255,0.85), 0 4px 10px rgba(61,107,145,0.12)',
              }}
            >
              🔍 Periksa Susunan Langkah
            </button>
          )}
          <button
            type="button"
            onClick={handleProceedToParsons}
            disabled={!canProceed}
            className="inline-flex items-center gap-2 font-bold rounded-full px-6 py-3 text-sm text-white transition-all hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-blue-400 outline-none active:scale-95"
            style={{
              background: canProceed ? 'linear-gradient(to bottom, #68b6f7, #3d6b91)' : '#c0cfe0',
              boxShadow: canProceed
                ? '0 14px 20px -4px rgba(61,107,145,0.45), inset 0 2px 3px rgba(255,255,255,0.7), inset 0 -3px 0 #253f8a'
                : 'none',
            }}
          >
            <span>Lanjut ke Parsons Problem</span>
            <span>→</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// Droppable Slot using useDroppable
function DroppableSlot({
  index,
  label,
  card,
  feedback,
  onRemove,
}: {
  index: number;
  label: string;
  card: DekomCard | null;
  feedback: 'correct' | 'wrong' | null;
  onRemove: () => void;
}) {
  const { isOver, setNodeRef } = useDroppable({
    id: `slot-${index}`,
  });

  return (
    <div className="flex items-center gap-3">
      <div className="w-36 shrink-0 text-xs font-bold text-[#464555] text-right">
        {label}
      </div>
      <div
        ref={setNodeRef}
        className="flex-1 min-h-[56px] rounded-2xl border-2 transition-all flex items-center px-4"
        style={{
          borderColor: feedback === 'correct' ? '#4caf50' : feedback === 'wrong' ? '#e57373' : isOver ? '#253f8a' : '#c0d8ef',
          borderStyle: card ? 'solid' : 'dashed',
          background: feedback === 'correct' ? '#edfff4' : feedback === 'wrong' ? '#fff0f0' : isOver ? '#d8edff' : '#ffffff',
          boxShadow: isOver ? '0 0 0 3px rgba(37,63,138,0.2)' : 'none',
        }}
      >
        {card ? (
          <div className="flex items-center justify-between w-full py-1">
            <span className="text-sm font-semibold text-[#121c2c]">{card.label}</span>
            <div className="flex items-center gap-2">
              {feedback && (
                <span className="text-base">
                  {feedback === 'correct' ? '✅' : '❌'}
                </span>
              )}
              {feedback === 'wrong' && (
                <span className="text-xs text-red-700 bg-red-100 px-2 py-0.5 rounded-md italic max-w-xs leading-snug">
                  {card.hint}
                </span>
              )}
              <button
                type="button"
                onClick={onRemove}
                aria-label={`Hapus ${card.label}`}
                className="text-[#aaa] hover:text-red-500 text-sm font-bold ml-1 size-6 rounded-full hover:bg-red-50 flex items-center justify-center transition"
              >
                ✕
              </button>
            </div>
          </div>
        ) : (
          <span className="text-xs text-[#999] italic">
            {isOver ? 'Lepaskan kartu di sini!' : 'Seret kartu ke sini atau klik kartu di atas…'}
          </span>
        )}
      </div>
    </div>
  );
}

// Pool Card component
function PoolCard({
  card,
  slots,
  onPlace,
}: {
  card: DekomCard;
  slots: (DekomCard | null)[];
  onPlace: (card: DekomCard, slot: number) => void;
}) {
  const [showPicker, setShowPicker] = useState(false);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: card.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative">
      <button
        type="button"
        {...attributes}
        {...listeners}
        onClick={() => setShowPicker((v) => !v)}
        className="px-3.5 py-2 rounded-xl text-xs font-semibold text-[#253f8a] transition hover:bg-[#d0ecff] active:scale-95 focus-visible:ring-2 focus-visible:ring-[#68b6f7] outline-none cursor-grab active:cursor-grabbing flex items-center gap-1.5 shadow-sm"
        style={{
          background: '#eaf6ff',
          border: '1.5px solid #a6d7ff',
        }}
      >
        <span>{card.label}</span>
        <span className="text-[10px] text-[#3d6b91] bg-white px-1.5 py-0.5 rounded-full">Pilih ▾</span>
      </button>

      {showPicker && (
        <div className="absolute top-full left-0 mt-1 z-30 bg-white rounded-xl shadow-xl border border-[#c0d8ef] flex flex-col overflow-hidden min-w-[200px] py-1">
          <div className="px-3 py-1 text-[11px] font-bold text-[#888] uppercase tracking-wide border-b border-[#f0f0f0]">
            Pilih Langkah:
          </div>
          {slots.map((s, i) => (
            <button
              key={i}
              type="button"
              disabled={!!s}
              onClick={() => { onPlace(card, i); setShowPicker(false); }}
              className="px-3 py-2 text-xs font-semibold text-left hover:bg-[#eaf6ff] transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-between"
            >
              <span>Langkah {i + 1}</span>
              {s && <span className="text-[10px] text-amber-700 font-normal truncate max-w-[100px]">(terisi)</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
