import { useCallback, useState } from 'react';
import { MATERI_LIST } from '../../data/curriculum';
import { getUnifiedStudentSummaries, StudentRecord } from '../../services/studentStorage';
import { summarizeStudentProgress } from '../../utils/teacherAnalytics';
import { Card } from '../../components/ui/Card';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { KelasFilterToolbar } from '../../components/guru/KelasFilterToolbar';

function StepStatusPill({ done, label }: { done: boolean; label: string }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
        done
          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
          : 'bg-slate-50 text-slate-400 border-slate-200'
      }`}
    >
      {done ? '✓' : '·'} {label}
    </span>
  );
}

export default function GuruKemajuanPage() {
  const [students, setStudents] = useState<StudentRecord[]>(() => getUnifiedStudentSummaries());
  const [selectedKelas, setSelectedKelas] = useState<string>('Semua');

  const handleRefresh = useCallback(() => {
    setStudents(getUnifiedStudentSummaries());
  }, []);

  const filtered =
    selectedKelas === 'Semua'
      ? students
      : students.filter((s) => s.kelas === selectedKelas);

  return (
    <div className="max-w-6xl mx-auto flex flex-col gap-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#121c2c] mb-1">Kemajuan Belajar</h1>
          <p className="text-sm text-[#464555]">
            Progres nyata setiap siswa per tahapan pembelajaran (Pretest, Materi 1, hingga Posttest).
          </p>
        </div>

        <KelasFilterToolbar
          allStudents={students}
          selectedKelas={selectedKelas}
          onSelectKelas={setSelectedKelas}
          onRefresh={handleRefresh}
        />
      </div>

      <Card className="p-0 overflow-hidden border border-[#bce0fd]">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#f4fbff] border-b border-[#d0ecff] text-[#253f8a] text-xs uppercase tracking-wide">
                <th className="text-left py-3 px-4">Siswa</th>
                <th className="text-left py-3 px-3 min-w-[260px]">Rincian Tahapan Materi 1</th>
                <th className="text-left py-3 px-3 min-w-[150px]">Progres M1</th>
                {MATERI_LIST.slice(1).map((m) => (
                  <th key={m.id} className="text-center py-3 px-2 min-w-[68px]" title={m.judul}>
                    M{m.id}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#eaf6ff]">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={3 + MATERI_LIST.slice(1).length} className="py-8 text-center text-[#888]">
                    Belum ada data siswa di kelas ini.
                  </td>
                </tr>
              )}
              {filtered.map((rec) => {
                const prog = summarizeStudentProgress(rec);
                const videoDone = rec.progress['1-video'] === 'done';
                const ipoDone = rec.progress['1-ipo'] === 'done' || rec.scores.ipo !== undefined;
                const dekomDone =
                  rec.progress['1-dekomposisi'] === 'done' || rec.scores.dekomposisi !== undefined;
                const parsonsDone =
                  rec.progress['1-parsons'] === 'done' || rec.scores.parsons !== undefined;
                const labDone = rec.progress['1-lab'] === 'done' || rec.scores.lab !== undefined;

                return (
                  <tr key={rec.userId} className="hover:bg-[#f8fbff] transition">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-[#121c2c]">{rec.nama}</div>
                      <div className="text-xs text-[#464555]">
                        {rec.kelas} · {rec.lastActivity}
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex flex-wrap gap-1">
                        <StepStatusPill done={prog.pretestDone} label="Pre" />
                        <StepStatusPill done={videoDone} label="Video" />
                        <StepStatusPill done={ipoDone} label="IPO" />
                        <StepStatusPill done={dekomDone} label="Dekom" />
                        <StepStatusPill done={parsonsDone} label="Parsons" />
                        <StepStatusPill done={labDone} label="Lab" />
                        <StepStatusPill done={prog.posttestDone} label="Post" />
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <ProgressBar value={prog.materi1Pct} label={`${prog.completedStages}/${prog.totalStages} tahap`} />
                    </td>
                    {MATERI_LIST.slice(1).map((m) => (
                      <td key={m.id} className="py-3 px-2 text-center">
                        {m.locked ? (
                          <span className="text-xs text-[#aaa]" title="Materi segera hadir">
                            🔒
                          </span>
                        ) : (
                          <span className="text-xs text-[#464555]">-</span>
                        )}
                      </td>
                    ))}
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
