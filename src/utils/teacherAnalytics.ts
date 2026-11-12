import { MATERI_LIST } from '../data/curriculum';
import { StudentRecord } from '../services/studentStorage';

export type CtComponentKey =
  | 'decomposition'
  | 'abstraction'
  | 'algorithm_design'
  | 'debugging'
  | 'iteration'
  | 'generalization';

export interface CtComponentMeta {
  key: CtComponentKey;
  label: string;
  shortLabel: string;
  icon: string;
  desc: string;
  sourceLabel: string;
}

export const CT_COMPONENT_META: CtComponentMeta[] = [
  {
    key: 'decomposition',
    label: 'Dekomposisi',
    shortLabel: 'Decomposition',
    icon: '🧩',
    desc: 'Memecah masalah kasir menjadi tahapan input, hitung, format struk, dan cetak.',
    sourceLabel: 'Tahap Dekomposisi & Pretest/Posttest',
  },
  {
    key: 'abstraction',
    label: 'Abstraksi',
    shortLabel: 'Abstraction',
    icon: '🔭',
    desc: 'Memilah data relevan (nama barang, harga, jumlah) dari informasi pengecoh.',
    sourceLabel: 'Tahap Analisis IPO',
  },
  {
    key: 'algorithm_design',
    label: 'Desain Algoritma',
    shortLabel: 'Algorithm Design',
    icon: '📋',
    desc: 'Menyusun urutan logika penugasan variabel dan cetak struk secara runtut.',
    sourceLabel: 'Tahap Parsons Problem (L1–L3)',
  },
  {
    key: 'debugging',
    label: 'Debugging',
    shortLabel: 'Debugging',
    icon: '🐛',
    desc: 'Mengidentifikasi dan memperbaiki error sintaks maupun logika variabel di Python.',
    sourceLabel: 'Lab Python & Penggunaan Hint',
  },
  {
    key: 'iteration',
    label: 'Iterasi',
    shortLabel: 'Iteration',
    icon: '🔄',
    desc: 'Menguji ulang dan menyempurnakan solusi kode secara bertahap.',
    sourceLabel: 'Frekuensi Uji & Perbaikan di Lab Python',
  },
  {
    key: 'generalization',
    label: 'Generalisasi',
    shortLabel: 'Generalization',
    icon: '🌐',
    desc: 'Menerapkan konsep penamaan & penugasan variabel ke skenario uji tersembunyi.',
    sourceLabel: 'Hidden Test Case Lab & Posttest',
  },
];

export const CT_COMPONENT_BY_KEY: Record<string, CtComponentMeta> = CT_COMPONENT_META.reduce(
  (acc, item) => {
    acc[item.key] = item;
    return acc;
  },
  {} as Record<string, CtComponentMeta>
);

export type StudentLearningStatus = 'Belum Mulai' | 'Sedang Berjalan' | 'Tuntas';

export interface StudentProgressSummary {
  completedStages: number;
  totalStages: number;
  materi1Pct: number;
  pretestDone: boolean;
  posttestDone: boolean;
  status: StudentLearningStatus;
  prePostDelta?: number;
  hasActivity: boolean;
}

const MATERI1_STAGES = MATERI_LIST[0]?.stages ?? [
  'video',
  'ipo',
  'dekomposisi',
  'parsons',
  'lab',
];

/** Cek apakah siswa sudah mulai mengerjakan aktivitas atau evaluasi apa pun. */
export function hasStudentActivity(rec: StudentRecord): boolean {
  if (rec.lastUpdated > 0) return true;
  if (
    rec.scores.pretest !== undefined ||
    rec.scores.ipo !== undefined ||
    rec.scores.dekomposisi !== undefined ||
    rec.scores.parsons !== undefined ||
    rec.scores.lab !== undefined ||
    rec.scores.posttest !== undefined
  ) {
    return true;
  }
  return MATERI1_STAGES.some((stage) => rec.progress[`1-${stage}`] === 'done');
}

