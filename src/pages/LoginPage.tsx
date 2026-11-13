import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router';
import { useAppStore } from '../store/useAppStore';
import { authenticate, KELAS_OPTIONS, SEKOLAH_OPTIONS } from '../data/users';
import { getUserGroup } from '../services/groupService';

type Peran = 'siswa' | 'guru';

// ---- Asset paths (dari public/assets Figma export) ----
const assetPathPrefix = `${import.meta.env.BASE_URL}assets`;
const imgLock     = `${assetPathPrefix}/ec9f5.svg`;
const imgSiswa    = `${assetPathPrefix}/71207.svg`;
const imgGuru     = `${assetPathPrefix}/0c91f.svg`;
const imgArrow    = `${assetPathPrefix}/683b6.svg`;

export default function LoginPage() {
  const { setUser, setDemoMode } = useAppStore();
  const navigate = useNavigate();

  const [peran, setPeran]       = useState<Peran>('siswa');
  const [nisn, setNisn]         = useState('');
  const [password, setPassword] = useState('');
  const [kelas, setKelas]       = useState(KELAS_OPTIONS[0]);
  const [sekolah, _setSekolah]  = useState(SEKOLAH_OPTIONS[0]);
  const [showPass, setShowPass] = useState(false);
  const [ingat, setIngat]       = useState(false);
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('demo') === '1') setDemoMode(true);

    // Pulihkan sesi "ingat saya"
    const saved = localStorage.getItem('stepverse-remembered');
    if (saved) {
      try {
        const { nisn: n, peran: p } = JSON.parse(saved);
        setNisn(n ?? '');
        setPeran(p ?? 'siswa');
        setIngat(true);
      } catch { /* abaikan */ }
    }
  }, [setDemoMode]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Simulasi delay network kecil agar terasa nyata
    await new Promise((r) => setTimeout(r, 300));

    const user = authenticate(nisn, password);
    setLoading(false);

    if (!user) {
      setError('NISN / email atau kata sandi salah. Coba lagi.');
      return;
    }
    if (user.peran !== peran) {
      setError(`Akun ini terdaftar sebagai ${user.peran === 'siswa' ? 'Siswa' : 'Guru'}, bukan ${peran === 'siswa' ? 'Siswa' : 'Guru'}.`);
      return;
    }

    if (ingat) {
      localStorage.setItem('stepverse-remembered', JSON.stringify({ nisn, peran }));
    } else {
      localStorage.removeItem('stepverse-remembered');
    }

    const storedGroup = user.peran === 'siswa' ? getUserGroup(user.id) : undefined;
    setUser({
      id: user.id,
      nama: user.nama,
      peran: user.peran,
      kelas: user.kelas,
      kelompok: storedGroup?.id,
    });

    if (user.peran === 'guru') {
      navigate('/guru');
    } else if (storedGroup) {
      navigate('/beranda');
    } else {
      navigate('/pilih-kelompok');
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden"
      style={{
        backgroundImage:
          'linear-gradient(90deg, rgb(234,244,255) 0%, rgb(234,244,255) 100%)',
      }}
    >
      {/* Ambient blobs */}
      <div className="absolute top-[-64px] left-[-64px] size-64 rounded-full bg-[rgba(166,215,255,0.6)] blur-[32px] pointer-events-none" />
      <div className="absolute right-[-80px] top-1/3 bottom-1/3 w-80 rounded-full bg-[rgba(166,215,255,0.4)] blur-[32px] pointer-events-none" />
      <div className="absolute bottom-[-64px] left-1/4 h-72 w-1/4 rounded-full bg-[rgba(166,215,255,0.2)] blur-[32px] pointer-events-none" />

      {/* Card */}
      <div
        className="relative bg-white w-full max-w-[576px] rounded-[48px] p-9 flex flex-col gap-6"
        style={{
          boxShadow:
            '0 28px 60px -12px rgba(61,107,145,0.2), inset 2px 2px 6px rgba(255,255,255,0.95), inset -3px -3px 8px rgba(61,107,145,0.06)',
        }}
      >
        {/* Header Branding */}
        <div className="flex flex-col items-center gap-1">
          <img
            src={`${import.meta.env.BASE_URL}assets/logooo.png`}
            alt="StepVerse Logo"
            className="h-12 w-auto object-contain mb-2"
          />

          <h1 className="text-[24px] font-bold text-[#121c2c] tracking-tight text-center">
            Masuk ke StepVerse
          </h1>
          <p className="text-sm text-[#464555] text-center leading-snug">
            Platform Problem-Based Learning Berpikir Komputasional & Python Interaktif Kelas X SMA.
          </p>
        </div>

        {/* Role Switcher */}
        <fieldset>
          <legend className="text-xs font-bold uppercase tracking-widest text-[#464555] text-center mb-3">
            Pilih Peran Belajar
          </legend>
          <div className="grid grid-cols-2 gap-3">
            {(['siswa', 'guru'] as Peran[]).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPeran(p)}
                aria-pressed={peran === p}
                className="relative p-4 rounded-[32px] text-left transition-all focus-visible:ring-2 focus-visible:ring-blue-400 outline-none"
                style={{
                  background: peran === p ? '#eaf6ff' : '#e7eeff',
                  boxShadow:
                    peran === p
                      ? 'inset 3px 3px 6px rgba(61,107,145,0.25), inset -3px -3px 6px rgba(255,255,255,0.8)'
                      : 'inset 2px 2px 4px rgba(61,107,145,0.15), inset -2px -2px 4px rgba(255,255,255,0.8)',
                  opacity: peran === p ? 1 : 0.85,
                }}
              >
                {peran === p && (
                  <span
                    className="absolute top-3 right-3 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full text-[#006a62]"
                    style={{ background: '#70f8e8' }}
                  >
                    AKTIF
                  </span>
                )}
                <div
                  className="size-10 rounded-full flex items-center justify-center mb-1"
                  style={{ background: peran === p ? '#3d6b91' : '#eaf6ff' }}
                >
                  <img
                    src={p === 'siswa' ? imgSiswa : imgGuru}
                    alt=""
                    className="w-5 h-5"
                  />
                </div>
                <div className="font-bold text-[#121c2c] text-base">
                  {p === 'siswa' ? 'Siswa' : 'Guru'}
                </div>
                <div className="text-xs text-[#464555]">
                  {p === 'siswa' ? 'Belajar Mandiri & Proyek Kasir' : 'Dasbor Pembelajaran & Nilai'}
                </div>
              </button>
            ))}
          </div>
        </fieldset>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
          {/* NISN / Email */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="nisn" className="text-sm font-bold text-[#121c2c]">
                {peran === 'siswa' ? 'NISN' : 'Email Sekolah'}
              </label>
              <span className="text-xs text-[#464555]">Wajib diisi</span>
            </div>
            <div className="relative">
              <input
                id="nisn"
                type={peran === 'guru' ? 'email' : 'text'}
                value={nisn}
                onChange={(e) => setNisn(e.target.value)}
                placeholder={peran === 'siswa' ? '0071234567' : 'nama@sekolah.sch.id'}
                required
                className="w-full px-6 py-3 rounded-full text-sm text-[#121c2c] outline-none focus-visible:ring-2 focus-visible:ring-[#68b6f7] transition"
                style={{
                  background: '#eaf6ff',
                  boxShadow:
                    'inset 3px 3px 6px rgba(61,107,145,0.2), inset -3px -3px 6px rgba(255,255,255,0.8), 0 14px 28px -10px rgba(61,107,145,0.25)',
                }}
              />
              {/* Kelas badge (hanya siswa) */}
              {peran === 'siswa' && (
                <span
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[11px] font-bold text-[#253f8a] px-2 py-0.5 rounded-full"
                  style={{ background: '#a6d7ff' }}
                >
                  {kelas.split(' ')[1]}
                </span>
              )}
            </div>
          </div>

          {/* Password */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="password" className="text-sm font-bold text-[#121c2c]">
                Kata Sandi
              </label>
              <button
                type="button"
                className="text-xs text-[#3d6b91] font-semibold hover:underline focus-visible:ring-1 focus-visible:ring-[#68b6f7] outline-none rounded"
                onClick={() => alert('Hubungi guru untuk reset kata sandi.')}
              >
                Lupa Sandi?
              </button>
            </div>
            <div className="relative">
              <input
                id="password"
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Kata sandi kamu"
                required
                className="w-full pl-6 pr-14 py-3 rounded-full text-sm text-[#121c2c] outline-none focus-visible:ring-2 focus-visible:ring-[#68b6f7] transition"
                style={{
                  background: '#eaf6ff',
                  boxShadow:
                    'inset 3px 3px 6px rgba(61,107,145,0.2), inset -3px -3px 6px rgba(255,255,255,0.8), 0 14px 28px -10px rgba(61,107,145,0.25)',
                }}
              />
              <button
                type="button"
                aria-label={showPass ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                onClick={() => setShowPass((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 size-8 flex items-center justify-center rounded-full bg-white focus-visible:ring-2 focus-visible:ring-[#68b6f7] outline-none transition"
                style={{ boxShadow: 'inset 1px 1px 2px rgba(61,107,145,0.15), inset -1px -1px 2px rgba(255,255,255,0.8)' }}
              >
                {showPass ? '🙈' : <img src={`${assetPathPrefix}/4930f.svg`} alt="" className="w-3.5 h-2.5" />}
              </button>
            </div>
          </div>

          {/* Kelas dropdown — hanya siswa */}
          {peran === 'siswa' && (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="kelas" className="text-sm font-bold text-[#121c2c] flex items-center gap-1.5">
                Pilih Kelas &amp; Sekolah
              </label>
              <div className="relative">
                <select
                  id="kelas"
                  value={kelas}
                  onChange={(e) => setKelas(e.target.value)}
                  className="w-full appearance-none px-6 py-3 rounded-full text-sm text-[#121c2c] outline-none focus-visible:ring-2 focus-visible:ring-[#68b6f7] transition pr-10 cursor-pointer"
                  style={{
                    background: '#eaf6ff',
                    boxShadow:
                      'inset 3px 3px 6px rgba(61,107,145,0.2), inset -3px -3px 6px rgba(255,255,255,0.8), 0 14px 14px -10px rgba(61,107,145,0.25)',
                  }}
                >
                  {KELAS_OPTIONS.map((k) => (
                    <option key={k}>{k} • {sekolah}</option>
                  ))}
                </select>
                <img
                  src={imgArrow}
                  alt=""
                  className="absolute right-5 top-1/2 -translate-y-1/2 w-3 h-2 pointer-events-none"
                />
              </div>
            </div>
          )}

          {/* Ingat saya */}
          <div className="flex items-center justify-between px-1">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <button
                type="button"
                role="switch"
                aria-checked={ingat}
                onClick={() => setIngat((v) => !v)}
                className={`relative w-12 h-6 rounded-full transition-colors focus-visible:ring-2 focus-visible:ring-[#68b6f7] outline-none`}
                style={{
                  background: ingat ? '#3d6b91' : '#c0d8ef',
                  boxShadow: 'inset 2px 2px 4px rgba(0,0,0,0.2), inset -2px -2px 4px rgba(255,255,255,0.4)',
                }}
              >
                <span
                  className="absolute top-1 size-4 rounded-full bg-white transition-all"
                  style={{
                    left: ingat ? '28px' : '4px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                  }}
                />
              </button>
              <span className="text-xs font-semibold text-[#121c2c]">
                Ingat Akun Saya di Perangkat Ini
              </span>
            </label>
          </div>

          {/* Error */}
          {error && (
            <div
              role="alert"
              className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-2xl px-4 py-3 text-center"
            >
              {error}
            </div>
          )}

          {/* Submit */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-full font-bold text-white text-base transition-all hover:brightness-110 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#68b6f7] outline-none disabled:opacity-60"
              style={{
                background: 'linear-gradient(to bottom, #68b6f7, #3d6b91)',
                boxShadow:
                  '0 18px 18px rgba(61,107,145,0.45), inset 0 2px 3px rgba(255,255,255,0.7), inset 0 -5px 0 #253f8a',
              }}
            >
              {loading ? (
                <span className="animate-pulse">Memeriksa…</span>
              ) : (
                <>
                  <span>🚀</span>
                  <span>Masuk ke Ruang Belajar</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Footer */}
        <div className="flex flex-col items-center gap-2 text-xs text-[#464555]">
          <span>
            Belum punya akun?{' '}
            <Link
              to="/daftar"
              className="text-[#3d6b91] font-semibold hover:underline focus-visible:ring-1 focus-visible:ring-[#68b6f7] outline-none rounded"
            >
              Hubungi Guru Pembimbing
            </Link>
            {' · '}
            <Link
              to="/daftar"
              className="text-[#3d6b91] font-semibold hover:underline focus-visible:ring-1 focus-visible:ring-[#68b6f7] outline-none rounded"
            >
              Daftar akun
            </Link>
          </span>
        </div>
      </div>
    </div>
  );
}
