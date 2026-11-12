import { NavLink } from 'react-router';
import { MATERI_LIST } from '../../data/curriculum';
import { useAppStore } from '../../store/useAppStore';
import { ProgressBar } from '../ui/ProgressBar';

// ─── Sidebar Siswa ───────────────────────────────────────────────
function SidebarSiswa() {
  const { progress, answers } = useAppStore();
  const isPretestDone = !!answers['pretest_result'] || !!answers['pretest_score'];
  const isPosttestDone = !!answers['posttest_result'] || !!answers['posttest_score'];

  return (
    <>
      <h2 className="text-xs font-bold uppercase tracking-widest text-[#464555] px-2 mb-2">
        Daftar Materi
      </h2>

      {MATERI_LIST.map((m) => {
        const doneStages = m.stages.filter(
          (s) => progress[`${m.id}-${s}`] === 'done'
        ).length;
        const pct = (doneStages / m.stages.length) * 100;

        return (
          <div key={m.id} className="flex flex-col gap-1">
            {m.locked ? (
              <div className="px-3 py-2 rounded-2xl text-sm text-[#aaa] flex items-center gap-2 cursor-not-allowed select-none opacity-60">
                <span className="text-base">🔒</span>
                <div>
                  <div className="font-semibold">{m.judul}</div>
                  <div className="text-xs">Segera hadir</div>
                </div>
              </div>
            ) : (
              <NavLink
                to={!isPretestDone ? '/tes/awal' : `/materi/${m.id}/video`}
                end={false}
                className={({ isActive }) =>
                  `px-3 py-2.5 rounded-2xl text-sm flex items-start gap-2.5 transition-all ${
                    isActive
                      ? 'bg-[#eaf6ff] text-[#253f8a] font-bold border border-[#bce0fd] shadow-[inset_2px_2px_4px_rgba(61,107,145,0.2),inset_-2px_-2px_4px_rgba(255,255,255,0.85)]'
                      : 'hover:bg-white/70 text-[#464555]'
                  }`
                }
              >
                <span className="text-base mt-0.5">📘</span>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate">
                    Materi {m.id}: {m.judul}
                  </div>
                  <ProgressBar value={pct} />
                </div>
              </NavLink>
            )}
          </div>
        );
      })}

      {/* Navigasi evaluasi & beranda siswa */}
      <div className="mt-auto pt-4 border-t border-[#c0d8ef]/60 flex flex-col gap-1.5">
        <h2 className="text-xs font-bold uppercase tracking-widest text-[#464555] px-2 mb-1">
          Evaluasi CT
        </h2>
        <SidebarLink
          to="/tes/awal"
          icon="📝"
          label="Pretest CT"
          badge={isPretestDone ? '✅ Selesai' : 'Wajib Awal'}
          badgeVariant={isPretestDone ? 'done' : 'active'}
        />
        <SidebarLink
          to="/tes/akhir"
          icon="🏆"
          label="Posttest CT"
          badge={isPosttestDone ? '✅ Selesai' : progress['1-lab'] === 'done' ? 'Mulai' : undefined}
          badgeVariant={isPosttestDone ? 'done' : 'active'}
        />
        <div className="pt-2">
          <SidebarLink to="/beranda" icon="🏠" label="Beranda Materi" />
        </div>
      </div>
    </>
  );
}

// ─── Sidebar Guru ────────────────────────────────────────────────
function SidebarGuru() {
  return (
    <>
      <h2 className="text-xs font-bold uppercase tracking-widest text-[#464555] px-2 mb-2">
        Menu Guru
      </h2>

      <SidebarLink to="/guru"           icon="📊" label="Dashboard"            end />
      <SidebarLink to="/guru/kelas"     icon="👥" label="Daftar Siswa"         />
      <SidebarLink to="/guru/kemajuan"  icon="📈" label="Kemajuan Belajar"     />
      <SidebarLink to="/guru/ct"        icon="🧠" label="Indikator CT"         />
      <SidebarLink to="/guru/ekspor"    icon="📥" label="Ekspor Data CSV"      />

      {/* Referensi materi read-only (guru tidak mengerjakan halaman siswa) */}
      <div className="mt-auto pt-4 border-t border-[#c0d8ef]/60 flex flex-col gap-1">
        <h2 className="text-xs font-bold uppercase tracking-widest text-[#464555] px-2 mb-1">
          Tinjau Kurikulum
        </h2>
        <SidebarLink
          to="/guru/materi"
          icon="📖"
          label="Materi & Bank Soal"
          badge="Read-Only"
          badgeVariant="active"
        />
      </div>
    </>
  );
}

// ─── Helper NavLink dengan styling LoginPage ───────────────────────
function SidebarLink({
  to,
  icon,
  label,
  end = false,
  badge,
  badgeVariant,
}: {
  to: string;
  icon: string;
  label: string;
  end?: boolean;
  badge?: string;
  badgeVariant?: 'done' | 'active';
}) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `px-3 py-2 rounded-2xl text-sm flex items-center justify-between gap-2 transition-all ${
          isActive
            ? 'bg-[#eaf6ff] text-[#253f8a] font-bold border border-[#bce0fd] shadow-[inset_2px_2px_4px_rgba(61,107,145,0.2),inset_-2px_-2px_4px_rgba(255,255,255,0.85)]'
            : 'hover:bg-white/70 text-[#464555]'
        }`
      }
    >
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-base shrink-0">{icon}</span>
        <span className="font-semibold truncate">{label}</span>
      </div>
      {badge && (
        <span
          className="text-[10px] px-2 py-0.5 rounded-full font-bold shrink-0 shadow-xs"
          style={{
            background: badgeVariant === 'done' ? '#70f8e8' : '#a6d7ff',
            color: badgeVariant === 'done' ? '#006a62' : '#253f8a',
          }}
        >
          {badge}
        </span>
      )}
    </NavLink>
  );
}

// ─── Sidebar utama ────────────────────────────────────────────────
export function Sidebar() {
  const user = useAppStore((s) => s.user);

  return (
    <aside className="w-64 shrink-0 h-full overflow-y-auto bg-white/75 backdrop-blur-md border-r border-[#c0d8ef] px-4 py-6 flex flex-col gap-2 shadow-xs">
      {user?.peran === 'guru' ? <SidebarGuru /> : <SidebarSiswa />}
    </aside>
  );
}
