import { useEffect, useRef, useState } from 'react';
import { Card } from '../components/ui/Card';
import { KELOMPOK_OPTIONS } from '../data/users';
import { useAppStore } from '../store/useAppStore';
import {
  ChatMessageRecord,
  fetchGroupChat,
  sendChatMessage,
} from '../services/researchApi';
import { getStageDisplayLabel } from '../utils/stuckDetector';
import { logEvent } from '../services/logger';

export default function DiskusiPage() {
  const { user, telemetry, demoMode, setKelompok, enterStage, touchInteraction } = useAppStore();
  const [messages, setMessages] = useState<ChatMessageRecord[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const activeGroup = user?.kelompok || 'Kelompok 1';

  useEffect(() => {
    enterStage('diskusi');
  }, [enterStage]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const list = await fetchGroupChat(activeGroup);
      if (!cancelled) setMessages(list);
    };
    void load();
    const interval = setInterval(load, 3000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [activeGroup]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text || sending || !user) return;
    setSending(true);
    touchInteraction();
    try {
      const saved = await sendChatMessage({
        groupId: activeGroup,
        senderId: user.id,
        senderName: user.nama,
        senderRole: 'siswa',
        stage: telemetry.currentStage || 'diskusi',
        message: text,
      });
      setMessages((prev) => (prev.some((m) => m.id === saved.id) ? prev : [...prev, saved]));
      setDraft('');
      logEvent({
        stage: 'diskusi',
        componentId: 'diskusi-page-send',
        ctComponent: 'decomposition',
        result: 'info',
        payload: { groupId: activeGroup, messageLength: text.length },
      });
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="text-xs text-[#464555] mb-1 uppercase tracking-widest font-semibold">
            Kolaborasi Kelompok Kecil · Tersimpan ke Log Penelitian
          </div>
          <h1 className="text-2xl font-bold text-[#121c2c]">
            Ruang Diskusi {activeGroup}
          </h1>
          <p className="text-xs text-[#464555] mt-1">
            Diskusikan pemecahan masalah Kasir Kantin Bu Ani bersama teman kelompokmu atau minta arahan langsung dari guru fasilitator.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-[#464555]">Kelompok Aktif:</span>
          {demoMode ? (
            <select
              value={activeGroup}
              onChange={(e) => setKelompok(e.target.value)}
              className="px-3 py-1.5 rounded-full text-xs font-bold bg-[#eaf6ff] border border-[#a6d7ff] text-[#253f8a]"
            >
              {KELOMPOK_OPTIONS.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          ) : (
            <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-[#eaf6ff] border border-[#a6d7ff] text-[#253f8a]">
              {activeGroup}
            </span>
          )}
        </div>
      </div>

      <Card className="border border-[#bce0fd] p-0 overflow-hidden flex flex-col h-[520px]">
        <div className="px-4 py-3 bg-[#f4fbff] border-b border-[#d0ecff] flex items-center justify-between text-xs">
          <span className="font-bold text-[#253f8a]">
            💬 Log Percakapan {activeGroup} ({messages.length} pesan)
          </span>
          <span className="text-[11px] text-[#464555]">
            ● Sinkronisasi Otomatis Aktif
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 bg-[#fbfdff]">
          {messages.length === 0 ? (
            <div className="my-auto text-center text-xs text-[#64748b]">
              Belum ada riwayat percakapan di {activeGroup}. Mulai dengan menuliskan pertanyaan atau ide algoritmamu di bawah.
            </div>
          ) : (
            messages.map((msg) => {
              const isSelf = msg.senderId === user?.id || msg.senderName === user?.nama;
              const isGuru = msg.senderRole === 'guru';
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col max-w-[80%] ${
                    isSelf ? 'self-end items-end' : 'self-start items-start'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-0.5 px-1">
                    <span className="text-[11px] font-bold text-[#121c2c]">
                      {isGuru ? `👩‍🏫 ${msg.senderName} (Guru Fasilitator)` : msg.senderName}
                    </span>
                    <span className="text-[10px] text-[#64748b] font-mono">
                      {msg.timestamp.slice(11, 19)}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#eaf6ff] text-[#253f8a]">
                      {getStageDisplayLabel(msg.stage)}
                    </span>
                  </div>
                  <div
                    className={`px-4 py-2.5 rounded-2xl text-xs leading-relaxed shadow-xs ${
                      isGuru
                        ? 'bg-amber-50 border border-amber-300 text-amber-950'
                        : isSelf
                        ? 'bg-[#253f8a] text-white'
                        : 'bg-white border border-[#d0ecff] text-[#121c2c]'
                    }`}
                  >
                    {msg.message}
                  </div>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        <form
          onSubmit={handleSend}
          className="p-3 bg-white border-t border-[#eaf6ff] flex items-center gap-2"
        >
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={`Tulis ide, pertanyaan, atau kendala ke ${activeGroup}...`}
            className="flex-1 px-4 py-2.5 rounded-full text-xs bg-[#f4fbff] border border-[#bce0fd] text-[#121c2c] outline-none focus:border-[#3d6b91]"
          />
          <button
            type="submit"
            disabled={!draft.trim() || sending}
            className="px-5 py-2.5 rounded-full text-xs font-bold text-white transition hover:brightness-110 disabled:opacity-40"
            style={{
              background: 'linear-gradient(to bottom, #68b6f7, #3d6b91)',
            }}
          >
            Kirim Pesan
          </button>
        </form>
      </Card>
    </div>
  );
}
