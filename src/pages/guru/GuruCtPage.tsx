import { useCallback, useState } from 'react';
import { getUnifiedStudentSummaries, StudentRecord } from '../../services/studentStorage';
import { computeClassCtOverview } from '../../utils/teacherAnalytics';
import { Card } from '../../components/ui/Card';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { KelasFilterToolbar } from '../../components/guru/KelasFilterToolbar';

export default function GuruCtPage() {
  const [students, setStudents] = useState<StudentRecord[]>(() => getUnifiedStudentSummaries());
  const [selectedKelas, setSelectedKelas] = useState<string>('Semua');

  const handleRefresh = useCallback(() => {
    setStudents(getUnifiedStudentSummaries());
  }, []);

  const filtered =
    selectedKelas === 'Semua'
      ? students
      : students.filter((s) => s.kelas === selectedKelas);

  const overview = computeClassCtOverview(filtered);

  return (
    <div className="max-w-6xl mx-auto flex flex-col gap-6">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#121c2c] mb-1">Indikator CT</h1>
          <div className="inline-block text-xs font-semibold text-amber-800 bg-amber-100 border border-amber-300 rounded-full px-3 py-1 mb-2">
            ⚠️ Indikator perilaku formatif — bukan pengukuran psikometrik tervalidasi (Shute et al., 2017)
          </div>
          <p className="text-sm text-[#464555]">
            Agregasi enam komponen Computational Thinking kelas dari aktivitas nyata siswa selama menggunakan StepVerse.
          </p>
        </div>

        <KelasFilterToolbar
          allStudents={students}
          selectedKelas={selectedKelas}
          onSelectKelas={setSelectedKelas}
          onRefresh={handleRefresh}
        />
      </div>

      {/* Ringkasan Cakupan Pengukuran Kelas */}
      <div className="p-4 rounded-2xl bg-[#f4fbff] border border-[#bce0fd] flex flex-wrap items-center justify-between gap-3 text-xs text-[#253f8a]">
        <div>
          <span className="font-bold">Cakupan Aktivitas CT:</span>{' '}
          <strong>{overview.activeStudentsCount}</strong> dari{' '}
          <strong>{overview.totalStudents} siswa</strong>{' '}
          {selectedKelas === 'Semua' ? '(Semua Kelas)' : `(${selectedKelas})`} sudah memiliki rekam aktivitas terukur.
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[11px]">
          <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold">
            Mahir ≥ 80%
          </span>
          <span className="px-2.5 py-0.5 rounded-full bg-sky-100 text-sky-800 font-semibold">
            Berkembang 60–79%
          </span>
          <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 font-semibold">
            Perlu Pendampingan &lt; 60%
          </span>
        </div>
      </div>

      {/* Kartu 6 Komponen CT */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {overview.metrics.map(({ meta, averageScore, evaluatedCount, mahirCount, berkembangCount, pendampinganCount, studentsNeedingSupport }) => (
          <Card key={meta.key} className="flex flex-col gap-3 border border-[#bce0fd]">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{meta.icon}</span>
                <div>
                  <h2 className="font-bold text-[#121c2c] leading-tight">{meta.label}</h2>
                  <span className="text-[11px] text-[#64748b]">{meta.shortLabel}</span>
                </div>
              </div>
              <span className="text-sm font-mono font-bold px-2.5 py-0.5 rounded-full bg-[#eaf6ff] text-[#253f8a] border border-[#bce0fd]">
                {averageScore !== null ? `${averageScore}%` : '-'}
              </span>
            </div>

            <p className="text-xs text-[#464555] leading-relaxed">{meta.desc}</p>

            <ProgressBar
              value={averageScore ?? 0}
              label={`Rata-rata (${evaluatedCount} siswa terukur)`}
            />

            <div className="grid grid-cols-3 gap-1.5 text-center text-[11px]">
              <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900">
                <div className="font-bold text-sm">{mahirCount}</div>
                <div>Mahir</div>
              </div>
              <div className="p-2 rounded-xl bg-sky-50 border border-sky-200 text-sky-900">
                <div className="font-bold text-sm">{berkembangCount}</div>
                <div>Berkembang</div>
              </div>
              <div className="p-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-900">
                <div className="font-bold text-sm">{pendampinganCount}</div>
                <div>Perlu Bantu</div>
              </div>
            </div>

            {studentsNeedingSupport.length > 0 && (
              <div className="text-[11px] text-amber-900 bg-amber-50/70 border border-amber-200 rounded-xl p-2.5">
                <span className="font-bold block mb-0.5">Perlu pendampingan:</span>
                {studentsNeedingSupport
                  .slice(0, 3)
                  .map((st) => `${st.nama} (${st.score}%)`)
                  .join(', ')}
              </div>
            )}

            <div className="text-[11px] text-[#64748b] mt-auto pt-2 border-t border-[#eaf6ff]">
              Sumber: {meta.sourceLabel}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