/** Ringkas status kemajuan belajar Materi 1 + Pretest/Posttest seorang siswa. */
export function summarizeStudentProgress(rec: StudentRecord): StudentProgressSummary {
  const completedStages = MATERI1_STAGES.filter(
    (stage) => rec.progress[`1-${stage}`] === 'done'
  ).length;
  const totalStages = MATERI1_STAGES.length;
  const materi1Pct = totalStages > 0 ? Math.round((completedStages / totalStages) * 100) : 0;

  const pretestDone = rec.scores.pretest !== undefined;
  const posttestDone = rec.scores.posttest !== undefined || rec.progress['1-posttest'] === 'done';
  const hasActivity = hasStudentActivity(rec);

  let status: StudentLearningStatus = 'Belum Mulai';
  if (completedStages === totalStages && posttestDone) {
    status = 'Tuntas';
  } else if (hasActivity || completedStages > 0 || pretestDone) {
    status = 'Sedang Berjalan';
  }

  const prePostDelta =
    rec.scores.pretest !== undefined && rec.scores.posttest !== undefined
      ? rec.scores.posttest - rec.scores.pretest
      : undefined;

  return {
    completedStages,
    totalStages,
    materi1Pct,
    pretestDone,
    posttestDone,
    status,
    prePostDelta,
    hasActivity,
  };
}

/** Hitung rata-rata hanya untuk siswa yang sudah memiliki nilai pada komponen tersebut. */
export function computeScoredAverage(values: (number | undefined)[]): {
  average: number | null;
  count: number;
} {
  const valid = values.filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
  if (valid.length === 0) return { average: null, count: 0 };
  const sum = valid.reduce((acc, v) => acc + v, 0);
  return { average: Math.round(sum / valid.length), count: valid.length };
}

export interface CtComponentClassMetric {
  meta: CtComponentMeta;
  averageScore: number | null;
  evaluatedCount: number;
  mahirCount: number;
  berkembangCount: number;
  pendampinganCount: number;
  studentsNeedingSupport: { nama: string; kelas: string; score: number }[];
}

export interface ClassCtOverview {
  totalStudents: number;
  activeStudentsCount: number;
  metrics: CtComponentClassMetric[];
}

/** Agregasi skor 6 indikator CT kelas dari siswa yang sudah memiliki data aktivitas nyata. */
export function computeClassCtOverview(records: StudentRecord[]): ClassCtOverview {
  const activeRecords = records.filter((rec) => hasStudentActivity(rec));

  const metrics: CtComponentClassMetric[] = CT_COMPONENT_META.map((meta) => {
    const measured = activeRecords
      .map((rec) => ({
        nama: rec.nama,
        kelas: rec.kelas,
        score: rec.ctScores[meta.key] ?? 0,
      }))
      .filter((entry) => entry.score > 0);

    const averageScore =
      measured.length > 0
        ? Math.round(measured.reduce((acc, item) => acc + item.score, 0) / measured.length)
        : null;

    let mahirCount = 0;
    let berkembangCount = 0;
    let pendampinganCount = 0;
    const studentsNeedingSupport: { nama: string; kelas: string; score: number }[] = [];

    for (const item of measured) {
      if (item.score >= 80) {
        mahirCount++;
      } else if (item.score >= 60) {
        berkembangCount++;
      } else {
        pendampinganCount++;
        studentsNeedingSupport.push(item);
      }
    }

    studentsNeedingSupport.sort((a, b) => a.score - b.score);

    return {
      meta,
      averageScore,
      evaluatedCount: measured.length,
      mahirCount,
      berkembangCount,
      pendampinganCount,
      studentsNeedingSupport,
    };
  });

  return {
    totalStudents: records.length,
    activeStudentsCount: activeRecords.length,
    metrics,
  };
}

export type CsvExportKind = 'lengkap' | 'nilai' | 'ct' | 'profil';

