import { describe, it, expect, beforeEach } from 'vitest';
import {
  getGroups,
  joinGroup,
  getUserGroup,
  saveGroups,
} from '../../services/groupService';
import {
  getAllChatMessages,
  getGroupChatMessages,
  sendChatMessage,
  exportChatLogsAsCsv,
} from '../../services/chatService';
import { UserSession } from '../../store/useAppStore';

// In-memory localStorage mock for Node 20 test environment
const storageMap = new Map<string, string>();
const localStorageMock = {
  getItem: (key: string) => storageMap.get(key) ?? null,
  setItem: (key: string, value: string) => { storageMap.set(key, String(value)); },
  removeItem: (key: string) => { storageMap.delete(key); },
  clear: () => { storageMap.clear(); },
};
// @ts-expect-error mock global
globalThis.localStorage = localStorageMock;

describe('Group Service & Quota Management', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('initializes 5 groups with odd maxCapacity of 5', () => {
    const groups = getGroups();
    expect(groups.length).toBe(5);
    groups.forEach((g) => {
      expect(g.maxCapacity).toBe(5);
      expect(g.maxCapacity % 2).toBe(1); // Ganjil
    });
  });

  it('allows a student to join an available group and decreases remaining quota', () => {
    const groupsBefore = getGroups();
    const group2 = groupsBefore.find((g) => g.id === 2)!;
    const initialCount = group2.members.length;

    const dummyUser: UserSession = {
      id: 'siswa-test-99',
      nama: 'Budi Test',
      peran: 'siswa',
      kelas: 'X MIPA 1',
    };

    const res = joinGroup(2, dummyUser);
    expect(res.success).toBe(true);

    const groupsAfter = getGroups();
    const group2After = groupsAfter.find((g) => g.id === 2)!;
    expect(group2After.members.length).toBe(initialCount + 1);

    const userGrp = getUserGroup(dummyUser.id);
    expect(userGrp?.id).toBe(2);
  });

  it('prevents joining a group when quota reaches maximum (5 students)', () => {
    // Fill group 1 up to 5 members
    const groups = getGroups();
    const grp1 = groups.find((g) => g.id === 1)!;
    while (grp1.members.length < 5) {
      grp1.members.push({
        id: `dummy-${Math.random()}`,
        nama: 'Siswa Extra',
        kelas: 'X MIPA 1',
        joinedAt: '14:00',
      });
    }
    saveGroups(groups);

    const newUser: UserSession = {
      id: 'siswa-overflow',
      nama: 'Siswa Gagal',
      peran: 'siswa',
      kelas: 'X MIPA 1',
    };

    const res = joinGroup(1, newUser);
    expect(res.success).toBe(false);
    expect(res.message).toContain('sudah penuh');
  });
});

describe('Chat Service & Research Logging', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('sends and filters messages by group', () => {
    const sender: UserSession = {
      id: 'siswa-001',
      nama: 'Budi Santoso',
      peran: 'siswa',
      kelas: 'X MIPA 1',
    };

    const sent = sendChatMessage(3, sender, 'Apakah total = harga * jumlah?', 'Analisis IPO');
    expect(sent.groupId).toBe(3);
    expect(sent.text).toBe('Apakah total = harga * jumlah?');
    expect(sent.pageContext).toBe('Analisis IPO');

    const group3Msgs = getGroupChatMessages(3);
    expect(group3Msgs.some((m) => m.id === sent.id)).toBe(true);
  });

  it('exports formatted CSV for thesis research log', () => {
    const sender: UserSession = {
      id: 'siswa-002',
      nama: 'Siti Rahayu',
      peran: 'siswa',
      kelas: 'X MIPA 1',
    };

    sendChatMessage(1, sender, 'Perdebatan konsep String vs Integer', 'Lab Python');
    const csv = exportChatLogsAsCsv(1);

    expect(csv).toContain('ID Pesan,Kelompok,Pengirim,Peran,Waktu,Konteks Halaman,Isi Pesan');
    expect(csv).toContain('Kelompok 1');
    expect(csv).toContain('Siti Rahayu');
    expect(csv).toContain('Perdebatan konsep String vs Integer');
  });
});
