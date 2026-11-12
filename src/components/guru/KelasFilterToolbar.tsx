import { KELAS_OPTIONS } from '../../data/users';
import { StudentRecord } from '../../services/studentStorage';

interface KelasFilterToolbarProps {
  allStudents: StudentRecord[];
  selectedKelas: string;
  onSelectKelas: (kelas: string) => void;
  onRefresh?: () => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  searchPlaceholder?: string;
}

export function KelasFilterToolbar({
  allStudents,
  selectedKelas,
  onSelectKelas,
  onRefresh,
  searchQuery,
  onSearchChange,
  searchPlaceholder = 'Cari nama atau NISN siswa…',
}: KelasFilterToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {onSearchChange !== undefined && (
        <input
          type="search"
          value={searchQuery ?? ''}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={searchPlaceholder}
          aria-label={searchPlaceholder}
          className="px-3.5 py-1.5 rounded-full text-xs bg-white border border-[#c0d8ef] text-[#121c2c] placeholder:text-[#8a94a6] outline-none focus:border-[#3d6b91] shadow-xs min-w-[200px]"
        />
      )}

      <div className="flex items-center gap-1.5 bg-white border border-[#c0d8ef] rounded-full px-3 py-1.5 text-xs text-[#253f8a] font-semibold shadow-xs">
        <span>🏫 Kelas:</span>
        <select
          value={selectedKelas}
          onChange={(e) => onSelectKelas(e.target.value)}
          aria-label="Filter Kelas"
          className="bg-transparent font-bold text-[#121c2c] outline-none cursor-pointer"
        >
          <option value="Semua">Semua Kelas ({allStudents.length})</option>
          {KELAS_OPTIONS.map((k) => (
            <option key={k} value={k}>
              {k} ({allStudents.filter((s) => s.kelas === k).length})
            </option>
          ))}
        </select>
      </div>

      {onRefresh && (
        <button
          type="button"
          onClick={onRefresh}
          className="px-3.5 py-1.5 rounded-full text-xs font-semibold text-[#253f8a] transition-all hover:brightness-105 active:scale-95 flex items-center gap-1.5"
          style={{
            background: '#eaf6ff',
            border: '1.5px solid #a6d7ff',
            boxShadow:
              'inset 2px 2px 4px rgba(61,107,145,0.18), inset -2px -2px 4px rgba(255,255,255,0.85), 0 3px 6px rgba(61,107,145,0.1)',
          }}
        >
          <span>🔄</span>
          <span>Segarkan Data</span>
        </button>
      )}
    </div>
  );
}

