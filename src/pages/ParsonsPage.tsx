import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { MATERI_LIST, STAGE_LABELS } from '../data/curriculum';
import { Card } from '../components/ui/Card';
import { useAppStore } from '../store/useAppStore';
import {
  PARSONS_L1_BLOCKS,
  PARSONS_L2_BLOCKS,
  validateParsonsL1,
  validateParsonsL2,
  ParsonsBlockL1,
  ParsonsBlockL2,
} from '../utils/parsonsValidator';
import { logEvent } from '../services/logger';

export interface ParsonsReasonEvaluation {
  status: 'bener' | 'mendekati' | 'salah';
  badgeLabel: string;
  badgeClass: string;
  feedback: string;
}

export function evaluateParsonsBlockReason(
  blockId: string,
  lineNo: number,
  reasonText: string
): ParsonsReasonEvaluation {
  const clean = reasonText.trim().toLowerCase();

  if (clean.length < 5 || clean.includes('gatau') || clean.includes('asal') || clean.includes('tebak')) {
    return {
      status: 'salah',
      badgeLabel: '❌ Alasan Belum Jelas',
      badgeClass: 'bg-red-950 text-red-200 border-red-500',
      feedback: 'Alasanmu belum menjelaskan fungsi logis penempatan baris kode ini. Tuliskan alasan mengapa baris ini dibutuhkan pada urutan tersebut.',
    };
  }

  const isInputBlock = blockId.includes('nama') || blockId.includes('harga') || blockId.includes('jumlah');
  const isTotalBlock = blockId.includes('total');
  const isPrintBlock = blockId.includes('print');
  const isDistractor = blockId.includes('_d');

  if (isDistractor) {
    return {
      status: 'salah',
      badgeLabel: '❌ Baris Pengecoh',
      badgeClass: 'bg-red-950 text-red-200 border-red-500',
      feedback: 'Baris kode ini adalah pengecoh dan tidak boleh dimasukkan ke dalam susunan program kasir.',
    };
  }

  if (isInputBlock) {
    const mentionsInput = /variabel|input|definisi|nilai|awal|data|simpan|sebelum|nama|harga|jumlah/i.test(clean);
    if (mentionsInput) {
      return {
        status: 'bener',
        badgeLabel: '✅ Tepat & Logis (Bener)',
        badgeClass: 'bg-emerald-950 text-emerald-200 border-emerald-500',
        feedback: 'Sangat logis! Variabel masukan harus didefinisikan di awal sebelum digunakan dalam perhitungan.',
      };
    }
    return {
      status: 'mendekati',
      badgeLabel: '⚠️ Alasan Mendekati',
      badgeClass: 'bg-amber-950 text-amber-200 border-amber-500',
      feedback: 'Penempatan baris sesuai. Ingat bahwa baris ini berfungsi menginisialisasi variabel masukan agar tersimpan di memori.',
    };
  }

  if (isTotalBlock) {
    const mentionsProcess = /hitung|proses|kali|perkalian|formula|rumus|total|setelah/i.test(clean);
    if (mentionsProcess) {
      return {
        status: 'bener',
        badgeLabel: '✅ Tepat & Logis (Bener)',
        badgeClass: 'bg-emerald-950 text-emerald-200 border-emerald-500',
        feedback: 'Tepat sekali! Formula total belanja mengeksekusi perkalian setelah variabel harga dan jumlah tersedia.',
      };
    }
    return {
      status: 'mendekati',
      badgeLabel: '⚠️ Alasan Mendekati',
      badgeClass: 'bg-amber-950 text-amber-200 border-amber-500',
      feedback: 'Penempatan baris perkalian total sudah tepat. Ingat bahwa rumus ini memerlukan nilai harga dan jumlah yang sudah ada sebelumnya.',
    };
  }

  if (isPrintBlock) {
    const mentionsOutput = /cetak|tampil|print|output|keluar|struk|nota|hasil|akhir/i.test(clean);
    if (mentionsOutput) {
      return {
        status: 'bener',
        badgeLabel: '✅ Tepat & Logis (Bener)',
        badgeClass: 'bg-emerald-950 text-emerald-200 border-emerald-500',
        feedback: 'Logika eksekusi tepat! Perintah print() menyajikan struk keluaran setelah hasil perhitungan selesai diperoleh.',
      };
    }
    return {
      status: 'mendekati',
      badgeLabel: '⚠️ Alasan Mendekati',
      badgeClass: 'bg-amber-950 text-amber-200 border-amber-500',
      feedback: 'Penempatan baris cetak print() sudah tepat. Perintah cetak dijalankan di akhir untuk menampilkan struk kepada pembeli.',
    };
  }

  return {
    status: 'bener',
    badgeLabel: '✅ Alasan Diterima',
    badgeClass: 'bg-emerald-950 text-emerald-200 border-emerald-500',
    feedback: 'Alasan penempatan baris kode telah diterima.',
  };
}

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

