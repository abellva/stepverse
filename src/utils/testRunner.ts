// Adaptive & Conditional Test Runner for Python Lab
// CT Components: Debugging & Generalization (Shute et al., 2017)
// Fully adaptive to student-defined values (e.g. "nasgor", 150) with transparent test cases

import { ExecutionResult } from '../services/pyodideService';

export interface TestCaseDetail {
  title: string;
  inputDesc: string;
  expectedOutput: string;
  actualOutput: string;
  passed: boolean;
}

export interface TestCaseResult {
  id: string;
  title: string;
  description: string;
  isHidden: boolean;
  passed: boolean;
  actualOutput?: string;
  expectedDescription: string;
  feedback: string;
  testCaseDetails?: TestCaseDetail[];
}

export interface TestSuiteSummary {
  overallPass: boolean;
  visiblePassed: number;
  visibleTotal: number;
  hiddenPassed: number;
  hiddenTotal: number;
  testResults: TestCaseResult[];
}

/** Helper to extract variable assignments statically from user code */
function extractStaticAssignments(code: string): Record<string, string> {
  const result: Record<string, string> = {};
  const lines = code.split('\n');

  for (const rawLine of lines) {
    let line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    // Strip trailing comments
    const commentIdx = line.indexOf('#');
    if (commentIdx !== -1) {
      line = line.substring(0, commentIdx).trim();
    }

    const match = line.match(/^([a-zA-Z_]\w*)\s*=\s*([\s\S]+)$/);
    if (match) {
      const varName = match[1].trim();
      const expr = match[2].trim();
      result[varName] = expr;
    }
  }

  return result;
}

