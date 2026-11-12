import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { MATERI_LIST, STAGE_LABELS } from '../data/curriculum';
import { Card } from '../components/ui/Card';
import { useAppStore } from '../store/useAppStore';

interface IpoItem {
  id: string;
  label: string;
  category: 'input' | 'process' | 'output';
}

const IPO_ITEMS: IpoItem[] = [
  { id: 'nama_barang',   label: 'Nama barang',          category: 'input' },
  { id: 'harga_satuan',  label: 'Harga satuan (Rp)',    category: 'input' },
  { id: 'jumlah',        label: 'Jumlah beli',          category: 'input' },
  { id: 'hitung_total',  label: 'total = harga_satuan × jumlah', category: 'process' },
  { id: 'cetak_struk',   label: 'Cetak struk belanja',  category: 'process' },
  { id: 'total_harga',   label: 'Total harga (Rp)',     category: 'output' },
  { id: 'struk',         label: 'Struk belanja tercetak', category: 'output' },
  // Distractors
  { id: 'nama_toko',     label: 'Nama toko Bu Ani',     category: 'input' },   // distractor
  { id: 'simpan_db',     label: 'Simpan ke database',   category: 'process' }, // distractor
];

const COLUMNS: { key: 'input' | 'process' | 'output'; label: string; icon: string; color: string }[] = [
  { key: 'input',   label: 'Input',   icon: '📥', color: '#eaf6ff' },
  { key: 'process', label: 'Proses',  icon: '⚙️', color: '#fff8e6' },
  { key: 'output',  label: 'Output',  icon: '📤', color: '#edfff4' },
];

// Shuffle helper
function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

