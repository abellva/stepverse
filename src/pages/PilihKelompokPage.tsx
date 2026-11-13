import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useAppStore } from '../store/useAppStore';
import {
  getGroups,
  joinGroup,
  subscribeToGroups,
  GroupInfo,
  getUserGroup,
} from '../services/groupService';
import { Card } from '../components/ui/Card';

export default function PilihKelompokPage() {
  const user = useAppStore((s) => s.user);
  const setKelompok = useAppStore((s) => s.setKelompok);
  const navigate = useNavigate();

  const [groups, setGroups] = useState<GroupInfo[]>([]);
  const [feedback, setFeedback] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    setGroups(getGroups());
    const unsub = subscribeToGroups((updated) => {
      setGroups(updated);
    });
    return unsub;
  }, []);

  if (!user) {
    navigate('/masuk');
    return null;
  }

  // Cek kelompok aktif user dari data service
  const currentGroup = user.kelompok ? getGroups().find((g) => g.id === user.kelompok) : getUserGroup(user.id);

  function handleSelectGroup(groupId: number) {
    if (!user) return;
    const res = joinGroup(groupId, user);
    if (res.success) {
      setKelompok(groupId);
      setFeedback({ text: res.message, type: 'success' });
      setGroups(getGroups());
      setTimeout(() => {
        navigate('/beranda');
      }, 1000);
    } else {
      setFeedback({ text: res.message, type: 'error' });
    }
  }

  function handleContinueToStudy() {
    navigate('/beranda');
  }

  return (
    <div className="max-w-5xl mx-auto flex flex-col gap-6 py-4">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto flex flex-col gap-2">
        <div className="inline-flex items-center justify-center gap-1.5 px-3 py-1 rounded-full bg-[#eaf6ff] border border-[#a6d7ff] text-xs font-bold text-[#253f8a] uppercase tracking-wider mx-auto shadow-xs">
          <span>👥</span>
          <span>Kolaborasi Problem-Based Learning</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-bold text-[#121c2c] tracking-tight">
          Pilih Kelompok Belajar Kolaboratif
        </h1>
        <p className="text-xs md:text-sm text-[#464555] leading-relaxed">
          Setiap kelompok beranggotakan <strong>maksimal 5 siswa (kuota ganjil)</strong> untuk memfasilitasi perdebatan logika, musyawarah dekomposisi masalah kasir, dan pembagian peran otentik antara <em>Programmer</em> dan <em>Komputer</em>.
        </p>
      </div>

      {/* User Status Bar */}
      <Card className="p-4 border border-[#bce0fd] bg-white flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-full bg-[#eaf6ff] border border-[#a6d7ff] flex items-center justify-center text-lg shrink-0">
            🎒
          </div>
          <div>
            <div className="font-bold text-sm text-[#121c2c] flex items-center gap-2">
              <span>{user.nama}</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#f1f5f9] text-[#475569]">
                {user.kelas}
              </span>
            </div>
            <div className="text-xs text-[#64748b]">
              Status Kelompok:{' '}
              {currentGroup ? (
                <span className="font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded border border-green-200">
                  Terdaftar di {currentGroup.nama} ({currentGroup.topikProyek})
                </span>
              ) : (
                <span className="font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  Belum Bergabung ke Kelompok
                </span>
              )}
            </div>
          </div>
        </div>

        {currentGroup && (
          <button
            type="button"
            onClick={handleContinueToStudy}
            className="px-5 py-2.5 rounded-full text-xs font-bold text-white transition-all hover:brightness-110 active:scale-95 whitespace-nowrap shadow-sm"
            style={{
              background: 'linear-gradient(to bottom, #68b6f7, #3d6b91)',
            }}
          >
            Lanjut ke Beranda Materi →
          </button>
        )}
      </Card>

      {/* Feedback Alert */}
      {feedback && (
        <div
          className={`p-3 rounded-2xl text-xs font-semibold text-center border transition-all ${
            feedback.type === 'success'
              ? 'bg-green-50 text-green-800 border-green-300'
              : 'bg-red-50 text-red-800 border-red-300'
          }`}
        >
          {feedback.type === 'success' ? '✅ ' : '⚠️ '}
          {feedback.text}
        </div>
      )}

      {/* 5 Kelompok Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {groups.map((group) => {
          const isUserInGroup = group.members.some((m) => m.id === user.id || m.nama === user.nama);
          const memberCount = group.members.length;
          const isFull = memberCount >= group.maxCapacity;
          const slotsLeft = Math.max(0, group.maxCapacity - memberCount);

          return (
            <Card
              key={group.id}
              className={`p-5 flex flex-col justify-between transition-all rounded-[32px] border relative ${
                isUserInGroup
                  ? 'border-[#3d6b91] bg-gradient-to-br from-[#f4fbff] to-[#eaf6ff] shadow-md ring-2 ring-[#3d6b91]/30'
                  : isFull
                  ? 'border-gray-200 bg-gray-50/70 opacity-80'
                  : 'border-[#bce0fd] bg-white hover:border-[#68b6f7] hover:shadow-md'
              }`}
            >
              <div>
                {/* Header Card */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="font-bold text-base text-[#121c2c] flex items-center gap-1.5">
                    <span>👥</span>
                    <span>{group.nama}</span>
                  </span>

                  <span
                    className={`text-[11px] font-bold px-2.5 py-1 rounded-full border shadow-xs ${
                      isFull
                        ? 'bg-red-50 text-red-700 border-red-200'
                        : slotsLeft <= 1
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : 'bg-green-50 text-green-700 border-green-200'
                    }`}
                  >
                    {isFull ? '🔴 Kuota Penuh' : `🟢 Sisa ${slotsLeft} Kursi`}
                  </span>
                </div>

                {/* Subtitle & Focus */}
                <div className="mb-3">
                  <div className="text-xs font-bold text-[#253f8a] mb-0.5">
                    {group.topikProyek}
                  </div>
                  <p className="text-[11px] text-[#64748b] leading-relaxed">
                    {group.deskripsi}
                  </p>
                </div>

                {/* Quota Progress Bar */}
                <div className="flex flex-col gap-1 mb-3">
                  <div className="flex justify-between text-[10px] text-[#464555] font-semibold">
                    <span>Kapasitas Kelompok (Ganjil)</span>
                    <span>
                      {memberCount} / {group.maxCapacity} Siswa
                    </span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                    <div
                      className={`h-full transition-all rounded-full ${
                        isFull
                          ? 'bg-red-500'
                          : memberCount >= 4
                          ? 'bg-amber-500'
                          : 'bg-[#3d6b91]'
                      }`}
                      style={{ width: `${(memberCount / group.maxCapacity) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Anggota List */}
                <div className="flex flex-col gap-1.5 mb-4">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#94a3b8]">
                    Daftar Anggota Tim:
                  </span>
                  <div className="flex flex-col gap-1 max-h-[140px] overflow-y-auto pr-1">
                    {group.members.length === 0 ? (
                      <span className="text-xs italic text-gray-400 py-1">
                        Belum ada anggota yang bergabung
                      </span>
                    ) : (
                      group.members.map((m) => {
                        const isMe = m.id === user.id || m.nama === user.nama;
                        return (
                          <div
                            key={m.id}
                            className={`p-1.5 px-2 rounded-xl text-xs flex items-center justify-between border ${
                              isMe
                                ? 'bg-[#3d6b91] text-white border-[#253f8a] font-bold'
                                : 'bg-slate-50 text-[#334155] border-slate-200'
                            }`}
                          >
                            <span className="truncate flex items-center gap-1.5">
                              <span>{isMe ? '⭐' : '👤'}</span>
                              <span className="truncate">{m.nama} {isMe && '(Kamu)'}</span>
                            </span>
                            <span
                              className={`text-[9px] px-1.5 py-0.5 rounded font-mono ${
                                isMe
                                  ? 'bg-white/20 text-white'
                                  : 'bg-white text-[#253f8a] border border-blue-100 font-semibold'
                              }`}
                            >
                              {m.role || 'Anggota'}
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div>
                {isUserInGroup ? (
                  <button
                    type="button"
                    onClick={handleContinueToStudy}
                    className="w-full py-2.5 rounded-full text-xs font-bold text-white transition-all hover:brightness-110 active:scale-95 shadow-sm"
                    style={{
                      background: 'linear-gradient(to bottom, #68b6f7, #3d6b91)',
                    }}
                  >
                    ✓ Kelompok Kamu (Masuk ke Materi)
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={isFull}
                    onClick={() => handleSelectGroup(group.id)}
                    className="w-full py-2.5 rounded-full text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
                    style={{
                      background: isFull ? '#e2e8f0' : '#eaf6ff',
                      color: isFull ? '#94a3b8' : '#253f8a',
                      border: isFull ? '1px solid #cbd5e1' : '1.5px solid #a6d7ff',
                      boxShadow: isFull ? 'none' : '0 3px 6px rgba(61,107,145,0.1)',
                    }}
                  >
                    {isFull ? '⛔ Kuota Penuh (Maks 5)' : `👉 Gabung ${group.nama}`}
                  </button>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
