import { useState } from 'react';
import { useNavigate, Link } from 'react-router';
import { registerUser, getAllUsers, KELAS_OPTIONS, SEKOLAH_OPTIONS } from '../data/users';
import { useAppStore } from '../store/useAppStore';
import { syncActiveUserProgress } from '../services/studentStorage';

export default function DaftarPage() {
  const navigate = useNavigate();
  const { setUser } = useAppStore();

  const [peran, setPeran]       = useState<'siswa' | 'guru'>('siswa');
  const [nama, setNama]         = useState('');
  const [nisn, setNisn]         = useState('');
  const [password, setPassword] = useState('');
  const [konfirmasi, setKonfirmasi] = useState('');
  const [kelas, setKelas]       = useState(KELAS_OPTIONS[0]);
  const [sekolah, setSekolah]   = useState(SEKOLAH_OPTIONS[0]);
  const [showPass, setShowPass] = useState(false);
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (password !== konfirmasi) {
      setError('Kata sandi dan konfirmasi tidak cocok.');
      return;
    }
    if (password.length < 6) {
      setError('Kata sandi minimal 6 karakter.');
      return;
    }

    setLoading(true);
    await new Promise((r) => setTimeout(r, 300));

    const err = registerUser({ nisn, nama, password, peran, kelas: peran === 'guru' ? '-' : kelas, sekolah });
    setLoading(false);

    if (err) {
      setError(err);
      return;
    }

    // Auto-login setelah daftar dengan user ID yang konsisten
    const createdUser = getAllUsers().find((u) => u.nisn.trim() === nisn.trim());
    const userId = createdUser?.id || `user-${Date.now()}`;
    const userSession = { id: userId, nama, peran, kelas: peran === 'guru' ? '-' : kelas };

    if (peran === 'siswa') {
      syncActiveUserProgress(userSession, { '1-video': 'active' }, {}, {});
    }

    setUser(userSession);
    navigate(peran === 'guru' ? '/guru' : '/beranda');
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden"
      style={{ backgroundImage: 'linear-gradient(90deg, rgb(234,244,255) 0%, rgb(234,244,255) 100%)' }}
    >
      {/* Blobs */}
      <div className="absolute top-[-64px] left-[-64px] size-64 rounded-full bg-[rgba(166,215,255,0.6)] blur-[32px] pointer-events-none" />
      <div className="absolute bottom-[-64px] right-[-64px] size-64 rounded-full bg-[rgba(166,215,255,0.4)] blur-[32px] pointer-events-none" />

      <div
        className="relative bg-white w-full max-w-[520px] rounded-[48px] p-9 flex flex-col gap-6"
        style={{
          boxShadow:
            '0 28px 60px -12px rgba(61,107,145,0.2), inset 2px 2px 6px rgba(255,255,255,0.95), inset -3px -3px 8px rgba(61,107,145,0.06)',
        }}
      >
        {/* Header */}
        <div className="text-center">
          <img
            src={`${import.meta.env.BASE_URL}assets/logooo.png`}
            alt="StepVerse Logo"
            className="h-12 w-auto mx-auto object-contain mb-3"
          />
          <h1 className="text-2xl font-bold text-[#121c2c] tracking-tight mb-1">
            Buat Akun StepVerse
          </h1>
          <p className="text-sm text-[#464555]">
            Isi data di bawah untuk mendaftarkan akun baru.
          </p>
        </div>

        {/* Peran */}
        <fieldset>
          <legend className="text-xs font-bold uppercase tracking-widest text-[#464555] text-center mb-3">
            Peran
          </legend>
          <div className="grid grid-cols-2 gap-3">
            {(['siswa', 'guru'] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPeran(p)}
                aria-pressed={peran === p}
                className="py-3 rounded-[24px] font-semibold text-sm transition-all focus-visible:ring-2 focus-visible:ring-blue-400 outline-none"
                style={{
                  background: peran === p ? '#eaf6ff' : '#f4fbff',
                  color: peran === p ? '#253f8a' : '#464555',
                  boxShadow: peran === p
                    ? 'inset 3px 3px 6px rgba(61,107,145,0.2), inset -3px -3px 6px rgba(255,255,255,0.8)'
                    : 'none',
                  border: `2px solid ${peran === p ? '#68b6f7' : '#d0e8f8'}`,
                }}
              >
                {p === 'siswa' ? '🎒 Siswa' : '📊 Guru'}
              </button>
            ))}
          </div>
        </fieldset>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
          {/* Nama */}
          <Field label="Nama Lengkap" htmlFor="nama">
            <input
              id="nama" type="text" value={nama} required
              onChange={(e) => setNama(e.target.value)}
              placeholder="Nama lengkap sesuai rapor"
              className="field-input"
            />
          </Field>

          {/* NISN / Email */}
          <Field label={peran === 'siswa' ? 'NISN' : 'Email Sekolah'} htmlFor="nisn-reg">
            <input
              id="nisn-reg"
              type={peran === 'guru' ? 'email' : 'text'}
              value={nisn} required
              onChange={(e) => setNisn(e.target.value)}
              placeholder={peran === 'siswa' ? '10 digit NISN' : 'nama@sekolah.sch.id'}
              className="field-input"
            />
          </Field>

          {/* Kelas (siswa) */}
          {peran === 'siswa' && (
            <Field label="Kelas & Sekolah" htmlFor="kelas-reg">
              <div className="grid grid-cols-2 gap-2">
                <select
                  id="kelas-reg" value={kelas}
                  onChange={(e) => setKelas(e.target.value)}
                  className="field-input cursor-pointer"
                >
                  {KELAS_OPTIONS.map((k) => <option key={k}>{k}</option>)}
                </select>
                <select
                  value={sekolah}
                  onChange={(e) => setSekolah(e.target.value)}
                  className="field-input cursor-pointer"
                >
                  {SEKOLAH_OPTIONS.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
            </Field>
          )}

          {/* Password */}
          <Field label="Kata Sandi" htmlFor="pass-reg">
            <div className="relative">
              <input
                id="pass-reg"
                type={showPass ? 'text' : 'password'}
                value={password} required minLength={6}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimal 6 karakter"
                className="field-input pr-12"
              />
              <button
                type="button"
                aria-label={showPass ? 'Sembunyikan' : 'Tampilkan'}
                onClick={() => setShowPass((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-lg focus-visible:ring-1 focus-visible:ring-blue-400 outline-none"
              >
                {showPass ? '🙈' : '👁️'}
              </button>
            </div>
          </Field>

          {/* Konfirmasi */}
          <Field label="Konfirmasi Kata Sandi" htmlFor="konfirmasi">
            <input
              id="konfirmasi"
              type={showPass ? 'text' : 'password'}
              value={konfirmasi} required
              onChange={(e) => setKonfirmasi(e.target.value)}
              placeholder="Ketik ulang kata sandi"
              className="field-input"
            />
          </Field>

          {/* Error */}
          {error && (
            <div role="alert" className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-2xl px-4 py-3 text-center">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-full font-bold text-white text-base transition-all hover:brightness-110 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#68b6f7] outline-none disabled:opacity-60"
            style={{
              background: 'linear-gradient(to bottom, #68b6f7, #3d6b91)',
              boxShadow: '0 18px 18px rgba(61,107,145,0.45), inset 0 2px 3px rgba(255,255,255,0.7), inset 0 -5px 0 #253f8a',
            }}
          >
            {loading ? <span className="animate-pulse">Mendaftarkan…</span> : '✅ Buat Akun'}
          </button>
        </form>

        <p className="text-center text-xs text-[#464555]">
          Sudah punya akun?{' '}
          <Link to="/masuk" className="text-[#3d6b91] font-semibold hover:underline">
            Masuk di sini
          </Link>
        </p>
      </div>

      {/* Inline style untuk field-input */}
      <style>{`
        .field-input {
          width: 100%;
          padding: 12px 24px;
          border-radius: 9999px;
          font-size: 14px;
          color: #121c2c;
          background: #eaf6ff;
          box-shadow: inset 3px 3px 6px rgba(61,107,145,0.2), inset -3px -3px 6px rgba(255,255,255,0.8);
          outline: none;
          border: none;
          transition: box-shadow 0.15s;
        }
        .field-input:focus-visible {
          box-shadow: inset 3px 3px 6px rgba(61,107,145,0.2), inset -3px -3px 6px rgba(255,255,255,0.8), 0 0 0 2px #68b6f7;
        }
      `}</style>
    </div>
  );
}

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-bold text-[#121c2c]">{label}</label>
      {children}
    </div>
  );
}

