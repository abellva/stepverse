import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { MATERI_LIST, STAGE_LABELS } from '../data/curriculum';
import { Card } from '../components/ui/Card';
import { useAppStore } from '../store/useAppStore';
import { PythonEditor } from '../components/PythonEditor';
import { runPythonAsync, ExecutionResult } from '../services/pyodideService';
import { translatePythonError, TranslatedError } from '../utils/pythonErrorTranslator';
import { runCodeTests, TestSuiteSummary } from '../utils/testRunner';
import { logEvent } from '../services/logger';

const DEFAULT_STARTER_CODE = `# Program Kasir Kantin Bu Ani (Materi 1: Variabel & Penugasan Nilai)
# Lengkapi variabel dan formula di bawah ini agar struk kasir berhasil tercetak:

# 1. Masukkan nama barang (Tipe String diapit tanda petik, contoh: "Nasi Goreng" atau "nasgor"):
nama_barang = ""

# 2. Masukkan harga satuan dan jumlah beli (Tipe Integer angka tanpa petik, contoh: 15000 dan 2):
harga_satuan = 0
jumlah = 0

# 3. Hitung total belanja (kalikan variabel harga_satuan dengan jumlah):
total = 0

# 4. Cetak struk kasir ke layar:
print("=== STRUK KASIR KANTIN BU ANI ===")
print("Barang :", nama_barang)
print("Harga  : Rp", harga_satuan)
print("Jumlah :", jumlah)
print("Total  : Rp", total)
print("=================================")
`;

