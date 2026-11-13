import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router';
import { useAppStore } from '../../store/useAppStore';
import {
  getGroupChatMessages,
  sendChatMessage,
  subscribeToChat,
  ChatMessage,
  downloadChatLogsCsv,
} from '../../services/chatService';
import { getGroupById } from '../../services/groupService';

// Map path URL to human-readable page name for research context
function getPageContext(pathname: string): string {
  if (pathname.includes('/video')) return 'Video Orientasi';
  if (pathname.includes('/ipo')) return 'Analisis IPO';
  if (pathname.includes('/dekomposisi')) return 'Dekomposisi';
  if (pathname.includes('/parsons')) return 'Parsons Problem';
  if (pathname.includes('/lab')) return 'Lab Python';
  if (pathname.includes('/tes/awal')) return 'Pretest CT';
  if (pathname.includes('/tes/akhir')) return 'Posttest CT';
  if (pathname.includes('/beranda')) return 'Beranda Materi';
  if (pathname.includes('/guru')) return 'Dasbor Guru';
  return 'Aktivitas Belajar';
}

const QUICK_PROMPTS = [
  'Menurut kalian kartu mana yang masuk pengecoh?',
  'Rumus perkaliannya pakai bintang (*): total = harga * jumlah',
  'Siapa yang mau jadi Programmer di simulasi kinestetik?',
  'Apakah variabel nama_barang wajib pakai tanda petik?',
];