export default function IpoPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const materiId = Number(id);
  const materi = MATERI_LIST.find((m) => m.id === materiId);
  const { setProgress, setAnswer, incrementAttempt, answers, demoMode, progress } = useAppStore();

  const savedAnswers = answers[`${materiId}-ipo`] as Record<string, 'input' | 'process' | 'output'> | undefined;

  const [placed, setPlaced] = useState<Record<string, 'input' | 'process' | 'output'>>(savedAnswers ?? {});
  const [shuffled] = useState(() => shuffle(IPO_ITEMS));
  const [feedback, setFeedback] = useState<Record<string, 'correct' | 'wrong' | null>>({});
  const [checked, setChecked] = useState(false);
  const [canProceed, setCanProceed] = useState(false);

  useEffect(() => {
    if (progress[`${materiId}-ipo`] === 'done') setCanProceed(true);
  }, [materiId, progress]);

  if (!materi) return <div className="p-6 text-red-500">Materi tidak ditemukan.</div>;

  const unplaced = shuffled.filter((item) => !(item.id in placed));

  function placeItem(itemId: string, column: 'input' | 'process' | 'output') {
    setPlaced((prev) => ({ ...prev, [itemId]: column }));
    setChecked(false);
    setFeedback({});
  }

  function removeItem(itemId: string) {
    setPlaced((prev) => {
      const next = { ...prev };
      delete next[itemId];
      return next;
    });
    setChecked(false);
    setFeedback({});
  }

  function handleCheck() {
    incrementAttempt(`${materiId}-ipo`);
    const fb: Record<string, 'correct' | 'wrong' | null> = {};
    for (const item of IPO_ITEMS) {
      if (item.id in placed) {
        const correct = placed[item.id] === item.category;
        fb[item.id] = correct ? 'correct' : 'wrong';
      }
    }
    setFeedback(fb);
    setChecked(true);

    // Need all non-distractor items placed correctly
    const correctRequired = IPO_ITEMS.filter((i) => !['nama_toko', 'simpan_db'].includes(i.id));
    const allRequiredCorrect = correctRequired.every(
      (i) => placed[i.id] === i.category
    );

    if (allRequiredCorrect) {
      setCanProceed(true);
      setAnswer(`${materiId}-ipo`, placed);
      setAnswer(`${materiId}-ipo-score`, 100);
      setProgress(materiId, 'ipo', 'done');
      setProgress(materiId, 'dekomposisi', 'active');
    }
  }

  function handleDemoSkip() {
    setProgress(materiId, 'ipo', 'done');
    setProgress(materiId, 'dekomposisi', 'active');
    navigate(`/materi/${materiId}/dekomposisi`);
  }

  const placedInColumn = (col: 'input' | 'process' | 'output') =>
    Object.entries(placed)
      .filter(([, v]) => v === col)
      .map(([k]) => IPO_ITEMS.find((i) => i.id === k)!)
      .filter(Boolean);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-xs text-[#464555] mb-1 uppercase tracking-widest font-semibold">
        Materi {materiId} · {STAGE_LABELS.ipo}
      </div>
      <h1 className="text-2xl font-bold text-[#121c2c] mb-2">{materi.judul}</h1>
      <p className="text-sm text-[#464555] mb-6">
        Kelompokkan setiap kartu berikut ke kolom <strong>Input</strong>, <strong>Proses</strong>,
        atau <strong>Output</strong> yang sesuai untuk program kasir Bu Ani.
        Klik kartu untuk memilih, lalu klik kolom tujuan.
      </p>

      {/* Unplaced cards */}
      <Card className="mb-6">
        <h2 className="text-xs font-bold uppercase tracking-widest text-[#464555] mb-3">
          Kartu yang belum ditempatkan
        </h2>
        <div className="flex flex-wrap gap-2 min-h-[48px]">
          {unplaced.length === 0 && (
            <span className="text-sm text-[#aaa] italic">Semua kartu sudah ditempatkan.</span>
          )}
          {unplaced.map((item) => (
            <UnplacedCard
              key={item.id}
              item={item}
              onPlace={placeItem}
            />
          ))}
        </div>
      </Card>

      {/* IPO columns */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {COLUMNS.map((col) => (
          <div key={col.key} className="flex flex-col gap-2">
            <div
              className="text-center font-bold text-sm py-2 rounded-2xl"
              style={{ background: col.color }}
            >
              {col.icon} {col.label}
            </div>
            <div
              className="min-h-[160px] rounded-2xl border-2 border-dashed border-[#c0d8ef] p-2 flex flex-col gap-2"
              style={{ background: col.color + '66' }}
            >
              {placedInColumn(col.key).map((item) => {
                const fb = feedback[item.id];
                return (
                  <div
                    key={item.id}
                    className="relative flex items-center justify-between gap-1 px-3 py-2 rounded-xl text-sm font-semibold transition"
                    style={{
                      background: fb === 'correct' ? '#c3f7c0' : fb === 'wrong' ? '#ffd6d6' : 'white',
                      border: `1.5px solid ${fb === 'correct' ? '#4caf50' : fb === 'wrong' ? '#e57373' : '#c0d8ef'}`,
                      boxShadow: '0 2px 8px rgba(61,107,145,0.08)',
                    }}
                  >
                    <span className="text-[#121c2c] text-xs leading-snug">{item.label}</span>
                    <div className="flex items-center gap-1">
                      {fb && <span>{fb === 'correct' ? '✅' : '❌'}</span>}
                      <button
                        onClick={() => removeItem(item.id)}
                        aria-label={`Hapus ${item.label}`}
                        className="text-[#aaa] hover:text-red-400 text-xs focus-visible:ring-1 focus-visible:ring-red-300 outline-none"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Feedback message */}
      {checked && !canProceed && (
        <div role="alert" className="mb-4 p-4 rounded-2xl bg-red-50 border border-red-200 text-sm text-red-700">
          Ada penempatan yang kurang tepat. Perhatikan kartu yang bertanda ❌ dan coba lagi!
        </div>
      )}
      {canProceed && (
        <div role="alert" className="mb-4 p-4 rounded-2xl bg-green-50 border border-green-200 text-sm text-green-700 font-semibold">
          ✅ Analisis IPO kamu sudah benar! Lanjut ke tahap Dekomposisi.
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between">
        {demoMode && (
          <button
            onClick={handleDemoSkip}
            className="px-4 py-2 rounded-full text-sm font-semibold text-yellow-800 bg-yellow-200 hover:bg-yellow-300 transition"
          >
            🎬 Demo: Lewati IPO
          </button>
        )}
        <div className="ml-auto flex gap-3">
          {!canProceed && (
            <button
              onClick={handleCheck}
              disabled={Object.keys(placed).length < 5}
              className="px-6 py-3 rounded-full font-bold text-sm text-[#253f8a] transition-all disabled:opacity-40 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-[#68b6f7] outline-none active:scale-95"
              style={{
                background: '#eaf6ff',
                border: '1.5px solid #a6d7ff',
                boxShadow:
                  'inset 2px 2px 4px rgba(61,107,145,0.18), inset -2px -2px 4px rgba(255,255,255,0.85), 0 4px 10px rgba(61,107,145,0.12)',
              }}
            >
              🔍 Periksa Jawaban
            </button>
          )}
          <button
            onClick={() => navigate(`/materi/${materiId}/dekomposisi`)}
            disabled={!canProceed}
            className="inline-flex items-center gap-2 font-bold rounded-full px-6 py-3 text-sm text-white transition-all hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-blue-400 outline-none active:scale-95"
            style={{
              background: canProceed ? 'linear-gradient(to bottom, #68b6f7, #3d6b91)' : '#c0cfe0',
              boxShadow: canProceed
                ? '0 14px 20px -4px rgba(61,107,145,0.45), inset 0 2px 3px rgba(255,255,255,0.7), inset 0 -3px 0 #253f8a'
                : 'none',
            }}
          >
            Lanjut ke Dekomposisi →
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Unplaced card component with column picker ───────────────────
function UnplacedCard({
  item,
  onPlace,
}: {
  item: IpoItem;
  onPlace: (id: string, col: 'input' | 'process' | 'output') => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="px-3 py-2 rounded-xl text-xs font-semibold text-[#253f8a] transition hover:bg-[#d0ecff] focus-visible:ring-2 focus-visible:ring-[#68b6f7] outline-none"
        style={{
          background: '#eaf6ff',
          border: '1.5px solid #a6d7ff',
          boxShadow: '0 2px 8px rgba(61,107,145,0.08)',
        }}
      >
        {item.label}
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 z-10 bg-white rounded-xl shadow-lg border border-[#eaf6ff] flex flex-col overflow-hidden min-w-[120px]">
          {(['input', 'process', 'output'] as const).map((col) => (
            <button
              key={col}
              onClick={() => { onPlace(item.id, col); setOpen(false); }}
              className="px-4 py-2 text-xs font-semibold text-left hover:bg-[#eaf6ff] transition capitalize"
            >
              → {col === 'input' ? 'Input' : col === 'process' ? 'Proses' : 'Output'}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