export default function LabPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const materiId = Number(id);
  const materi = MATERI_LIST.find((m) => m.id === materiId);

  const { setProgress, setAnswer, demoMode, progress } = useAppStore();

  const [code, setCode] = useState(DEFAULT_STARTER_CODE);
  const [isRunning, setIsRunning] = useState(false);
  const [terminalOutput, setTerminalOutput] = useState<string>('');
  const [execStatus, setExecStatus] = useState<'idle' | 'success' | 'error' | 'timeout'>('idle');
  const [translatedError, setTranslatedError] = useState<TranslatedError | null>(null);

  // Test suite state
  const [testSummary, setTestSummary] = useState<TestSuiteSummary | null>(null);
  const [iterations, setIterations] = useState(0);

  // Hint Ladder & Dynamic Scoring (Initial: 100, decreases when hints are accessed)
  const [hintLevel, setHintLevel] = useState(0);
  const [maxHintOpened, setMaxHintOpened] = useState(0);
  const hintPenalties = [0, 10, 25, 50]; // L0: 0, L1: -10, L2: -25, L3: -50
  const currentScore = Math.max(50, 100 - (hintPenalties[maxHintOpened] || 0));

  const canProceed = progress[`${materiId}-lab`] === 'done' || testSummary?.overallPass;

  useEffect(() => {
    if (progress[`${materiId}-lab`] === 'done') {
      // restore completed state
    }
  }, [materiId, progress]);

  if (!materi) return <div className="p-6 text-red-500">Materi tidak ditemukan.</div>;

  async function handleRunCode() {
    setIsRunning(true);
    setExecStatus('idle');
    setTranslatedError(null);
    const nextIter = iterations + 1;
    setIterations(nextIter);

    const res: ExecutionResult = await runPythonAsync(code, 5000);
    setIsRunning(false);
    setExecStatus(res.status);

    if (res.status === 'success') {
      setTerminalOutput(res.stdout || '(Program selesai dijalankan tanpa output text)');
      logEvent({
        stage: 'lab',
        componentId: 'lab-run',
        ctComponent: 'debugging',
        result: 'pass',
        attemptNo: nextIter,
        payload: { stdout: res.stdout },
      });
    } else if (res.status === 'error') {
      const translated = translatePythonError(res.error || res.stderr);
      setTranslatedError(translated);
      setTerminalOutput(res.stderr || res.error || 'Terjadi kesalahan eksekusi.');
      logEvent({
        stage: 'lab',
        componentId: 'lab-run',
        ctComponent: 'debugging',
        result: 'fail',
        attemptNo: nextIter,
        payload: { errorType: translated.type, raw: res.error },
      });
    } else if (res.status === 'timeout') {
      setTerminalOutput('⚠️ Batas waktu eksekusi 5 detik terlampaui. Program dihentikan paksa.');
      logEvent({
        stage: 'lab',
        componentId: 'lab-timeout',
        ctComponent: 'debugging',
        result: 'fail',
        attemptNo: nextIter,
        payload: { timeout: true },
      });
    }
  }

  async function handleSubmitAndTest() {
    setIsRunning(true);
    setExecStatus('idle');
    setTranslatedError(null);
    const nextIter = iterations + 1;
    setIterations(nextIter);

    const res: ExecutionResult = await runPythonAsync(code, 5000);
    setIsRunning(false);
    setExecStatus(res.status);

    if (res.status === 'success') {
      setTerminalOutput(res.stdout || '(Program selesai dieksekusi)');
    } else {
      const translated = translatePythonError(res.error || res.stderr);
      setTranslatedError(translated);
      setTerminalOutput(res.stderr || res.error || 'Kesalahan eksekusi.');
    }

    // Run visible and hidden test cases
    const summary = runCodeTests(code, res);
    setTestSummary(summary);

    logEvent({
      stage: 'lab',
      componentId: 'lab-submit-test',
      ctComponent: 'generalization',
      result: summary.overallPass ? 'pass' : 'fail',
      attemptNo: nextIter,
      payload: {
        visiblePassed: summary.visiblePassed,
        hiddenPassed: summary.hiddenPassed,
      },
    });

    if (summary.overallPass) {
      setProgress(materiId, 'lab', 'done');
      setAnswer(`${materiId}-lab-score`, currentScore);
      setAnswer('lab_score', currentScore);
    }
  }

  function handleNextStage() {
    setProgress(materiId, 'lab', 'done');
    navigate('/tes/akhir');
  }

  function handleDemoSkip() {
    setProgress(materiId, 'lab', 'done');
    navigate('/tes/akhir');
  }

  return (
    <div className="max-w-5xl mx-auto flex flex-col gap-6">
      {/* Header */}
      <div>
        <div className="text-xs text-[#464555] mb-1 uppercase tracking-widest font-semibold">
          Materi {materiId} · {STAGE_LABELS.lab}
        </div>
        <h1 className="text-2xl font-bold text-[#121c2c]">{materi.judul}</h1>
        <p className="text-sm text-[#464555] mt-1 leading-relaxed">
          <strong>Komponen Berpikir Komputasional: Debugging, Iterasi, & Generalisasi.</strong><br />
          Tulis dan uji program kasir menggunakan bahasa Python asli di browser tanpa perlu instalasi.
        </p>
      </div>

      {/* Main Grid: Code Editor & Terminal */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Target Output & Code Editor */}
        <div className="lg:col-span-7 flex flex-col gap-3">
          {/* Target Output yang Diharapkan */}
          <div
            className="rounded-[32px] p-5 flex flex-col gap-3 relative transition-all"
            style={{
              background: 'linear-gradient(135deg, #f4fbff 0%, #eaf6ff 100%)',
              border: '1.5px solid #bce0fd',
              boxShadow:
                '0 18px 36px -12px rgba(61,107,145,0.18), inset 2px 2px 6px rgba(255,255,255,0.95), inset -3px -3px 8px rgba(61,107,145,0.05)',
            }}
          >
            <div className="flex items-center justify-between flex-wrap gap-1">
              <span className="font-bold text-xs uppercase tracking-wider text-[#253f8a] flex items-center gap-1.5">
                <span>🎯</span>
                <span>Target Output yang Diharapkan (Struk Kasir)</span>
              </span>
              <span
                className="text-[10px] px-2.5 py-0.5 rounded-full font-bold shadow-xs"
                style={{
                  background: '#70f8e8',
                  color: '#006a62',
                  boxShadow: 'inset 1px 1px 2px rgba(0,106,98,0.2)',
                }}
              >
                Bebas nama &amp; harga makanan
              </span>
            </div>

            <div className="bg-[#0f172a] text-slate-200 p-3.5 rounded-2xl font-mono text-xs leading-relaxed border border-[#334155] shadow-inner">
              <div className="text-slate-400">=== STRUK KASIR KANTIN BU ANI ===</div>
              <div>Barang : <span className="text-amber-300 font-semibold">Nasi Goreng</span></div>
              <div>Harga  : Rp <span className="text-amber-300 font-semibold">15000</span></div>
              <div>Jumlah : <span className="text-amber-300 font-semibold">2</span></div>
              <div>Total  : Rp <span className="text-cyan-300 font-bold">30000</span></div>
              <div className="text-slate-400">=================================</div>
            </div>

            <p className="text-xs text-[#464555] leading-relaxed">
              💡 <strong>Misi Kamu:</strong> Pada editor di bawah, lengkapi variabel <code>nama_barang</code> (teks dalam tanda petik), <code>harga_satuan</code> &amp; <code>jumlah</code> (angka positif), serta isi rumus <code>total</code> agar nilai struk terkalkulasi otomatis.
            </p>
          </div>

          <Card className="flex flex-col gap-3 border border-[#bce0fd] p-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="font-bold text-xs uppercase tracking-wider text-[#253f8a] flex items-center gap-1.5">
                <span>💻</span>
                <span>Editor Python (CodeMirror 6)</span>
              </span>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-[#888]">
                  Iterasi: <strong>{iterations}x</strong>
                </span>
                <span
                  className={`text-xs font-mono font-bold px-2.5 py-0.5 rounded-full border ${
                    currentScore >= 90
                      ? 'bg-green-100 text-green-800 border-green-300'
                      : currentScore >= 75
                      ? 'bg-amber-100 text-amber-800 border-amber-300'
                      : 'bg-red-100 text-red-800 border-red-300'
                  }`}
                  title="Skor awal 100. Poin akan berkurang jika kamu membuka bantuan di bawah."
                >
                  ⭐ Skor Lab: {currentScore}/100
                </span>
              </div>
            </div>

            <PythonEditor
              value={code}
              onChange={setCode}
              className="h-[340px]"
            />

            {/* Actions Bar */}
            <div className="flex items-center justify-between pt-1 flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setCode(DEFAULT_STARTER_CODE)}
                className="text-xs text-[#464555] hover:text-[#253f8a] underline"
              >
                Reset ke Kode Awal
              </button>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={handleRunCode}
                  disabled={isRunning}
                  className="px-5 py-2.5 rounded-full text-xs font-bold text-[#253f8a] transition-all hover:brightness-105 active:scale-95 disabled:opacity-50"
                  style={{
                    background: '#eaf6ff',
                    border: '1.5px solid #a6d7ff',
                    boxShadow:
                      'inset 2px 2px 4px rgba(61,107,145,0.18), inset -2px -2px 4px rgba(255,255,255,0.85), 0 4px 10px rgba(61,107,145,0.12)',
                  }}
                >
                  {isRunning ? '⏳ Menjalankan…' : '▶ Jalankan Kode'}
                </button>
                <button
                  type="button"
                  onClick={handleSubmitAndTest}
                  disabled={isRunning}
                  className="px-6 py-2.5 rounded-full text-xs font-bold text-white transition-all hover:brightness-110 active:scale-95 disabled:opacity-50"
                  style={{
                    background: 'linear-gradient(to bottom, #68b6f7, #3d6b91)',
                    boxShadow:
                      '0 12px 18px -4px rgba(61,107,145,0.45), inset 0 2px 3px rgba(255,255,255,0.7), inset 0 -3px 0 #253f8a',
                  }}
                >
                  {isRunning ? '⏳ Menguji…' : '🧪 Kirim & Uji Solusi'}
                </button>
              </div>
            </div>
          </Card>

          {/* Hint Ladder (3 Levels) */}
          <Card className="border border-[#e2e8f0] p-4 bg-white">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-xs text-[#464555] uppercase tracking-wider flex items-center gap-1.5">
                <span>🪜</span>
                <span>Tangga Bantuan Bertingkat (Hint Ladder)</span>
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono text-[#253f8a]">
                  Level Bantuan: {hintLevel}/3
                </span>
                {maxHintOpened > 0 && (
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    -{hintPenalties[maxHintOpened]} Poin
                  </span>
                )}
              </div>
            </div>

            {hintLevel === 0 && (
              <p className="text-xs text-[#666]">
                Skor awal 100. Membuka bantuan bertingkat akan mengurangi skor performa secara proporsional. Cobalah debug mandiri terlebih dahulu!
              </p>
            )}

            {hintLevel >= 1 && (
              <div className="p-2.5 rounded-xl bg-[#f4fbff] border border-[#d0ecff] text-xs text-[#253f8a] mb-2 leading-relaxed">
                <strong>Bantuan 1 (Variabel):</strong> Simpan teks ke variabel dengan tanda petik, contoh: <code className="bg-white px-1 py-0.5 rounded">nama_barang = "Nasi Goreng"</code>. Untuk harga dan jumlah, tulis angka langsung tanpa petik.
              </div>
            )}

            {hintLevel >= 2 && (
              <div className="p-2.5 rounded-xl bg-[#fffbeb] border border-[#fef08a] text-xs text-[#92400e] mb-2 leading-relaxed">
                <strong>Bantuan 2 (Aritmatika):</strong> Gunakan operator bintang (*) untuk perkalian: <code className="bg-white px-1 py-0.5 rounded">total = harga_satuan * jumlah</code>.
              </div>
            )}

            {hintLevel >= 3 && (
              <div className="p-2.5 rounded-xl bg-[#f0fdf4] border border-[#bbf7d0] text-xs text-[#166534] mb-2 leading-relaxed">
                <strong>Bantuan 3 (Solusi Lengkap):</strong> Cetak variabel total menggunakan perintah: <code className="bg-white px-1 py-0.5 rounded">print("Total belanja:", total)</code>.
              </div>
            )}

            <div className="flex justify-end gap-2 mt-1">
              {hintLevel < 3 && (
                <button
                  type="button"
                  onClick={() => {
                    const next = hintLevel + 1;
                    setHintLevel(next);
                    setMaxHintOpened((prev) => Math.max(prev, next));
                    logEvent({
                      stage: 'lab',
                      componentId: 'hint-view',
                      ctComponent: 'debugging',
                      result: 'info',
                      payload: { hintLevel: next },
                    });
                  }}
                  className="text-xs text-[#253f8a] px-4 py-2 rounded-full font-bold transition-all hover:brightness-105 flex items-center gap-1.5 active:scale-95"
                  style={{
                    background: '#eaf6ff',
                    border: '1.5px solid #a6d7ff',
                    boxShadow:
                      'inset 2px 2px 4px rgba(61,107,145,0.18), inset -2px -2px 4px rgba(255,255,255,0.85), 0 2px 6px rgba(61,107,145,0.1)',
                  }}
                >
                  <span>+ Buka Bantuan Level {hintLevel + 1}</span>
                  <span className="text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded font-bold border border-amber-200">
                    {hintLevel === 0 ? '-10 Poin' : hintLevel === 1 ? '-15 Poin' : '-25 Poin'}
                  </span>
                </button>
              )}
              {hintLevel > 0 && (
                <button
                  type="button"
                  onClick={() => setHintLevel(0)}
                  className="text-xs text-[#888] hover:text-[#464555] px-2 py-1"
                >
                  Tutup Bantuan
                </button>
              )}
            </div>
          </Card>
        </div>

        {/* Right Column: Terminal & Friendly Error & Tests */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          {/* Terminal Output */}
          <Card className="flex flex-col gap-2 bg-[#0f172a] text-white border border-[#334155] p-4">
            <div className="flex items-center justify-between border-b border-[#1e293b] pb-2">
              <span className="font-mono text-xs text-[#94a3b8] flex items-center gap-2">
                <span className="size-2 rounded-full bg-green-400 inline-block" />
                Terminal Output (Pyodide Python 3.11)
              </span>
              <button
                type="button"
                onClick={() => setTerminalOutput('')}
                className="text-[10px] text-[#64748b] hover:text-white"
              >
                Clear
              </button>
            </div>

            <pre className="font-mono text-xs text-[#38bdf8] whitespace-pre-wrap min-h-[140px] max-h-[220px] overflow-y-auto leading-relaxed">
              {terminalOutput || '> Output program akan tampil di sini setelah kamu menekan "Jalankan Kode".'}
            </pre>
          </Card>

          {/* Friendly Indonesian Error Message */}
          {translatedError && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-xs text-[#78350f] shadow-sm flex flex-col gap-1.5">
              <div className="font-bold flex items-center gap-1.5 text-amber-900">
                <span>🐛</span>
                <span>{translatedError.friendlyTitle}</span>
              </div>
              <p className="leading-relaxed">{translatedError.friendlyExplanation}</p>
              <div className="p-2 rounded-xl bg-white/70 border border-amber-200 mt-1 font-medium">
                💡 <strong>Saran Perbaikan:</strong> {translatedError.suggestion}
              </div>
            </div>
          )}

          {/* Test Cases Results */}
          {testSummary && (
            <Card className="border border-[#bce0fd] p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between border-b border-[#eaf6ff] pb-2">
                <span className="font-bold text-xs text-[#121c2c] uppercase tracking-wider">
                  Hasil Uji Solusi (Test Suite)
                </span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                    testSummary.overallPass
                      ? 'bg-green-100 text-green-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {testSummary.overallPass ? '✅ LULUS SEMUA' : '⚠️ PERLU PERBAIKAN'}
                </span>
              </div>

              {/* Summary counters */}
              <div className="grid grid-cols-2 gap-2 text-center text-xs">
                <div className="p-2 rounded-xl bg-[#f4fbff] border border-[#d0ecff]">
                  <span className="text-[#464555] block">Kasus Terlihat</span>
                  <span className="font-bold text-[#253f8a]">
                    {testSummary.visiblePassed}/{testSummary.visibleTotal} Lulus
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-[#f0fdf4] border border-[#bbf7d0]">
                  <span className="text-[#464555] block">Kasus Tersembunyi (Generalisasi)</span>
                  <span className="font-bold text-[#166534]">
                    {testSummary.hiddenPassed}/{testSummary.hiddenTotal} Lulus
                  </span>
                </div>
              </div>

              {/* Individual test items */}
              <div className="flex flex-col gap-2.5 max-h-[300px] overflow-y-auto pr-1">
                {testSummary.testResults.map((t) => (
                  <div
                    key={t.id}
                    className={`p-3 rounded-xl border text-xs flex flex-col gap-1.5 transition ${
                      t.passed
                        ? 'bg-green-50/70 border-green-200'
                        : 'bg-red-50/70 border-red-200'
                    }`}
                  >
                    <div className="flex items-center justify-between font-semibold">
                      <span className={t.passed ? 'text-green-800' : 'text-red-800'}>
                        {t.passed ? '✅' : '❌'} {t.title}
                      </span>
                      {t.isHidden && (
                        <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">
                          Generalisasi
                        </span>
                      )}
                    </div>

                    {/* Expected vs Actual output for transparency */}
                    <div className="p-2 rounded-lg bg-white/80 border border-slate-200 font-mono text-[11px] space-y-1">
                      <div className="text-slate-600">
                        <span className="font-semibold text-slate-700">🎯 Target:</span> {t.expectedDescription}
                      </div>
                      <div className={t.passed ? 'text-green-700' : 'text-red-600'}>
                        <span className="font-semibold">🔍 Terdeteksi:</span> {t.actualOutput}
                      </div>
                    </div>

                    <p className={`text-[11px] leading-relaxed ${t.passed ? 'text-green-800' : 'text-red-700'}`}>
                      {t.feedback}
                    </p>

                    {/* Transparent Test Cases breakdown if available */}
                    {t.testCaseDetails && t.testCaseDetails.length > 0 && (
                      <div className="mt-1 pt-2 border-t border-purple-200">
                        <span className="text-[10px] font-bold text-purple-900 block mb-1">
                          📊 Rincian Test Cases Otomatis:
                        </span>
                        <div className="space-y-1">
                          {t.testCaseDetails.map((tc, idx) => (
                            <div
                              key={idx}
                              className={`p-1.5 rounded text-[10px] flex items-center justify-between ${
                                tc.passed ? 'bg-green-100/60 text-green-800' : 'bg-red-100/60 text-red-800'
                              }`}
                            >
                              <span>
                                {tc.passed ? '✓' : '✗'} <strong>{tc.title}:</strong> {tc.inputDesc} ➔ {tc.expectedOutput}
                              </span>
                              <span className="font-mono">{tc.actualOutput}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Completion & Navigation */}
      {canProceed && (
        <Card className="bg-green-50 border border-green-300 p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🎉</span>
            <div>
              <h3 className="font-bold text-sm text-green-900">
                Selamat! Pembelajaran Materi 1 Telah Tuntas!
              </h3>
              <p className="text-xs text-green-700">
                Kamu telah menyelesaikan perancangan algoritma variabel dan kalkulasi struk kasir secara mandiri di Lab Python.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate('/beranda')}
              className="px-4 py-2.5 rounded-full text-xs font-semibold text-[#253f8a] bg-[#eaf6ff] border border-[#a6d7ff] hover:bg-[#d0ecff] transition whitespace-nowrap shadow-xs active:scale-95"
            >
              🏠 Beranda Materi
            </button>
            <button
              type="button"
              onClick={handleNextStage}
              className="px-6 py-2.5 rounded-full text-xs font-bold text-white transition-all hover:brightness-110 active:scale-95 whitespace-nowrap"
              style={{
                background: 'linear-gradient(to bottom, #68b6f7, #3d6b91)',
                boxShadow:
                  '0 12px 18px -4px rgba(61,107,145,0.45), inset 0 2px 3px rgba(255,255,255,0.7), inset 0 -3px 0 #253f8a',
              }}
            >
              Lanjut ke Posttest CT →
            </button>
          </div>
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
            🎬 Demo: Lewati Lab Python
          </button>
        </div>
      )}
    </div>
  );
}