export default function ParsonsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const materiId = Number(id);
  const materi = MATERI_LIST.find((m) => m.id === materiId);

  const { setProgress, setAnswer, demoMode, progress, enterStage, recordStageFailure } = useAppStore();
  const [level, setLevel] = useState<1 | 2 | 3>(1);
  const [maxLevelUnlocked, setMaxLevelUnlocked] = useState<1 | 2 | 3>(() => {
    if (progress[`${materiId}-parsons`] === 'done') return 3;
    return 1;
  });

  // LEVEL 1 STATE
  const [l1Pool, setL1Pool] = useState<ParsonsBlockL1[]>(() => shuffle(PARSONS_L1_BLOCKS));
  const [l1Placed, setL1Placed] = useState<ParsonsBlockL1[]>([]);
  const [l1Reasons, setL1Reasons] = useState<Record<string, string>>({});
  const [l1Evaluations, setL1Evaluations] = useState<Record<string, ParsonsReasonEvaluation>>({});
  const [l1Errors, setL1Errors] = useState<string[]>([]);
  const [l1Success, setL1Success] = useState(false);

  // LEVEL 2 STATE
  const [l2Pool, setL2Pool] = useState<ParsonsBlockL2[]>(() => shuffle(PARSONS_L2_BLOCKS));
  const [l2Placed, setL2Placed] = useState<(ParsonsBlockL2 & { userBlanks: string[] })[]>([]);
  const [l2Reasons, setL2Reasons] = useState<Record<string, string>>({});
  const [l2Evaluations, setL2Evaluations] = useState<Record<string, ParsonsReasonEvaluation>>({});
  const [l2Errors, setL2Errors] = useState<string[]>([]);
  const [l2Success, setL2Success] = useState(false);

  // MODAL ALASAN PENEMPATAN BARIS KODE
  const [pendingBlock, setPendingBlock] = useState<{
    level: 1 | 2;
    blockL1?: ParsonsBlockL1;
    blockL2?: ParsonsBlockL2;
    isEditing?: boolean;
    lineNo?: number;
  } | null>(null);
  const [blockReasonInput, setBlockReasonInput] = useState('');

  const canProceed = progress[`${materiId}-parsons`] === 'done' || level === 3 || l2Success;

  useEffect(() => {
    enterStage('parsons');
  }, [enterStage]);

  useEffect(() => {
    if (progress[`${materiId}-parsons`] === 'done') {
      setLevel(3);
    }
  }, [materiId, progress]);

  if (!materi) return <div className="p-6 text-red-500">Materi tidak ditemukan.</div>;

  // L1 HANDLERS
  function promptPlaceL1(block: ParsonsBlockL1) {
    setPendingBlock({
      level: 1,
      blockL1: block,
      isEditing: false,
      lineNo: l1Placed.length + 1,
    });
    setBlockReasonInput(l1Reasons[block.id] || '');
  }

  function promptEditL1Reason(block: ParsonsBlockL1, lineNo: number) {
    setPendingBlock({
      level: 1,
      blockL1: block,
      isEditing: true,
      lineNo,
    });
    setBlockReasonInput(l1Reasons[block.id] || '');
  }

  function handleRemoveL1(block: ParsonsBlockL1) {
    setL1Placed((p) => p.filter((b) => b.id !== block.id));
    setL1Pool((p) => [...p, block]);
    setL1Reasons((prev) => {
      const copy = { ...prev };
      delete copy[block.id];
      return copy;
    });
    setL1Evaluations((prev) => {
      const copy = { ...prev };
      delete copy[block.id];
      return copy;
    });
    setL1Errors([]);
  }

  function moveL1(idx: number, dir: -1 | 1) {
    const target = idx + dir;
    if (target < 0 || target >= l1Placed.length) return;
    const copy = [...l1Placed];
    const temp = copy[idx];
    copy[idx] = copy[target];
    copy[target] = temp;
    setL1Placed(copy);
  }

  function checkL1() {
    const missingReasons = l1Placed.some((b) => !(l1Reasons[b.id] ?? '').trim());
    if (missingReasons) {
      setL1Errors(['Setiap baris kode yang kamu tempatkan wajib dilengkapi alasan logis penempatannya.']);
      return;
    }

    const faultyReasons = l1Placed.filter((b) => l1Evaluations[b.id]?.status === 'salah');
    if (faultyReasons.length > 0) {
      setL1Errors([
        'Ada alasan penempatan baris yang belum memadai atau belum tepat. Periksa baris bertanda ❌ dan klik "Ubah Alasan" untuk memperjelas.',
      ]);
      return;
    }

    const result = validateParsonsL1(l1Placed.map((b) => b.id));
    setL1Errors(result.errors);
    setL1Success(result.isValid);

    logEvent({
      stage: 'parsons',
      componentId: 'parsons-l1',
      ctComponent: 'algorithm_design',
      result: result.isValid ? 'pass' : 'fail',
      payload: { placed: l1Placed.map((b) => b.id), reasons: l1Reasons, evaluations: l1Evaluations },
    });

    if (!result.isValid) {
      recordStageFailure('parsons');
    } else {
      setMaxLevelUnlocked((prev) => Math.max(prev, 2) as 1 | 2 | 3);
      setTimeout(() => {
        setLevel(2);
      }, 1200);
    }
  }

  // L2 HANDLERS
  function promptPlaceL2(block: ParsonsBlockL2) {
    setPendingBlock({
      level: 2,
      blockL2: block,
      isEditing: false,
      lineNo: l2Placed.length + 1,
    });
    setBlockReasonInput(l2Reasons[block.id] || '');
  }

  function promptEditL2Reason(block: ParsonsBlockL2, lineNo: number) {
    setPendingBlock({
      level: 2,
      blockL2: block,
      isEditing: true,
      lineNo,
    });
    setBlockReasonInput(l2Reasons[block.id] || '');
  }

  function handleRemoveL2(id: string) {
    const found = l2Placed.find((b) => b.id === id);
    if (!found) return;
    setL2Placed((p) => p.filter((b) => b.id !== id));
    setL2Pool((p) => [...p, PARSONS_L2_BLOCKS.find((b) => b.id === id)!]);
    setL2Reasons((prev) => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });
    setL2Evaluations((prev) => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });
    setL2Errors([]);
  }

  function moveL2(idx: number, dir: -1 | 1) {
    const target = idx + dir;
    if (target < 0 || target >= l2Placed.length) return;
    const copy = [...l2Placed];
    const temp = copy[idx];
    copy[idx] = copy[target];
    copy[target] = temp;
    setL2Placed(copy);
  }

  function handleBlankChange(blockId: string, blankIdx: number, val: string) {
    setL2Placed((prev) =>
      prev.map((item) => {
        if (item.id !== blockId) return item;
        const nextBlanks = [...item.userBlanks];
        nextBlanks[blankIdx] = val;
        return { ...item, userBlanks: nextBlanks };
      })
    );
  }

  function checkL2() {
    const missingReasons = l2Placed.some((b) => !(l2Reasons[b.id] ?? '').trim());
    if (missingReasons) {
      setL2Errors(['Setiap baris kode di Level 2 wajib dilengkapi alasan logis penempatannya.']);
      return;
    }

    const faultyReasons = l2Placed.filter((b) => l2Evaluations[b.id]?.status === 'salah');
    if (faultyReasons.length > 0) {
      setL2Errors([
        'Ada alasan penempatan baris di Level 2 yang belum memadai atau belum tepat. Periksa baris bertanda ❌ dan klik "Ubah Alasan" untuk memperjelas.',
      ]);
      return;
    }

    const payload = l2Placed.map((p) => ({
      id: p.id,
      filledBlanks: p.userBlanks,
    }));
    const result = validateParsonsL2(payload);
    setL2Errors(result.errors);
    setL2Success(result.isValid);

    logEvent({
      stage: 'parsons',
      componentId: 'parsons-l2',
      ctComponent: 'algorithm_design',
      result: result.isValid ? 'pass' : 'fail',
      payload: { placed: payload, reasons: l2Reasons, evaluations: l2Evaluations },
    });

    if (!result.isValid) {
      recordStageFailure('parsons');
    } else {
      setMaxLevelUnlocked(3);
      setAnswer(`${materiId}-parsons-score`, 100);
      setProgress(materiId, 'parsons', 'done');
      setProgress(materiId, 'lab', 'active');
      setTimeout(() => {
        setLevel(3);
      }, 1200);
    }
  }

  function handleConfirmPlaceBlock() {
    if (!pendingBlock || blockReasonInput.trim().length < 4) return;
    const rText = blockReasonInput.trim();
    if (pendingBlock.level === 1 && pendingBlock.blockL1) {
      const block = pendingBlock.blockL1;
      const lineNo = pendingBlock.lineNo ?? (l1Placed.length + 1);
      const ev = evaluateParsonsBlockReason(block.id, lineNo, rText);
      setL1Reasons((prev) => ({ ...prev, [block.id]: rText }));
      setL1Evaluations((prev) => ({ ...prev, [block.id]: ev }));
      if (!pendingBlock.isEditing) {
        setL1Pool((p) => p.filter((b) => b.id !== block.id));
        setL1Placed((p) => [...p, block]);
      }
      setL1Errors([]);
    } else if (pendingBlock.level === 2 && pendingBlock.blockL2) {
      const block = pendingBlock.blockL2;
      const lineNo = pendingBlock.lineNo ?? (l2Placed.length + 1);
      const ev = evaluateParsonsBlockReason(block.id, lineNo, rText);
      setL2Reasons((prev) => ({ ...prev, [block.id]: rText }));
      setL2Evaluations((prev) => ({ ...prev, [block.id]: ev }));
      if (!pendingBlock.isEditing) {
        const blankMatches = block.template.match(/\{(\d+)\}/g);
        const blankCount = blankMatches ? blankMatches.length : 1;
        setL2Pool((p) => p.filter((b) => b.id !== block.id));
        setL2Placed((p) => [...p, { ...block, userBlanks: Array(blankCount).fill('') }]);
      }
      setL2Errors([]);
    }
    setPendingBlock(null);
  }

  function handleGoToLab() {
    setProgress(materiId, 'parsons', 'done');
    setProgress(materiId, 'lab', 'active');
    navigate(`/materi/${materiId}/lab`);
  }

  function handleDemoSkip() {
    setProgress(materiId, 'parsons', 'done');
    setProgress(materiId, 'lab', 'active');
    navigate(`/materi/${materiId}/lab`);
  }

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-6">
      {/* Header */}
      <div>
        <div className="text-xs text-[#464555] mb-1 uppercase tracking-widest font-semibold">
          Materi {materiId} · {STAGE_LABELS.parsons}
        </div>
        <h1 className="text-2xl font-bold text-[#121c2c]">{materi.judul}</h1>
        <p className="text-sm text-[#464555] mt-1 leading-relaxed">
          <strong>Komponen Berpikir Komputasional: Desain Algoritma (Parsons Problem).</strong><br />
          Latihan menyusun baris kode program secara bertahap dengan teknik <em>scaffolding fading</em>.
        </p>
      </div>

      {/* Level Selector Tabs */}
      <div className="flex items-center gap-2 border-b border-[#eaf6ff] pb-3 flex-wrap">
        <span className="text-xs font-bold text-[#464555] uppercase tracking-wider mr-2">
          Tahapan Scaffolding:
        </span>
        {[1, 2, 3].map((l) => {
          const isLocked = !demoMode && l > maxLevelUnlocked;
          const label = l === 1 ? 'Susun Baris (L1)' : l === 2 ? 'Lengkapi & Susun (L2)' : 'Pengkodean Bebas (L3)';

          return (
            <button
              key={l}
              type="button"
              disabled={isLocked}
              onClick={() => !isLocked && setLevel(l as 1 | 2 | 3)}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 active:scale-95 ${
                isLocked ? 'cursor-not-allowed opacity-50 bg-gray-100 text-gray-400 border border-gray-200' : ''
              }`}
              style={
                level === l
                  ? {
                      background: 'linear-gradient(to bottom, #68b6f7, #3d6b91)',
                      color: '#ffffff',
                      boxShadow:
                        '0 10px 18px -4px rgba(61,107,145,0.45), inset 0 2px 3px rgba(255,255,255,0.7), inset 0 -3px 0 #253f8a',
                    }
                  : !isLocked
                  ? {
                      background: '#eaf6ff',
                      color: '#253f8a',
                      border: '1.5px solid #a6d7ff',
                      boxShadow:
                        'inset 2px 2px 4px rgba(61,107,145,0.18), inset -2px -2px 4px rgba(255,255,255,0.85), 0 3px 8px rgba(61,107,145,0.1)',
                    }
                  : {}
              }
              title={isLocked ? `Selesaikan Level ${l - 1} terlebih dahulu untuk membuka level ini.` : ''}
            >
              {isLocked && <span>🔒</span>}
              <span>Level {l}: {label}</span>
            </button>
          );
        })}
      </div>

      {/* LEVEL 1: SHUFFLED COMPLETE LINES */}
      {level === 1 && (
        <div className="flex flex-col gap-5">
          <Card className="border border-[#bce0fd]">
            <h2 className="font-bold text-sm text-[#121c2c] mb-1">
              Level 1: Susun Potongan Kode Utuh
            </h2>
            <p className="text-xs text-[#464555] mb-4">
              Pilih baris kode dari kotak sumber di bawah, susun menjadi program kasir yang benar.
              Hati-hati terhadap 2 baris kode pengecoh (*distractor*)!
            </p>

            {/* Sumber Baris Kode */}
            <div className="mb-4">
              <span className="text-xs font-bold text-[#464555] uppercase tracking-wider block mb-2">
                Potongan Kode Tersedia (Klik untuk Memilih):
              </span>
              <div className="flex flex-wrap gap-2 p-3 bg-[#f4fbff] rounded-2xl border border-dashed border-[#c0d8ef] min-h-[50px]">
                {l1Pool.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => promptPlaceL1(b)}
                    className="font-mono text-xs px-3 py-2 rounded-xl bg-white border border-[#a6d7ff] text-[#253f8a] hover:bg-[#eaf6ff] transition shadow-sm active:scale-95"
                  >
                    + {b.code}
                  </button>
                ))}
                {l1Pool.length === 0 && (
                  <span className="text-xs text-[#aaa] italic">Semua potongan sudah ditempatkan di editor.</span>
                )}
              </div>
            </div>

            {/* Editor Susunan Kode */}
            <div>
              <span className="text-xs font-bold text-[#464555] uppercase tracking-wider block mb-2">
                Editor Program (Urutan Eksekusi Baris):
              </span>
              <div className="flex flex-col gap-2 p-3 bg-[#1e293b] rounded-2xl min-h-[140px]">
                {l1Placed.map((b, idx) => (
                  <div
                    key={b.id}
                    className="flex flex-col gap-1.5 px-3 py-2 rounded-xl bg-[#0f172a] border border-[#334155] text-white"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-xs text-[#64748b] select-none">
                          {idx + 1}.
                        </span>
                        <code className="font-mono text-xs text-[#38bdf8]">{b.code}</code>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => moveL1(idx, -1)}
                          disabled={idx === 0}
                          className="px-2 py-0.5 rounded text-xs bg-[#1e293b] text-white hover:bg-[#334155] disabled:opacity-30"
                        >
                          ▲
                        </button>
                        <button
                          type="button"
                          onClick={() => moveL1(idx, 1)}
                          disabled={idx === l1Placed.length - 1}
                          className="px-2 py-0.5 rounded text-xs bg-[#1e293b] text-white hover:bg-[#334155] disabled:opacity-30"
                        >
                          ▼
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveL1(b)}
                          className="text-red-400 hover:text-red-300 text-xs px-2 py-0.5 ml-1"
                        >
                          ✕
                        </button>
                      </div>
                    </div>

                    {/* Kolom Alasan Logis Tiap Baris L1 */}
                    <div className="flex flex-col gap-1 bg-[#1e293b] p-2 rounded-lg border border-slate-700">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-300 font-sans">
                          💡 <strong>Alasan:</strong> {l1Reasons[b.id] || '(Belum ada alasan)'}
                        </span>
                        <button
                          type="button"
                          onClick={() => promptEditL1Reason(b, idx + 1)}
                          className="text-[#38bdf8] hover:underline text-[10px] ml-2 shrink-0 font-sans font-semibold"
                        >
                          ✎ Ubah Alasan
                        </button>
                      </div>
                      {l1Evaluations[b.id] && (
                        <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-700/60 text-[10px]">
                          <span className="text-slate-400 font-sans">{l1Evaluations[b.id].feedback}</span>
                          <span className={`px-2 py-0.5 rounded-full font-bold border shrink-0 ${l1Evaluations[b.id].badgeClass}`}>
                            {l1Evaluations[b.id].badgeLabel}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {l1Placed.length === 0 && (
                  <div className="text-xs text-[#64748b] italic py-6 text-center">
                    Klik potongan kode di atas untuk memasukannya ke program ini.
                  </div>
                )}
              </div>
            </div>

            {/* Error & Success Messages */}
            {l1Errors.length > 0 && (
              <div className="mt-4 p-3 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-700 space-y-1">
                <span className="font-bold block">Ada kesalahan pada susunan kode:</span>
                {l1Errors.map((err, i) => (
                  <div key={i}>• {err}</div>
                ))}
              </div>
            )}
            {l1Success && (
              <div className="mt-4 p-3 rounded-2xl bg-green-50 border border-green-200 text-xs text-green-700 font-bold flex items-center gap-2">
                <span>✅</span>
                <span>Hebat! Susunan Level 1 tepat. Beralih ke Level 2 (Scaffolding Fading)…</span>
              </div>
            )}

            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={checkL1}
                disabled={l1Placed.length === 0}
                className="px-6 py-2.5 rounded-full text-xs font-bold text-white transition-all hover:brightness-110 active:scale-95 disabled:opacity-40"
                style={{
                  background: 'linear-gradient(to bottom, #68b6f7, #3d6b91)',
                  boxShadow:
                    '0 12px 18px -4px rgba(61,107,145,0.45), inset 0 2px 3px rgba(255,255,255,0.7), inset 0 -3px 0 #253f8a',
                }}
              >
                🔍 Periksa Kode Level 1
              </button>
            </div>
          </Card>
        </div>
      )}

      {/* LEVEL 2: PARTIAL LINES WITH BLANKS + REORDER */}
      {level === 2 && (
        <div className="flex flex-col gap-5">
          <Card className="border border-[#bce0fd]">
            <h2 className="font-bold text-sm text-[#121c2c] mb-1">
              Level 2: Lengkapi Isian Kosong & Susun Baris
            </h2>
            <p className="text-xs text-[#464555] mb-3">
              Pada level ini, beberapa bagian baris dikosongkan. Isilah variabel dan nilainya dengan tepat, lalu susun urutannya.
            </p>

            {/* Guidance banner for adaptive inputs */}
            <div className="p-3 mb-4 rounded-xl bg-[#eaf6ff] border border-[#a6d7ff] text-xs text-[#253f8a] flex items-start gap-2">
              <span className="text-base select-none">💡</span>
              <div>
                <strong>Bebas & Adaptif:</strong>
                <p className="mt-0.5 leading-relaxed text-[#335099]">
                  Kamu bebas menentukan nama barang (misal: <code className="bg-white px-1 py-0.2 rounded font-mono font-bold">"nasgor"</code> atau <code className="bg-white px-1 py-0.2 rounded font-mono font-bold">"Nasi Goreng"</code>) dan harga (misal: <code className="bg-white px-1 py-0.2 rounded font-mono font-bold">150</code> atau <code className="bg-white px-1 py-0.2 rounded font-mono font-bold">15000</code>).
                  Pastikan mematuhi kaidah penulisan variabel: teks <strong>wajib diapit tanda petik</strong>, sedangkan angka <strong>tanpa tanda petik</strong>.
                </p>
              </div>
            </div>

            {/* Sumber Pool L2 */}
            <div className="mb-4">
              <span className="text-xs font-bold text-[#464555] uppercase tracking-wider block mb-2">
                Pilih Baris Kode (Klik):
              </span>
              <div className="flex flex-wrap gap-2 p-3 bg-[#f4fbff] rounded-2xl border border-dashed border-[#c0d8ef] min-h-[50px]">
                {l2Pool.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => promptPlaceL2(b)}
                    className="font-mono text-xs px-3 py-2 rounded-xl bg-white border border-[#a6d7ff] text-[#253f8a] hover:bg-[#eaf6ff] transition shadow-sm active:scale-95"
                  >
                    + {b.template.replace(/\{(\d+)\}/g, '____')}
                  </button>
                ))}
                {l2Pool.length === 0 && (
                  <span className="text-xs text-[#aaa] italic">Semua baris sudah dipasang.</span>
                )}
              </div>
            </div>

            {/* Editor L2 */}
            <div>
              <span className="text-xs font-bold text-[#464555] uppercase tracking-wider block mb-2">
                Program Kasir (Lengkapi & Urutkan):
              </span>
              <div className="flex flex-col gap-2 p-3 bg-[#1e293b] rounded-2xl min-h-[140px]">
                {l2Placed.map((b, idx) => (
                  <div
                    key={b.id}
                    className="flex flex-col gap-1.5 px-3 py-2.5 rounded-xl bg-[#0f172a] border border-[#334155] text-white"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs text-[#64748b] select-none">{idx + 1}.</span>
                        <span className="font-mono text-xs text-[#38bdf8]">
                          {b.template.split(/\{(\d+)\}/).map((part, pIdx) => {
                            const blankNum = parseInt(part, 10);
                            if (!isNaN(blankNum)) {
                              return (
                                <input
                                  key={pIdx}
                                  type="text"
                                  value={b.userBlanks[blankNum] || ''}
                                  onChange={(e) => handleBlankChange(b.id, blankNum, e.target.value)}
                                  placeholder="isi di sini"
                                  className="inline-block mx-1 px-2 py-0.5 rounded bg-[#1e293b] border border-[#475569] text-xs font-mono text-amber-300 w-28 text-center focus:outline-none focus:border-[#38bdf8]"
                                />
                              );
                            }
                            return <span key={pIdx}>{part}</span>;
                          })}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => moveL2(idx, -1)}
                          disabled={idx === 0}
                          className="px-2 py-0.5 rounded text-xs bg-[#1e293b] text-white hover:bg-[#334155] disabled:opacity-30"
                        >
                          ▲
                        </button>
                        <button
                          type="button"
                          onClick={() => moveL2(idx, 1)}
                          disabled={idx === l2Placed.length - 1}
                          className="px-2 py-0.5 rounded text-xs bg-[#1e293b] text-white hover:bg-[#334155] disabled:opacity-30"
                        >
                          ▼
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveL2(b.id)}
                          className="text-red-400 hover:text-red-300 text-xs px-2 py-0.5 ml-1"
                        >
                          ✕
                        </button>
                      </div>
                    </div>

                    {/* Kolom Alasan Logis Tiap Baris L2 */}
                    <div className="w-full flex flex-col gap-1 bg-[#1e293b] p-2 rounded-lg border border-slate-700">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-300 font-sans">
                          💡 <strong>Alasan:</strong> {l2Reasons[b.id] || '(Belum ada alasan)'}
                        </span>
                        <button
                          type="button"
                          onClick={() => promptEditL2Reason(b, idx + 1)}
                          className="text-[#38bdf8] hover:underline text-[10px] ml-2 shrink-0 font-sans font-semibold"
                        >
                          ✎ Ubah Alasan
                        </button>
                      </div>
                      {l2Evaluations[b.id] && (
                        <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-700/60 text-[10px]">
                          <span className="text-slate-400 font-sans">{l2Evaluations[b.id].feedback}</span>
                          <span className={`px-2 py-0.5 rounded-full font-bold border shrink-0 ${l2Evaluations[b.id].badgeClass}`}>
                            {l2Evaluations[b.id].badgeLabel}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {l2Placed.length === 0 && (
                  <div className="text-xs text-[#64748b] italic py-6 text-center">
                    Klik potongan baris di atas untuk memasukkannya ke program.
                  </div>
                )}
              </div>
            </div>

            {/* Error & Success Messages */}
            {l2Errors.length > 0 && (
              <div className="mt-4 p-3 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-700 space-y-1">
                <span className="font-bold block">Periksa kembali:</span>
                {l2Errors.map((err, i) => (
                  <div key={i}>• {err}</div>
                ))}
              </div>
            )}
            {l2Success && (
              <div className="mt-4 p-3 rounded-2xl bg-green-50 border border-green-200 text-xs text-green-700 font-bold flex items-center gap-2">
                <span>🎉</span>
                <span>Luar biasa! Level 2 sukses. Scaffolding kini terlepas sempurna. Siap ke Lab Python!</span>
              </div>
            )}

            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={checkL2}
                disabled={l2Placed.length === 0}
                className="px-6 py-2.5 rounded-full text-xs font-bold text-white transition-all hover:brightness-110 active:scale-95 disabled:opacity-40"
                style={{
                  background: 'linear-gradient(to bottom, #68b6f7, #3d6b91)',
                  boxShadow:
                    '0 12px 18px -4px rgba(61,107,145,0.45), inset 0 2px 3px rgba(255,255,255,0.7), inset 0 -3px 0 #253f8a',
                }}
              >
                🔍 Periksa Jawaban Level 2
              </button>
            </div>
          </Card>
        </div>
      )}

      {/* LEVEL 3: FREE CODING HANDOFF */}
      {level === 3 && (
        <Card className="flex flex-col gap-5 border border-green-200 bg-green-50/30">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🚀</span>
            <div>
              <h2 className="font-bold text-base text-[#121c2c]">
                Level 3: Pengkodean Mandiri di Lab Python
              </h2>
              <span className="text-xs text-[#464555]">
                Scaffolding telah memudar (*faded*). Sekarang saatnya menulis dan menjalankan kode Python secara nyata di editor interaktif!
              </span>
            </div>
          </div>

          <div className="p-4 bg-[#0f172a] rounded-2xl text-white font-mono text-xs leading-relaxed border border-[#334155]">
            <div className="text-[#64748b] mb-2"># Struktur algoritma yang telah kamu rancang:</div>
            <div className="text-[#38bdf8]">nama_barang = "Nasi Goreng"</div>
            <div className="text-[#38bdf8]">harga_satuan = 15000</div>
            <div className="text-[#38bdf8]">jumlah = 2</div>
            <div className="text-[#38bdf8]">total = harga_satuan * jumlah</div>
            <div className="text-[#38bdf8]">print("Total belanja:", total)</div>
          </div>

          <p className="text-xs text-[#464555] leading-relaxed">
            Di <strong>Lab Python</strong>, kamu akan memiliki editor mandiri berbasis CodeMirror 6,
            menjalankan Python langsung di browsermu dengan Pyodide, dan menguji kode dengan <em>test cases</em> adaptif
            (kamu bebas memakai nama variabel sendiri seperti <code className="font-mono bg-white px-1 rounded">jumlah</code>,{' '}
            <code className="font-mono bg-white px-1 rounded">jumlah_porsi</code>, <code className="font-mono bg-white px-1 rounded">qty</code>,{' '}
            atau <code className="font-mono bg-white px-1 rounded">total_harga</code>).
          </p>

          <button
            type="button"
            onClick={handleGoToLab}
            className="w-full py-3.5 rounded-full font-bold text-white text-sm transition hover:brightness-110 active:scale-98 focus-visible:ring-2 focus-visible:ring-blue-400 outline-none shadow-md"
            style={{
              background: 'linear-gradient(to bottom, #68b6f7, #3d6b91)',
            }}
          >
            💻 Buka Lab Python Sekarang →
          </button>
        </Card>
      )}

      {/* MODAL ALASAN PENEMPATAN BLOK KODE (LEVEL 1 & 2) */}
      {pendingBlock && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border-2 border-[#68b6f7] shadow-2xl max-w-lg w-full p-5 flex flex-col gap-3.5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-[#eaf6ff] pb-2">
              <div className="flex items-center gap-2">
                <span className="text-xl">✍️</span>
                <h3 className="font-bold text-sm text-[#121c2c]">
                  Alasan Penempatan Baris Kode (Level {pendingBlock.level})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPendingBlock(null)}
                className="size-7 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 text-xs font-bold flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <div className="p-3 rounded-2xl bg-[#0f172a] border border-[#334155] text-white flex flex-col gap-1 font-mono text-xs">
              <span className="text-[10px] text-slate-400 uppercase font-sans font-bold">
                Baris ke-{pendingBlock.lineNo ?? (pendingBlock.level === 1 ? l1Placed.length + 1 : l2Placed.length + 1)}:
              </span>
              <code className="text-[#38bdf8]">
                {pendingBlock.level === 1
                  ? pendingBlock.blockL1?.code
                  : pendingBlock.blockL2?.template.replace(/\{(\d+)\}/g, '____')}
              </code>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="parsons-reason-input" className="text-xs font-bold text-[#121c2c]">
                Mengapa baris kode ini kamu tempatkan pada urutan ini? *
              </label>
              <textarea
                id="parsons-reason-input"
                rows={3}
                value={blockReasonInput}
                onChange={(e) => setBlockReasonInput(e.target.value)}
                placeholder="Tuliskan alasan logismu mengapa menaruh baris ini pada urutan tersebut..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#bce0fd] text-xs text-[#121c2c] bg-white focus:outline-none focus:ring-2 focus:ring-[#68b6f7] resize-none"
              />
              <span className="text-[10px] text-slate-500">
                Wajib diisi minimal 4 karakter sebagai bukti pemahaman logika urutan eksekusi program.
              </span>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1 border-t border-[#eaf6ff]">
              <button
                type="button"
                onClick={() => setPendingBlock(null)}
                className="px-4 py-2 rounded-full text-xs font-semibold text-[#464555] hover:bg-slate-100 transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmPlaceBlock}
                disabled={blockReasonInput.trim().length < 4}
                className="px-5 py-2 rounded-full text-xs font-bold text-white bg-[#253f8a] hover:brightness-110 disabled:opacity-40 transition shadow-sm"
              >
                ✓ Simpan Baris &amp; Alasan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Demo Skip Toolbar */}
      {demoMode && (
        <div className="flex justify-start">
          <button
            type="button"
            onClick={handleDemoSkip}
            className="px-4 py-2 rounded-full text-xs font-semibold text-amber-900 bg-amber-200 hover:bg-amber-300 transition"
          >
            🎬 Demo: Lewati Parsons Problem
          </button>
        </div>
      )}
    </div>
  );
}
