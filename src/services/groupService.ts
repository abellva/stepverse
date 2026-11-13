// Layanan Manajemen Kelompok Siswa (StepVerse)
// Mendukung kuota kelompok ganjil (maksimal 5 siswa per kelompok),
// alokasi dinamis, dan sinkronisasi real-time antar-tab via BroadcastChannel & localStorage.

import { UserSession } from '../store/useAppStore';

export interface GroupMember {
  id: string;
  nama: string;
  kelas: string;
  role?: 'Programmer' | 'Komputer' | 'Anggota';
  joinedAt: string;
  currentStage?: string;
}

export interface GroupInfo {
  id: number;
  nama: string;
  topikProyek: string;
  deskripsi: string;
  maxCapacity: number; // default: 5 siswa (kuota ganjil sesuai arahan dosen)
  members: GroupMember[];
}

const STORAGE_KEY = 'stepverse_groups_data';
const CHANNEL_NAME = 'stepverse_groups_broadcast';

// Initial pre-seeded groups dengan anggota realistis
const DEFAULT_GROUPS: GroupInfo[] = [
  {
    id: 1,
    nama: 'Kelompok 1',
    topikProyek: 'Kantin Bu Ani: Menu Makanan Berat',
    deskripsi: 'Fokus analisis variabel harga porsi nasi goreng, soto ayam, dan paket hemat.',
    maxCapacity: 5,
    members: [
      { id: 'siswa-003', nama: 'Ahmad Fauzi', kelas: 'X MIPA 1', role: 'Programmer', joinedAt: '13:30', currentStage: 'Lab Python' },
      { id: 'siswa-004', nama: 'Dewi Lestari', kelas: 'X MIPA 1', role: 'Komputer', joinedAt: '13:31', currentStage: 'Lab Python' },
      { id: 'siswa-005', nama: 'Rian Pratama', kelas: 'X MIPA 1', role: 'Anggota', joinedAt: '13:35', currentStage: 'Analisis IPO' },
      { id: 'siswa-006', nama: 'Nadia Putri', kelas: 'X MIPA 1', role: 'Anggota', joinedAt: '13:40', currentStage: 'Dekomposisi' },
    ], // 4/5 (sisa 1 slot)
  },
  {
    id: 2,
    nama: 'Kelompok 2',
    topikProyek: 'Kantin Bu Ani: Minuman & Dessert',
    deskripsi: 'Fokus analisis variabel harga es teh, jus alpukat, dan es cincau.',
    maxCapacity: 5,
    members: [
      { id: 'siswa-007', nama: 'Bambang Irawan', kelas: 'X MIPA 1', role: 'Programmer', joinedAt: '13:28', currentStage: 'Video Orientasi' },
      { id: 'siswa-008', nama: 'Citra Amelia', kelas: 'X MIPA 1', role: 'Komputer', joinedAt: '13:32', currentStage: 'Video Orientasi' },
    ], // 2/5 (sisa 3 slot)
  },
  {
    id: 3,
    nama: 'Kelompok 3',
    topikProyek: 'Kantin Bu Ani: Aneka Gorengan & Snack',
    deskripsi: 'Fokus analisis variabel harga satuan tempe mendoan, bakwan, dan tahu isi.',
    maxCapacity: 5,
    members: [
      { id: 'siswa-009', nama: 'Dimas Anggara', kelas: 'X MIPA 1', role: 'Programmer', joinedAt: '13:25', currentStage: 'Parsons Problem' },
      { id: 'siswa-010', nama: 'Eka Kurniawan', kelas: 'X MIPA 1', role: 'Komputer', joinedAt: '13:27', currentStage: 'Parsons Problem' },
      { id: 'siswa-011', nama: 'Fitri Handayani', kelas: 'X MIPA 1', role: 'Anggota', joinedAt: '13:30', currentStage: 'Dekomposisi' },
    ], // 3/5 (sisa 2 slot)
  },
  {
    id: 4,
    nama: 'Kelompok 4',
    topikProyek: 'Kantin Bu Ani: Paket Hemat Sarapan',
    deskripsi: 'Fokus analisis variabel paket roti bakar + teh hangat pagi hari.',
    maxCapacity: 5,
    members: [
      { id: 'siswa-012', nama: 'Gilang Ramadhan', kelas: 'X MIPA 1', role: 'Programmer', joinedAt: '13:20', currentStage: 'Analisis IPO' },
      { id: 'siswa-013', nama: 'Hana Safitri', kelas: 'X MIPA 1', role: 'Komputer', joinedAt: '13:22', currentStage: 'Analisis IPO' },
      { id: 'siswa-014', nama: 'Indra Gunawan', kelas: 'X MIPA 1', role: 'Anggota', joinedAt: '13:35', currentStage: 'Video Orientasi' },
      { id: 'siswa-015', nama: 'Jasmine Aulia', kelas: 'X MIPA 1', role: 'Anggota', joinedAt: '13:38', currentStage: 'Video Orientasi' },
    ], // 4/5 (sisa 1 slot)
  },
  {
    id: 5,
    nama: 'Kelompok 5',
    topikProyek: 'Kantin Bu Ani: Menu Spesial Jumatan',
    deskripsi: 'Fokus analisis variabel kalkulasi menu makan siang porsi besar.',
    maxCapacity: 5,
    members: [
      { id: 'siswa-016', nama: 'Kiki Ramadhani', kelas: 'X MIPA 1', role: 'Programmer', joinedAt: '13:33', currentStage: 'Lab Python' },
      { id: 'siswa-017', nama: 'Lutfi Hakim', kelas: 'X MIPA 1', role: 'Komputer', joinedAt: '13:35', currentStage: 'Lab Python' },
      { id: 'siswa-018', nama: 'Mega Wulandari', kelas: 'X MIPA 1', role: 'Anggota', joinedAt: '13:42', currentStage: 'Dekomposisi' },
    ], // 3/5 (sisa 2 slot)
  },
];

