import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { Card } from '../components/ui/Card';
import { useAppStore } from '../store/useAppStore';
import pretestQuestions from '../data/pretest-questions.json';
import posttestQuestions from '../data/posttest-questions.json';
import { logEvent } from '../services/logger';
import { fetchPosttestLockState } from '../services/researchApi';
import { checkPosttestAccess, getStageDisplayLabel } from '../utils/stuckDetector';

interface ReasonEvaluation {
  status: 'bener' | 'mendekati' | 'salah';
  badgeLabel: string;
  badgeClass: string;
  feedback: string;
}

interface QuestionWithReason {
  id: string;
  ctComponent: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  reasonKeywords?: string[];
  misconceptionKeywords?: string[];
  correctFeedback?: string;
  approachingFeedback?: string;
  wrongFeedback?: string;
}

function evaluatePretestReason(
  question: QuestionWithReason,
  selectedOptionIdx: number | undefined,
  reasonText: string
): ReasonEvaluation {
  const cleanReason = (reasonText || '').trim().toLowerCase();
  const isOptionCorrect = selectedOptionIdx === question.correctIndex;

  const qAny = question as any;
  const keywords: string[] = qAny.reasonKeywords ?? ['variabel', 'tipe', 'data'];
  const misconceptionKeywords: string[] = qAny.misconceptionKeywords ?? ['asal', 'tebak'];

  const matchedKeywords = keywords.filter((kw) => cleanReason.includes(kw.toLowerCase()));
  const hasMisconception =
    misconceptionKeywords.some((kw) => cleanReason.includes(kw.toLowerCase())) ||
    cleanReason.includes('asal') ||
    cleanReason.includes('tebak') ||
    cleanReason.includes('gatau') ||
    cleanReason.includes('ga tau') ||
    cleanReason.includes('tidak tahu') ||
    cleanReason.includes('ngasal');

  if (!isOptionCorrect) {
    return {
      status: 'salah',
      badgeLabel: '❌ Alasan & Pilihan Kurang Tepat (Salah)',
      badgeClass: 'bg-red-50 text-red-900 border-red-300',
      feedback:
        qAny.wrongFeedback ??
        `Pilihan jawaban dan alasanmu belum tepat. Konsep yang benar: ${question.explanation}`,
    };
  }

  if (hasMisconception || cleanReason.length < 8) {
    return {
      status: 'mendekati',
      badgeLabel: '⚠️ Alasan Mendekati (Perlu Diperjelas)',
      badgeClass: 'bg-amber-50 text-amber-950 border-amber-300',
      feedback:
        qAny.approachingFeedback ??
        `Pilihan jawabanmu sudah tepat! Namun alasan logismu masih terlalu singkat atau belum menjelaskan konsepnya secara mendalam: ${question.explanation}`,
    };
  }

  if (matchedKeywords.length >= 1 && cleanReason.length >= 12) {
    return {
      status: 'bener',
      badgeLabel: '✅ Alasan Tepat (Bener)',
      badgeClass: 'bg-emerald-50 text-emerald-950 border-emerald-300',
      feedback:
        qAny.correctFeedback ??
        `Alasan logismu sangat tepat! Kamu memahami konsep bahwa ${question.explanation}`,
    };
  }

  return {
    status: 'mendekati',
    badgeLabel: '⚠️ Alasan Mendekati',
    badgeClass: 'bg-amber-50 text-amber-950 border-amber-300',
    feedback:
      qAny.approachingFeedback ??
      `Pilihan jawabanmu sudah tepat! Namun alasanmu belum mencakup kata kunci konsep dasar. Konsep yang perlu diperhatikan: ${question.explanation}`,
  };
}

interface SavedTestResult {
  score: number;
  total: number;
  selectedAnswers?: Record<number, number>;
  reasons?: Record<number, string>;
  reasonEvaluations?: Record<number, ReasonEvaluation>;
  submittedAt?: string;
}

