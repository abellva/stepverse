import { useCallback, useState } from 'react';
import { getUnifiedStudentSummaries, StudentRecord } from '../../services/studentStorage';
import { summarizeStudentProgress, StudentLearningStatus } from '../../utils/teacherAnalytics';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { KelasFilterToolbar } from '../../components/guru/KelasFilterToolbar';

const STATUS_BADGE_VARIANT: Record<StudentLearningStatus, 'done' | 'active' | 'locked'> = {
  Tuntas: 'done',
  'Sedang Berjalan': 'active',
  'Belum Mulai': 'locked',
};

export default function GuruKelasPage() {
  const [students, setStudents] = useState<StudentRecord[]>(() => getUnifiedStudentSummaries());
  const [selectedKelas, setSelectedKelas] = useState<string>('Semua');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const handleRefresh = useCallback(() => {
    setStudents(getUnifiedStudentSummaries());
  }, []);

  const query = searchQuery.trim().toLowerCase();
  const filtered = students.filter((s) => {
    const matchKelas = selectedKelas === 'Semua' || s.kelas === selectedKelas;
    const matchQuery =
      !query ||
      s.nama.toLowerCase().includes(query) ||
      s.nisn.toLowerCase().includes(query);
    return matchKelas && matchQuery;
  });

  const summaryCounts = filtered.reduce(
    (acc, s) => {
      const st = summarizeStudentProgress(s).status;
      acc[st] += 1;
      return acc;
    },
    { Tuntas: 0, 'Sedang Berjalan': 0, 'Belum Mulai': 0 } as Record<StudentLearningStatus, number>
  );

  return (
    <div className="max-w-6xl mx-auto flex flex-col gap-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#121c2c] mb-1">Daftar Siswa</h1>
          <p className="text-sm text-[#464555]">
            Seluruh akun siswa terdaftar beserta status penyelesaian materi dan aktivitas terbaru.
          </p>
        </div>

        <KelasFilterToolbar
          allStudents={students}
          selectedKelas={selectedKelas}
          onSelectKelas={setSelectedKelas}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onRefresh={handleRefresh}
        />
      </div>

      {/* Ringkasan Status Singkat */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-4 border border-[#bce0fd] bg-gradient-to-br from-white to-[#f4fbff]">
          <span className="text-xs text-[#464555] block">Tuntas Materi & Posttest</span>
          <span className="text-xl font-bold text-green-700">{summaryCounts.Tuntas} Siswa</span>
        </Card>
        <Card className="p-4 border border-[#bce0fd] bg-gradient-to-br from-white to-[#f4fbff]">
          <span className="text-xs text-[#464555] block">Sedang Mengerjakan</span>
          <span className="text-xl font-bold text-[#253f8a]">
            {summaryCounts['Sedang Berjalan']} Siswa
          </span>
        </Card>
        <Card className="p-4 border border-[#bce0fd] bg-gradient-to-br from-white to-[#f4fbff]">
          <span className="text-xs text-[#464555] block">Belum Mulai</span>
          <span className="text-xl font-bold text-[#64748b]">
            {summaryCounts['Belum Mulai']} Siswa
          </span>
        </Card>
      </div>

      <Card className="p-0 overflow-hidden border border-[#bce0fd]">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#f4fbff] border-b border-[#d0ecff] text-[#253f8a] text-xs uppercase tracking-wide">
                <th className="text-left py-3 px-4">Nama Siswa</th>
                <th className="text-left py-3 px-3">NISN</th>
                <th className="text-left py-3 px-3">Kelas</th>
                <th className="text-left py-3 px-3">Sekolah</th>
                <th className="text-left py-3 px-3 min-w-[150px]">Progres Materi 1</th>
                <th className="text-left py-3 px-3">Aktivitas</th>
                <th className="text-left py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#eaf6ff]">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-[#888]">
                    Tidak ada siswa yang sesuai dengan filter saat ini.
                  </td>
                </tr>
              )}
              {filtered.map((s) => {
                const prog = summarizeStudentProgress(s);
                return (
                  <tr key={s.userId} className="hover:bg-[#f8fbff] transition">
                    <td className="py-3 px-4 font-semibold text-[#121c2c]">{s.nama}</td>
                    <td className="py-3 px-3 font-mono text-xs text-[#464555]">{s.nisn}</td>
                    <td className="py-3 px-3 text-xs font-medium text-[#121c2c]">{s.kelas}</td>
                    <td className="py-3 px-3 text-xs text-[#464555]">{s.sekolah}</td>
                    <td className="py-3 px-3">
                      <ProgressBar
                        value={prog.materi1Pct}
                        label={`${prog.completedStages}/${prog.totalStages} tahap`}
                      />
                    </td>
                    <td className="py-3 px-3 text-xs text-[#64748b]">{s.lastActivity}</td>
                    <td className="py-3 px-4">
                      <Badge variant={STATUS_BADGE_VARIANT[prog.status]}>
                        {prog.status}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
