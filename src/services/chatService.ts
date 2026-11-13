// Layanan Chat Diskusi Kelompok Real-Time (StepVerse)
// Menyediakan komunikasi real-time antar-tab via Web BroadcastChannel & localStorage,
// pencatatan konteks halaman siswa saat diskusi, dan ekspor log obrolan untuk instrumen penelitian sempro.

import { UserSession } from '../store/useAppStore';
import { logEvent } from './logger';

export interface ChatMessage {
  id: string;
  groupId: number; // 1 to 5
  userId: string;
  senderName: string;
  senderRole?: 'Programmer' | 'Komputer' | 'Anggota' | 'Guru';
  timestamp: string; // e.g. "13:45"
  pageContext: string; // e.g. "Analisis IPO", "Lab Python"
  text: string;
}

const STORAGE_KEY = 'stepverse_chat_messages_data';
const CHANNEL_NAME = 'stepverse_chat_broadcast';

// Pre-seeded percakapan otentik siswa untuk menunjukkan kolaborasi berpikir komputasional
const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: 'msg-seed-1',
    groupId: 1,
    userId: 'siswa-003',
    senderName: 'Ahmad Fauzi',
    senderRole: 'Programmer',
    timestamp: '13:35',
    pageContext: 'Analisis IPO',
    text: 'Halo teman-teman kelompok 1! Di bagian Analisis IPO, kartu "warna taplak meja" itu pengecoh kan ya? Karena nggak berpengaruh ke hitungan harga.',
  },
  {
    id: 'msg-seed-2',
    groupId: 1,
    userId: 'siswa-004',
    senderName: 'Dewi Lestari',
    senderRole: 'Komputer',
    timestamp: '13:36',
    pageContext: 'Analisis IPO',
    text: 'Iya bener Ahmad! Itu masuk abstraksi, kita abaikan aja kartu taplak meja. Yang penting inputnya nama_barang, harga_satuan, sama jumlah.',
  },
  {
    id: 'msg-seed-3',
    groupId: 1,
    userId: 'siswa-005',
    senderName: 'Rian Pratama',
    senderRole: 'Anggota',
    timestamp: '13:42',
    pageContext: 'Lab Python',
    text: 'Nanti di Lab Python jangan lupa variabel harga sama jumlahnya tipe data Integer ya, jangan pakai tanda petik biar bisa dikali (*).',
  },
  {
    id: 'msg-seed-4',
    groupId: 2,
    userId: 'siswa-007',
    senderName: 'Bambang Irawan',
    senderRole: 'Programmer',
    timestamp: '13:33',
    pageContext: 'Video Orientasi',
    text: 'Halo Kelompok 2! Yuk kita simak bareng video Kantin Bu Ani. Nanti waktu kinesthetic break, aku yang jadi Programmer ya.',
  },
  {
    id: 'msg-seed-5',
    groupId: 2,
    userId: 'siswa-008',
    senderName: 'Citra Amelia',
    senderRole: 'Komputer',
    timestamp: '13:34',
    pageContext: 'Video Orientasi',
    text: 'Oke Bambang, aku jadi komputernya! Siap mencatat variabel ke memori sesuai perintah.',
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

export function getAllChatMessages(): ChatMessage[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_MESSAGES));
      return INITIAL_MESSAGES;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_MESSAGES;
  }
}

export function getGroupChatMessages(groupId: number): ChatMessage[] {
  const all = getAllChatMessages();
  return all.filter((m) => m.groupId === groupId);
}

export function sendChatMessage(
  groupId: number,
  user: UserSession,
  text: string,
  pageContext: string = 'Beranda Materi'
): ChatMessage {
  const all = getAllChatMessages();
  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const newMsg: ChatMessage = {
    id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    groupId,
    userId: user.id,
    senderName: user.nama,
    senderRole: user.peran === 'guru' ? 'Guru' : 'Anggota',
    timestamp: timeStr,
    pageContext,
    text: text.trim(),
  };

  all.push(newMsg);

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    broadcastChannel?.postMessage({ type: 'NEW_CHAT_MESSAGE', payload: newMsg });
  } catch (err) {
    console.error('Gagal menyimpan chat:', err);
  }

  // Rekam event penelitian kolaborasi
  logEvent({
    stage: 'lab',
    componentId: 'group-chat-message',
    ctComponent: 'collaboration',
    result: 'info',
    payload: {
      groupId,
      senderName: user.nama,
      pageContext,
      charLength: text.length,
      snippet: text.substring(0, 40),
    },
  });

  return newMsg;
}

export function subscribeToChat(callback: (msg: ChatMessage) => void): () => void {
  const handleMessage = (event: MessageEvent) => {
    if (event.data && event.data.type === 'NEW_CHAT_MESSAGE' && event.data.payload) {
      callback(event.data.payload);
    }
  };

  const handleStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY && event.newValue) {
      try {
        const msgs: ChatMessage[] = JSON.parse(event.newValue);
        if (msgs.length > 0) {
          callback(msgs[msgs.length - 1]);
        }
      } catch {
        // ignore
      }
    }
  };

  broadcastChannel?.addEventListener('message', handleMessage);
  window.addEventListener('storage', handleStorage);

  return () => {
    broadcastChannel?.removeEventListener('message', handleMessage);
    window.removeEventListener('storage', handleStorage);
  };
}

/**
 * Format CSV untuk bukti penelitian sempro (Log Perdebatan & Diskusi Siswa)
 */
export function exportChatLogsAsCsv(groupId?: number): string {
  const all = getAllChatMessages();
  const filtered = groupId ? all.filter((m) => m.groupId === groupId) : all;

  const headers = ['ID Pesan', 'Kelompok', 'Pengirim', 'Peran', 'Waktu', 'Konteks Halaman', 'Isi Pesan'];
  const rows = filtered.map((m) => [
    `"${m.id}"`,
    `"Kelompok ${m.groupId}"`,
    `"${m.senderName.replace(/"/g, '""')}"`,
    `"${m.senderRole || 'Anggota'}"`,
    `"${m.timestamp}"`,
    `"${m.pageContext.replace(/"/g, '""')}"`,
    `"${m.text.replace(/"/g, '""')}"`,
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

export function downloadChatLogsCsv(groupId?: number): void {
  const csvContent = exportChatLogsAsCsv(groupId);
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute(
    'download',
    `stepverse_chat_log_${groupId ? `kelompok_${groupId}` : 'semua_kelompok'}_${Date.now()}.csv`
  );
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