export default function TestPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const isPretest = location.pathname.includes('/tes/awal');
  const questions = isPretest ? pretestQuestions : posttestQuestions;
  const testTitle = isPretest
    ? 'Pretest: Evaluasi Awal Berpikir Komputasional'
    : 'Post-test: Evaluasi Akhir Berpikir Komputasional (Sumatif)';

  const {
    setAnswer,
    setProgress,
    answers,
    progress,
    demoMode,
    enterStage,
    posttestLockedByGuru,
    setPosttestLockedByGuru,
  } = useAppStore();

  const storeKey = isPretest ? 'pretest_result' : 'posttest_result';
  const savedResult = answers[storeKey] as SavedTestResult | undefined;

  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>(
    () => savedResult?.selectedAnswers ?? {}
  );
  const [reasons, setReasons] = useState<Record<number, string>>(
    () => savedResult?.reasons ?? {}
  );
  const [submitted, setSubmitted] = useState(!!savedResult);
  const [score, setScore] = useState<number>(savedResult?.score || 0);

  // Sync stage telemetry & teacher Post-test lock state
  useEffect(() => {
    enterStage(isPretest ? 'pretest' : 'posttest');
    if (!isPretest) {
      void fetchPosttestLockState().then((locked) => {
        setPosttestLockedByGuru(locked);
      });
    }
  }, [enterStage, isPretest, setPosttestLockedByGuru]);

  // Restore saved state when switching between /tes/awal and /tes/akhir
  useEffect(() => {
    const currentSaved = answers[storeKey] as SavedTestResult | undefined;
    setSelectedAnswers(currentSaved?.selectedAnswers ?? {});
    setReasons(currentSaved?.reasons ?? {});
    setSubmitted(!!currentSaved);
    setScore(currentSaved?.score || 0);
  }, [storeKey, answers]);

  const posttestAccess = checkPosttestAccess({
    progress,
    lockedByGuru: posttestLockedByGuru,
    demoMode,
    answers,
  });

  function handleSelect(qIdx: number, optIdx: number) {
    if (submitted) return;
    setSelectedAnswers((prev) => ({ ...prev, [qIdx]: optIdx }));
  }

  function handleReasonChange(qIdx: number, value: string) {
    if (submitted) return;
    setReasons((prev) => ({ ...prev, [qIdx]: value }));
  }

  function handleSubmit() {
    let correctCount = 0;
    questions.forEach((q, idx) => {
      if (selectedAnswers[idx] === q.correctIndex) {
        correctCount++;
      }
    });

    const finalScore = Math.round((correctCount / questions.length) * 100);
    setScore(finalScore);
    setSubmitted(true);

    const trimmedReasons: Record<number, string> = {};
    const reasonEvaluations: Record<number, ReasonEvaluation> = {};
    questions.forEach((q, idx) => {
      const r = (reasons[idx] ?? '').trim();
      trimmedReasons[idx] = r;
      if (isPretest) {
        reasonEvaluations[idx] = evaluatePretestReason(q, selectedAnswers[idx], r);
      }
    });

    setAnswer(storeKey, {
      score: finalScore,
      total: 100,
      selectedAnswers,
      reasons: trimmedReasons,
      reasonEvaluations,
      submittedAt: new Date().toISOString(),
    });
    setAnswer(isPretest ? 'pretest_score' : 'posttest_score', finalScore);
    if (!isPretest) {
      setProgress(1, 'posttest', 'done');
    }

    logEvent({
      stage: isPretest ? 'pretest' : 'posttest',
      componentId: isPretest ? 'pretest-submit' : 'posttest-submit',
      ctComponent: 'generalization',
      result: 'info',
      payload: {
        score: finalScore,
        correctCount,
        totalQuestions: questions.length,
        selectedAnswers,
        reasons: trimmedReasons,
      },
    });
  }

  const allAnswered = questions.every((_, idx) => selectedAnswers[idx] !== undefined);
  const allReasonsFilled = questions.every((_, idx) => (reasons[idx] ?? '').trim().length >= 5);
  const canSubmit = allAnswered && allReasonsFilled;

  // Render locked view for Post-test when formative stages aren't done or teacher locked Post-test
  if (!isPretest && !posttestAccess.unlocked && !submitted) {
    return (
      <div className="max-w-3xl mx-auto flex flex-col gap-6">
        <div>
          <div className="text-xs text-[#464555] mb-1 uppercase tracking-widest font-semibold">
            Evaluasi Sumatif · Terkunci
          </div>
          <h1 className="text-2xl font-bold text-[#121c2c]">{testTitle}</h1>
        </div>

        <Card className="border-2 border-amber-300 bg-amber-50/70 p-6 flex flex-col gap-4">
          <div className="flex items-start gap-3">
            <span className="text-3xl select-none">🔒</span>
            <div className="flex flex-col gap-1">
              <h2 className="font-bold text-base text-amber-950">
                Post-test Sumatif Belum Dapat Dibuka
              </h2>
              <p className="text-xs text-amber-900 leading-relaxed">
                {posttestAccess.reason}
              </p>
            </div>
          </div>

          {posttestAccess.missingStages.length > 0 && (
            <div className="p-3.5 rounded-2xl bg-white border border-amber-200 flex flex-col gap-2">
              <span className="text-xs font-bold text-[#121c2c]">
                Latihan Formatif Materi 1 yang harus diselesaikan terlebih dahulu:
              </span>
              <div className="flex flex-wrap gap-2">
                {posttestAccess.missingStages.map((stage) => (
                  <button
                    key={stage}
                    type="button"
                    onClick={() => navigate(`/materi/1/${stage}`)}
                    className="px-3 py-1.5 rounded-full text-xs font-semibold bg-[#eaf6ff] text-[#253f8a] border border-[#a6d7ff] hover:bg-[#d0ecff] transition"
                  >
                    Belum Tuntas: {getStageDisplayLabel(stage)} →
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <span className="text-[11px] text-amber-800">
              Latihan formatif dipisahkan dari Post-test agar hasil evaluasi akhir objektif.
            </span>
            <button
              type="button"
              onClick={() => navigate('/beranda')}
              className="px-5 py-2 rounded-full text-xs font-bold text-white bg-[#253f8a] hover:brightness-110 transition"
            >
              ← Kembali ke Beranda
            </button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-6">
      {/* Header */}
      <div>
        <div className="text-xs text-[#464555] mb-1 uppercase tracking-widest font-semibold">
          Materi 1: Variabel, Penugasan Nilai &amp; Tipe Data · {isPretest ? 'Tes Awal (Diagnostik)' : 'Tes Akhir (Sumatif)'}
        </div>
        <h1 className="text-2xl font-bold text-[#121c2c]">{testTitle}</h1>
        <p className="text-xs text-[#555] mt-1 leading-relaxed">
          {isPretest
            ? 'Kerjakan tes awal ini sebelum mempelajari modul untuk mengukur kemampuan awal berpikir komputasionalmu.'
            : 'Evaluasi sumatif akhir modul. Tuliskan pilihan dan alasan logismu secara mandiri.'}
        </p>
      </div>

      {/* Instructions Card */}
      <div className="p-4 rounded-2xl bg-[#f4fbff] border border-[#d0ecff] text-xs text-[#253f8a] flex items-start gap-3 shadow-xs">
        <span className="text-lg leading-none select-none">📋</span>
        <div>
          <span className="font-bold block uppercase tracking-wider text-[11px] text-[#1b2f68] mb-0.5">
            Petunjuk Pengerjaan &amp; Alasan Logis
          </span>
          Pilihlah satu opsi jawaban yang paling tepat dari {questions.length} pertanyaan di bawah, lalu{' '}
          <strong>tuliskan alasan logis singkat</strong> di kolom alasan pada setiap soal.
          {!isPretest && (
            <span className="block mt-1 font-semibold text-purple-900">
              🔒 Pada Post-test sumatif, kunci jawaban dan pembahasan instan tidak ditampilkan setelah pengiriman.
            </span>
          )}
        </div>
      </div>

      {/* Questions List */}
      <div className="flex flex-col gap-4">
        {questions.map((item, qIdx) => {
          const selected = selectedAnswers[qIdx];
          const isCorrect = selected === item.correctIndex;
          const reasonValue = reasons[qIdx] ?? '';
          const reasonValid = reasonValue.trim().length >= 5;

          return (
            <Card key={item.id} className="border border-[#bce0fd] p-5 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <span className="font-bold text-sm text-[#121c2c] leading-snug whitespace-pre-line">
                  {qIdx + 1}. {item.question}
                </span>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-[#eaf6ff] text-[#253f8a] shrink-0 font-semibold">
                  {item.ctComponent}
                </span>
              </div>

              {/* Options */}
              <div className="flex flex-col gap-2 mt-1">
                {item.options.map((opt, optIdx) => {
                  let optStyle = 'bg-white border-[#d0ecff] hover:bg-[#f4fbff] text-[#333]';

                  if (selected === optIdx) {
                    optStyle =
                      'bg-[#eaf6ff] border-[#68b6f7] text-[#253f8a] font-bold shadow-[inset_2px_2px_4px_rgba(61,107,145,0.2),inset_-2px_-2px_4px_rgba(255,255,255,0.85)]';
                  }

                  // STRICT REQUIREMENT #6: NEVER show answer keys or right/wrong coloring on Post-test
                  if (submitted && isPretest) {
                    if (optIdx === item.correctIndex) {
                      optStyle = 'bg-green-100 border-green-500 text-green-900 font-semibold';
                    } else if (selected === optIdx && !isCorrect) {
                      optStyle = 'bg-red-100 border-red-500 text-red-900';
                    } else {
                      optStyle = 'bg-gray-50 border-gray-200 text-gray-400 opacity-60';
                    }
                  } else if (submitted && !isPretest) {
                    optStyle =
                      selected === optIdx
                        ? 'bg-[#eaf6ff] border-[#253f8a] text-[#253f8a] font-bold'
                        : 'bg-gray-50 border-gray-200 text-gray-500 opacity-75';
                  }

                  return (
                    <button
                      key={optIdx}
                      type="button"
                      disabled={submitted}
                      onClick={() => handleSelect(qIdx, optIdx)}
                      className={`p-3 rounded-xl border text-left text-xs transition flex items-center justify-between gap-3 ${optStyle}`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="size-5 rounded-full border border-current flex items-center justify-center shrink-0 text-[10px] font-bold">
                          {String.fromCharCode(65 + optIdx)}
                        </span>
                        <span>{opt}</span>
                      </div>
                      {submitted && !isPretest && selected === optIdx && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#253f8a] text-white shrink-0">
                          Pilihanmu
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Kolom Alasan Logis Siswa */}
              <div className="mt-1 flex flex-col gap-1">
                <label
                  htmlFor={`reason-${item.id}`}
                  className="text-[11px] font-bold text-[#253f8a] flex items-center justify-between"
                >
                  <span>Alasan Logis Jawabanmu *</span>
                  {!submitted && (
                    <span className={`text-[10px] font-normal ${reasonValid ? 'text-green-700' : 'text-[#64748b]'}`}>
                      {reasonValid ? '✓ Alasan terisi' : 'Minimal 5 karakter'}
                    </span>
                  )}
                </label>
                <textarea
                  id={`reason-${item.id}`}
                  rows={2}
                  disabled={submitted}
                  value={reasonValue}
                  onChange={(e) => handleReasonChange(qIdx, e.target.value)}
                  placeholder="Jelaskan secara singkat alasan logis mengapa kamu memilih jawaban tersebut..."
                  className="w-full rounded-xl border border-[#bce0fd] bg-[#f8fbff] px-3 py-2 text-xs text-[#121c2c] outline-none focus:border-[#3d6b91] disabled:bg-slate-50 disabled:text-[#464555]"
                />
              </div>

              {/* Evaluasi Alasan & Penjelasan Konsep KHUSUS Pretest */}
              {submitted && isPretest && (
                <div className="mt-2 flex flex-col gap-2">
                  {(() => {
                    const evalResult =
                      savedResult?.reasonEvaluations?.[qIdx] ??
                      evaluatePretestReason(item, selected, reasonValue);
                    return (
                      <div
                        className={`p-3.5 rounded-2xl border text-xs flex flex-col gap-1.5 ${evalResult.badgeClass}`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-[11px] uppercase tracking-wide">
                            {evalResult.badgeLabel}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase bg-white/80 border border-current">
                            Status Alasan: {evalResult.status.toUpperCase()}
                          </span>
                        </div>
                        <p className="leading-relaxed font-medium">
                          <strong>Umpan Balik Adaptif:</strong> {evalResult.feedback}
                        </p>
                      </div>
                    );
                  })()}

                  <div className="p-3 rounded-xl bg-[#f8fafc] border border-gray-200 text-xs text-[#464555] leading-relaxed">
                    💡 <strong>Penjelasan Konsep Kunci:</strong> {item.explanation}
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* Submission Card */}
      {!submitted ? (
        <Card className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border border-[#bce0fd]">
          <div className="text-xs text-[#464555] flex flex-col gap-0.5">
            <span>
              Pilihan terjawab: <strong>{Object.keys(selectedAnswers).length}</strong> / {questions.length} soal
            </span>
            <span>
              Alasan logis terisi:{' '}
              <strong>
                {questions.filter((_, idx) => (reasons[idx] ?? '').trim().length >= 5).length}
              </strong>{' '}
              / {questions.length} soal
            </span>
          </div>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="px-6 py-2.5 rounded-full text-xs font-bold text-white transition-all hover:brightness-110 active:scale-95 disabled:opacity-40"
            style={{
              background: 'linear-gradient(to bottom, #68b6f7, #3d6b91)',
              boxShadow:
                '0 12px 18px -4px rgba(61,107,145,0.45), inset 0 2px 3px rgba(255,255,255,0.7), inset 0 -3px 0 #253f8a',
            }}
          >
            Kirim Jawaban &amp; Alasan {isPretest ? 'Pretest' : 'Post-test'}
          </button>
        </Card>
      ) : isPretest ? (
        <Card className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 bg-green-50 border border-green-300 shadow-md">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🎉</span>
            <div>
              <h3 className="font-bold text-base text-green-900">
                Pretest Selesai! Skor Awalmu: {score} / 100
              </h3>
              <p className="text-xs text-green-700">
                Hasil dan alasan logis tes awalmu telah tersimpan. Sekarang kamu siap memulai Materi 1.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate('/beranda')}
              className="px-4 py-2.5 rounded-full text-xs font-semibold text-green-800 bg-white border border-green-200 hover:bg-green-100 transition whitespace-nowrap"
            >
              🏠 Beranda
            </button>
            <button
              type="button"
              onClick={() => navigate('/materi/1/video')}
              className="px-6 py-2.5 rounded-full text-xs font-bold text-white bg-green-700 hover:bg-green-800 transition active:scale-95 shadow-sm whitespace-nowrap"
            >
              Mulai Materi 1 (Orientasi Video) →
            </button>
          </div>
        </Card>
      ) : (
        <Card className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 bg-[#eaf6ff] border border-[#a6d7ff] shadow-md">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🔒</span>
            <div>
              <h3 className="font-bold text-base text-[#121c2c]">
                Jawaban Post-test Telah Direkam!
              </h3>
              <p className="text-xs text-[#253f8a] leading-relaxed">
                Seluruh pilihan jawaban dan alasan logismu telah tersimpan ke sistem untuk dievaluasi oleh guru.
                Sesuai aturan asesmen sumatif, kunci jawaban dan pembahasan instan tidak ditampilkan di halaman siswa.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate('/beranda')}
            className="px-6 py-2.5 rounded-full text-xs font-bold text-white bg-[#253f8a] hover:brightness-110 transition shadow-sm whitespace-nowrap"
          >
            Kembali ke Beranda →
          </button>
        </Card>
      )}
    </div>
  );
}