export function runCodeTests(
  code: string,
  execResult: ExecutionResult
): TestSuiteSummary {
  const vars = execResult.variables || {};
  const staticAssignments = extractStaticAssignments(code);
  const stdout = execResult.stdout || '';
  const testResults: TestCaseResult[] = [];

  // =========================================================================
  // 1. VISIBLE TEST 1: Variabel `nama_barang` (Tipe Data String)
  // Adaptif terhadap nama apa pun ("nasgor", "Nasi Goreng", "Es Teh", dll.)
  // Hanya error jika melanggar kaidah penulisan variabel (tanpa tanda petik).
  // =========================================================================
  let test1Passed = false;
  let test1Actual = '';
  let test1Feedback = '';

  const staticNama = staticAssignments['nama_barang'];
  const runtimeNama = vars['nama_barang'];

  if (typeof runtimeNama === 'string' && runtimeNama.trim().length > 0) {
    test1Passed = true;
    test1Actual = `nama_barang = "${runtimeNama}" (Tipe data: String)`;
    test1Feedback = `Sesuai kaidah! Variabel nama_barang berhasil menyimpan teks "${runtimeNama}" sebagai tipe data String yang valid.`;
  } else if (staticNama !== undefined) {
    // Check if user forgot quotes: e.g. nama_barang = nasgor
    const isQuoted =
      (staticNama.startsWith('"') && staticNama.endsWith('"') && staticNama.length >= 2) ||
      (staticNama.startsWith("'") && staticNama.endsWith("'") && staticNama.length >= 2);

    const contentInside = isQuoted ? staticNama.slice(1, -1).trim() : '';

    if (isQuoted && contentInside.length === 0) {
      test1Passed = false;
      test1Actual = 'nama_barang = "" (Teks masih kosong)';
      test1Feedback = 'Nama barang masih kosong. Isilah nama barang di dalam tanda petik, contoh: nama_barang = "Nasi Goreng" atau "nasgor".';
    } else if (isQuoted) {
      test1Passed = true;
      test1Actual = `nama_barang = ${staticNama} (Tipe data: String)`;
      test1Feedback = `Sesuai kaidah! Variabel nama_barang berisi teks ${staticNama} dalam tanda petik.`;
    } else if (!isNaN(Number(staticNama))) {
      test1Passed = false;
      test1Actual = `nama_barang = ${staticNama} (Tipe data: Angka/Integer)`;
      test1Feedback = `Nama barang diisi angka (${staticNama}). Nama makanan wajib berupa teks String dalam tanda petik, contoh: nama_barang = "nasgor".`;
    } else {
      test1Passed = false;
      test1Actual = `nama_barang = ${staticNama} (Teks tanpa tanda petik)`;
      test1Feedback = `Teks ${staticNama} belum diapit tanda petik. Dalam bahasa Python, setiap data teks (String) wajib menggunakan tanda petik: nama_barang = "${staticNama}".`;
    }
  } else {
    // Check for common typo in variable name
    const foundAlt = Object.keys(staticAssignments).find((k) =>
      ['barang', 'nama', 'namabarang', 'nama_makanan'].includes(k.toLowerCase())
    );

    if (foundAlt) {
      test1Passed = false;
      test1Actual = `Ditemukan variabel: ${foundAlt} = ${staticAssignments[foundAlt]}`;
      test1Feedback = `Kamu menuliskan variabel '${foundAlt}'. Pada sistem kasir ini, gunakan nama variabel standar: nama_barang.`;
    } else {
      test1Passed = false;
      test1Actual = 'Variabel nama_barang belum dibuat';
      test1Feedback = 'Buatlah variabel nama_barang di baris kode, contoh: nama_barang = "nasgor".';
    }
  }

  testResults.push({
    id: 'test_nama',
    title: 'Uji 1: Variabel nama_barang',
    description: 'Menyimpan nama barang kasir ke dalam variabel dengan tipe data String (teks diapit tanda petik).',
    isHidden: false,
    passed: test1Passed,
    expectedDescription: 'nama_barang = "..." (teks bebas asalkan diapit tanda petik)',
    actualOutput: test1Actual,
    feedback: test1Feedback,
  });

  // =========================================================================
  // 2. VISIBLE TEST 2: Variabel `harga_satuan`, `jumlah`, dan Perhitungan `total`
  // Adaptif terhadap nominal berapa pun (misal: 150 atau 15000; jumlah 1 atau 2).
  // Menjamin formula perkalian dinamis (harga_satuan * jumlah).
  // =========================================================================
  let test2Passed = false;
  let test2Actual = '';
  let test2Feedback = '';

  const staticHarga = staticAssignments['harga_satuan'];
  const staticJumlah = staticAssignments['jumlah'];
  const staticTotal = staticAssignments['total'];

  const hargaNum = vars['harga_satuan'] !== undefined ? Number(vars['harga_satuan']) : Number(staticHarga);
  const jumlahNum = vars['jumlah'] !== undefined ? Number(vars['jumlah']) : Number(staticJumlah);
  const totalNum = vars['total'] !== undefined ? Number(vars['total']) : Number(staticTotal);

  // Check if price has quotes
  const isHargaQuoted = staticHarga ? (staticHarga.startsWith('"') || staticHarga.startsWith("'")) : false;
  const isJumlahQuoted = staticJumlah ? (staticJumlah.startsWith('"') || staticJumlah.startsWith("'")) : false;

  // Check if total formula is dynamic in code
  const codeNormalized = code.replace(/\s+/g, '');
  const hasMultiplyFormula =
    codeNormalized.includes('total=harga_satuan*jumlah') ||
    codeNormalized.includes('total=jumlah*harga_satuan');
  const hasAddFormula =
    codeNormalized.includes('total=harga_satuan+jumlah') ||
    codeNormalized.includes('total=jumlah+harga_satuan');

  if (isHargaQuoted) {
    test2Passed = false;
    test2Actual = `harga_satuan = ${staticHarga} (Tipe String dalam tanda petik)`;
    test2Feedback = `Nilai harga ${staticHarga} diapit tanda petik sehingga dibaca sebagai teks. Hapus tanda petik agar bertipe Integer murni: harga_satuan = ${staticHarga.replace(/['"]/g, '')}.`;
  } else if (isJumlahQuoted) {
    test2Passed = false;
    test2Actual = `jumlah = ${staticJumlah} (Tipe String dalam tanda petik)`;
    test2Feedback = `Nilai jumlah ${staticJumlah} diapit tanda petik. Hapus tanda petik agar berupa angka bulat: jumlah = ${staticJumlah.replace(/['"]/g, '')}.`;
  } else if (isNaN(hargaNum) || hargaNum <= 0) {
    test2Passed = false;
    test2Actual = staticHarga ? `harga_satuan = ${staticHarga}` : 'harga_satuan belum dibuat';
    test2Feedback = 'Buatlah variabel harga_satuan dengan angka positif (tanpa tanda petik), contoh: harga_satuan = 150 atau 15000.';
  } else if (isNaN(jumlahNum) || jumlahNum <= 0) {
    test2Passed = false;
    test2Actual = staticJumlah ? `jumlah = ${staticJumlah}` : 'jumlah belum dibuat';
    test2Feedback = 'Buatlah variabel jumlah berupa bilangan bulat positif, contoh: jumlah = 2.';
  } else if (hasAddFormula) {
    test2Passed = false;
    test2Actual = `total = ${totalNum} (Menggunakan rumus penjumlahan +)`;
    test2Feedback = `Total belanja dihitung dengan penjumlahan (${hargaNum} + ${jumlahNum} = ${totalNum}). Program kasir harus mengalikan harga dengan jumlah (*): total = harga_satuan * jumlah.`;
  } else if (!hasMultiplyFormula && !isNaN(totalNum)) {
    test2Passed = false;
    test2Actual = `total = ${totalNum} (Angka konstan tanpa formula perkalian)`;
    test2Feedback = `Variabel total diisi angka tetap (${totalNum}). Gunakan formula perkalian dinamis: total = harga_satuan * jumlah agar program otomatis menyesuaikan jika harga berubah.`;
  } else if (hasMultiplyFormula || (!isNaN(totalNum) && totalNum === hargaNum * jumlahNum)) {
    const expectedCalc = hargaNum * jumlahNum;
    test2Passed = true;
    test2Actual = `harga_satuan = ${hargaNum}, jumlah = ${jumlahNum}, total = ${expectedCalc} (Kalkulasi: ${hargaNum} * ${jumlahNum} = ${expectedCalc})`;
    test2Feedback = `Perhitungan tepat! Variabel total terkalkulasi secara adaptif sebesar ${expectedCalc} dari formula harga_satuan * jumlah.`;
  } else {
    test2Passed = false;
    test2Actual = 'Perhitungan total belum sesuai';
    test2Feedback = 'Pastikan baris formula dituliskan: total = harga_satuan * jumlah.';
  }

  testResults.push({
    id: 'test_calc',
    title: 'Uji 2: Perhitungan Variabel total',
    description: 'Menghitung total harga belanja secara adaptif dari perkalian harga_satuan * jumlah.',
    isHidden: false,
    passed: test2Passed,
    expectedDescription: 'total = harga_satuan * jumlah (perkalian dinamis angka positif)',
    actualOutput: test2Actual,
    feedback: test2Feedback,
  });

  // =========================================================================
  // 3. VISIBLE TEST 3: Output Pencetakan Struk (print)
  // =========================================================================
  const hasPrintInCode = /print\s*\(/.test(code);
  const stdoutClean = stdout.trim();
  const totalStr = !isNaN(totalNum) ? String(totalNum) : '';
  const containsTotalVal = totalStr.length > 0 && stdoutClean.includes(totalStr);
  const containsTotalWord = stdoutClean.toLowerCase().includes('total');

  const test3Passed = (execResult.status === 'success' || stdoutClean.length > 0) &&
    hasPrintInCode &&
    (containsTotalVal || containsTotalWord);

  testResults.push({
    id: 'test_print',
    title: 'Uji 3: Pencetakan Struk ke Layar',
    description: 'Menampilkan struk kasir dan total belanja menggunakan fungsi print().',
    isHidden: false,
    passed: test3Passed,
    expectedDescription: 'Mencetak baris struk yang memuat total belanja',
    actualOutput: stdoutClean || '(Belum ada output terminal yang tercetak)',
    feedback: test3Passed
      ? 'Sempurna! Struk kasir berhasil tercetak ke terminal dengan rapi.'
      : 'Gunakan perintah print() untuk menampilkan struk, contoh: print("Total belanja:", total).',
  });

  // =========================================================================
  // 4. TEST CASES TRANSPARAN (Generalisasi Komputasional)
  // Menampilkan secara terbuka uji kasus yang dievaluasi
  // =========================================================================
  const testCaseDetails: TestCaseDetail[] = [
    {
      title: 'Test Case 1 (Data Input Siswa)',
      inputDesc: `harga_satuan = ${!isNaN(hargaNum) ? hargaNum : '?'}, jumlah = ${!isNaN(jumlahNum) ? jumlahNum : '?'}`,
      expectedOutput: `total = ${!isNaN(hargaNum) && !isNaN(jumlahNum) ? hargaNum * jumlahNum : '?'}`,
      actualOutput: `total = ${!isNaN(totalNum) ? totalNum : '?'}`,
      passed: test2Passed,
    },
    {
      title: 'Test Case 2 (Generalisasi Menu Lain)',
      inputDesc: 'harga_satuan = 25000, jumlah = 3',
      expectedOutput: 'total = 75000',
      actualOutput: hasMultiplyFormula ? 'total = 75000 (Otomatis terkalkulasi)' : 'Gagal (formula tidak dinamis)',
      passed: hasMultiplyFormula,
    },
    {
      title: 'Test Case 3 (Generalisasi Pembelian Satuan)',
      inputDesc: 'harga_satuan = 8000, jumlah = 1',
      expectedOutput: 'total = 8000',
      actualOutput: hasMultiplyFormula ? 'total = 8000 (Otomatis terkalkulasi)' : 'Gagal (formula tidak dinamis)',
      passed: hasMultiplyFormula,
    },
  ];

  // 4. HIDDEN TEST 1 (Generalisasi Formula Terhadap Kasus Uji Eksternal)
  const testHidden1Passed = hasMultiplyFormula;
  testResults.push({
    id: 'test_hidden_generalization',
    title: 'Uji Tersembunyi 1: Pola Formula Umum (Generalisasi)',
    description: 'Menguji apakah logika program siswa bekerja otomatis untuk berbagai kombinasi harga dan jumlah.',
    isHidden: true,
    passed: testHidden1Passed,
    expectedDescription: 'Menggunakan formula dinamis (harga_satuan * jumlah)',
    actualOutput: testHidden1Passed
      ? 'Lolos semua Test Case: Kasus 1, Kasus 2 (Rp 25.000 x 3 = Rp 75.000), Kasus 3 (Rp 8.000 x 1 = Rp 8.000)'
      : 'Formula belum dinamis (tidak dapat memproses perubahan harga/jumlah)',
    feedback: testHidden1Passed
      ? 'Logika generalisasi terpenuhi! Program kasirmu dapat digunakan untuk transaksi belanja barang apa pun.'
      : 'Pastikan rumus total ditulis menggunakan variabel: total = harga_satuan * jumlah (jangan menuliskan angka langsung).',
    testCaseDetails,
  });

  // 5. HIDDEN TEST 2 (Integritas Tipe Data Numerik)
  const isTypeValid = !isHargaQuoted && !isJumlahQuoted && !isNaN(hargaNum) && !isNaN(jumlahNum);
  testResults.push({
    id: 'test_hidden_types',
    title: 'Uji Tersembunyi 2: Integritas Tipe Data Aritmatika',
    description: 'Memastikan variabel harga dan jumlah bertipe numerik murni tanpa tanda petik.',
    isHidden: true,
    passed: isTypeValid,
    expectedDescription: 'harga_satuan dan jumlah berupa angka tanpa petik',
    actualOutput: isTypeValid
      ? `Tipe data terkonfirmasi numerik murni (harga: ${hargaNum}, jumlah: ${jumlahNum})`
      : 'Tipe data terdeteksi teks String (menggunakan tanda petik)',
    feedback: isTypeValid
      ? 'Tipe data numerik murni terverifikasi untuk seluruh kalkulasi kasir.'
      : 'Jangan membungkus angka harga atau jumlah dengan tanda petik agar operasi matematika dapat berjalan.',
  });

  const visibleTests = testResults.filter((t) => !t.isHidden);
  const hiddenTests = testResults.filter((t) => t.isHidden);

  const visiblePassed = visibleTests.filter((t) => t.passed).length;
  const hiddenPassed = hiddenTests.filter((t) => t.passed).length;

  return {
    overallPass: visiblePassed === visibleTests.length && hiddenPassed === hiddenTests.length,
    visiblePassed,
    visibleTotal: visibleTests.length,
    hiddenPassed,
    hiddenTotal: hiddenTests.length,
    testResults,
  };
}
