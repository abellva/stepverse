import { useState, useEffect } from 'react';
import { Card } from '../../components/ui/Card';
import { useAppStore } from '../../store/useAppStore';
import {
  getGroups,
  GroupInfo,
  subscribeToGroups,
} from '../../services/groupService';
import {
  getAllChatMessages,
  ChatMessage,
  sendChatMessage,
  subscribeToChat,
  downloadChatLogsCsv,
} from '../../services/chatService';

export default function GuruKelompokPage() {
  const user = useAppStore((s) => s.user);

  const [groups, setGroups] = useState<GroupInfo[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<number | 'all'>('all');
  const [selectedContext, setSelectedContext] = useState<string>('all');
  const [teacherMsg, setTeacherMsg] = useState('');
  const [targetGroupForTeacher, setTargetGroupForTeacher] = useState<number>(1);
  const [feedback, setFeedback] = useState<string | null>(null);

  function refreshData() {
    setGroups(getGroups());
    setMessages(getAllChatMessages());
  }

  useEffect(() => {
    refreshData();
    const unsubG = subscribeToGroups(() => setGroups(getGroups()));
    const unsubC = subscribeToChat(() => setMessages(getAllChatMessages()));

    return () => {
      unsubG();
      unsubC();
    };
  }, []);

  // Filtered messages
  const filteredMessages = messages.filter((m) => {
    if (selectedGroupId !== 'all' && m.groupId !== selectedGroupId) return false;
    if (selectedContext !== 'all' && m.pageContext !== selectedContext) return false;
    return true;
  });

  // Analytics for thesis research
  const totalMessages = messages.length;
  const contextCounts: Record<string, number> = {};
  messages.forEach((m) => {
    contextCounts[m.pageContext] = (contextCounts[m.pageContext] || 0) + 1;
  });

  const sortedContexts = Object.entries(contextCounts).sort((a, b) => b[1] - a[1]);
  const mostDebatedContext = sortedContexts[0] ? `${sortedContexts[0][0]} (${sortedContexts[0][1]} pesan)` : 'Belum Ada';

  function handleSendTeacherGuidance(e: React.FormEvent) {
    e.preventDefault();
    if (!teacherMsg.trim() || !user) return;

    sendChatMessage(
      targetGroupForTeacher,
      {
        ...user,
        nama: `Guru: ${user.nama}`,
        peran: 'guru',
      },
      teacherMsg.trim(),
      'Bimbingan Guru (Fasilitator)'
    );

    setTeacherMsg('');
    setFeedback(`Pesan bimbingan berhasil dikirim ke Kelompok ${targetGroupForTeacher}!`);
    setTimeout(() => setFeedback(null), 3000);
    setMessages(getAllChatMessages());
  }

  return (
    <div className="max-w-6xl mx-auto flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="text-xs text-[#464555] mb-1 uppercase tracking-widest font-semibold flex items-center gap-1.5">
            <span>💬</span>
            <span>Instrumen Penelitian Kolaboratif · Dasbor Guru</span>
          </div>
          <h1 className="text-2xl font-bold text-[#121c2c]">
            Pemantauan Diskusi &amp; Log Chat Kelompok
          </h1>
          <p className="text-xs text-[#555] mt-1 leading-relaxed max-w-2xl">
            Pantau perdebatan konsep berpikir komputasional antar-siswa di 5 kelompok secara real-time. Rekaman obrolan ini berfungsi sebagai bukti otentik penelitian proses belajar (inkuiri) untuk seminar proposal.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={refreshData}
            className="px-4 py-2 rounded-full text-xs font-semibold text-[#253f8a] bg-[#eaf6ff] border border-[#a6d7ff] hover:bg-[#d0ecff] transition flex items-center gap-1.5 shadow-xs active:scale-95"
          >
            <span>🔄</span>
            <span>Segarkan</span>
          </button>
          <button
            type="button"
            onClick={() => downloadChatLogsCsv(selectedGroupId === 'all' ? undefined : selectedGroupId)}
            className="px-5 py-2 rounded-full text-xs font-bold text-white transition hover:brightness-110 flex items-center gap-1.5 shadow-md active:scale-95"
            style={{
              background: 'linear-gradient(to bottom, #68b6f7, #3d6b91)',
            }}
          >
            <span>📥</span>
            <span>Ekspor Chat Log (.CSV)</span>
          </button>
        </div>
      </div>

      {/* Top 3 Research Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 border border-[#bce0fd] bg-white flex flex-col gap-1">
          <span className="text-[11px] font-bold text-[#64748b] uppercase tracking-wider">
            Total Percakapan Terekam
          </span>
          <div className="text-2xl font-bold text-[#253f8a]">
            {totalMessages} <span className="text-xs font-normal text-slate-500">Pesan</span>
          </div>
          <span className="text-[10px] text-green-700 bg-green-50 px-2 py-0.5 rounded-full w-fit border border-green-200">
            ✓ Log Tersimpan untuk Lampiran Skripsi
          </span>
        </Card>

        <Card className="p-4 border border-[#bce0fd] bg-white flex flex-col gap-1">
          <span className="text-[11px] font-bold text-[#64748b] uppercase tracking-wider">
            Tahap Paling Memicu Perdebatan
          </span>
          <div className="text-xl font-bold text-[#121c2c] truncate">
            {mostDebatedContext}
          </div>
          <span className="text-[10px] text-slate-500">
            Area materi yang paling membutuhkan scaffolding guru
          </span>
        </Card>

        <Card className="p-4 border border-[#bce0fd] bg-white flex flex-col gap-1">
          <span className="text-[11px] font-bold text-[#64748b] uppercase tracking-wider">
            Kapasitas Rombongan Belajar
          </span>
          <div className="text-2xl font-bold text-[#006a62]">
            5 <span className="text-xs font-normal text-slate-500">Kelompok Ganjil (Maks 5)</span>
          </div>
          <span className="text-[10px] text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full w-fit border border-blue-200">
            Alokasi Dinamis Real-Time
          </span>
        </Card>
      </div>

      {/* 5 Kelompok Overview Cards */}
      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-bold text-[#121c2c] flex items-center gap-2">
          <span>👥</span>
          <span>Status Kehadiran &amp; Lokasi Belajar 5 Kelompok</span>
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
          {groups.map((g) => {
            const isSelected = selectedGroupId === g.id;
            const isFull = g.members.length >= g.maxCapacity;

            return (
              <button
                key={g.id}
                type="button"
                onClick={() => setSelectedGroupId(isSelected ? 'all' : g.id)}
                className={`p-3 rounded-2xl text-left border transition-all flex flex-col justify-between gap-2 ${
                  isSelected
                    ? 'border-[#253f8a] bg-[#eaf6ff] ring-2 ring-[#253f8a]/30 shadow-md'
                    : 'border-slate-200 bg-white hover:border-[#a6d7ff] hover:bg-slate-50 shadow-xs'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="font-bold text-xs text-[#121c2c]">{g.nama}</span>
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full border ${
                        isFull
                          ? 'bg-red-50 text-red-700 border-red-200'
                          : 'bg-green-50 text-green-700 border-green-200'
                      }`}
                    >
                      {g.members.length}/{g.maxCapacity}
                    </span>
                  </div>
                  <div className="text-[10px] text-[#253f8a] font-semibold truncate">
                    {g.topikProyek}
                  </div>
                </div>

                <div className="text-[9px] text-slate-500">
                  {g.members.length === 0 ? (
                    <span className="italic">Belum ada anggota</span>
                  ) : (
                    <span>
                      {g.members.map((m) => m.nama.split(' ')[0]).join(', ')}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Guru Guidance Box: Intervensi Fasilitator */}
      <Card className="p-4 border border-[#bce0fd] bg-gradient-to-r from-[#f4fbff] to-[#eaf6ff] flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="font-bold text-xs text-[#121c2c] uppercase tracking-wider flex items-center gap-1.5">
            <span>🤝</span>
            <span>Kirim Bimbingan / Intervensi Guru ke Chat Kelompok</span>
          </span>
          {feedback && (
            <span className="text-xs font-bold text-green-800 bg-green-100 px-3 py-0.5 rounded-full border border-green-300 animate-in fade-in">
              {feedback}
            </span>
          )}
        </div>

        <form onSubmit={handleSendTeacherGuidance} className="flex flex-col sm:flex-row items-center gap-2">
          <div className="w-full sm:w-44 shrink-0">
            <select
              value={targetGroupForTeacher}
              onChange={(e) => setTargetGroupForTeacher(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-xl text-xs bg-white border border-[#a6d7ff] text-[#121c2c] outline-none font-semibold cursor-pointer"
            >
              {[1, 2, 3, 4, 5].map((gid) => (
                <option key={gid} value={gid}>
                  Kirim ke Kelompok {gid}
                </option>
              ))}
            </select>
          </div>

          <input
            type="text"
            value={teacherMsg}
            onChange={(e) => setTeacherMsg(e.target.value)}
            placeholder="Contoh: Kelompok 1, coba perhatikan lagi baris 19 rumus total perkaliannya..."
            className="flex-1 w-full px-4 py-2 rounded-xl text-xs bg-white border border-[#a6d7ff] text-[#121c2c] outline-none"
          />

          <button
            type="submit"
            disabled={!teacherMsg.trim()}
            className="w-full sm:w-auto px-5 py-2 rounded-xl text-xs font-bold text-white transition disabled:opacity-40 shadow-xs"
            style={{
              background: 'linear-gradient(to bottom, #68b6f7, #3d6b91)',
            }}
          >
            Kirim Arahan
          </button>
        </form>
      </Card>

      {/* Main Table: Research Chat Logs */}
      <Card className="p-5 border border-[#bce0fd] bg-white flex flex-col gap-4">
        {/* Table Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-[#121c2c]">
              📜 Transkrip Percakapan Siswa ({filteredMessages.length} Pesan)
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={selectedGroupId}
              onChange={(e) => setSelectedGroupId(e.target.value === 'all' ? 'all' : Number(e.target.value))}
              className="px-3 py-1.5 rounded-xl text-xs bg-[#f4fbff] border border-[#a6d7ff] text-[#253f8a] font-semibold outline-none cursor-pointer"
            >
              <option value="all">Semua Kelompok (1-5)</option>
              {[1, 2, 3, 4, 5].map((id) => (
                <option key={id} value={id}>Kelompok {id}</option>
              ))}
            </select>

            <select
              value={selectedContext}
              onChange={(e) => setSelectedContext(e.target.value)}
              className="px-3 py-1.5 rounded-xl text-xs bg-[#f4fbff] border border-[#a6d7ff] text-[#253f8a] font-semibold outline-none cursor-pointer"
            >
              <option value="all">Semua Tahap Aktivitas</option>
              <option value="Video Orientasi">Video Orientasi</option>
              <option value="Analisis IPO">Analisis IPO</option>
              <option value="Dekomposisi">Dekomposisi</option>
              <option value="Parsons Problem">Parsons Problem</option>
              <option value="Lab Python">Lab Python</option>
              <option value="Bimbingan Guru (Fasilitator)">Bimbingan Guru</option>
            </select>
          </div>
        </div>

        {/* Messages Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-[#475569] bg-slate-50">
                <th className="py-2.5 px-3 font-semibold w-16">Waktu</th>
                <th className="py-2.5 px-3 font-semibold w-24">Kelompok</th>
                <th className="py-2.5 px-3 font-semibold w-40">Siswa &amp; Peran</th>
                <th className="py-2.5 px-3 font-semibold w-36">Konteks Halaman</th>
                <th className="py-2.5 px-3 font-semibold">Isi Pesan / Perdebatan Konsep</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredMessages.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400 italic">
                    Tidak ada rekaman chat yang sesuai dengan filter.
                  </td>
                </tr>
              ) : (
                filteredMessages.map((msg) => (
                  <tr key={msg.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-2.5 px-3 font-mono text-slate-500 whitespace-nowrap">
                      {msg.timestamp}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span className="font-bold text-[#253f8a] bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-md">
                        Kel. {msg.groupId}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <div className="font-semibold text-[#1e293b]">{msg.senderName}</div>
                      {msg.senderRole && (
                        <span className="text-[10px] text-slate-500 font-mono">
                          {msg.senderRole}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span className="text-[11px] text-[#475569] bg-slate-100 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                        <span>📍</span>
                        <span>{msg.pageContext}</span>
                      </span>
                    </td>
                    <td className="py-2.5 px-3 leading-relaxed text-[#334155]">
                      {msg.text}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
