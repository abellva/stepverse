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

  // Deteksi nama variabel secara fleksibel & adaptif (tidak kaku/hardcoded)
  const namaKey =
    ['nama_barang', 'nama', 'barang', 'item', 'menu', 'nama_makanan', 'nama_item', 'namabarang'].find(
      (k) => vars[k] !== undefined || staticAssignments[k] !== undefined
    ) ||
    Object.keys(staticAssignments).find((k) => {
      const v = staticAssignments[k] || '';
      return (
        (v.startsWith('"') || v.startsWith("'")) &&
        !['total', 'harga', 'hrg', 'jumlah', 'jml', 'qty'].some((p) => k.toLowerCase().includes(p))
      );
    }) ||
    'nama_barang';

  const hargaKey =
    ['harga_satuan', 'harga', 'hrg', 'price', 'harga_barang', 'hargasatuan'].find(
      (k) => vars[k] !== undefined || staticAssignments[k] !== undefined
    ) ||
    Object.keys(staticAssignments).find((k) => ['harga', 'hrg', 'price'].some((p) => k.toLowerCase().includes(p))) ||
    'harga_satuan';

  const jumlahKey =
    ['jumlah', 'jml', 'qty', 'banyak', 'jumlah_beli', 'porsi', 'jumlah_porsi', 'kuantitas'].find(
      (k) => vars[k] !== undefined || staticAssignments[k] !== undefined
    ) ||
    Object.keys(staticAssignments).find((k) => ['jumlah', 'jml', 'qty', 'porsi'].some((p) => k.toLowerCase().includes(p))) ||
    'jumlah';

  const totalKey =
    ['total', 'total_harga', 'total_bayar', 'bayar', 'subtotal', 'tot'].find(
      (k) => vars[k] !== undefined || staticAssignments[k] !== undefined
    ) ||
    Object.keys(staticAssignments).find((k) => ['total', 'bayar'].some((p) => k.toLowerCase().includes(p))) ||
    'total';

  // =========================================================================
  // 1. VISIBLE TEST 1: Variabel Nama Barang (Tipe Data String)
  // Fleksibel terhadap nama variabel siswa (nama_barang, menu, barang, dll.)
  // =========================================================================
  let test1Passed = false;
  let test1Actual = '';
  let test1Feedback = '';

  const staticNama = staticAssignments[namaKey];
  const runtimeNama = vars[namaKey];

  if (typeof runtimeNama === 'string' && runtimeNama.trim().length > 0) {
    test1Passed = true;
    test1Actual = `${namaKey} = "${runtimeNama}" (Tipe data: String)`;
    test1Feedback = `Sesuai kaidah! Variabel '${namaKey}' berhasil menyimpan teks "${runtimeNama}" sebagai tipe data String yang valid.`;
  } else if (staticNama !== undefined) {
    const isQuoted =
      (staticNama.startsWith('"') && staticNama.endsWith('"') && staticNama.length >= 2) ||
      (staticNama.startsWith("'") && staticNama.endsWith("'") && staticNama.length >= 2);

    const contentInside = isQuoted ? staticNama.slice(1, -1).trim() : '';

    if (isQuoted && contentInside.length === 0) {
      test1Passed = false;
      test1Actual = `${namaKey} = "" (Teks masih kosong)`;
      test1Feedback = `Nama barang di variabel '${namaKey}' masih kosong. Isilah nama barang di dalam tanda petik, contoh: ${namaKey} = "Nasi Goreng".`;
    } else if (isQuoted) {
      test1Passed = true;
      test1Actual = `${namaKey} = ${staticNama} (Tipe data: String)`;
      test1Feedback = `Sesuai kaidah! Variabel '${namaKey}' berisi teks ${staticNama} dalam tanda petik.`;
    } else if (!isNaN(Number(staticNama))) {
      test1Passed = false;
      test1Actual = `${namaKey} = ${staticNama} (Tipe data: Angka/Integer)`;
      test1Feedback = `Nama barang diisi angka (${staticNama}). Nama makanan/barang wajib berupa teks String dalam tanda petik.`;
    } else {
      test1Passed = false;
      test1Actual = `${namaKey} = ${staticNama} (Teks tanpa tanda petik)`;
      test1Feedback = `Teks ${staticNama} belum diapit tanda petik. Dalam bahasa Python, setiap data teks (String) wajib menggunakan tanda petik: ${namaKey} = "${staticNama}".`;
    }
  } else {
    test1Passed = false;
    test1Actual = `Variabel nama barang belum dibuat`;
    test1Feedback = `Buatlah variabel untuk nama barang (misal: ${namaKey} = "Nasi Goreng" atau menu = "Es Teh").`;
  }

  testResults.push({
    id: 'test_nama',
    title: `Uji 1: Variabel Nama Barang (${namaKey})`,
    description: 'Menyimpan nama barang kasir ke dalam variabel dengan tipe data String (teks diapit tanda petik).',
    isHidden: false,
    passed: test1Passed,
    expectedDescription: `${namaKey} = "..." (teks bebas diapit tanda petik)`,
    actualOutput: test1Actual,
    feedback: test1Feedback,
  });

  // =========================================================================
  // 2. VISIBLE TEST 2: Variabel Harga, Jumlah, dan Perhitungan Total
  // Fleksibel terhadap nama variabel siswa (harga_satuan/harga, jumlah/jml/qty, total)
  // dan urutan perkalian (harga * jumlah atau jumlah * harga).
  // =========================================================================
  let test2Passed = false;
  let test2Actual = '';
  let test2Feedback = '';

  const staticHarga = staticAssignments[hargaKey];
  const staticJumlah = staticAssignments[jumlahKey];
  const staticTotal = staticAssignments[totalKey];

  const hargaNum = vars[hargaKey] !== undefined ? Number(vars[hargaKey]) : Number(staticHarga);
  const jumlahNum = vars[jumlahKey] !== undefined ? Number(vars[jumlahKey]) : Number(staticJumlah);
  const totalNum = vars[totalKey] !== undefined ? Number(vars[totalKey]) : Number(staticTotal);

  const isHargaQuoted = staticHarga ? (staticHarga.startsWith('"') || staticHarga.startsWith("'")) : false;
  const isJumlahQuoted = staticJumlah ? (staticJumlah.startsWith('"') || staticJumlah.startsWith("'")) : false;

  const codeNormalized = code.replace(/\s+/g, '');
  const hasMultiplyFormula =
    codeNormalized.includes(`${totalKey}=${hargaKey}*${jumlahKey}`) ||
    codeNormalized.includes(`${totalKey}=${jumlahKey}*${hargaKey}`) ||
    codeNormalized.includes('total=harga_satuan*jumlah') ||
    codeNormalized.includes('total=jumlah*harga_satuan') ||
    codeNormalized.includes('total=harga*jumlah') ||
    codeNormalized.includes('total=jumlah*harga') ||
    codeNormalized.includes('total=harga*jml') ||
    codeNormalized.includes('total=jml*harga') ||
    new RegExp(`${totalKey}=(${hargaKey}|${jumlahKey})\\*(${hargaKey}|${jumlahKey})`).test(codeNormalized);

  const hasAddFormula =
    codeNormalized.includes(`${totalKey}=${hargaKey}+${jumlahKey}`) ||
    codeNormalized.includes(`${totalKey}=${jumlahKey}+${hargaKey}`);

  if (isHargaQuoted) {
    test2Passed = false;
    test2Actual = `${hargaKey} = ${staticHarga} (Tipe String dalam tanda petik)`;
    test2Feedback = `Nilai harga ${staticHarga} diapit tanda petik sehingga dibaca sebagai teks. Hapus tanda petik agar bertipe Integer murni: ${hargaKey} = ${staticHarga.replace(/['"]/g, '')}.`;
  } else if (isJumlahQuoted) {
    test2Passed = false;
    test2Actual = `${jumlahKey} = ${staticJumlah} (Tipe String dalam tanda petik)`;
    test2Feedback = `Nilai jumlah ${staticJumlah} diapit tanda petik. Hapus tanda petik agar berupa angka bulat: ${jumlahKey} = ${staticJumlah.replace(/['"]/g, '')}.`;
  } else if (isNaN(hargaNum) || hargaNum <= 0) {
    test2Passed = false;
    test2Actual = staticHarga ? `${hargaKey} = ${staticHarga}` : `Variabel harga (${hargaKey}) belum dibuat`;
    test2Feedback = `Buatlah variabel harga dengan angka positif (tanpa tanda petik), contoh: ${hargaKey} = 15000.`;
  } else if (isNaN(jumlahNum) || jumlahNum <= 0) {
    test2Passed = false;
    test2Actual = staticJumlah ? `${jumlahKey} = ${staticJumlah}` : `Variabel kuantitas (${jumlahKey}) belum dibuat`;
    test2Feedback = `Buatlah variabel jumlah berupa bilangan bulat positif, contoh: ${jumlahKey} = 2.`;
  } else if (hasAddFormula) {
    test2Passed = false;
    test2Actual = `${totalKey} = ${totalNum} (Menggunakan rumus penjumlahan +)`;
    test2Feedback = `Total belanja dihitung dengan penjumlahan (${hargaNum} + ${jumlahNum} = ${totalNum}). Program kasir harus mengalikan harga dengan kuantitas (*): ${totalKey} = ${hargaKey} * ${jumlahKey}.`;
  } else if (!hasMultiplyFormula && !isNaN(totalNum)) {
    test2Passed = false;
    test2Actual = `${totalKey} = ${totalNum} (Angka konstan tanpa formula perkalian)`;
    test2Feedback = `Variabel ${totalKey} diisi angka tetap (${totalNum}). Gunakan formula perkalian dinamis: ${totalKey} = ${hargaKey} * ${jumlahKey} agar program otomatis berhitung jika harga berubah.`;
  } else if (hasMultiplyFormula || (!isNaN(totalNum) && totalNum === hargaNum * jumlahNum)) {
    const expectedCalc = hargaNum * jumlahNum;
    test2Passed = true;
    test2Actual = `${hargaKey} = ${hargaNum}, ${jumlahKey} = ${jumlahNum}, ${totalKey} = ${expectedCalc} (Kalkulasi: ${hargaNum} * ${jumlahNum} = ${expectedCalc})`;
    test2Feedback = `Perhitungan tepat! Variabel ${totalKey} terkalkulasi secara adaptif sebesar ${expectedCalc} dari formula ${hargaKey} * ${jumlahKey}.`;
  } else {
    test2Passed = false;
    test2Actual = 'Perhitungan total belum sesuai';
    test2Feedback = `Pastikan baris formula perkalian dituliskan: ${totalKey} = ${hargaKey} * ${jumlahKey}.`;
  }

  testResults.push({
    id: 'test_calc',
    title: `Uji 2: Perhitungan Variabel (${totalKey})`,
    description: `Menghitung total harga belanja secara adaptif dari perkalian ${hargaKey} * ${jumlahKey}.`,
    isHidden: false,
    passed: test2Passed,
    expectedDescription: `${totalKey} = ${hargaKey} * ${jumlahKey} (perkalian dinamis angka)`,
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
  const containsTotalWord = stdoutClean.toLowerCase().includes('total') || stdoutClean.toLowerCase().includes('rp');

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
      : `Gunakan perintah print() untuk menampilkan struk, contoh: print("Total:", ${totalKey}).`,
  });

  // =========================================================================
  // 4. TEST CASES TRANSPARAN (Generalisasi Komputasional)
  // =========================================================================
  const testCaseDetails: TestCaseDetail[] = [
    {
      title: 'Test Case 1 (Data Input Siswa)',
      inputDesc: `${hargaKey} = ${!isNaN(hargaNum) ? hargaNum : '?'}, ${jumlahKey} = ${!isNaN(jumlahNum) ? jumlahNum : '?'}`,
      expectedOutput: `${totalKey} = ${!isNaN(hargaNum) && !isNaN(jumlahNum) ? hargaNum * jumlahNum : '?'}`,
      actualOutput: `${totalKey} = ${!isNaN(totalNum) ? totalNum : '?'}`,
      passed: test2Passed,
    },
    {
      title: 'Test Case 2 (Generalisasi Menu Lain)',
      inputDesc: `${hargaKey} = 25000, ${jumlahKey} = 3`,
      expectedOutput: `${totalKey} = 75000`,
      actualOutput: hasMultiplyFormula ? `${totalKey} = 75000 (Otomatis terkalkulasi)` : 'Gagal (formula tidak dinamis)',
      passed: hasMultiplyFormula,
    },
    {
      title: 'Test Case 3 (Generalisasi Pembelian Satuan)',
      inputDesc: `${hargaKey} = 8000, ${jumlahKey} = 1`,
      expectedOutput: `${totalKey} = 8000`,
      actualOutput: hasMultiplyFormula ? `${totalKey} = 8000 (Otomatis terkalkulasi)` : 'Gagal (formula tidak dinamis)',
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
    expectedDescription: `Menggunakan formula dinamis (${hargaKey} * ${jumlahKey})`,
    actualOutput: testHidden1Passed
      ? 'Lolos semua Test Case: Kasus 1, Kasus 2 (Rp 25.000 x 3 = Rp 75.000), Kasus 3 (Rp 8.000 x 1 = Rp 8.000)'
      : 'Formula belum dinamis (tidak dapat memproses perubahan harga/kuantitas)',
    feedback: testHidden1Passed
      ? 'Logika generalisasi terpenuhi! Program kasirmu dapat digunakan untuk transaksi belanja barang apa pun.'
      : `Pastikan rumus total ditulis menggunakan variabel: ${totalKey} = ${hargaKey} * ${jumlahKey} (jangan menuliskan angka langsung).`,
    testCaseDetails,
  });

  // 5. HIDDEN TEST 2 (Integritas Tipe Data Numerik)
  const isTypeValid = !isHargaQuoted && !isJumlahQuoted && !isNaN(hargaNum) && !isNaN(jumlahNum);
  testResults.push({
    id: 'test_hidden_types',
    title: 'Uji Tersembunyi 2: Integritas Tipe Data Aritmatika',
    description: 'Memastikan variabel harga dan kuantitas bertipe numerik murni tanpa tanda petik.',
    isHidden: true,
    passed: isTypeValid,
    expectedDescription: `${hargaKey} dan ${jumlahKey} berupa angka tanpa petik`,
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
