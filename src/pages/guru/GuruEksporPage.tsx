import { useCallback, useEffect, useState } from 'react';
import { getUnifiedStudentSummaries, StudentRecord } from '../../services/studentStorage';
import {
  CsvExportKind,
  downloadCsvFile,
  generateChatLogsCsv,
  generateReasonsCsv,
  generateStudentsCsv,
} from '../../utils/teacherAnalytics';
import { ChatMessageRecord, fetchGroupChat } from '../../services/researchApi';
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
  const [chatLogs, setChatLogs] = useState<ChatMessageRecord[]>([]);
  const [selectedKelas, setSelectedKelas] = useState<string>('Semua');
  const [lastExported, setLastExported] = useState<string | null>(null);

  const loadChat = useCallback(async () => {
    const msgs = await fetchGroupChat('all');
    setChatLogs(msgs);
  }, []);

  useEffect(() => {
    void loadChat();
  }, [loadChat]);

  const handleRefresh = useCallback(() => {
    setStudents(getUnifiedStudentSummaries());
    void loadChat();
  }, [loadChat]);

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

  function handleExportChatCsv() {
    const csv = generateChatLogsCsv(chatLogs);
    const filename = `stepverse-log-chat-kelompok-${new Date().toISOString().slice(0, 10)}.csv`;
    downloadCsvFile(filename, csv);
    setLastExported(filename);
  }

  function handleExportReasonsCsv() {
    const csv = generateReasonsCsv(filtered);
    const filename = `stepverse-alasan-logis-siswa-${new Date().toISOString().slice(0, 10)}.csv`;
    downloadCsvFile(filename, csv);
    setLastExported(filename);
  }

  async function handleExportResearchJson() {
    let payload: unknown = {
      exportedAt: new Date().toISOString(),
      students: filtered,
      chatMessages: chatLogs,
    };
    try {
      const res = await fetch('/api/export/research');
      if (res.ok) {
        payload = await res.json();
      }
    } catch {
      // use local payload fallback
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const filename = `stepverse-arsip-penelitian-${new Date().toISOString().slice(0, 10)}.json`;
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
    setLastExported(filename);
  }

  return (
    <div className="max-w-5xl mx-auto flex flex-col gap-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#121c2c] mb-1">Ekspor Data &amp; Log Penelitian</h1>
          <p className="text-sm text-[#464555]">
            Unduh rekap identitas, nilai, alasan logis siswa, serta riwayat log chat kelompok kecil dalam format CSV / JSON.
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
          ({selectedKelas === 'Semua' ? 'Seluruh Kelas' : `Kelas ${selectedKelas}`}) ·{' '}
          <strong>{chatLogs.length} pesan log chat</strong>.
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

        {/* Research Chat Log Export */}
        <Card className="flex flex-col gap-4 border border-[#bce0fd]">
          <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-amber-50 border border-amber-200">
            <span className="text-3xl shrink-0">💬</span>
            <div>
              <div className="font-bold text-[#121c2c]">Log Chat Diskusi Kelompok (CSV)</div>
              <div className="text-xs text-amber-900 font-medium mt-0.5">
                Waktu, Kelompok (1–5), Pengirim, Peran, Sub-bab, Isi Pesan
              </div>
            </div>
          </div>
          <p className="text-xs text-[#464555] leading-relaxed">
            Riwayat percakapan diskusi kelompok kecil dan intervensi guru fasilitator dari basis data untuk analisis penelitian.
          </p>
          <div className="mt-auto">
            <Button
              onClick={handleExportChatCsv}
              variant="secondary"
              size="md"
              disabled={chatLogs.length === 0}
              className="w-full"
            >
              📥 Unduh Log Chat ({chatLogs.length} pesan)
            </Button>
          </div>
        </Card>

        {/* Logical Reasons & Full Research JSON */}
        <Card className="flex flex-col gap-4 border border-[#bce0fd]">
          <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200">
            <span className="text-3xl shrink-0">🔬</span>
            <div>
              <div className="font-bold text-[#121c2c]">Alasan Logis &amp; Arsip Penelitian</div>
              <div className="text-xs text-emerald-900 font-medium mt-0.5">
                Alasan Prediksi, IPO, Dekomposisi, Pretest &amp; Post-test + JSON DB
              </div>
            </div>
          </div>
          <p className="text-xs text-[#464555] leading-relaxed">
            Unduh alasan logis yang dituliskan siswa di setiap sub-bab dalam CSV, atau unduh arsip penuh basis data penelitian (JSON).
          </p>
          <div className="mt-auto grid grid-cols-2 gap-2">
            <Button
              onClick={handleExportReasonsCsv}
              variant="secondary"
              size="md"
              disabled={filtered.length === 0}
              className="w-full"
            >
              📥 Alasan (CSV)
            </Button>
            <Button
              onClick={handleExportResearchJson}
              variant="primary"
              size="md"
              className="w-full"
            >
              🗄️ Full DB (JSON)
            </Button>
          </div>
        </Card>

        {/* Source Code Project Zip Export */}
        <Card className="flex flex-col gap-4 border border-[#bce0fd] md:col-span-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <span className="text-3xl shrink-0">📦</span>
              <div>
                <div className="font-bold text-[#121c2c]">Unduh Kode Proyek StepVerse Terbaru (.zip)</div>
                <div className="text-xs text-[#464555] mt-0.5 leading-relaxed">
                  Unduh seluruh kode sumber terbaru untuk dijalankan di VS Code (<code className="font-mono bg-[#f4fbff] px-1 rounded">npm install</code> lalu <code className="font-mono bg-[#f4fbff] px-1 rounded">npm run dev</code>) atau di-push ke GitHub.
                </div>
              </div>
            </div>
            <a
              href="/api/export/project-zip"
              download="stepverse-updated.zip"
              className="shrink-0 inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold text-white transition hover:brightness-110 active:scale-95 shadow-sm"
              style={{
                background: 'linear-gradient(to bottom, #68b6f7, #253f8a)',
              }}
            >
              📦 Unduh Proyek (.zip)
            </a>
          </div>
        </Card>
      </div>
    </div>
  );
}
