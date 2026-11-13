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
    skipped?: boolean;
    reason?: string;
  }) => void;
}

/**
 * Panel aktivitas pertanyaan prediksi dua pilihan dengan umpan balik konsep langsung
 * dan kewajiban menuliskan argumen/alasan logis.
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

  if (!prediction) return null;

  const selectedOption: PredictionOption | undefined = prediction.options.find(
    (opt) => opt.id === selectedId
  );

  function handleSelect(option: PredictionOption) {
    setSelectedId(option.id);
  }

  function handleConfirmContinue() {
    if (!selectedOption || reason.trim().length < 5) return;
    onComplete({
      selectedOptionId: selectedOption.id,
      isCorrect: selectedOption.isCorrect,
      skipped: false,
      reason: reason.trim(),
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
          if (isChosen) {
            containerClass = opt.isCorrect
              ? 'border-emerald-400 bg-emerald-50 text-emerald-950 shadow-sm'
              : 'border-amber-400 bg-amber-50 text-amber-950 shadow-sm';
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
                      ? opt.isCorrect
                        ? 'bg-emerald-500 text-white'
                        : 'bg-amber-500 text-white'
                      : 'bg-[#eaf6ff] text-[#253f8a]'
                  }`}
                >
                  {prefix}
                </span>
                <span className="font-bold text-sm sm:text-base">{opt.label}</span>
              </div>
              {isChosen && (
                <span className="text-base shrink-0" aria-hidden="true">
                  {opt.isCorrect ? '✅' : '💡'}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {selectedOption && (
        <div className="flex flex-col gap-3">
          <div
            role="status"
            aria-live="polite"
            className={`p-4 rounded-2xl border text-xs sm:text-sm leading-relaxed ${
              selectedOption.isCorrect
                ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                : 'bg-amber-50 border-amber-200 text-amber-950'
            }`}
          >
            <p className="font-bold mb-1">
              {selectedOption.isCorrect ? '✅ Prediksimu Tepat!' : '💡 Yuk Perhatikan Penjelasannya:'}
            </p>
            <p>{selectedOption.feedback}</p>
          </div>

          {/* Kolom Alasan/Argumen Logis Siswa */}
          <div className="p-3.5 rounded-2xl bg-[#f8fbff] border border-[#bce0fd] flex flex-col gap-2">
            <label className="text-xs font-bold text-[#1b2f68] flex items-center justify-between">
              <span>✍️ Tuliskan Alasan / Argumen Kelompokmu (Wajib):</span>
              <span className={`text-[10px] font-normal ${reason.trim().length >= 5 ? 'text-green-600 font-bold' : 'text-slate-400'}`}>
                {reason.trim().length >= 5 ? '✓ Alasan terisi' : 'Minimal 5 karakter'}
              </span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Jelaskan secara singkat: Mengapa nilai kotak tersebut belum atau sudah berubah menurut logika komputermu?"
              rows={2}
              className="w-full p-2.5 rounded-xl border border-[#c0d8ef] text-xs text-[#121c2c] bg-white focus:outline-none focus:border-[#253f8a] resize-none"
            />
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <div className="flex flex-wrap items-center gap-2">
          {pausePoint.optional && (
            <button
              type="button"
              onClick={() => onComplete({ skipped: true })}
              className="px-4 py-2 rounded-full text-xs font-semibold text-[#464555] bg-[#f4fbff] border border-[#c0d8ef] hover:bg-[#eaf6ff] transition"
            >
              Lewati Pertanyaan (Opsional) →
            </button>
          )}
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
          disabled={!selectedOption || reason.trim().length < 5}
          className="ml-auto px-5 py-2.5 rounded-full text-xs sm:text-sm font-bold text-white transition hover:brightness-110 active:scale-98 disabled:opacity-40 disabled:cursor-not-allowed shadow-md"
          style={{
            background: selectedOption && reason.trim().length >= 5
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

