import { describe, it, expect } from 'vitest';
import {
  computeClassCtOverview,
  computeScoredAverage,
  generateStudentsCsv,
  hasStudentActivity,
  summarizeStudentProgress,
} from '../teacherAnalytics';
import { StudentRecord } from '../../services/studentStorage';

function makeStudent(overrides: Partial<StudentRecord> = {}): StudentRecord {
  return {
    userId: 'siswa-test',
    nisn: '0070000001',
    nama: 'Siswa Uji',
    kelas: 'X MIPA 1',
    sekolah: 'SMAN 1 Nusantara',
    progress: { '1-video': 'active' },
    answers: {},
    attempts: {},
    scores: {},
    ctScores: {
      decomposition: 0,
      abstraction: 0,
      algorithm_design: 0,
      debugging: 0,
      iteration: 0,
      generalization: 0,
    },
    timeOnTaskMinutes: 0,
    lastActivity: 'Belum Mulai',
    lastUpdated: 0,
    ...overrides,
  };
}

describe('teacherAnalytics', () => {
  it('detects student activity and summarizes stage completion accurately', () => {
    const idleStudent = makeStudent();
    expect(hasStudentActivity(idleStudent)).toBe(false);
    expect(summarizeStudentProgress(idleStudent)).toEqual({
      completedStages: 0,
      totalStages: 5,
      materi1Pct: 0,
      pretestDone: false,
      posttestDone: false,
      status: 'Belum Mulai',
      prePostDelta: undefined,
      hasActivity: false,
    });

    const activeStudent = makeStudent({
      progress: {
        '1-video': 'done',
        '1-ipo': 'done',
      },
      scores: { pretest: 60, ipo: 100 },
      lastUpdated: 1000,
    });
    expect(hasStudentActivity(activeStudent)).toBe(true);
    expect(summarizeStudentProgress(activeStudent)).toMatchObject({
      completedStages: 2,
      totalStages: 5,
      materi1Pct: 40,
      pretestDone: true,
      posttestDone: false,
      status: 'Sedang Berjalan',
    });

    const completedStudent = makeStudent({
      progress: {
        '1-video': 'done',
        '1-ipo': 'done',
        '1-dekomposisi': 'done',
        '1-parsons': 'done',
        '1-lab': 'done',
      },
      scores: { pretest: 60, posttest: 95 },
      lastUpdated: 2000,
    });
    expect(summarizeStudentProgress(completedStudent)).toMatchObject({
      completedStages: 5,
      totalStages: 5,
      materi1Pct: 100,
      pretestDone: true,
      posttestDone: true,
      status: 'Tuntas',
      prePostDelta: 35,
    });
  });

  it('computes average only across scored students', () => {
    expect(computeScoredAverage([undefined, undefined])).toEqual({
      average: null,
      count: 0,
    });
    expect(computeScoredAverage([80, undefined, 60, undefined])).toEqual({
      average: 70,
      count: 2,
    });
  });

  it('aggregates class CT metrics excluding unstarted students and flags low scorers', () => {
    const idle = makeStudent({ userId: 's1', nama: 'Belum Mulai' });
    const mahir = makeStudent({
      userId: 's2',
      nama: 'Kai',
      lastUpdated: 100,
      ctScores: {
        decomposition: 90,
        abstraction: 85,
        algorithm_design: 90,
        debugging: 85,
        iteration: 80,
        generalization: 90,
      },
    });
    const butuhBantu = makeStudent({
      userId: 's3',
      nama: 'Rizky',
      lastUpdated: 200,
      ctScores: {
        decomposition: 50,
        abstraction: 70,
        algorithm_design: 55,
        debugging: 45,
        iteration: 70,
        generalization: 65,
      },
    });

    const overview = computeClassCtOverview([idle, mahir, butuhBantu]);
    expect(overview.totalStudents).toBe(3);
    expect(overview.activeStudentsCount).toBe(2);

    const dekomMetric = overview.metrics.find((m) => m.meta.key === 'decomposition');
    expect(dekomMetric?.averageScore).toBe(70); // (90 + 50) / 2
    expect(dekomMetric?.evaluatedCount).toBe(2);
    expect(dekomMetric?.mahirCount).toBe(1);
    expect(dekomMetric?.pendampinganCount).toBe(1);
    expect(dekomMetric?.studentsNeedingSupport[0]?.nama).toBe('Rizky');
  });

  it('generates properly escaped CSV outputs for all export kinds', () => {
    const student = makeStudent({
      nama: 'Budi, "Santoso"',
      scores: {
        pretest: 60,
        ipo: 100,
        posttest: 100,
        average: 87,
      },
      progress: {
        '1-video': 'done',
        '1-ipo': 'done',
      },
      lastUpdated: 500,
    });

    const nilaiCsv = generateStudentsCsv([student], 'nilai');
    expect(nilaiCsv).toContain('Nama Siswa,NISN,Kelas,Nilai Pretest');
    expect(nilaiCsv).toContain('"Budi, ""Santoso"""');
    expect(nilaiCsv).toContain(',60,100,-,-,-,100,87,40,');

    const ctCsv = generateStudentsCsv([student], 'ct');
    expect(ctCsv).toContain('Dekomposisi (%),Abstraksi (%)');

    const lengkapCsv = generateStudentsCsv([student], 'lengkap');
    expect(lengkapCsv.split('\n')).toHaveLength(2);
  });
});