function escapeCsvCell(value: string | number | undefined): string {
  const str = value === undefined ? '-' : String(value);
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/** Buat konten CSV dengan escaping RFC-4180 untuk berbagai kebutuhan laporan guru. */
export function generateStudentsCsv(
  records: StudentRecord[],
  kind: CsvExportKind
): string {
  let headers: string[] = [];
  let rows: (string | number | undefined)[][] = [];

  if (kind === 'profil') {
    headers = ['ID', 'Nama Siswa', 'NISN', 'Kelas', 'Sekolah', 'Status Belajar', 'Progres Materi 1 (%)', 'Aktivitas Terakhir'];
    rows = records.map((rec) => {
      const summary = summarizeStudentProgress(rec);
      return [
        rec.userId,
        rec.nama,
        rec.nisn,
        rec.kelas,
        rec.sekolah,
        summary.status,
        summary.materi1Pct,
        rec.lastActivity,
      ];
    });
  } else if (kind === 'nilai') {
    headers = [
      'Nama Siswa',
      'NISN',
      'Kelas',
      'Nilai Pretest',
      'Nilai IPO',
      'Nilai Dekomposisi',
      'Nilai Parsons',
      'Nilai Lab Python',
      'Nilai Posttest',
      'Rata-Rata Nilai',
      'Selisih Post-Pre',
      'Total Percobaan Lab',
      'Waktu Belajar (Menit)',
    ];
    rows = records.map((rec) => {
      const summary = summarizeStudentProgress(rec);
      return [
        rec.nama,
        rec.nisn,
        rec.kelas,
        rec.scores.pretest ?? '-',
        rec.scores.ipo ?? '-',
        rec.scores.dekomposisi ?? '-',
        rec.scores.parsons ?? '-',
        rec.scores.lab ?? '-',
        rec.scores.posttest ?? '-',
        rec.scores.average ?? '-',
        summary.prePostDelta !== undefined ? summary.prePostDelta : '-',
        rec.attempts['1-lab'] ?? 0,
        rec.timeOnTaskMinutes,
      ];
    });
  } else if (kind === 'ct') {
    headers = [
      'Nama Siswa',
      'NISN',
      'Kelas',
      'Status Aktivitas',
      'Dekomposisi (%)',
      'Abstraksi (%)',
      'Desain Algoritma (%)',
      'Debugging (%)',
      'Iterasi (%)',
      'Generalisasi (%)',
    ];
    rows = records.map((rec) => {
      const summary = summarizeStudentProgress(rec);
      return [
        rec.nama,
        rec.nisn,
        rec.kelas,
        summary.status,
        rec.ctScores.decomposition,
        rec.ctScores.abstraction,
        rec.ctScores.algorithm_design,
        rec.ctScores.debugging,
        rec.ctScores.iteration,
        rec.ctScores.generalization,
      ];
    });
  } else {
    headers = [
      'ID',
      'Nama Siswa',
      'NISN',
      'Kelas',
      'Sekolah',
      'Status Belajar',
      'Progres Materi 1 (%)',
      'Nilai Pretest',
      'Nilai IPO',
      'Nilai Dekomposisi',
      'Nilai Parsons',
      'Nilai Lab Python',
      'Nilai Posttest',
      'Rata-Rata Nilai',
      'Selisih Post-Pre',
      'CT Dekomposisi',
      'CT Abstraksi',
      'CT Desain Algoritma',
      'CT Debugging',
      'CT Iterasi',
      'CT Generalisasi',
      'Waktu Belajar (Menit)',
    ];
    rows = records.map((rec) => {
      const summary = summarizeStudentProgress(rec);
      return [
        rec.userId,
        rec.nama,
        rec.nisn,
        rec.kelas,
        rec.sekolah,
        summary.status,
        summary.materi1Pct,
        rec.scores.pretest ?? '-',
        rec.scores.ipo ?? '-',
        rec.scores.dekomposisi ?? '-',
        rec.scores.parsons ?? '-',
        rec.scores.lab ?? '-',
        rec.scores.posttest ?? '-',
        rec.scores.average ?? '-',
        summary.prePostDelta !== undefined ? summary.prePostDelta : '-',
        rec.ctScores.decomposition,
        rec.ctScores.abstraction,
        rec.ctScores.algorithm_design,
        rec.ctScores.debugging,
        rec.ctScores.iteration,
        rec.ctScores.generalization,
        rec.timeOnTaskMinutes,
      ];
    });
  }

  return [headers, ...rows]
    .map((row) => row.map((cell) => escapeCsvCell(cell)).join(','))
    .join('\n');
}

/** Unduh string CSV sebagai file di browser. */
export function downloadCsvFile(filename: string, csvContent: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

