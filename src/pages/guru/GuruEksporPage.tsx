import { useCallback, useState } from 'react';
import { getUnifiedStudentSummaries, StudentRecord } from '../../services/studentStorage';
import {
  CsvExportKind,
  downloadCsvFile,
  generateStudentsCsv,
} from '../../utils/teacherAnalytics';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { KelasFilterToolbar } from '../../components/guru/KelasFilterToolbar';

interface ExportPreset {
  kind: CsvExportKind;
  icon: string;
  title: string;
  description: string;
  columns: string;
  filePrefix: string;
  variant: 'primary' | 'secondary';
}

const EXPORT_PRESETS: ExportPreset[] = [
  {
    kind: 'lengkap',
    icon: '📊',
    title: 'Rekap Lengkap (Semua Data)',
    description:
      'Gabungan identitas siswa, progres Materi 1, nilai seluruh fitur (Pretest s.d. Posttest), selisih peningkatan, 6 indikator CT, dan waktu belajar.',
    columns: '22 kolom lengkap siap olah di Excel / Google Sheets',
    filePrefix: 'stepverse-rekap-lengkap',
    variant: 'primary',
  },
  {
    kind: 'nilai',
    icon: '📝',
    title: 'Rekap Nilai Fitur & Evaluasi',
    description:
      'Berfokus pada skor Pretest, IPO, Dekomposisi, Parsons, Lab Python, Posttest, rata-rata, selisih Post–Pre, dan percobaan Lab.',
    columns: 'Nama, NISN, Kelas, Pretest–Posttest, Rata-rata, Selisih, Waktu',
    filePrefix: 'stepverse-rekap-nilai',
    variant: 'secondary',
  },
  {
    kind: 'ct',
    icon: '🧠',
    title: 'Profil 6 Indikator CT Siswa',
    description:
      'Rekap persentase 6 komponen Computational Thinking per siswa: Dekomposisi, Abstraksi, Desain Algoritma, Debugging, Iterasi, dan Generalisasi.',
    columns: 'Nama, NISN, Kelas, Status, 6 Skor Komponen CT (%)',
    filePrefix: 'stepverse-indikator-ct',
    variant: 'secondary',
  },
  {
    kind: 'profil',
    icon: '📄',
    title: 'Data Identitas & Status Siswa',
    description:
      'Daftar akun siswa beserta NISN, kelas, asal sekolah, status belajar terkini, dan persentase progres Materi 1.',
    columns: 'ID, Nama, NISN, Kelas, Sekolah, Status, Progres (%), Aktivitas',
    filePrefix: 'stepverse-data-siswa',
    variant: 'secondary',
  },
];

export default function GuruEksporPage() {
  const [students, setStudents] = useState<StudentRecord[]>(() => getUnifiedStudentSummaries());
  const [selectedKelas, setSelectedKelas] = useState<string>('Semua');
  const [lastExported, setLastExported] = useState<string | null>(null);

  const handleRefresh = useCallback(() => {
    setStudents(getUnifiedStudentSummaries());
  }, []);

  const filtered =
    selectedKelas === 'Semua'
      ? students
      : students.filter((s) => s.kelas === selectedKelas);

  function handleExport(preset: ExportPreset) {
    const csv = generateStudentsCsv(filtered, preset.kind);
    const dateTag = new Date().toISOString().slice(0, 10);
    const kelasSlug =
      selectedKelas === 'Semua'
        ? 'semua-kelas'
        : selectedKelas.toLowerCase().replace(/\s+/g, '-');
    const filename = `${preset.filePrefix}-${kelasSlug}-${dateTag}.csv`;
    downloadCsvFile(filename, csv);
    setLastExported(filename);
  }

  return (
    <div className="max-w-5xl mx-auto flex flex-col gap-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#121c2c] mb-1">Ekspor Data CSV</h1>
          <p className="text-sm text-[#464555]">
            Unduh rekap identitas, kemajuan belajar, nilai per fitur, dan profil indikator CT siswa dalam format CSV.
          </p>
        </div>

        <KelasFilterToolbar
          allStudents={students}
          selectedKelas={selectedKelas}
          onSelectKelas={setSelectedKelas}
          onRefresh={handleRefresh}
        />
      </div>

      <div className="p-4 rounded-2xl bg-[#f4fbff] border border-[#bce0fd] flex flex-wrap items-center justify-between gap-2 text-xs text-[#253f8a]">
        <span>
          Cakupan data saat ini: <strong>{filtered.length} siswa</strong>{' '}
          ({selectedKelas === 'Semua' ? 'Seluruh Kelas' : `Kelas ${selectedKelas}`}).
        </span>
        {lastExported && (
          <span className="font-semibold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
            ✓ Berhasil mengunduh {lastExported}
          </span>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {EXPORT_PRESETS.map((preset) => (
          <Card key={preset.kind} className="flex flex-col gap-4 border border-[#bce0fd]">
            <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-[#f4fbff] border border-[#eaf6ff]">
              <span className="text-3xl shrink-0">{preset.icon}</span>
              <div>
                <div className="font-bold text-[#121c2c]">{preset.title}</div>
                <div className="text-xs text-[#253f8a] font-medium mt-0.5">{preset.columns}</div>
              </div>
            </div>

            <p className="text-xs text-[#464555] leading-relaxed">{preset.description}</p>

            <div className="mt-auto">
              <Button
                onClick={() => handleExport(preset)}
                variant={preset.variant}
                size="md"
                disabled={filtered.length === 0}
                className="w-full"
              >
                📥 Unduh CSV ({filtered.length} siswa)
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
