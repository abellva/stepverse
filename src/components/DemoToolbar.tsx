import { useLocation, useNavigate } from 'react-router';
import { useAppStore } from '../store/useAppStore';

export function DemoToolbar() {
  const { reset, setProgress } = useAppStore();
  const location = useLocation();
  const navigate = useNavigate();

  function handleSkipCurrentGate() {
    const path = location.pathname;
    const match = path.match(/\/materi\/(\d+)\/(\w+)/);

    if (match) {
      const materiId = Number(match[1]);
      const stage = match[2];

      if (stage === 'video') {
        setProgress(materiId, 'video', 'done');
        setProgress(materiId, 'ipo', 'active');
        navigate(`/materi/${materiId}/ipo`);
      } else if (stage === 'ipo') {
        setProgress(materiId, 'ipo', 'done');
        setProgress(materiId, 'dekomposisi', 'active');
        navigate(`/materi/${materiId}/dekomposisi`);
      } else if (stage === 'dekomposisi') {
        setProgress(materiId, 'dekomposisi', 'done');
        setProgress(materiId, 'parsons', 'active');
        navigate(`/materi/${materiId}/parsons`);
      } else if (stage === 'parsons') {
        setProgress(materiId, 'parsons', 'done');
        setProgress(materiId, 'lab', 'active');
        navigate(`/materi/${materiId}/lab`);
      } else if (stage === 'lab') {
        setProgress(materiId, 'lab', 'done');
        navigate('/tes/akhir');
      }
    } else {
      alert('Buka salah satu tahapan materi untuk menggunakan tombol lewati.');
    }
  }

  function handleSeedDemoData() {
    // Akan dihubungkan penuh di Phase 2C
    alert('Data contoh telah dimuat untuk demonstrasi.');
  }

  return (
    <div
      role="toolbar"
      aria-label="Toolbar Mode Demo"
      className="sticky top-[57px] z-50 w-full bg-amber-100 border-b border-amber-300 px-4 py-2 flex flex-wrap items-center gap-3 text-sm shadow-sm"
    >
      <span className="font-bold text-amber-900 flex items-center gap-1.5">
        <span>🎬</span>
        <span>MODE DEMO PRESENTER</span>
      </span>
      <button
        type="button"
        className="px-3 py-1 rounded-full bg-amber-300 text-amber-900 font-semibold hover:bg-amber-400 active:scale-95 transition text-xs"
        onClick={handleSkipCurrentGate}
      >
        ⏭️ Lewati langkah ini (Unlock Gate)
      </button>
      <button
        type="button"
        className="px-3 py-1 rounded-full bg-amber-300 text-amber-900 font-semibold hover:bg-amber-400 active:scale-95 transition text-xs"
        onClick={handleSeedDemoData}
      >
        📊 Muat data contoh (Guru)
      </button>
      <button
        type="button"
        className="px-3 py-1 rounded-full bg-red-200 text-red-800 font-semibold hover:bg-red-300 active:scale-95 transition text-xs ml-auto"
        onClick={reset}
      >
        🔄 Reset Sesi
      </button>
    </div>
  );
}
