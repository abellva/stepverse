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

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

export default function ParsonsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const materiId = Number(id);
  const materi = MATERI_LIST.find((m) => m.id === materiId);

  const { setProgress, setAnswer, demoMode, progress } = useAppStore();
  const [level, setLevel] = useState<1 | 2 | 3>(1);
  const [maxLevelUnlocked, setMaxLevelUnlocked] = useState<1 | 2 | 3>(() => {
    if (progress[`${materiId}-parsons`] === 'done') return 3;
    return 1;
  });

  // LEVEL 1 STATE
  const [l1Pool, setL1Pool] = useState<ParsonsBlockL1[]>(() => shuffle(PARSONS_L1_BLOCKS));
  const [l1Placed, setL1Placed] = useState<ParsonsBlockL1[]>([]);
  const [l1Errors, setL1Errors] = useState<string[]>([]);
  const [l1Success, setL1Success] = useState(false);

  // LEVEL 2 STATE
  const [l2Pool, setL2Pool] = useState<ParsonsBlockL2[]>(() => shuffle(PARSONS_L2_BLOCKS));
  const [l2Placed, setL2Placed] = useState<(ParsonsBlockL2 & { userBlanks: string[] })[]>([]);
  const [l2Errors, setL2Errors] = useState<string[]>([]);
  const [l2Success, setL2Success] = useState(false);

  const canProceed = progress[`${materiId}-parsons`] === 'done' || level === 3 || l2Success;

  useEffect(() => {
    if (progress[`${materiId}-parsons`] === 'done') {
      setLevel(3);
    }
  }, [materiId, progress]);

  if (!materi) return <div className="p-6 text-red-500">Materi tidak ditemukan.</div>;

  // L1 HANDLERS
  function handlePlaceL1(block: ParsonsBlockL1) {
    setL1Pool((p) => p.filter((b) => b.id !== block.id));
    setL1Placed((p) => [...p, block]);
    setL1Errors([]);
  }

  function handleRemoveL1(block: ParsonsBlockL1) {
    setL1Placed((p) => p.filter((b) => b.id !== block.id));
    setL1Pool((p) => [...p, block]);
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
    const result = validateParsonsL1(l1Placed.map((b) => b.id));
    setL1Errors(result.errors);
    setL1Success(result.isValid);

    logEvent({
      stage: 'parsons',
      componentId: 'parsons-l1',
      ctComponent: 'algorithm_design',
      result: result.isValid ? 'pass' : 'fail',
      payload: { placed: l1Placed.map((b) => b.id) },
    });

    if (result.isValid) {
      setMaxLevelUnlocked((prev) => Math.max(prev, 2) as 1 | 2 | 3);
      setTimeout(() => {
        setLevel(2);
      }, 1200);
    }
  }

  // L2 HANDLERS
  function handlePlaceL2(block: ParsonsBlockL2) {
    const blankMatches = block.template.match(/\{(\d+)\}/g);
    const blankCount = blankMatches ? blankMatches.length : 1;
    setL2Pool((p) => p.filter((b) => b.id !== block.id));
    setL2Placed((p) => [...p, { ...block, userBlanks: Array(blankCount).fill('') }]);
    setL2Errors([]);
  }

  function handleRemoveL2(id: string) {
    const found = l2Placed.find((b) => b.id === id);
    if (!found) return;
    setL2Placed((p) => p.filter((b) => b.id !== id));
    setL2Pool((p) => [...p, PARSONS_L2_BLOCKS.find((b) => b.id === id)!]);
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
      payload,
    });

    if (result.isValid) {
      setMaxLevelUnlocked(3);
      setAnswer(`${materiId}-parsons-score`, 100);
      setProgress(materiId, 'parsons', 'done');
      setProgress(materiId, 'lab', 'active');
      setTimeout(() => {
        setLevel(3);
      }, 1200);
    }
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
                    onClick={() => handlePlaceL1(b)}
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
                    className="flex items-center justify-between px-3 py-2 rounded-xl bg-[#0f172a] border border-[#334155] text-white"
                  >
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
                    onClick={() => handlePlaceL2(b)}
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
                    className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 rounded-xl bg-[#0f172a] border border-[#334155] text-white"
                  >
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
            menjalankan Python langsung di browsermu dengan Pyodide, mengamati output terminal,
            dan menguji kode dengan <em>test cases</em> otomatis.
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
