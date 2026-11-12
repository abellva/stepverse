# 🎬 Panduan Demonstrasi Seminar Proposal (Sempro) StepVerse
**Durasi Rekomendasi:** 5 – 7 Menit  
**Target Audiens:** Dosen Pembimbing & Penguji Seminar Proposal Skripsi / Tesis  
**Topik:** Pengembangan Modul Problem-Based Learning (PBL) Berbantuan StepVerse untuk Meningkatkan *Computational Thinking* (CT) Siswa SMA pada Materi Pemrograman Python (Fase E Kurikulum Merdeka)

---

## 🎯 Poin Kunci yang Perlu Ditekankan ke Penguji
1. **Pendekatan Pedagogis PBL Kontekstual**: Kasus nyata *"Kasir Kantin Bu Ani"* memandu seluruh tahapan pembelajaran, bukan sekadar teori sintaks Python abstrak.
2. **Pemetaan Komponen Computational Thinking (Shute et al., 2017)**:
   - *Orientasi Video 3D & Jeda Kinestetik* → Abstraksi & Dekomposisi Awal
   - *Analisis IPO* → Abstraksi Masalah (Memilah variabel penting vs pengecoh)
   - *Dekomposisi Berurutan* → Dekomposisi Masalah (Memecah 4 tahap kasir)
   - *Parsons Problem (Scaffolding Fading L1–L3)* → Desain Algoritma
   - *Lab Python (CodeMirror + Pyodide Offline)* → Debugging, Iterasi, & Generalisasi
   - *Dasbor Guru* → Pemantauan formatif proses belajar (*formative monitoring*)
3. **Kemandirian Offline**: Eksekusi Python berjalan 100% di browser siswa via Pyodide WebAssembly tanpa server backend berat atau ketergantungan koneksi internet sekolah yang labil.

---

## ⏱️ Skenario Demonstrasi Langkah demi Langkah (5–7 Menit)

### Menit 0:00 – 0:45 | Pengenalan & Masuk Sistem
- **URL**: `http://localhost:8443/masuk?demo=1`
- **Tindakan**:
  1. Tampilkan halaman login bergaya *claymorphic*.
  2. Tunjukkan pemilihan peran **Siswa** vs **Guru**.
  3. Masuk dengan akun demo siswa (klik tombol *"Masuk ke Ruang Belajar"*).
- **Narasi**:
  > *"Bapak/Ibu penguji, ini adalah halaman masuk StepVerse. Desain antarmuka disesuaikan dengan psikologi visual siswa Fase E SMA. Sistem ini mendukung akun Siswa untuk belajar mandiri dan akun Guru untuk monitoring formatif."*

---

### Menit 0:45 – 1:45 | Beranda & Orientasi Kasus Video dengan Jeda Kinestetik
- **URL**: `http://localhost:8443/materi/1/video?demo=1`
- **Tindakan**:
  1. Dari Beranda, klik *"Mulai Belajar"* pada Materi 1 (Variabel & Penugasan). Materi 2–5 tampil terkunci rapi (*scoping*).
  2. Di halaman video, klik *"▶ Putar Simulasi Tontonan Video"*.
  3. Perhatikan: Tepat pada progres **50%**, video otomatis dijeda untuk **Istirahat Kinestetik (*Kinesthetic Break*)**.
  4. Buka panel simulasi: tunjukkan timer 5 menit, peran berpasangan *Programmer & Komputer*, serta checklist tugas.
  5. Centang checklist / klik *"Ronde 1 Tuntas → Tukar Peran"* lalu tuntaskan simulasi.
  6. Lanjutkan video hingga mencapai **≥ 95%**, tombol *"Saya sudah paham masalahnya"* aktif.
- **Narasi**:
  > *"Di tahap orientasi, siswa diajak memahami masalah kantin Bu Ani. Sesuai prinsip kinesthetic break, di tengah video siswa diminta berpasangan mensimulasikan aliran instruksi secara unplugged sebelum menulis kode di komputer. Tombol lanjut hanya terbuka setelah video ditonton minimal 95%."*

---

### Menit 1:45 – 2:45 | Analisis IPO & Dekomposisi
- **URL**: `http://localhost:8443/materi/1/ipo?demo=1` lalu `http://localhost:8443/materi/1/dekomposisi?demo=1`
- **Tindakan**:
  1. **Di halaman IPO**: Tempatkan kartu `nama_barang`, `harga_satuan`, `jumlah` ke **Input**; `hitung_total`, `cetak_struk` ke **Proses**; `total_harga`, `struk` ke **Output**.
  2. Klik *"Periksa Jawaban"*: sistem memberikan umpan balik langsung (✅/❌) dalam Bahasa Indonesia.
  3. Lanjut ke halaman **Dekomposisi**: Demonstrasikan fitur **Drag-and-Drop** atau klik kartu untuk menempatkan 4 langkah berurutan.
  4. Tunjukkan adanya 2 kartu pengecoh (*distractor*): `Simpan ke database server` dan `Minta login password`.
  5. Klik *"Periksa Susunan Langkah"*, jika tepat tombol lanjut ke Parsons Problem terbuka.
