import { useState } from 'react';
import type { PausePoint, PredictionOption } from '../data/curriculum';
import { Card } from './ui/Card';
import type { PausePointCompletionRecord } from '../utils/videoPausePoints';

interface PredictionActivityProps {
  pausePoint: PausePoint;
  savedRecord?: PausePointCompletionRecord;
  demoMode: boolean;
  onComplete: (result: {
    selectedOptionId?: string;
    isCorrect?: boolean;
    reason?: string;
    skipped?: boolean;
  }) => void;
}

interface AdaptivePredictionFeedback {
  status: 'bener' | 'mendekati' | 'salah';
  badgeLabel: string;
  badgeClass: string;
  title: string;
  explanation: string;
}

function evaluatePredictionReason(
  chosenId: string,
  reasonText: string
): AdaptivePredictionFeedback {
  const clean = reasonText.trim().toLowerCase();
  const is16000 = chosenId === '16000';

  const conceptualKeywords = [
    'hitung ulang',
    'hitung kembali',
    'dijalankan lagi',
    'dieksekusi',
    'ditugaskan',
    'belum jalan',
    'belum dihitung',
    'masih tersimpan',
    'nilai lama',
    'tidak otomatis',
    'belum print',
    'reassignment',
    'kotak lama',
    'sekuensial',
    'belum diproses',
  ];

  const hasConcept = conceptualKeywords.some((kw) => clean.includes(kw));

  if (!is16000) {
    return {
      status: 'salah',
      badgeLabel: '❌ Prediksi & Alasan Kurang Tepat (Salah)',
      badgeClass: 'bg-red-50 border-red-300 text-red-950',
      title: 'Miskonsepsi Eksekusi Memori Komputer',
      explanation:
        'Di kehidupan nyata, jika porsi bertambah maka kita langsung berpikir totalnya otomatis jadi 24000. Namun di memori komputer, variabel bekerja secara terisolasi! Mengubah variabel jumlah_porsi TIDAK otomatis mengubah variabel total_harga. Isi kotak total_harga tetap 16000 sampai komputer menjalankan ulang baris instruksi perhitungan.',
    };
  }

  if (hasConcept && clean.length >= 10) {
    return {
      status: 'bener',
      badgeLabel: '✅ Prediksi & Alasanmu Sangat Tepat (Bener)!',
      badgeClass: 'bg-emerald-50 border-emerald-300 text-emerald-950',
      title: 'Pemahaman Konsep Memori Sangat Baik',
      explanation:
        'Tepat sekali! Nilai di kotak total_harga tetap 16000 karena memori komputer tidak otomatis menghitung ulang formula perkalian saat salah satu variabel input diubah, sebelum instruksi rumus tersebut dieksekusi dan ditugaskan kembali.',
    };
  }

  return {
    status: 'mendekati',
    badgeLabel: '⚠️ Pilihan Benar, Namun Alasan Perlu Diperjelas (Mendekati)',
    badgeClass: 'bg-amber-50 border-amber-300 text-amber-950',
    title: 'Konsep Memori Perlu Ditegaskan',
    explanation:
      'Pilihanmu 16000 tepat! Namun alasanmu belum menegaskan cara kerja komputer: komputer tidak otomatis memperbarui hasil hitungan di variabel lain saat variabel jumlah bertambah. Komputer hanya menyimpan nilai lama (16000) sampai baris perhitungan dijalankan ulang.',
  };
}

/**
 * Panel aktivitas pertanyaan prediksi dua pilihan dilengkapi kolom alasan logis siswa
 * sebelum umpan balik konsep ditampilkan.
 */