let broadcastChannel: BroadcastChannel | null = null;
try {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    broadcastChannel = new BroadcastChannel(CHANNEL_NAME);
  }
} catch {
  broadcastChannel = null;
}

export function getGroups(): GroupInfo[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_GROUPS));
      return DEFAULT_GROUPS;
    }
    return JSON.parse(raw);
  } catch {
    return DEFAULT_GROUPS;
  }
}

export function saveGroups(groups: GroupInfo[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(groups));
    broadcastChannel?.postMessage({ type: 'GROUPS_UPDATED', timestamp: Date.now() });
  } catch (err) {
    console.error('Gagal menyimpan data kelompok:', err);
  }
}

export function getGroupById(groupId: number): GroupInfo | undefined {
  const groups = getGroups();
  return groups.find((g) => g.id === groupId);
}

export function getUserGroup(userId: string): GroupInfo | undefined {
  const groups = getGroups();
  return groups.find((g) => g.members.some((m) => m.id === userId));
}

/**
 * Bergabung ke kelompok:
 * Memastikan kapasitas ganjil (maksimal 5 siswa) tidak terlampaui.
 * Mengurangi kuota secara otomatis dan mengeluarkan dari kelompok lama jika ada.
 */
export function joinGroup(groupId: number, user: UserSession): { success: boolean; message: string } {
  const groups = getGroups();
  const targetGroup = groups.find((g) => g.id === groupId);

  if (!targetGroup) {
    return { success: false, message: 'Kelompok tidak ditemukan.' };
  }

  // Cek apakah user sudah terdaftar di kelompok ini
  const alreadyInTarget = targetGroup.members.some((m) => m.id === user.id || m.nama === user.nama);
  if (alreadyInTarget) {
    return { success: true, message: `Kamu sudah berada di ${targetGroup.nama}.` };
  }

  // Cek kuota
  if (targetGroup.members.length >= targetGroup.maxCapacity) {
    return { success: false, message: `Maaf, kuota ${targetGroup.nama} sudah penuh (${targetGroup.maxCapacity}/${targetGroup.maxCapacity}). Silakan pilih kelompok lain.` };
  }

  // Hapus dari kelompok lama (jika ada)
  groups.forEach((g) => {
    g.members = g.members.filter((m) => m.id !== user.id && m.nama !== user.nama);
  });

  // Tentukan waktu dan default peran
  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const newMember: GroupMember = {
    id: user.id,
    nama: user.nama,
    kelas: user.kelas,
    role: targetGroup.members.length === 0 ? 'Programmer' : targetGroup.members.length === 1 ? 'Komputer' : 'Anggota',
    joinedAt: timeStr,
    currentStage: 'Beranda Materi',
  };

  targetGroup.members.push(newMember);
  saveGroups(groups);

  return { success: true, message: `Berhasil bergabung ke ${targetGroup.nama}!` };
}

/**
 * Update stage lokasi aktif siswa dalam kelompok (agar rekan kelompok dan guru tahu letak belajarnya)
 */
export function updateMemberStage(groupId: number, userId: string, stageName: string): void {
  const groups = getGroups();
  const grp = groups.find((g) => g.id === groupId);
  if (!grp) return;

  const member = grp.members.find((m) => m.id === userId);
  if (member) {
    member.currentStage = stageName;
    saveGroups(groups);
  }
}

/**
 * Berlangganan perubahan update kelompok secara real-time antar-tab
 */
export function subscribeToGroups(callback: (groups: GroupInfo[]) => void): () => void {
  const handleStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) {
      callback(getGroups());
    }
  };

  const handleMessage = () => {
    callback(getGroups());
  };

  window.addEventListener('storage', handleStorage);
  broadcastChannel?.addEventListener('message', handleMessage);

  return () => {
    window.removeEventListener('storage', handleStorage);
    broadcastChannel?.removeEventListener('message', handleMessage);
  };
}
