export type PblStage =
  | 'video'
  | 'ipo'
  | 'dekomposisi'
  | 'parsons'
  | 'lab';

export type PausePointType = 'kinesthetic' | 'prediction';
 
export interface PredictionOption {
  id: string;
  label: string;
  isCorrect: boolean;
  feedback: string;
}

export interface PredictionContent {
  context?: string;
  question: string;
  options: [PredictionOption, PredictionOption];
}

export interface PausePoint {
  id: string;
  time: number;
  type: PausePointType;
  optional?: boolean;
  title?: string;
  prediction?: PredictionContent;
}

export interface Materi {
  id: number;
  judul: string;
  deskripsi: string;
  stages: PblStage[];
  locked: boolean;
  videoSrc?: string;
  pausePoints?: PausePoint[];
}

export const MATERI_LIST: Materi[] = [
  {
    id: 1,
    judul: 'Variabel, Penugasan Nilai & Tipe Data',
    deskripsi:
      'Menyimpan data ke dalam variabel, melakukan penugasan nilai, dan memahami tipe data dasar Python (String, Integer, Float, Boolean).',
    stages: ['video', 'ipo', 'dekomposisi', 'parsons', 'lab'],
    locked: false,
    videoSrc: '/video/materi fiks.mp4',
    pausePoints: [
      {
        // Klip S1-15 selesai memberi instruksi simulasi tepat pada detik 149 (02:29), sebelum segmen berikutnya dimulai (02:30)
        id: 'm1-kinesthetic',
        time: 149,
        type: 'kinesthetic',
        title: 'Aktivitas Kinestetik (Unplugged Break)',
      },
      {
        // Klip S2-05 ("Menurutmu, isi kotak total harga sekarang yang mana?") dimulai pada detik 184.53 (03:04) + 2s
        id: 'm1-prediction',
        time: 186.5,
        type: 'prediction',
        optional: false,
        title: 'Prediksi Konsep: Nilai Kotak Total Harga',
        prediction: {
          context:
            'Pembeli menambah 1 porsi sehingga kotak wadah jumlah diganti isinya, tetapi perhitungan total_harga belum dijalankan ulang.',
          question: 'Menurutmu, isi kotak total_harga saat ini yang mana?',
          options: [
            {
              id: '16000',
              label: '16000',
              isCorrect: true,
              feedback:
                'Tepat! Nilai di dalam kotak total_harga saat ini tetap 16000 karena mengubah isi kotak jumlah tidak otomatis mengubah isi kotak total_harga yang sudah tersimpan sebelum dihitung dan dimasukkan ulang.',
            },
            {
              id: '24000',
              label: '24000',
              isCorrect: false,
              feedback:
                'Belum tepat di memori komputer! Meskipun pesanan bertambah, isi kotak total_harga tetap 16000 sampai komputer menjalankan ulang perhitungan dan memasukkannya kembali ke kotak total_harga.',
            },
          ],
        },
      },
    ],
  },
  {
    id: 2,
    judul: 'Operator dalam Python',
    deskripsi: 'Mengenal operator aritmatika (+, -, *, /, //, %, **), perbandingan, dan logika dalam Python.',
    stages: ['video', 'ipo', 'dekomposisi', 'parsons', 'lab'],
    locked: true,
  },
  {
    id: 3,
    judul: 'Pseudocode & Rancangan Algoritma',
    deskripsi: 'Merancang langkah-langkah penyelesaian masalah secara terstruktur.',
    stages: ['video', 'ipo', 'dekomposisi', 'parsons', 'lab'],
    locked: true,
  },
  {
    id: 4,
    judul: 'Percabangan (If-Elif-Else)',
    deskripsi: 'Membuat keputusan dalam program menggunakan kondisi.',
    stages: ['video', 'ipo', 'dekomposisi', 'parsons', 'lab'],
    locked: true,
  },
  {
    id: 5,
    judul: 'Perulangan (While & For)',
    deskripsi: 'Mengulang instruksi dengan While dan For loop.',
    stages: ['video', 'ipo', 'dekomposisi', 'parsons', 'lab'],
    locked: true,
  },
];

export const STAGE_LABELS: Record<PblStage, string> = {
  video: 'Orientasi Video',
  ipo: 'Analisis IPO',
  dekomposisi: 'Dekomposisi',
  parsons: 'Parsons Problem',
  lab: 'Lab Python',
};