export function PredictionActivity({
  pausePoint,
  savedRecord,
  demoMode,
  onComplete,
}: PredictionActivityProps) {
  const prediction = pausePoint.prediction;
  const [selectedId, setSelectedId] = useState<string | null>(
    savedRecord?.selectedOptionId ?? null
  );
  const [reason, setReason] = useState<string>(savedRecord?.reason ?? '');
  const [reasonSubmitted, setReasonSubmitted] = useState<boolean>(
    Boolean(savedRecord?.selectedOptionId && savedRecord?.reason)
  );
  const [feedbackResult, setFeedbackResult] = useState<AdaptivePredictionFeedback | null>(
    savedRecord?.selectedOptionId && savedRecord?.reason
      ? evaluatePredictionReason(savedRecord.selectedOptionId, savedRecord.reason)
      : null
  );

  if (!prediction) return null;

  const selectedOption: PredictionOption | undefined = prediction.options.find(
    (opt) => opt.id === selectedId
  );

  const isReasonValid = reason.trim().length >= 5;

  function handleSelect(option: PredictionOption) {
    setSelectedId(option.id);
    setReasonSubmitted(false);
    setFeedbackResult(null);
  }

  function handleRevealFeedback() {
    if (!selectedOption || !isReasonValid) return;
    const fb = evaluatePredictionReason(selectedOption.id, reason);
    setFeedbackResult(fb);
    setReasonSubmitted(true);
  }

  function handleConfirmContinue() {
    if (!selectedOption || !isReasonValid || !feedbackResult) return;
    onComplete({
      selectedOptionId: selectedOption.id,
      isCorrect: feedbackResult.status === 'bener',
      reason: reason.trim(),
      skipped: false,
    });
  }

  return (
    <Card className="border border-[#bce0fd] flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xl" aria-hidden="true">
            🔮
          </span>
          <h3 className="text-base font-bold text-[#121c2c]">
            {pausePoint.title ?? 'Pertanyaan Prediksi Konsep'}
          </h3>
        </div>
        {pausePoint.optional && (
          <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[#eaf6ff] text-[#253f8a] border border-[#a6d7ff]">
            Opsional
          </span>
        )}
      </div>

      {prediction.context && (
        <p className="text-xs sm:text-sm text-[#464555] bg-[#f4fbff] border border-[#cde7fc] rounded-2xl px-4 py-3 leading-relaxed">
          {prediction.context}
        </p>
      )}

      <p className="text-sm sm:text-base font-bold text-[#121c2c] leading-snug">
        {prediction.question}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {prediction.options.map((opt, idx) => {
          const isChosen = selectedId === opt.id;
          const prefix = idx === 0 ? 'A' : 'B';

          let containerClass =
            'border-[#c0d8ef] bg-white hover:bg-[#f4fbff] hover:border-[#68b6f7] text-[#121c2c]';
          if (isChosen && reasonSubmitted) {
            containerClass = opt.isCorrect
              ? 'border-emerald-400 bg-emerald-50 text-emerald-950 shadow-sm'
              : 'border-amber-400 bg-amber-50 text-amber-950 shadow-sm';
          } else if (isChosen) {
            containerClass = 'border-[#253f8a] bg-[#eaf6ff] text-[#121c2c] shadow-sm';
          }

          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => handleSelect(opt)}
              aria-pressed={isChosen}
              className={`p-4 rounded-2xl border-2 text-left transition flex items-center justify-between gap-3 cursor-pointer focus-visible:ring-2 focus-visible:ring-[#68b6f7] outline-none ${containerClass}`}
            >
              <div className="flex items-center gap-3">
                <span
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                    isChosen
                      ? reasonSubmitted
                        ? opt.isCorrect
                          ? 'bg-emerald-500 text-white'
                          : 'bg-amber-500 text-white'
                        : 'bg-[#253f8a] text-white'
                      : 'bg-[#eaf6ff] text-[#253f8a]'
                  }`}
                >
                  {prefix}
                </span>
                <span className="font-bold text-sm sm:text-base">{opt.label}</span>
              </div>
              {isChosen && reasonSubmitted && (
                <span className="text-base shrink-0" aria-hidden="true">
                  {opt.isCorrect ? '✅' : '💡'}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Kolom Alasan Logis Siswa */}
      {selectedOption && (
        <div className="p-4 rounded-2xl bg-[#f8fbff] border border-[#c0d8ef] flex flex-col gap-2">
          <label
            htmlFor={`reason-${pausePoint.id}`}
            className="text-xs font-bold text-[#253f8a] flex items-center justify-between gap-2"
          >
            <span>✍️ Tuliskan Alasan Logis Pilihanmu ({selectedOption.label}):</span>
            <span className="text-[11px] font-normal text-[#64748b]">Wajib diisi (min. 5 karakter)</span>
          </label>
          <textarea
            id={`reason-${pausePoint.id}`}
            rows={2}
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              if (reasonSubmitted) setReasonSubmitted(false);
            }}
            placeholder="Tuliskan alasan logismu mengapa memilih opsi tersebut..."
            className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#bce0fd] text-xs sm:text-sm text-[#121c2c] focus:outline-none focus:ring-2 focus:ring-[#68b6f7] resize-none"
          />
          {!reasonSubmitted && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleRevealFeedback}
                disabled={!isReasonValid}
                className="px-4 py-2 rounded-full text-xs font-bold text-[#253f8a] bg-[#eaf6ff] border border-[#a6d7ff] hover:bg-[#d8eeff] disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                🔍 Simpan Alasan &amp; Cek Prediksi
              </button>
            </div>
          )}
        </div>
      )}

      {selectedOption && reasonSubmitted && feedbackResult && (
        <div
          role="status"
          aria-live="polite"
          className={`p-4 rounded-2xl border text-xs sm:text-sm leading-relaxed flex flex-col gap-2 ${feedbackResult.badgeClass}`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="font-bold text-xs uppercase tracking-wide">
              {feedbackResult.badgeLabel}
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase bg-white/80 border border-current">
              Status: {feedbackResult.status.toUpperCase()}
            </span>
          </div>
          <div>
            <h4 className="font-bold text-xs sm:text-sm mb-1">{feedbackResult.title}</h4>
            <p className="leading-relaxed">{feedbackResult.explanation}</p>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <div className="flex flex-wrap items-center gap-2">
          {demoMode && (
            <button
              type="button"
              onClick={() => onComplete({ skipped: true })}
              className="px-3.5 py-2 rounded-full text-[11px] font-semibold text-amber-900 bg-amber-200 hover:bg-amber-300 transition"
            >
              🎬 Demo: Lewati Aktivitas
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={handleConfirmContinue}
          disabled={!selectedOption || !isReasonValid || !reasonSubmitted || !feedbackResult}
          className="ml-auto px-5 py-2.5 rounded-full text-xs sm:text-sm font-bold text-white transition hover:brightness-110 active:scale-98 disabled:opacity-40 disabled:cursor-not-allowed shadow-md"
          style={{
            background:
              selectedOption && isReasonValid && reasonSubmitted && feedbackResult
                ? 'linear-gradient(to bottom, #68b6f7, #3d6b91)'
                : '#c0cfe0',
          }}
        >
          ▶ Lanjutkan Video
        </button>
      </div>
    </Card>
  );
}
