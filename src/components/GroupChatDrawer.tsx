import { useEffect, useRef, useState } from 'react';
import { KELOMPOK_OPTIONS } from '../data/users';
import { useAppStore } from '../store/useAppStore';
import {
  ChatMessageRecord,
  fetchGroupChat,
  sendChatMessage,
} from '../services/researchApi';
import { getStageDisplayLabel } from '../utils/stuckDetector';
import { logEvent } from '../services/logger';

const QUICK_PROMPTS = [
  'Kami masih bingung di tahap ini.',
  'Ada error di kode Python kami, bisa bantu cek?',
  'Kenapa hasil perhitungannya belum sesuai?',
];

export function GroupChatDrawer() {
  const { user, telemetry, demoMode, setKelompok, touchInteraction } = useAppStore();
  const [open, setOpen] = useState(false);
  const [isIconOnly, setIsIconOnly] = useState(false);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [messages, setMessages] = useState<ChatMessageRecord[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{ startX: number; startY: number; initialX: number; initialY: number; moved: boolean } | null>(null);

  const activeGroup = user?.kelompok || 'Kelompok 1';

  // Inisialisasi posisi default pojok kanan bawah
  useEffect(() => {
    if (pos === null && typeof window !== 'undefined') {
      setPos({
        x: Math.max(16, window.innerWidth - 220),
        y: Math.max(16, window.innerHeight - 70),
      });
    }
  }, [pos]);

  // Pointer drag handler untuk tombol mengambang
  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    // Abaikan jika klik tombol minimize/close di dalam
    if ((e.target as HTMLElement).tagName === 'BUTTON') return;
    const currentX = pos?.x ?? (window.innerWidth - 220);
    const currentY = pos?.y ?? (window.innerHeight - 70);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialX: currentX,
      initialY: currentY,
      moved: false,
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    if (Math.hypot(dx, dy) > 4) {
      dragRef.current.moved = true;
      const nextX = Math.min(Math.max(10, dragRef.current.initialX + dx), window.innerWidth - 80);
      const nextY = Math.min(Math.max(10, dragRef.current.initialY + dy), window.innerHeight - 70);
      setPos({ x: nextX, y: nextY });
    }
  }

  function handlePointerUp(e: React.PointerEvent<HTMLDivElement>) {
    if (dragRef.current) {
      if (!dragRef.current.moved) {
        // Klik murni, bukan seret
        setOpen((v) => !v);
      }
      dragRef.current = null;
    }
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    if (!user || user.peran !== 'siswa') return;
    let cancelled = false;

    const load = async () => {
      const list = await fetchGroupChat(activeGroup);
      if (!cancelled) {
        setMessages(list);
      }
    };

    void load();
    const interval = setInterval(load, open ? 3000 : 8000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [user, activeGroup, open]);

  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length, open]);

  if (!user || user.peran !== 'siswa') return null;

  async function handleSend(textOverride?: string) {
    const text = (textOverride ?? draft).trim();
    if (!text || sending || !user) return;
    setSending(true);
    touchInteraction();
    try {
      const saved = await sendChatMessage({
        groupId: activeGroup,
        senderId: user.id,
        senderName: user.nama,
        senderRole: 'siswa',
        stage: telemetry.currentStage || 'beranda',
        message: text,
      });
      setMessages((prev) => (prev.some((m) => m.id === saved.id) ? prev : [...prev, saved]));
      if (!textOverride) setDraft('');
      logEvent({
        stage: telemetry.currentStage || 'beranda',
        componentId: 'group-chat-send',
        ctComponent: 'decomposition',
        result: 'info',
        payload: { groupId: activeGroup, messageLength: text.length },
      });
    } finally {
      setSending(false);
    }
  }

  const dialogLeft = pos ? Math.min(Math.max(10, pos.x - 140), window.innerWidth - 360) : undefined;
  const dialogTop = pos ? Math.max(10, pos.y - 470) : undefined;

  return (
    <>
      {/* Floating Chat Trigger Button (Draggable & Minimizable) */}
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        style={{
          position: 'fixed',
          left: pos ? `${pos.x}px` : undefined,
          top: pos ? `${pos.y}px` : undefined,
          bottom: pos ? undefined : '20px',
          right: pos ? undefined : '20px',
          touchAction: 'none',
        }}
        className="z-50 select-none cursor-grab active:cursor-grabbing"
      >
        {isIconOnly ? (
          <div className="relative group">
            <button
              type="button"
              className="size-13 rounded-full flex items-center justify-center font-bold text-white shadow-2xl transition hover:scale-105 active:scale-95 cursor-pointer"
              style={{
                background: 'linear-gradient(to bottom, #68b6f7, #253f8a)',
                boxShadow: '0 10px 22px -3px rgba(37,63,138,0.5)',
              }}
              title="💬 Klik untuk membuka chat kelompok · Geser untuk memindahkan posisi"
              aria-label="Buka chat kelompok"
            >
              <span className="text-xl">💬</span>
              {messages.length > 0 && (
                <span className="absolute -top-1 -right-1 px-1.5 py-0.5 rounded-full bg-red-500 text-white text-[10px] font-extrabold shadow-sm">
                  {messages.length}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsIconOnly(false);
              }}
              className="absolute -bottom-2 -left-2 size-5 rounded-full bg-white border border-[#93c5fd] text-[#253f8a] text-[10px] font-bold flex items-center justify-center shadow hover:bg-[#eaf6ff] transition"
              title="Perluas tombol chat"
            >
              ⤢
            </button>
          </div>
        ) : (
          <div
            className="flex items-center gap-2 pl-3 pr-2 py-2.5 rounded-full font-bold text-xs text-white shadow-xl transition hover:brightness-105 active:scale-98"
            style={{
              background: 'linear-gradient(to bottom, #68b6f7, #253f8a)',
              boxShadow: '0 12px 24px -4px rgba(37,63,138,0.45)',
            }}
          >
            <span className="text-slate-300 opacity-60 text-xs tracking-tighter" title="Geser tombol">
              ⋮⋮
            </span>
            <span className="text-base">💬</span>
            <span className="max-w-[130px] truncate">Diskusi {activeGroup}</span>
            {messages.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-white text-[#253f8a] text-[10px] font-extrabold">
                {messages.length}
              </span>
            )}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsIconOnly(true);
              }}
              className="size-5 rounded-full bg-white/20 hover:bg-white/35 text-white text-[10px] flex items-center justify-center transition"
              title="Perkecil jadi ikon bulat"
              aria-label="Perkecil ke ikon"
            >
              _
            </button>
          </div>
        )}
      </div>

      {/* Drawer Panel */}
      {open && (
        <div
          style={{
            position: 'fixed',
            left: dialogLeft !== undefined ? `${dialogLeft}px` : undefined,
            top: dialogTop !== undefined ? `${dialogTop}px` : undefined,
            bottom: dialogTop === undefined ? '80px' : undefined,
            right: dialogLeft === undefined ? '20px' : undefined,
          }}
          className="z-50 w-[350px] max-w-[calc(100vw-1.5rem)] h-[460px] bg-white rounded-3xl border-2 border-[#a6d7ff] shadow-2xl flex flex-col overflow-hidden"
          role="dialog"
          aria-label="Chat Diskusi Kelompok Kecil"
        >
          {/* Header */}
          <div className="px-4 py-2.5 bg-gradient-to-r from-[#eaf6ff] to-[#f4fbff] border-b border-[#c0d8ef] flex items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold text-[#121c2c]">💬 Ruang Diskusi Kelompok</span>
              </div>
              <span className="text-[10px] text-[#464555] block">
                Sub-bab: <strong>{getStageDisplayLabel(telemetry.currentStage)}</strong> · Riwayat tersimpan
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setIsIconOnly(true);
                }}
                className="size-7 rounded-full bg-white border border-[#c0d8ef] text-[#464555] hover:bg-[#eaf6ff] text-xs font-bold flex items-center justify-center"
                title="Minimize jadi ikon"
                aria-label="Minimize"
              >
                —
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="size-7 rounded-full bg-white border border-[#c0d8ef] text-[#464555] hover:bg-[#eaf6ff] text-xs font-bold flex items-center justify-center"
                title="Tutup chat"
                aria-label="Tutup chat"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Group Selector (if demoMode or allow quick switch only in demo) */}
          <div className="px-3 py-2 bg-[#f8fbff] border-b border-[#eaf6ff] flex items-center justify-between gap-2 text-[11px]">
            <span className="font-semibold text-[#253f8a]">Kelompok:</span>
            {demoMode ? (
              <select
                value={activeGroup}
                onChange={(e) => setKelompok(e.target.value)}
                className="px-2 py-1 rounded-lg border border-[#a6d7ff] bg-white text-xs font-bold text-[#121c2c]"
              >
                {KELOMPOK_OPTIONS.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full bg-[#eaf6ff] border border-[#a6d7ff] font-bold text-[#253f8a]">
                {activeGroup}
              </span>
            )}
          </div>

          {/* Message List */}
          <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2.5 bg-[#fbfdff]">
            {messages.length === 0 ? (
              <div className="text-center text-xs text-[#64748b] my-auto px-4">
                Belum ada pesan di {activeGroup}. Mulai diskusi dengan teman kelompokmu atau tanya guru fasilitator!
              </div>
            ) : (
              messages.map((msg) => {
                const isSelf = msg.senderId === user.id || msg.senderName === user.nama;
                const isGuru = msg.senderRole === 'guru';
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col max-w-[85%] ${
                      isSelf ? 'self-end items-end' : 'self-start items-start'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-0.5 px-1">
                      <span className="text-[10px] font-bold text-[#464555]">
                        {isGuru ? `👩‍🏫 ${msg.senderName} (Guru)` : msg.senderName}
                      </span>
                      <span className="text-[9px] text-[#64748b] font-mono">
                        {msg.timestamp.slice(11, 16)}
                      </span>
                    </div>
                    <div
                      className={`px-3 py-2 rounded-2xl text-xs leading-relaxed shadow-xs ${
                        isGuru
                          ? 'bg-amber-50 border border-amber-300 text-amber-950'
                          : isSelf
                          ? 'bg-[#253f8a] text-white'
                          : 'bg-white border border-[#d0ecff] text-[#121c2c]'
                      }`}
                    >
                      {msg.message}
                    </div>
                    <span className="text-[9px] text-[#64748b] px-1 mt-0.5">
                      @ {getStageDisplayLabel(msg.stage)}
                    </span>
                  </div>
                );
              })
            )}
            <div ref={bottomRef} />
          </div>

          {/* Quick prompts */}
          <div className="px-3 pt-2 pb-1 bg-white border-t border-[#eaf6ff] flex gap-1.5 overflow-x-auto">
            {QUICK_PROMPTS.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => void handleSend(q)}
                className="shrink-0 text-[10px] px-2.5 py-1 rounded-full bg-[#f4fbff] border border-[#bce0fd] text-[#253f8a] hover:bg-[#eaf6ff] transition"
              >
                {q}
              </button>
            ))}
          </div>

          {/* Composer */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void handleSend();
            }}
            className="p-2.5 bg-white flex items-center gap-2"
          >
            <input
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={`Tulis pesan ke ${activeGroup}...`}
              className="flex-1 px-3 py-2 rounded-full text-xs bg-[#f4fbff] border border-[#bce0fd] text-[#121c2c] outline-none focus:border-[#3d6b91]"
            />
            <button
              type="submit"
              disabled={!draft.trim() || sending}
              className="px-3.5 py-2 rounded-full text-xs font-bold text-white bg-[#253f8a] hover:brightness-110 disabled:opacity-40 transition"
            >
              Kirim
            </button>
          </form>
        </div>
      )}
    </>
  );
}
