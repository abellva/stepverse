// Mock "database" pengguna — disimpan di localStorage
// Untuk mengganti dengan backend sungguhan, ubah fungsi-fungsi di bawah

export interface UserRecord {
  id: string;
  nisn: string;       // atau email (untuk guru)
  nama: string;
  password: string;   // plain text — OK untuk demo, jangan pakai di produksi
  peran: 'siswa' | 'guru';
  kelas: string;
  sekolah: string;
}

// Akun bawaan (pre-seeded)
const DEFAULT_USERS: UserRecord[] = [
  {
    id: 'siswa-001',
    nisn: '0071234567',
    nama: 'Budi Santoso',
    password: 'KantinPython2025',
    peran: 'siswa',
    kelas: 'X MIPA 1',
    sekolah: 'SMAN 1 Nusantara',
  },
  {
    id: 'siswa-002',
    nisn: '0071234568',
    nama: 'Siti Rahayu',
    password: 'KantinPython2025',
    peran: 'siswa',
    kelas: 'X MIPA 1',
    sekolah: 'SMAN 1 Nusantara',
  },
  {
    id: 'guru-001',
    nisn: 'guru@sman1.sch.id',
    nama: 'Bu Sari',
    password: 'GuruSari2025',
    peran: 'guru',
    kelas: '-',
    sekolah: 'SMAN 1 Nusantara',
  },
];

const DB_KEY = 'stepverse-users';

function loadUsers(): UserRecord[] {
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (!raw) return DEFAULT_USERS;
    const stored: UserRecord[] = JSON.parse(raw);
    // Merge: pastikan akun default selalu ada
    const merged = [...DEFAULT_USERS];
    for (const u of stored) {
      if (!merged.find((m) => m.id === u.id)) merged.push(u);
    }
    return merged;
  } catch {
    return DEFAULT_USERS;
  }
}

function saveUsers(users: UserRecord[]): void {
  // Simpan hanya akun non-default (yang didaftarkan pengguna)
  const extras = users.filter((u) => !DEFAULT_USERS.find((d) => d.id === u.id));
  localStorage.setItem(DB_KEY, JSON.stringify(extras));
}

/** Cek login — kembalikan UserRecord jika cocok, null jika gagal */
export function authenticate(nisn: string, password: string): UserRecord | null {
  const users = loadUsers();
  return (
    users.find(
      (u) => u.nisn.trim() === nisn.trim() && u.password === password
    ) ?? null
  );
}

/** Daftar akun baru — kembalikan error string atau null jika sukses */
export function registerUser(data: {
  nisn: string;
  nama: string;
  password: string;
  peran: 'siswa' | 'guru';
  kelas: string;
  sekolah: string;
}): string | null {
  const users = loadUsers();
  if (users.find((u) => u.nisn.trim() === data.nisn.trim())) {
    return 'NISN / email sudah terdaftar.';
  }
  const newUser: UserRecord = {
    id: `user-${Date.now()}`,
    ...data,
  };
  users.push(newUser);
  saveUsers(users);
  return null; // sukses
}

/** Ambil semua users (untuk teacher dashboard) */
export function getAllUsers(): UserRecord[] {
  return loadUsers();
}

export const KELAS_OPTIONS = [
  'X MIPA 1',
  'X MIPA 2',
  'X IPS 1',
  'X IPS 2',
  'X IPA 1',
];

export const SEKOLAH_OPTIONS = ['SMAN 1 Nusantara', 'SMAN 2 Nusantara'];

