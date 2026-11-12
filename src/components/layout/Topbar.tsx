import { useNavigate } from 'react-router';
import { useAppStore } from '../../store/useAppStore';

export function Topbar() {
  const user    = useAppStore((s) => s.user);
  const reset   = useAppStore((s) => s.reset);
  const navigate = useNavigate();

  function handleLogout() {
    reset();
    navigate('/masuk');
  }

  return (
    <header className="sticky top-0 z-40 w-full bg-gradient-to-r from-white/95 via-[#f8fbff]/90 to-white/95 backdrop-blur-md border-b border-[#c0d8ef] px-6 py-2.5 flex items-center justify-between shadow-xs">
      {/* Kiri: Logo StepVerse (logooo.png) */}
      <div className="flex items-center">
        <img
          src={`${import.meta.env.BASE_URL}assets/logooo.png`}
          alt="StepVerse Logo"
          className="h-8 w-auto object-contain cursor-pointer hover:brightness-105 transition"
          onClick={() => navigate(user?.peran === 'guru' ? '/guru' : '/beranda')}
        />
      </div>

      {/* Kanan: User info + Logout */}
      {user && (
        <div className="flex items-center gap-3 text-sm text-[#464555]">
          <div className="flex items-center gap-2">
            <span className="text-lg">{user.peran === 'guru' ? '📊' : '🎒'}</span>
            <span className="font-bold text-[#121c2c]">{user.nama}</span>
            {user.kelas !== '-' && (
              <span
                className="text-xs px-2.5 py-0.5 rounded-full font-bold shadow-xs"
                style={{
                  background: '#eaf6ff',
                  color: '#253f8a',
                  boxShadow:
                    'inset 2px 2px 4px rgba(61,107,145,0.18), inset -2px -2px 4px rgba(255,255,255,0.85)',
                  border: '1px solid #bce0fd',
                }}
              >
                {user.kelas}
              </span>
            )}
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold text-[#3d6b91] transition-all hover:brightness-105 active:scale-95 focus-visible:ring-2 focus-visible:ring-[#68b6f7] outline-none"
            style={{
              background: '#eaf6ff',
              border: '1.5px solid #a6d7ff',
              boxShadow:
                '0 3px 6px rgba(61,107,145,0.1), inset 1px 1px 2px rgba(255,255,255,0.9)',
            }}
            aria-label="Keluar dari akun"
          >
            <span>🚪</span>
            <span>Keluar</span>
          </button>
        </div>
      )}
    </header>
  );
}
