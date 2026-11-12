import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { Card } from '../components/ui/Card';
import { useAppStore } from '../store/useAppStore';
import pretestQuestions from '../data/pretest-questions.json';
import posttestQuestions from '../data/posttest-questions.json';
import { logEvent } from '../services/logger';

export default function TestPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const isPretest = location.pathname.includes('/tes/awal');
  const questions = isPretest ? pretestQuestions : posttestQuestions;
  const testTitle = isPretest
    ? 'Pretest: Evaluasi Awal Berpikir Komputasional'
    : 'Posttest: Evaluasi Akhir Berpikir Komputasional';

  const { setAnswer, answers } = useAppStore();
  const storeKey = isPretest ? 'pretest_result' : 'posttest_result';
  const savedResult = answers[storeKey] as { score: number; total: number } | undefined;

  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(!!savedResult);
  const [score, setScore] = useState<number>(savedResult?.score || 0);

  function handleSelect(qIdx: number, optIdx: number) {
    if (submitted) return;
    setSelectedAnswers((prev) => ({ ...prev, [qIdx]: optIdx }));
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

    setAnswer(storeKey, { score: finalScore, total: 100 });
    // Also save specific key for teacher dashboard
    setAnswer(isPretest ? 'pretest_score' : 'posttest_score', finalScore);

    logEvent({
      stage: isPretest ? 'pretest' : 'posttest',
      componentId: isPretest ? 'pretest-submit' : 'posttest-submit',
      ctComponent: 'generalization',
      result: 'info',
      payload: { score: finalScore, correctCount, totalQuestions: questions.length },
    });
  }

  const allAnswered = Object.keys(selectedAnswers).length === questions.length;

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-6">
      {/* Header */}
      <div>
        <div className="text-xs text-[#464555] mb-1 uppercase tracking-widest font-semibold">
          Materi 1: Variabel & Penugasan Nilai · {isPretest ? 'Tes Awal' : 'Tes Akhir'}
        </div>
        <h1 className="text-2xl font-bold text-[#121c2c]">{testTitle}</h1>
        <p className="text-xs text-[#555] mt-1 leading-relaxed">
          {isPretest
            ? 'Kerjakan tes awal ini sebelum mempelajari modul untuk mengukur kemampuan awal berpikir komputasionalmu.'
            : 'Uji kembali peningkatan pemahaman berpikir komputasionalmu setelah menyelesaikan seluruh aktivitas modul.'}
        </p>
      </div>

      {/* Instructions Card */}
      <div className="p-4 rounded-2xl bg-[#f4fbff] border border-[#d0ecff] text-xs text-[#253f8a] flex items-start gap-3 shadow-xs">
        <span className="text-lg leading-none select-none">📋</span>
        <div>
          <span className="font-bold block uppercase tracking-wider text-[11px] text-[#1b2f68] mb-0.5">
            Petunjuk Pengerjaan
          </span>
          Pilihlah satu opsi jawaban yang paling tepat dari 5 pertanyaan di bawah.
          Soal mencakup 5 indikator berpikir komputasional: Dekomposisi, Abstraksi, Desain Algoritma, Debugging, dan Generalisasi.
        </div>
      </div>

      {/* Questions List */}
      <div className="flex flex-col gap-4">
        {questions.map((item, qIdx) => {
          const selected = selectedAnswers[qIdx];
          const isCorrect = selected === item.correctIndex;

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
                    optStyle = 'bg-[#eaf6ff] border-[#68b6f7] text-[#253f8a] font-bold shadow-[inset_2px_2px_4px_rgba(61,107,145,0.2),inset_-2px_-2px_4px_rgba(255,255,255,0.85)]';
                  }

                  if (submitted) {
                    if (optIdx === item.correctIndex) {
                      optStyle = 'bg-green-100 border-green-500 text-green-900 font-semibold';
                    } else if (selected === optIdx && !isCorrect) {
                      optStyle = 'bg-red-100 border-red-500 text-red-900';
                    } else {
                      optStyle = 'bg-gray-50 border-gray-200 text-gray-400 opacity-60';
                    }
                  }

                  return (
                    <button
                      key={optIdx}
                      type="button"
                      disabled={submitted}
                      onClick={() => handleSelect(qIdx, optIdx)}
                      className={`p-3 rounded-xl border text-left text-xs transition flex items-center gap-3 ${optStyle}`}
                    >
                      <span className="size-5 rounded-full border border-current flex items-center justify-center shrink-0 text-[10px] font-bold">
                        {String.fromCharCode(65 + optIdx)}
                      </span>
                      <span>{opt}</span>
                    </button>
                  );
                })}
              </div>

              {/* Post-submit Explanation */}
              {submitted && (
                <div className="mt-2 p-2.5 rounded-xl bg-[#f8fafc] border border-gray-200 text-xs text-[#555] leading-relaxed">
                  💡 <strong>Penjelasan Konsep:</strong> {item.explanation}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* Submission Card */}
      {!submitted ? (
        <Card className="flex items-center justify-between p-4 border border-[#bce0fd]">
          <span className="text-xs text-[#464555]">
            Terjawab: <strong>{Object.keys(selectedAnswers).length}</strong> dari {questions.length} soal
          </span>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!allAnswered}
            className="px-6 py-2.5 rounded-full text-xs font-bold text-white transition-all hover:brightness-110 active:scale-95 disabled:opacity-40"
            style={{
              background: 'linear-gradient(to bottom, #68b6f7, #3d6b91)',
              boxShadow:
                '0 12px 18px -4px rgba(61,107,145,0.45), inset 0 2px 3px rgba(255,255,255,0.7), inset 0 -3px 0 #253f8a',
            }}
          >
            Kirim Jawaban {isPretest ? 'Pretest' : 'Posttest'}
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
                Hasil tes awalmu telah tersimpan ke sistem. Sekarang kamu siap memulai pembelajaran Materi 1.
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
        <Card className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 bg-green-50 border border-green-300 shadow-md">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🏆</span>
            <div>
              <h3 className="font-bold text-base text-green-900">
                Posttest Selesai! Skor Akhirmu: {score} / 100
              </h3>
              <p className="text-xs text-green-700">
                Luar biasa! Kamu telah menuntaskan seluruh proses pembelajaran dan evaluasi berpikir komputasional.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate('/beranda')}
            className="px-6 py-2.5 rounded-full text-xs font-bold text-white bg-green-800 hover:bg-green-900 transition shadow-sm whitespace-nowrap"
          >
            Selesai & Kembali ke Beranda →
          </button>
        </Card>
      )}
    </div>
  );
}