export function GroupChatWidget() {
  const user = useAppStore((s) => s.user);
  const location = useLocation();

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputVal, setInputVal] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const currentGroupId = user?.kelompok || 1;
  const currentGroup = getGroupById(currentGroupId);

  const currentPageContext = getPageContext(location.pathname);

  // Load and listen to messages
  useEffect(() => {
    if (!user) return;
    setMessages(getGroupChatMessages(currentGroupId));

    const unsubscribe = subscribeToChat((newMsg) => {
      if (newMsg.groupId === currentGroupId) {
        setMessages((prev) => [...prev, newMsg]);
        if (!isOpen) {
          setUnreadCount((c) => c + 1);
        }
      }
    });

    return unsubscribe;
  }, [user, currentGroupId, isOpen]);

  // Scroll to bottom when messages update or chat opened
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      setUnreadCount(0);
    }
  }, [messages, isOpen]);

  if (!user) return null;

  function handleSend(textToSend?: string) {
    const text = (textToSend || inputVal).trim();
    if (!text || !user) return;

    sendChatMessage(currentGroupId, user, text, currentPageContext);
    setInputVal('');
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end">
      {/* Expanded Chat Drawer / Popover */}
      {isOpen && (
        <div
          className="w-[360px] sm:w-[410px] h-[540px] max-h-[85vh] bg-white rounded-[32px] flex flex-col overflow-hidden shadow-2xl border border-[#bce0fd] mb-3 animate-in fade-in slide-in-from-bottom-4 duration-200"
          style={{
            boxShadow:
              '0 24px 50px -12px rgba(37,63,138,0.25), inset 1px 1px 2px rgba(255,255,255,0.9)',
          }}
        >
          {/* Header */}
          <div className="p-3.5 px-4 bg-gradient-to-r from-[#eaf6ff] via-[#f4fbff] to-[#eaf6ff] border-b border-[#c0d8ef] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="size-9 rounded-full bg-[#3d6b91] text-white flex items-center justify-center font-bold text-sm shadow-xs">
                {currentGroupId}
              </div>
              <div>
                <h3 className="font-bold text-xs text-[#121c2c] flex items-center gap-1.5">
                  <span>Forum Diskusi Kelompok {currentGroupId}</span>
                  <span className="size-2 rounded-full bg-green-500 inline-block animate-pulse" />
                </h3>
                <p className="text-[10px] text-[#475569] truncate max-w-[200px]">
                  {currentGroup?.topikProyek || 'Kantin Bu Ani'} · {currentGroup?.members.length || 1}/5 Siswa
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => downloadChatLogsCsv(currentGroupId)}
                title="Ekspor Chat Log Kelompok (.CSV) untuk Bukti Penelitian"
                className="size-7 rounded-full bg-white hover:bg-slate-100 border border-slate-200 text-xs flex items-center justify-center text-[#253f8a] transition"
              >
                📥
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="size-7 rounded-full bg-white hover:bg-slate-100 border border-slate-200 text-xs flex items-center justify-center text-slate-600 transition"
                aria-label="Tutup Obrolan"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Peer Presence Strip */}
          <div className="px-3 py-1.5 bg-[#f8fafc] border-b border-slate-100 flex items-center gap-2 overflow-x-auto text-[10px] text-[#475569]">
            <span className="font-bold text-[#64748b] shrink-0">👥 Rekan Tim:</span>
            {currentGroup?.members.map((m) => (
              <span
                key={m.id}
                className={`px-2 py-0.5 rounded-full shrink-0 border ${
                  m.id === user.id
                    ? 'bg-[#eaf6ff] border-[#a6d7ff] text-[#253f8a] font-bold'
                    : 'bg-white border-slate-200 text-slate-700'
                }`}
                title={`Bergabung pukul ${m.joinedAt} · Di: ${m.currentStage || 'Beranda'}`}
              >
                {m.nama.split(' ')[0]} {m.id === user.id && '(Kamu)'}
              </span>
            ))}
          </div>

          {/* Messages Stream */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-3 bg-[#fdfefe]">
            {messages.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400">
                Belum ada percakapan. Mulailah menyapa rekan kelompokmu!
              </div>
            ) : (
              messages.map((msg) => {
                const isMe = msg.userId === user.id;

                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[88%] ${
                      isMe ? 'ml-auto' : 'mr-auto'
                    }`}
                  >
                    {/* Sender Info & Page Context */}
                    <div className="flex items-center gap-1.5 mb-1 px-1">
                      <span className="font-bold text-[10px] text-[#334155]">
                        {isMe ? 'Kamu' : msg.senderName}
                      </span>
                      {msg.senderRole && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded font-mono bg-slate-100 text-slate-600">
                          {msg.senderRole}
                        </span>
                      )}
                      <span className="text-[9px] text-[#94a3b8]">{msg.timestamp}</span>
                    </div>

                    {/* Chat Bubble */}
                    <div
                      className={`p-3 rounded-2xl text-xs leading-relaxed transition-all shadow-xs ${
                        isMe
                          ? 'bg-[#3d6b91] text-white rounded-br-xs'
                          : 'bg-[#f1f5f9] text-[#1e293b] border border-slate-200 rounded-bl-xs'
                      }`}
                    >
                      {msg.text}
                    </div>

                    {/* Page Context Badge */}
                    {msg.pageContext && (
                      <span className="text-[9px] text-[#64748b] mt-0.5 px-1 flex items-center gap-1">
                        <span>📍</span>
                        <span>{msg.pageContext}</span>
                      </span>
                    )}
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts Bar */}
          <div className="p-2 bg-slate-50 border-t border-slate-200 flex items-center gap-1.5 overflow-x-auto">
            <span className="text-[10px] font-bold text-[#64748b] shrink-0">💡 Pertanyaan:</span>
            {QUICK_PROMPTS.map((prompt, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSend(prompt)}
                className="text-[10px] px-2 py-1 bg-white hover:bg-blue-50 text-[#253f8a] border border-blue-200 rounded-full whitespace-nowrap transition active:scale-95"
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Input Box */}
          <div className="p-2.5 bg-white border-t border-[#c0d8ef] flex items-center gap-2">
            <input
              type="text"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Tulis pesan ke Kelompok ${currentGroupId}…`}
              className="flex-1 px-3.5 py-2 rounded-full text-xs bg-[#f4fbff] border border-[#a6d7ff] text-[#121c2c] outline-none focus:ring-2 focus:ring-[#3d6b91]"
            />
            <button
              type="button"
              onClick={() => handleSend()}
              disabled={!inputVal.trim()}
              className="px-4 py-2 rounded-full text-xs font-bold text-white transition disabled:opacity-40 active:scale-95 shadow-xs"
              style={{
                background: 'linear-gradient(to bottom, #68b6f7, #3d6b91)',
              }}
            >
              Kirim
            </button>
          </div>
        </div>
      )}

      {/* Floating Toggle Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="relative flex items-center gap-2 px-4 py-3 rounded-full text-xs font-bold text-white transition-all hover:brightness-110 active:scale-95 shadow-xl"
        style={{
          background: 'linear-gradient(135deg, #253f8a 0%, #3d6b91 100%)',
          border: '1.5px solid #a6d7ff',
          boxShadow:
            '0 12px 24px -4px rgba(37,63,138,0.45), inset 0 2px 3px rgba(255,255,255,0.5)',
        }}
        aria-label="Buka Obrolan Kelompok"
      >
        <span className="text-base">💬</span>
        <span>Diskusi Kelompok {user.kelompok || 1}</span>

        {/* Unread badge */}
        {unreadCount > 0 && (
          <span className="size-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center animate-bounce shadow-md">
            {unreadCount}
          </span>
        )}

        {/* Online Indicator Dot */}
        <span className="size-2.5 rounded-full bg-green-400 border-2 border-white inline-block animate-pulse" />
      </button>
    </div>
  );
}