- **Narasi**:
  > *"Pada tahap IPO dan Dekomposisi, kita melatih komponen Abstraksi dan Dekomposisi. Siswa belajar memilah informasi penting dan menyusun 4 alur kasir yang logis sembari menyaring kartu pengecoh."*

---

### Menit 2:45 – 4:15 | Parsons Problem (*Scaffolding Fading*)
- **URL**: `http://localhost:8443/materi/1/parsons?demo=1`
- **Tindakan**:
  1. **Level 1**: Tunjukkan penyusunan potongan baris kode utuh yang diacak + distractor tipe data string.
  2. **Level 2**: Tunjukkan peluruhan bantuan (*fading*): baris kode kini memiliki bagian kosong (*blanks*) yang harus diisi siswa.
  3. **Level 3**: Bantuan memudar seutuhnya (*faded*), menampilkan rancangan program utuh siap dieksekusi di Lab.
  4. Klik *"💻 Buka Lab Python Sekarang"*.
- **Narasi**:
  > *"Untuk melatih Desain Algoritma tanpa membebani kognitif siswa dengan syntax error di awal, StepVerse mengadopsi Parsons Problem dengan 3 tingkat scaffolding fading. Bantuan dikurangi perlahan hingga siswa siap menulis kode mandiri."*

---

### Menit 4:15 – 5:45 | Lab Python Mandiri & Test Runner
- **URL**: `http://localhost:8443/materi/1/lab?demo=1`
- **Tindakan**:
  1. Tunjukkan editor kode berbasis CodeMirror 6 dengan syntax highlighting Python.
  2. Klik *"▶ Jalankan Kode"*: Pyodide mengeksekusi Python langsung di Web Worker offline dalam hitungan milidetik, output struk tercetak di terminal hitam.
  3. Tunjukkan proteksi keamanan: *watchdog timer* 5 detik akan memutus eksekusi jika terjadi perulangan tanpa henti (`while True`).
  4. Buat kesalahan sengaja (misal hapus tanda kurung) untuk memperlihatkan **Pesan Error Ramah Bahasa Indonesia** (*Friendly Error Translator*).
  5. Klik *"🪜 Tangga Bantuan"* untuk melihat 3 tingkatan petunjuk.
  6. Klik *"🧪 Kirim & Uji Solusi"*: Tunjukkan pengujian otomatis yang terdiri dari **3 Kasus Terlihat** dan **2 Kasus Tersembunyi (Uji Generalisasi)**.
- **Narasi**:
  > *"Di Lab Python, siswa mengasah kemampuan Debugging, Iterasi, dan Generalisasi. Program diuji dengan test cases otomatis yang mencakup edge cases tersembunyi untuk membuktikan apakah formula kasir siswa dapat digeneralisasi untuk nilai apa pun."*

---

### Menit 5:45 – 7:00 | Dasbor Monitoring Guru & Penutup
- **URL**: `http://localhost:8443/guru`
- **Tindakan**:
  1. Buka Dasbor Guru.
  2. Tunjukkan tabel perkembangan formatif kelas (progres per tahap, level Parsons, percobaan, lulus uji, waktu belajar).
  3. Klik salah satu siswa (misal *Budi Santoso*) untuk membuka **Drill-down CT**: perlihatkan grafik 6 komponen CT (Dekomposisi, Abstraksi, Algoritma, Debugging, Iterasi, Generalisasi).
  4. Sorot catatan etis penelitian: *"⚠️ Indikator perilaku, bukan pengukuran tervalidasi"*.
  5. Klik *"📥 Ekspor CSV"* untuk mengunduh laporan formatif ke file Excel/CSV.
- **Narasi**:
  > *"Terakhir, guru memiliki akses ke dasbor formatif untuk mendiagnosis siswa yang mengalami hambatan belajar secara real-time. Data interaksi dapat diekspor ke CSV untuk analisis data penelitian skripsi."*

---

## 📋 Batasan Prototipe yang Diketahui (*Known Limitations*)
Harap sampaikan secara jujur kepada penguji jika ditanyakan:
1. **Video Placeholder**: Video saat ini menggunakan video player HTML5 dengan simulasi tontonan karena berkas animasi 3D final `public/video/materi fiks.mp4` masih dalam tahap produksi oleh peneliti.
2. **Instrumen Pretest/Posttest Dummy**: Butir soal pada `/tes/awal` dan `/tes/akhir` berlabel *DUMMY* untuk demonstrasi alur sistem dan belum melalui uji validitas dan reliabilitas instrumen penelitian formal.
3. **Penyimpanan Lokal (Tanpa Backend Server)**: Data sesi dan log tersimpan di `localStorage` peramban menggunakan pola *Repository Pattern*. Backend server terpusat akan dikembangkan pada tahap implementasi lapangan jika diperlukan.
4. **Cakupan Materi**: Prototipe fokus penuh pada **Materi 1 (Variabel & Penugasan Nilai)**. Materi 2–5 disiapkan dalam kurikulum dan berstatus *Segera Hadir*.

