import { useRef, useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router';
import { MATERI_LIST, STAGE_LABELS, type PausePoint } from '../data/curriculum';
import { Card } from '../components/ui/Card';
import { useAppStore } from '../store/useAppStore';
import { KinestheticSimulator } from '../components/KinestheticSimulator';
import { PredictionActivity } from '../components/PredictionActivity';
import { logEvent } from '../services/logger';
import {
  areRequiredPausePointsCompleted,
  findTriggeredPausePoint,
  formatPauseTime,
  getPausePointStorageKey,
  getSortedPausePoints,
  isPausePointCompleted,
  readPausePointCompletions,
  type MateriPausePointMap,
} from '../utils/videoPausePoints';

const WATCH_THRESHOLD = 0.95; // 95%
const FALLBACK_SIM_DURATION_SECONDS = 258; // Durasi fallback bila video tidak tersedia

export default function VideoPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const materiId = Number(id);
  const materi = MATERI_LIST.find((m) => m.id === materiId);

  const {
    setProgress,
    setAnswer,
    demoMode,
    progress,
    answers,
    user,
    enterStage,
    recordVideoReplay,
    telemetry,
  } = useAppStore();
  const videoRef = useRef<HTMLVideoElement>(null);
  const pauseBannerRef = useRef<HTMLDivElement>(null);
  const maxWatchedRef = useRef(0);
  const lastPlaybackTimeRef = useRef(0);
  const hasEndedOnceRef = useRef(false);
  const lastReplayRecordedAtRef = useRef(0);
  const [videoDuration, setVideoDuration] = useState<number>(FALLBACK_SIM_DURATION_SECONDS);
  const [canProceed, setCanProceed] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const [watchedPct, setWatchedPct] = useState(0);
  const [videoError, setVideoError] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulatedTime, setSimulatedTime] = useState(0);

  // Pause points dari konfigurasi kurikulum
  const pausePoints = useMemo(() => getSortedPausePoints(materi?.pausePoints), [materi?.pausePoints]);
  const completions = useMemo(
    () => readPausePointCompletions(answers, materiId),
    [answers, materiId]
  );

  const [activePausePointId, setActivePausePointId] = useState<string | null>(null);
  const activePausePointIdRef = useRef<string | null>(null);
  const [reviewPausePointId, setReviewPausePointId] = useState<string | null>(null);

  const activePausePoint: PausePoint | null =
    pausePoints.find((pp) => pp.id === activePausePointId) ?? null;
  const reviewPausePoint: PausePoint | null =
    !activePausePoint ? (pausePoints.find((pp) => pp.id === reviewPausePointId) ?? null) : null;

  // Status Pretest di awal pembelajaran
  const isPretestDone = !!answers['pretest_result'];
  const isVideoMarkedDone = progress[`${materiId}-video`] === 'done';

  useEffect(() => {
    enterStage('video');
  }, [enterStage, materiId]);

  // Reset UI state saat berganti materi atau akun siswa
  useEffect(() => {
    activePausePointIdRef.current = null;
    setActivePausePointId(null);
    setReviewPausePointId(null);
    setIsSimulating(false);
    setSimulatedTime(0);
    setVideoError(false);
    lastPlaybackTimeRef.current = 0;
    hasEndedOnceRef.current = false;
    if (videoRef.current?.duration && !isNaN(videoRef.current.duration)) {
      setVideoDuration(videoRef.current.duration);
    }
    if (progress[`${materiId}-video`] === 'done') {
      setCanProceed(true);
      setWatchedPct(100);
      maxWatchedRef.current = 1;
    } else {
      setCanProceed(false);
      setWatchedPct(0);
      maxWatchedRef.current = 0;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [materiId, user?.id]);

  // Sinkronkan status selesai bila progres video sudah ditandai selesai
  useEffect(() => {
    if (isVideoMarkedDone) {
      setCanProceed(true);
      setWatchedPct(100);
      maxWatchedRef.current = 1;
    }
  }, [isVideoMarkedDone]);

  // Periksa kesiapan lanjut setiap kali status pause point berubah
  useEffect(() => {
    const requiredDone = areRequiredPausePointsCompleted(pausePoints, completions);
    if (isVideoMarkedDone || (maxWatchedRef.current >= WATCH_THRESHOLD && requiredDone)) {
      setCanProceed(true);
    }
  }, [pausePoints, completions, isVideoMarkedDone]);

  // Pastikan banner "Video dijeda" dan panel aktivitas terlihat jelas saat jeda aktif
  useEffect(() => {
    if (activePausePointId && pauseBannerRef.current) {
      pauseBannerRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [activePausePointId]);

  if (!materi) return <div className="p-6 text-red-500">Materi tidak ditemukan.</div>;

  const videoSrc = materi.videoSrc ?? `/video/materi${materiId}.mp4`;

  function registerReplayEvent(reason: string, currentSec?: number) {
    const now = Date.now();
    // Debounce agar event seeking berturut-turut tidak dihitung ganda dalam 2 detik
    if (now - lastReplayRecordedAtRef.current < 2000) return;
    lastReplayRecordedAtRef.current = now;
    recordVideoReplay();
    logEvent({
      stage: 'video',
      componentId: 'video-replay',
      ctComponent: 'abstraction',
      result: 'info',
      payload: { reason, atSecond: currentSec ?? 0 },
    });
  }

  function getFreshCompletionsSnapshot() {
    const storeState = useAppStore.getState();
    return readPausePointCompletions(storeState.answers, materiId);
  }

  function triggerPausePoint(pp: PausePoint) {
    setReviewPausePointId(null);
    activePausePointIdRef.current = pp.id;
    if (typeof document !== 'undefined' && document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
    setActivePausePointId((prev) => {
      if (prev !== pp.id) {
        logEvent({
          stage: 'video',
          componentId: `video-pause-${pp.id}`,
          ctComponent: pp.type === 'kinesthetic' ? 'decomposition' : 'abstraction',
          result: 'info',
          payload: { time: pp.time, type: pp.type, optional: !!pp.optional },
        });
      }
      return pp.id;
    });
  }

  function handleLoadedMetadata() {
    const v = videoRef.current;
    if (v && v.duration && !isNaN(v.duration)) {
      setVideoDuration(v.duration);
    }
  }

  function handleTimeUpdate() {
    const v = videoRef.current;
    if (!v || !v.duration || isNaN(v.duration)) return;

    // Update waktu terakhir jika tidak sedang meloncat mundur jauh
    if (v.currentTime >= lastPlaybackTimeRef.current) {
      lastPlaybackTimeRef.current = v.currentTime;
    }

    const freshCompletions = getFreshCompletionsSnapshot();
    const triggered = findTriggeredPausePoint(v.currentTime, pausePoints, freshCompletions);

    if (triggered) {
      v.pause();
      if (v.currentTime > triggered.time + 0.15) {
        v.currentTime = triggered.time;
      }
      triggerPausePoint(triggered);
      const boundedRatio = Math.min(v.currentTime, triggered.time) / v.duration;
      if (boundedRatio > maxWatchedRef.current) {
        maxWatchedRef.current = boundedRatio;
        setWatchedPct(Math.round(boundedRatio * 100));
      }
      return;
    }

    const currentRatio = v.currentTime / v.duration;
    if (currentRatio > maxWatchedRef.current) {
      maxWatchedRef.current = currentRatio;
      setWatchedPct(Math.round(currentRatio * 100));
    }

    const requiredDone = areRequiredPausePointsCompleted(pausePoints, freshCompletions);
    if (maxWatchedRef.current >= WATCH_THRESHOLD && requiredDone && !canProceed) {
      setCanProceed(true);
    }
  }

  function handleSeeking() {
    const v = videoRef.current;
    if (!v || !v.duration || isNaN(v.duration)) return;

    // Deteksi mundur/rewind >= 5 detik sebagai pemutaran ulang bagian video
    if (lastPlaybackTimeRef.current - v.currentTime >= 5) {
      registerReplayEvent('rewind', Math.round(v.currentTime));
    }
    lastPlaybackTimeRef.current = v.currentTime;

    const freshCompletions = getFreshCompletionsSnapshot();
    const triggered = findTriggeredPausePoint(v.currentTime, pausePoints, freshCompletions);
    if (triggered) {
      v.pause();
      if (v.currentTime > triggered.time + 0.05) {
        v.currentTime = triggered.time;
      }
      triggerPausePoint(triggered);
    }
  }

  function handleVideoEnded() {
    hasEndedOnceRef.current = true;
  }

  function handleVideoPlay() {
    const v = videoRef.current;
    if (!v) return;
    if (hasEndedOnceRef.current && v.currentTime < 5) {
      hasEndedOnceRef.current = false;
      registerReplayEvent('replay_after_end', 0);
    }
    const freshCompletions = getFreshCompletionsSnapshot();
    const openPausePoint = pausePoints.find((pp) => pp.id === activePausePointIdRef.current);
    // Lanjutkan pemutaran hanya setelah aktivitas pada pause point selesai atau dilewati (demo/opsional)
    if (openPausePoint && !isPausePointCompleted(openPausePoint, freshCompletions)) {
      v.pause();
      return;
    }
    const triggered = findTriggeredPausePoint(v.currentTime, pausePoints, freshCompletions);
    if (triggered) {
      v.pause();
      if (v.currentTime > triggered.time + 0.05) {
        v.currentTime = triggered.time;
      }
      triggerPausePoint(triggered);
    }
  }

  function handleCompletePausePoint(
    pp: PausePoint,
    meta?: { selectedOptionId?: string; isCorrect?: boolean; reason?: string; skipped?: boolean }
  ) {
    const freshCompletions = getFreshCompletionsSnapshot();
    const nextCompletions: MateriPausePointMap = {
      ...freshCompletions,
      [pp.id]: {
        completedAt: new Date().toISOString(),
        ...(meta?.skipped ? { skipped: true } : {}),
        ...(meta?.selectedOptionId ? { selectedOptionId: meta.selectedOptionId } : {}),
        ...(typeof meta?.isCorrect === 'boolean' ? { isCorrect: meta.isCorrect } : {}),
        ...(meta?.reason ? { reason: meta.reason } : {}),
      },
    };
    setAnswer(getPausePointStorageKey(materiId), nextCompletions);
    if (pp.type === 'kinesthetic') {
      setProgress(materiId, 'simulasi', 'done');
    }
    logEvent({
      stage: 'video',
      componentId: `video-pause-complete-${pp.id}`,
      ctComponent: pp.type === 'kinesthetic' ? 'decomposition' : 'abstraction',
      result: meta?.skipped ? 'info' : 'pass',
      payload: { pausePointId: pp.id, type: pp.type, ...meta },
    });

    activePausePointIdRef.current = null;
    setActivePausePointId(null);

    if (videoError) {
      runFallbackSimulation(simulatedTime, nextCompletions);
      return;
    }

    if (videoRef.current) {
      videoRef.current.play().catch(() => {});
    }
  }

  function handleResetPausePoints() {
    activePausePointIdRef.current = null;
    setActivePausePointId(null);
    setReviewPausePointId(null);
    setAnswer(getPausePointStorageKey(materiId), {});
    setAnswer(`${materiId}-simulasi`, { role1Done: false, role2Done: false });
    registerReplayEvent('manual_reset_replay', 0);
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.pause();
    }
  }

  function runFallbackSimulation(
    startSec: number,
    latestCompletions: MateriPausePointMap
  ) {
    if (isSimulating) return;
    setIsSimulating(true);
    let currentSec = startSec;
    const stepSec = 15;

    const timer = setInterval(() => {
      currentSec = Math.min(FALLBACK_SIM_DURATION_SECONDS, currentSec + stepSec);
      const triggered = findTriggeredPausePoint(currentSec, pausePoints, latestCompletions);

      if (triggered) {
        clearInterval(timer);
        setIsSimulating(false);
        setSimulatedTime(triggered.time);
        const pct = Math.round((triggered.time / FALLBACK_SIM_DURATION_SECONDS) * 100);
        maxWatchedRef.current = Math.max(maxWatchedRef.current, pct / 100);
        setWatchedPct((prev) => Math.max(prev, pct));
        triggerPausePoint(triggered);
        return;
      }

      setSimulatedTime(currentSec);
      const ratio = currentSec / FALLBACK_SIM_DURATION_SECONDS;
      if (ratio > maxWatchedRef.current) {
        maxWatchedRef.current = ratio;
        setWatchedPct((prev) => Math.max(prev, Math.round(ratio * 100)));
      }

      if (currentSec >= FALLBACK_SIM_DURATION_SECONDS) {
        clearInterval(timer);
        setIsSimulating(false);
        maxWatchedRef.current = 1;
        setWatchedPct(100);
        setCanProceed(true);
      }
    }, 350);
  }

  function handleProceed() {
    logEvent({
      stage: 'video',
      componentId: 'video-proceed',
      ctComponent: 'abstraction',
      result: 'pass',
      payload: { watchedPct: maxWatchedRef.current },
    });
    setProgress(materiId, 'video', 'done');
    setProgress(materiId, 'ipo', 'active');
    navigate(`/materi/${materiId}/ipo`);
  }

  function handleDemoSkip() {
    setCanProceed(true);
    setProgress(materiId, 'video', 'done');
    setProgress(materiId, 'ipo', 'active');
    navigate(`/materi/${materiId}/ipo`);
  }

  const displayedPausePoint = activePausePoint ?? reviewPausePoint;

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-6 relative">
      {/* Pretest Guard Dialog if pretest has not been completed */}
      {!isPretestDone && !demoMode && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-3xl p-6 shadow-2xl border border-[#bce0fd] flex flex-col items-center text-center gap-3 animate-in fade-in zoom-in-95 duration-200">
            <span className="text-4xl select-none">📝</span>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#253f8a] bg-[#eaf6ff] px-3 py-1 rounded-full">
              Tahap Evaluasi Awal
            </span>
            <h2 className="text-lg font-bold text-[#121c2c]">Kerjakan Pretest CT Terlebih Dahulu</h2>
            <p className="text-xs text-[#555] leading-relaxed">
              Sebelum memulai menonton video orientasi <strong>Materi 1: Variabel & Penugasan Nilai</strong>,
              kamu diwajibkan menyelesaikan <strong>Pretest CT</strong> untuk mengukur kemampuan awal berpikir komputasionalmu.
            </p>
            <div className="w-full flex flex-col gap-2 mt-2">
              <button
                type="button"
                onClick={() => navigate('/tes/awal')}
                className="w-full py-2.5 rounded-full text-xs font-bold text-white bg-gradient-to-r from-[#68b6f7] to-[#3d6b91] hover:brightness-110 active:scale-95 transition shadow-sm"
              >
                Mulai Pretest Sekarang (5 Soal) →
              </button>
              <button
                type="button"
                onClick={() => navigate('/beranda')}
                className="w-full py-2 rounded-full text-xs font-semibold text-[#666] hover:bg-gray-100 transition"
              >
                Kembali ke Beranda Materi
              </button>
            </div>
          </div>
        </div>
      )}

      <div>
        <div className="text-xs text-[#464555] mb-1 uppercase tracking-widest font-semibold">
          Materi {materiId} · {STAGE_LABELS.video}
        </div>
        <h1 className="text-2xl font-bold text-[#121c2c]">{materi.judul}</h1>
      </div>

      <Card>
        {/* Video Player */}
        <div className="aspect-video bg-[#121c2c] rounded-2xl overflow-hidden mb-4 relative flex items-center justify-center">
          <video
            ref={videoRef}
            className="w-full h-full object-contain"
            controls
            onLoadedMetadata={handleLoadedMetadata}
            onTimeUpdate={handleTimeUpdate}
            onSeeking={handleSeeking}
            onPlay={handleVideoPlay}
            onEnded={handleVideoEnded}
            onError={() => setVideoError(true)}
            preload="metadata"
          >
            <source src={videoSrc} type="video/mp4" />
          </video>

          {/* Fallback Placeholder jika video belum tersedia */}
          {videoError && (
            <div
              className="absolute inset-0 bg-[#0e1626]/90 p-6 flex flex-col items-center justify-center text-center text-white"
              role="region"
              aria-label="Fallback Video Contoh"
            >
              <span className="text-4xl mb-2">🎬</span>
              <span className="font-bold text-xs tracking-wider bg-[#253f8a] px-3 py-1 rounded-full mb-2 uppercase">
                Video Orientasi Kasus
              </span>
              <p className="text-xs text-white/70 max-w-md mb-4 leading-relaxed">
                File <code className="bg-black/50 px-1 py-0.5 rounded">public{videoSrc}</code> gagal dimuat.
                Gunakan tombol di bawah untuk menyimulasikan pemutaran video beserta titik jeda aktivitas:
              </p>
              <button
                type="button"
                onClick={() => runFallbackSimulation(simulatedTime, completions)}
                disabled={isSimulating || canProceed || !!activePausePoint}
                className="px-5 py-2.5 rounded-full text-xs font-bold text-white bg-gradient-to-r from-[#68b6f7] to-[#3d6b91] hover:brightness-110 active:scale-95 transition disabled:opacity-60 shadow-md"
              >
                {activePausePoint
                  ? '⏸ Selesaikan Aktivitas Jeda di Bawah'
                  : isSimulating
                  ? '⏳ Memutar simulasi video…'
                  : canProceed
                  ? '✅ Tontonan Selesai (100%)'
                  : '▶ Putar Simulasi Tontonan Video'}
              </button>
            </div>
          )}
        </div>

        {/* Banner informasi jika jeda aktivitas sudah selesai sebelumnya */}
        {Object.keys(completions).length > 0 && !activePausePoint && (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-[#f0f9ff] border border-[#bae6fd] text-[#0369a1] text-xs">
            <div className="flex items-center gap-2">
              <span className="text-base shrink-0">ℹ️</span>
              <span className="leading-relaxed">
                <strong>Aktivitas jeda sudah selesai:</strong> Video tidak akan berhenti otomatis lagi saat ditonton ulang karena simulasi kinestetik &amp; prediksi konsep sudah tercatat selesai di akunmu.
              </span>
            </div>
            <button
              type="button"
              onClick={handleResetPausePoints}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full font-bold text-xs bg-[#0284c7] text-white hover:bg-[#0369a1] shadow-xs transition active:scale-95 cursor-pointer shrink-0"
            >
              🔄 Reset &amp; Ulangi Jeda Otomatis
            </button>
          </div>
        )}

        {/* Banner kecil "Video dijeda" saat aktivitas jeda terbuka */}
        {activePausePoint && (
          <div
            ref={pauseBannerRef}
            role="status"
            aria-live="polite"
            data-testid="video-paused-banner"
            className="mb-4 flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 rounded-2xl bg-amber-50 border border-amber-300 shadow-xs text-amber-950"
          >
            <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-200 text-amber-950 font-bold text-xs shrink-0">
                ⏸ Video dijeda
              </span>
              <span>
                {activePausePoint.type === 'kinesthetic'
                  ? 'Lakukan aktivitas kinestetik berpasangan di bawah ini untuk melanjutkan pemutaran.'
                  : 'Jawab pertanyaan prediksi dan tuliskan alasan logismu di bawah untuk melanjutkan pemutaran.'}
              </span>
            </div>
            <span className="text-[11px] font-mono font-semibold text-amber-800 shrink-0">
              {formatPauseTime(activePausePoint.time)}
            </span>
          </div>
        )}

        {/* Progress bar + penanda pause points */}
        <div className="mb-4">
          <div className="flex flex-wrap justify-between items-center gap-2 text-xs text-[#464555] mb-1.5">
            <span className="font-semibold flex flex-wrap items-center gap-1.5">
              <span>Progres tonton</span>
              {pausePoints.map((pp) => {
                const done = isPausePointCompleted(pp, completions);
                const isOpen = displayedPausePoint?.id === pp.id;
                return (
                  <button
                    key={pp.id}
                    type="button"
                    disabled={!done && !activePausePoint}
                    onClick={() => {
                      if (!activePausePoint && done) {
                        setReviewPausePointId((prev) => (prev === pp.id ? null : pp.id));
                      }
                    }}
                    title={
                      done
                        ? 'Klik untuk meninjau aktivitas yang sudah selesai'
                        : `Aktivitas akan terbuka pada menit ${formatPauseTime(pp.time)}`
                    }
                    className={`text-[10px] px-2.5 py-0.5 rounded-full font-semibold border transition ${
                      done
                        ? isOpen
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100 cursor-pointer'
                        : activePausePoint?.id === pp.id
                        ? 'bg-amber-200 text-amber-950 border-amber-400'
                        : 'bg-[#eaf6ff] text-[#253f8a] border-[#a6d7ff]'
                    }`}
                  >
                    {done ? '✅ ' : pp.type === 'kinesthetic' ? '🤝 ' : '🔮 '}
                    {formatPauseTime(pp.time)}{' '}
                    {pp.type === 'kinesthetic' ? 'Simulasi' : 'Prediksi'}
                    {pp.optional ? ' (Opsional)' : ''}
                  </button>
                );
              })}
              {Object.keys(completions).length > 0 && !activePausePoint && (
                <button
                  type="button"
                  onClick={handleResetPausePoints}
                  title="Reset jeda aktivitas video agar muncul kembali saat menonton ulang"
                  className="text-[10px] px-2 py-0.5 rounded-full font-semibold text-[#464555] bg-white border border-[#c0d8ef] hover:bg-[#eaf6ff] transition"
                >
                  ↺ Ulangi Jeda
                </button>
              )}
            </span>
            <span className="font-mono flex items-center gap-2">
              {telemetry.videoReplayCount > 0 && (
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#eaf6ff] text-[#253f8a] border border-[#bce0fd]">
                  🔁 {telemetry.videoReplayCount}× putar ulang
                </span>
              )}
              <span>
                {watchedPct}% {canProceed ? '✅ (Lolos ≥95%)' : '(perlu ≥95%)'}
              </span>
            </span>
          </div>
          <div className="w-full h-2.5 rounded-full bg-[#eaf6ff] overflow-hidden relative">
            {pausePoints.map((pp) => {
              const pct = Math.min(100, Math.max(0, (pp.time / videoDuration) * 100));
              const done = isPausePointCompleted(pp, completions);
              return (
                <div
                  key={pp.id}
                  className={`absolute top-0 bottom-0 w-1 z-10 ${
                    done
                      ? 'bg-emerald-500'
                      : pp.type === 'kinesthetic'
                      ? 'bg-amber-400'
                      : 'bg-indigo-400'
                  }`}
                  style={{ left: `${pct}%` }}
                  title={`${pp.title ?? pp.type} (${formatPauseTime(pp.time)})`}
                />
              );
            })}
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#68b6f7] to-[#3d6b91] transition-all duration-300"
              style={{ width: `${watchedPct}%` }}
              role="progressbar"
              aria-valuenow={watchedPct}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
        </div>

        <p className="text-sm text-[#464555] leading-relaxed">
          Tonton video pembelajaran <strong>{materi.judul}</strong>. Pemutaran akan berhenti sejenak pada titik aktivitas
          (simulasi kinestetik berpasangan dan pertanyaan prediksi konsep). Tombol lanjut ke Analisis IPO aktif setelah
          video ditonton minimal <strong>95%</strong> dan aktivitas wajib selesai.
        </p>
      </Card>

      {/* PANEL AKTIVITAS PAUSE POINT (AKTIF ATAU TINJAU ULANG) */}
      {displayedPausePoint && (
        <div
          className={`p-5 rounded-3xl border-2 transition-all ${
            activePausePoint
              ? 'bg-amber-50/70 border-amber-300 shadow-lg'
              : 'bg-[#f4fbff] border-[#bce0fd]'
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2.5">
              <span className="text-2xl">
                {displayedPausePoint.type === 'kinesthetic' ? '🤝' : '🔮'}
              </span>
              <div>
                <h3 className="font-bold text-sm text-[#121c2c]">
                  {displayedPausePoint.title ??
                    (displayedPausePoint.type === 'kinesthetic'
                      ? 'Aktivitas Kinestetik (Unplugged Break)'
                      : 'Pertanyaan Prediksi Konsep')}
                </h3>
                <span className="text-xs text-[#464555]">
                  {activePausePoint
                    ? `⏸️ Video dijeda pada ${formatPauseTime(displayedPausePoint.time)} — selesaikan aktivitas untuk melanjutkan.`
                    : `✅ Aktivitas pada ${formatPauseTime(displayedPausePoint.time)} telah diselesaikan (mode tinjau).`}
                </span>
              </div>
            </div>

            {!activePausePoint && reviewPausePoint && (
              <button
                type="button"
                onClick={() => setReviewPausePointId(null)}
                className="text-xs font-semibold px-3 py-1 rounded-full bg-white border border-[#c0d8ef] text-[#253f8a] hover:bg-[#eaf6ff] transition"
              >
                Tutup Tinjauan ▲
              </button>
            )}
          </div>

          {displayedPausePoint.type === 'kinesthetic' ? (
            <div className="mt-3 pt-3 border-t border-amber-200/80">
              <KinestheticSimulator
                key={`${displayedPausePoint.id}-${user?.id ?? 'guest'}`}
                materiId={materiId}
                isEmbedded={true}
                onComplete={() => {
                  if (activePausePoint?.id === displayedPausePoint.id) {
                    handleCompletePausePoint(displayedPausePoint);
                  } else {
                    setReviewPausePointId(null);
                    videoRef.current?.play().catch(() => {});
                  }
                }}
              />
            </div>
          ) : (
            <div className="mt-3 pt-3 border-t border-[#cde7fc]">
              <PredictionActivity
                key={`${displayedPausePoint.id}-${user?.id ?? 'guest'}`}
                pausePoint={displayedPausePoint}
                savedRecord={completions[displayedPausePoint.id]}
                demoMode={demoMode}
                onComplete={(result) => {
                  if (activePausePoint?.id === displayedPausePoint.id) {
                    handleCompletePausePoint(displayedPausePoint, result);
                  } else {
                    setReviewPausePointId(null);
                    videoRef.current?.play().catch(() => {});
                  }
                }}
              />
            </div>
          )}
        </div>
      )}

      {/* Transcript Drawer */}
      <Card>
        <button
          type="button"
          className="w-full flex items-center justify-between text-sm font-semibold text-[#253f8a] focus-visible:ring-2 focus-visible:ring-[#68b6f7] outline-none"
          onClick={() => setShowTranscript((v) => !v)}
          aria-expanded={showTranscript}
        >
          <span className="flex items-center gap-2">
            <span>📄</span>
            <span>Transkrip Video Pembelajaran</span>
          </span>
          <span className="text-xs bg-[#eaf6ff] px-2 py-1 rounded-full font-mono">
            {showTranscript ? 'Tutup ▲' : 'Buka ▼'}
          </span>
        </button>
        {showTranscript && (
          <div className="mt-4 text-sm text-[#464555] space-y-2.5 border-t border-[#eaf6ff] pt-4 leading-relaxed">
            <p><strong>[00:00] Masalah Kasir Kantin Bu Ani:</strong> Kantin Bu Ani sedang ramai pembeli. Catatan pesanan di kertas nota mulai berantakan, basah, dan sering salah hitung saat ada pesanan bertambah. Rani mengajak kita merancang sistem pencatatan yang teratur di komputer untuk membantu Bu Ani.</p>
            <p><strong>[00:25] Inkuiri Kebutuhan Wadah:</strong> Untuk memproses pesanan, ada banyak informasi yang harus disimpan: siapa pembelinya, berapa harga makanannya, dan berapa banyak porsinya. Bagaimana cara komputer menyimpan dan membedakan informasi-informasi tersebut di dalam memorinya agar tidak saling bercampur?</p>
            <p><strong>[00:50] Permisalan Wadah Berlabel:</strong> Bayangkan komputer memiliki rak berisi kotak-kotak berlabel khusus. Kotak berstiker label <code className="bg-[#eaf6ff] px-1 rounded">nama_pembeli</code> untuk menyimpan nama, kotak <code className="bg-[#eaf6ff] px-1 rounded">harga</code> untuk harga satuan, dan kotak <code className="bg-[#eaf6ff] px-1 rounded">jumlah</code> untuk banyaknya porsi.</p>
            <p><strong>[01:15] Memasukkan Isi ke Wadah (=):</strong> Untuk memasukkan isi ke dalam wadah, kita gunakan tanda penunjuk sama dengan (<code className="bg-[#eaf6ff] px-1 rounded">=</code>). Misalnya: masukkan <code className="bg-[#eaf6ff] px-1 rounded">8000</code> ke wadah berlabel <code className="bg-[#eaf6ff] px-1 rounded">harga</code>, ditulis <code className="bg-[#eaf6ff] px-1 rounded">harga = 8000</code>. Tanda ini bekerja seperti tangan yang menaruh isi dari sisi kanan ke wadah di sisi kiri.</p>
            <p><strong>[01:40] Membedakan Jenis-Jenis Isi Wadah:</strong> Perhatikan karakteristik isi yang dimasukkan:
              <br />• <strong>Teks/Kata yang diapit petik:</strong> Wajib dibungkus tanda petik, contoh <code className="bg-[#eaf6ff] px-1 rounded">&quot;Bakso&quot;</code> atau <code className="bg-[#eaf6ff] px-1 rounded">&quot;Ayu&quot;</code>, agar komputer mengenalnya sebagai tulisan biasa dan bukan stiker label wadah.
              <br />• <strong>Angka murni untuk perhitungan:</strong> Ditulis langsung tanpa petik, contoh <code className="bg-[#eaf6ff] px-1 rounded">8000</code> dan <code className="bg-[#eaf6ff] px-1 rounded">2</code>. Angka murni inilah yang bisa dioperasikan matematika (dikali/dijumlahkan).
              <br />• <strong>Angka desimal/pecahan:</strong> Contoh <code className="bg-[#eaf6ff] px-1 rounded">0.1</code> untuk diskon 10% atau takaran berkoma.
              <br />• <strong>Pilihan kepastian (Benar/Salah):</strong> Hanya bernilai <code className="bg-[#eaf6ff] px-1 rounded">True</code> atau <code className="bg-[#eaf6ff] px-1 rounded">False</code>, misalnya untuk mengecek apakah nota belanja sudah dibayar.
            </p>
            <p><strong>[02:20] <em>[Jeda Simulasi Kinestetik]</em></strong> Sekarang giliran kalian berpasangan memperagakan peran Programmer dan Komputer untuk mempraktikkan pengisian wadah-wadah fisik ini secara nyata!</p>
            <p><strong>[02:30] Karakteristik Kotak Penyimpanan:</strong> Satu wadah memori hanya dapat menampung satu isi terbaru. Saat pesanan bertambah dan wadah <code className="bg-[#eaf6ff] px-1 rounded">jumlah</code> diisi dengan angka baru, isi yang lama akan keluar dan tergantikan. Namun, wadah hasil hitungan <code className="bg-[#eaf6ff] px-1 rounded">total_harga</code> yang sudah tersimpan sebelumnya tidak otomatis berganti sendiri.</p>
            <p><strong>[03:04] <em>[Jeda Prediksi Konsep]</em></strong> Menurutmu, isi kotak <code className="bg-[#eaf6ff] px-1 rounded">total_harga</code> sekarang tetap <code className="bg-[#eaf6ff] px-1 rounded">16000</code> atau otomatis jadi <code className="bg-[#eaf6ff] px-1 rounded">24000</code>? Untuk memperbarui isinya, komputer harus menghitung ulang dan memasukkan kembali hasilnya ke dalam wadah tersebut.</p>
            <p><strong>[03:18] Aturan Label Wadah &amp; Penutup:</strong> Buatlah stiker label wadah yang jelas tanpa spasi, jangan awali label dengan angka, dan pastikan bentuk isinya sesuai dengan kebutuhan sistem kasir. Siap memecahkan tantangan berikutnya?</p>
          </div>
        )}
      </Card>

      {/* Actions */}
      <div className="flex items-center justify-between">
        {demoMode && (
          <button
            type="button"
            onClick={handleDemoSkip}
            className="px-4 py-2 rounded-full text-xs font-semibold text-amber-900 bg-amber-200 hover:bg-amber-300 transition"
          >
            🎬 Demo: Lewati Video
          </button>
        )}
        <div className="ml-auto">
          <button
            type="button"
            onClick={handleProceed}
            disabled={!canProceed}
            className="inline-flex items-center gap-2 font-semibold rounded-full px-6 py-3 text-base text-white transition-all hover:brightness-110 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-blue-400 outline-none disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: canProceed
                ? 'linear-gradient(to bottom, #68b6f7, #3d6b91)'
                : '#c0cfe0',
              boxShadow: canProceed
                ? '0 14px 22px -6px rgba(61,107,145,0.45), inset 0 2px 3px rgba(255,255,255,0.7), inset 0 -4px 0 #253f8a'
                : 'none',
            }}
          >
            <span>Saya sudah paham masalahnya</span>
            <span>→</span>
          </button>
        </div>
      </div>
    </div>
  );
}
