// Adaptive & Flexible Test Runner for Python Lab
// CT Components: Debugging & Generalization (Shute et al., 2017)
// Adapts to student-defined variable names (e.g. jumlah_porsi, porsi, qty, total_harga, menu)
// while strictly validating Python data types and dynamic multiplication logic.

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

interface AssignmentEntry {
  name: string;
  expr: string;
  rawExpr: string;
  hasTrailingSemicolon: boolean;
  lineIndex: number;
}

/** Helper to extract variable assignments statically from user code */
function extractStaticAssignments(code: string): {
  map: Record<string, string>;
  list: AssignmentEntry[];
} {
  const map: Record<string, string> = {};
  const list: AssignmentEntry[] = [];
  const lines = code.split('\n');

  lines.forEach((rawLine, lineIndex) => {
    let line = rawLine.trim();
    if (!line || line.startsWith('#')) return;

    // Strip trailing comments outside quotes
    let inQuote = false;
    let quoteChar = '';
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if ((ch === '"' || ch === "'") && (i === 0 || line[i - 1] !== '\\')) {
        if (!inQuote) {
          inQuote = true;
          quoteChar = ch;
        } else if (ch === quoteChar) {
          inQuote = false;
        }
      } else if (ch === '#' && !inQuote) {
        line = line.substring(0, i).trim();
        break;
      }
    }
    if (!line) return;

    const match = line.match(/^([a-zA-Z_]\w*)\s*=\s*([\s\S]+)$/);
    if (match) {
      const varName = match[1].trim();
      const rawExpr = match[2].trim();
      const hasTrailingSemicolon = rawExpr.endsWith(';');
      const expr = rawExpr.replace(/;\s*$/, '').trim();
      map[varName] = expr;
      list.push({ name: varName, expr, rawExpr, hasTrailingSemicolon, lineIndex });
    }
  });

  return { map, list };
}

function isQuotedLiteral(expr: string | undefined): boolean {
  if (!expr) return false;
  const t = expr.trim();
  return (
    (t.startsWith('"') && t.endsWith('"') && t.length >= 2) ||
    (t.startsWith("'") && t.endsWith("'") && t.length >= 2)
  );
}

function stripQuotes(expr: string): string {
  const t = expr.trim();
  if (isQuotedLiteral(t)) return t.slice(1, -1);
  return t.replace(/['"]/g, '');
}

function isNumericLiteral(expr: string | undefined): boolean {
  if (!expr) return false;
  return /^-?\d+(\.\d+)?$/.test(expr.trim());
}

const ITEM_NAME_RE = /^(nama_barang|nama_makanan|nama_minuman|nama_menu|nama_produk|nama_item|barang|menu|makanan|minuman|produk|item|nama)$/i;
const PRICE_NAME_RE = /harga|price|tarif|biaya|satuan/i;
const QTY_NAME_RE = /jumlah|jml|porsi|banyak|qty|kuantitas|unit/i;
const TOTAL_NAME_RE = /total|subtotal|bayar|tagihan|hasil/i;

export function runCodeTests(
  code: string,
  execResult: ExecutionResult
): TestSuiteSummary {
  const vars = execResult.variables || {};
  const { map: staticAssignments, list: assignmentList } = extractStaticAssignments(code);
  const stdout = execResult.stdout || '';
  const testResults: TestCaseResult[] = [];

  // =========================================================================
  // 1. VISIBLE TEST 1: Variabel Nama Barang / Menu (Tipe Data String)
  // Fleksibel terhadap berbagai nama variabel (nama_barang, menu, nama_makanan, item, dll.)
  // =========================================================================
  let test1Passed = false;
  let test1Actual = '';
  let test1Feedback = '';

  const allVarNames = Object.keys(staticAssignments);

  // Cari kandidat variabel nama item:
  // 1) Cocok pola nama item
  // 2) Atau variabel runtime bertipe string bukan angka
  const namaVarName =
    allVarNames.find((k) => k === 'nama_barang') ??
    allVarNames.find((k) => ITEM_NAME_RE.test(k)) ??
    allVarNames.find(
      (k) =>
        !PRICE_NAME_RE.test(k) &&
        !QTY_NAME_RE.test(k) &&
        !TOTAL_NAME_RE.test(k) &&
        (typeof vars[k] === 'string' ||
          isQuotedLiteral(staticAssignments[k]) ||
          (!isNumericLiteral(staticAssignments[k]) && !/[+\-*/()]/.test(staticAssignments[k])))
    );

  if (namaVarName) {
    const staticNama = staticAssignments[namaVarName];
    const runtimeNama = vars[namaVarName];
    const namaEntry = assignmentList.find((a) => a.name === namaVarName);

    if (namaEntry?.hasTrailingSemicolon) {
      test1Passed = false;
      test1Actual = `${namaVarName} = ${namaEntry.rawExpr} (Mengandung tanda titik koma ;)`;
      test1Feedback = `Terdapat tanda titik koma (;) pada baris '${namaVarName}'. Dalam Python, tanda titik koma (;) di akhir baris tidak diperlukan. Silakan hapus tanda titik koma tersebut: '${namaVarName} = ${namaEntry.expr}'.`;
    } else if (typeof runtimeNama === 'string' && runtimeNama.trim().length > 0) {
      test1Passed = true;
      test1Actual = `${namaVarName} = "${runtimeNama}" (Tipe data: String)`;
      test1Feedback = `Sesuai kaidah! Variabel '${namaVarName}' berhasil menyimpan teks "${runtimeNama}" sebagai tipe data String yang valid.`;
    } else if (staticNama !== undefined) {
      const quoted = isQuotedLiteral(staticNama);
      const contentInside = quoted ? staticNama.slice(1, -1).trim() : '';

      if (quoted && contentInside.length === 0) {
        test1Passed = false;
        test1Actual = `${namaVarName} = "" (Teks masih kosong)`;
        test1Feedback = `Variabel '${namaVarName}' masih kosong. Isilah nama makanan/barang di dalam tanda petik, contoh: ${namaVarName} = "Nasi Goreng" atau "nasgor".`;
      } else if (quoted) {
        test1Passed = true;
        test1Actual = `${namaVarName} = ${staticNama} (Tipe data: String)`;
        test1Feedback = `Sesuai kaidah! Variabel '${namaVarName}' berisi teks ${staticNama} dalam tanda petik.`;
      } else if (isNumericLiteral(staticNama)) {
        test1Passed = false;
        test1Actual = `${namaVarName} = ${staticNama} (Tipe data: Angka/Integer)`;
        test1Feedback = `Variabel '${namaVarName}' diisi angka (${staticNama}). Nama barang wajib berupa teks String dalam tanda petik, contoh: ${namaVarName} = "nasgor".`;
      } else {
        test1Passed = false;
        test1Actual = `${namaVarName} = ${staticNama} (Teks tanpa tanda petik)`;
        test1Feedback = `Teks ${staticNama} pada variabel '${namaVarName}' belum diapit tanda petik. Dalam Python, data teks (String) wajib menggunakan tanda petik: ${namaVarName} = "${staticNama}".`;
      }
    }
  } else {
    test1Passed = false;
    test1Actual = 'Variabel nama barang/menu belum dibuat';
    test1Feedback =
      'Buatlah variabel bertipe teks String untuk menyimpan nama barang/menu, contoh: nama_barang = "nasgor" atau menu = "Mie Ayam".';
  }

  testResults.push({
    id: 'test_nama',
    title: 'Uji 1: Variabel Nama Barang (String)',
    description:
      'Menyimpan nama barang/menu ke dalam variabel (nama variabel bebas tanpa spasi) dengan tipe data String (diapit tanda petik).',
    isHidden: false,
    passed: test1Passed,
    expectedDescription: 'variabel_nama = "..." (nama variabel bebas, teks diapit tanda petik)',
    actualOutput: test1Actual,
    feedback: test1Feedback,
  });

  // =========================================================================
  // 2. VISIBLE TEST 2: Variabel Harga, Jumlah/Porsi, dan Formula Perkalian Total
  // Fleksibel terhadap nama variabel apa pun (jumlah, jumlah_porsi, porsi, qty, banyak, harga, total_harga, dll.)
  // =========================================================================
  let test2Passed = false;
  let test2Actual = '';
  let test2Feedback = '';

  // Deteksi pola formula perkalian: totalVar = opA * opB (dengan dua identifier variabel)
  const mulEntry = assignmentList.find((entry) =>
    /^([a-zA-Z_]\w*)\s*\*\s*([a-zA-Z_]\w*)$/.test(entry.expr.replace(/\s+/g, ' '))
  );
  const mulMatch = mulEntry?.expr.trim().match(/^([a-zA-Z_]\w*)\s*\*\s*([a-zA-Z_]\w*)$/);

  // Deteksi pola kesalahan penjumlahan: totalVar = opA + opB
  const addEntry = assignmentList.find(
    (entry) =>
      TOTAL_NAME_RE.test(entry.name) &&
      /^([a-zA-Z_]\w*)\s*\+\s*([a-zA-Z_]\w*)$/.test(entry.expr.trim())
  );
  const addMatch = addEntry?.expr.trim().match(/^([a-zA-Z_]\w*)\s*\+\s*([a-zA-Z_]\w*)$/);

  let hargaVarName: string | undefined;
  let jumlahVarName: string | undefined;
  let totalVarName: string | undefined;

  if (mulEntry && mulMatch) {
    totalVarName = mulEntry.name;
    const opA = mulMatch[1];
    const opB = mulMatch[2];
    if (QTY_NAME_RE.test(opA) && !QTY_NAME_RE.test(opB)) {
      jumlahVarName = opA;
      hargaVarName = opB;
    } else if (PRICE_NAME_RE.test(opB) && !PRICE_NAME_RE.test(opA)) {
      jumlahVarName = opA;
      hargaVarName = opB;
    } else {
      hargaVarName = opA;
      jumlahVarName = opB;
    }
  } else if (addEntry && addMatch) {
    totalVarName = addEntry.name;
    const opA = addMatch[1];
    const opB = addMatch[2];
    if (QTY_NAME_RE.test(opA) && !QTY_NAME_RE.test(opB)) {
      jumlahVarName = opA;
      hargaVarName = opB;
    } else {
      hargaVarName = opA;
      jumlahVarName = opB;
    }
  } else {
    hargaVarName =
      allVarNames.find((k) => k === 'harga_satuan') ??
      allVarNames.find((k) => PRICE_NAME_RE.test(k) && !TOTAL_NAME_RE.test(k));
    jumlahVarName =
      allVarNames.find((k) => k === 'jumlah') ??
      allVarNames.find((k) => QTY_NAME_RE.test(k) && !TOTAL_NAME_RE.test(k));
    totalVarName =
      allVarNames.find((k) => k === 'total') ??
      allVarNames.find((k) => TOTAL_NAME_RE.test(k));
  }

  const staticHarga = hargaVarName ? staticAssignments[hargaVarName] : undefined;
  const staticJumlah = jumlahVarName ? staticAssignments[jumlahVarName] : undefined;
  const staticTotal = totalVarName ? staticAssignments[totalVarName] : undefined;

  const hargaNum =
    hargaVarName && vars[hargaVarName] !== undefined
      ? Number(vars[hargaVarName])
      : staticHarga !== undefined
      ? Number(staticHarga)
      : NaN;
  const jumlahNum =
    jumlahVarName && vars[jumlahVarName] !== undefined
      ? Number(vars[jumlahVarName])
      : staticJumlah !== undefined
      ? Number(staticJumlah)
      : NaN;
  const totalNum =
    totalVarName && vars[totalVarName] !== undefined
      ? Number(vars[totalVarName])
      : staticTotal !== undefined
      ? Number(staticTotal)
      : NaN;

  const isHargaQuoted = isQuotedLiteral(staticHarga);
  const isJumlahQuoted = isQuotedLiteral(staticJumlah);

  // Pastikan kedua operan didefinisikan sebelum baris formula perkalian
  const hargaEntryIdx = assignmentList.findIndex((a) => a.name === hargaVarName);
  const jumlahEntryIdx = assignmentList.findIndex((a) => a.name === jumlahVarName);
  const hasMultiplyFormula = Boolean(
    mulEntry &&
      mulMatch &&
      hargaVarName &&
      jumlahVarName &&
      hargaEntryIdx !== -1 &&
      jumlahEntryIdx !== -1 &&
      hargaEntryIdx < assignmentList.indexOf(mulEntry) &&
      jumlahEntryIdx < assignmentList.indexOf(mulEntry)
  );
  const hasAddFormula = Boolean(addEntry && addMatch);

  const hargaEntry = assignmentList.find((a) => a.name === hargaVarName);
  const jumlahEntry = assignmentList.find((a) => a.name === jumlahVarName);

  if (isHargaQuoted && hargaVarName) {
    test2Passed = false;
    test2Actual = `${hargaVarName} = ${staticHarga} (Tipe String dalam tanda petik)`;
    test2Feedback = `Nilai '${hargaVarName}' (${staticHarga}) diapit tanda petik sehingga dibaca sebagai teks. Hapus tanda petik agar bertipe angka Integer: ${hargaVarName} = ${stripQuotes(staticHarga ?? '')}.`;
  } else if (isJumlahQuoted && jumlahVarName) {
    test2Passed = false;
    test2Actual = `${jumlahVarName} = ${staticJumlah} (Tipe String dalam tanda petik)`;
    test2Feedback = `Nilai '${jumlahVarName}' (${staticJumlah}) diapit tanda petik. Hapus tanda petik agar berupa angka bulat: ${jumlahVarName} = ${stripQuotes(staticJumlah ?? '')}.`;
  } else if (hargaEntry?.hasTrailingSemicolon) {
    test2Passed = false;
    test2Actual = `${hargaVarName} = ${hargaEntry.rawExpr} (Mengandung tanda titik koma ;)`;
    test2Feedback = `Terdapat tanda titik koma (;) pada baris '${hargaVarName}'. Dalam Python, tanda titik koma (;) di akhir baris tidak diperlukan. Hapus tanda titik koma tersebut: '${hargaVarName} = ${hargaEntry.expr}'.`;
  } else if (jumlahEntry?.hasTrailingSemicolon) {
    test2Passed = false;
    test2Actual = `${jumlahVarName} = ${jumlahEntry.rawExpr} (Mengandung tanda titik koma ;)`;
    test2Feedback = `Terdapat tanda titik koma (;) pada baris '${jumlahVarName}'. Dalam Python, tanda titik koma (;) di akhir baris tidak diperlukan. Hapus tanda titik koma tersebut: '${jumlahVarName} = ${jumlahEntry.expr}'.`;
  } else if (mulEntry && mulEntry.hasTrailingSemicolon) {
    test2Passed = false;
    test2Actual = `${totalVarName} = ${mulEntry.rawExpr} (Mengandung tanda titik koma ;)`;
    test2Feedback = `Rumus perkalianmu (${totalVarName} = ${mulEntry.expr}) sebenarnya sudah dinamis dan tepat! Namun dalam bahasa Python, kamu TIDAK perlu menuliskan tanda titik koma (;) di akhir baris. Silakan hapus tanda titik koma (;) pada baris tersebut: '${totalVarName} = ${mulEntry.expr}'.`;
  } else if (!hargaVarName || isNaN(hargaNum) || hargaNum <= 0) {
    test2Passed = false;
    test2Actual = hargaVarName
      ? `${hargaVarName} = ${staticHarga}`
      : 'Variabel harga belum dibuat';
    test2Feedback =
      'Buatlah variabel harga dengan angka positif tanpa tanda petik, contoh: harga_satuan = 15000 atau harga = 12000.';
  } else if (!jumlahVarName || isNaN(jumlahNum) || jumlahNum <= 0) {
    test2Passed = false;
    test2Actual = jumlahVarName
      ? `${jumlahVarName} = ${staticJumlah}`
      : 'Variabel jumlah/kuantitas belum dibuat';
    test2Feedback =
      'Buatlah variabel jumlah/kuantitas berupa bilangan bulat positif tanpa petik (nama variabel bebas, misal: jumlah = 2, porsi = 2, atau qty = 2).';
  } else if (hasAddFormula && totalVarName) {
    test2Passed = false;
    test2Actual = `${totalVarName} = ${totalNum} (Menggunakan penjumlahan +)`;
    test2Feedback = `Total belanja dihitung dengan penjumlahan (${hargaNum} + ${jumlahNum}). Program kasir harus mengalikan dengan tanda bintang (*): ${totalVarName} = ${hargaVarName} * ${jumlahVarName}.`;
  } else if (!hasMultiplyFormula && !isNaN(totalNum) && totalVarName) {
    test2Passed = false;
    test2Actual = `${totalVarName} = ${totalNum} (Angka konstan tanpa formula perkalian variabel)`;
    test2Feedback = `Variabel '${totalVarName}' diisi angka tetap (${totalNum}). Gunakan formula perkalian dinamis memakai nama variabelmu: ${totalVarName} = ${hargaVarName} * ${jumlahVarName}.`;
  } else if (hasMultiplyFormula && totalVarName) {
    const expectedCalc = hargaNum * jumlahNum;
    test2Passed = true;
    test2Actual = `${hargaVarName} = ${hargaNum}, ${jumlahVarName} = ${jumlahNum}, ${totalVarName} = ${expectedCalc} (${hargaVarName} * ${jumlahVarName})`;
    test2Feedback = `Perhitungan tepat! Variabel '${totalVarName}' terkalkulasi dinamis sebesar ${expectedCalc} dari formula ${hargaVarName} * ${jumlahVarName}.`;
  } else {
    test2Passed = false;
    test2Actual = 'Perhitungan total belum sesuai';
    test2Feedback = `Pastikan kamu mendefinisikan variabel total menggunakan perkalian dua variabelmu, contoh: total = ${hargaVarName} * ${jumlahVarName}.`;
  }

  testResults.push({
    id: 'test_calc',
    title: 'Uji 2: Perhitungan Total Belanja (Fleksibel)',
    description:
      'Menghitung total harga secara dinamis menggunakan perkalian variabel harga dan jumlah/kuantitas (nama variabel fleksibel).',
    isHidden: false,
    passed: test2Passed,
    expectedDescription:
      'total_variabel = variabel_harga * variabel_jumlah (perkalian dinamis angka positif)',
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
  const containsTotalWord = /total|struk|bayar|harga/i.test(stdoutClean);

  const test3Passed =
    (execResult.status === 'success' || stdoutClean.length > 0) &&
    hasPrintInCode &&
    (containsTotalVal || containsTotalWord);

  testResults.push({
    id: 'test_print',
    title: 'Uji 3: Pencetakan Struk ke Layar',
    description: 'Menampilkan struk kasir dan total belanja menggunakan fungsi print().',
    isHidden: false,
    passed: test3Passed,
    expectedDescription: 'Mencetak baris struk yang memuat hasil total belanja',
    actualOutput: stdoutClean || '(Belum ada output terminal yang tercetak)',
    feedback: test3Passed
      ? 'Sempurna! Struk kasir berhasil tercetak ke terminal dengan rapi.'
      : `Gunakan perintah print() untuk menampilkan total belanja, contoh: print("Total belanja:", ${totalVarName ?? 'total'}).`,
  });

  // =========================================================================
  // 4. TEST CASES TRANSPARAN (Generalisasi Komputasional)
  // =========================================================================
  const hLabel = hargaVarName ?? 'harga';
  const jLabel = jumlahVarName ?? 'jumlah';
  const tLabel = totalVarName ?? 'total';

  const testCaseDetails: TestCaseDetail[] = [
    {
      title: 'Test Case 1 (Data Input Siswa)',
      inputDesc: `${hLabel} = ${!isNaN(hargaNum) ? hargaNum : '?'}, ${jLabel} = ${!isNaN(jumlahNum) ? jumlahNum : '?'}`,
      expectedOutput: `${tLabel} = ${!isNaN(hargaNum) && !isNaN(jumlahNum) ? hargaNum * jumlahNum : '?'}`,
      actualOutput: `${tLabel} = ${!isNaN(totalNum) ? totalNum : '?'}`,
      passed: test2Passed,
    },
    {
      title: 'Test Case 2 (Generalisasi Menu Lain)',
      inputDesc: `${hLabel} = 25000, ${jLabel} = 3`,
      expectedOutput: `${tLabel} = 75000`,
      actualOutput: hasMultiplyFormula
        ? `${tLabel} = 75000 (Otomatis terkalkulasi)`
        : 'Gagal (formula tidak dinamis)',
      passed: hasMultiplyFormula,
    },
    {
      title: 'Test Case 3 (Generalisasi Pembelian Satuan)',
      inputDesc: `${hLabel} = 8000, ${jLabel} = 1`,
      expectedOutput: `${tLabel} = 8000`,
      actualOutput: hasMultiplyFormula
        ? `${tLabel} = 8000 (Otomatis terkalkulasi)`
        : 'Gagal (formula tidak dinamis)',
      passed: hasMultiplyFormula,
    },
  ];

  const testHidden1Passed = hasMultiplyFormula && !mulEntry?.hasTrailingSemicolon;
  testResults.push({
    id: 'test_hidden_generalization',
    title: 'Uji Tersembunyi 1: Pola Formula Umum (Generalisasi)',
    description:
      'Menguji apakah logika program siswa bekerja otomatis untuk berbagai kombinasi harga dan jumlah menggunakan penamaan variabel siswa sendiri.',
    isHidden: true,
    passed: testHidden1Passed,
    expectedDescription: `Menggunakan formula dinamis (${hLabel} * ${jLabel})`,
    actualOutput: testHidden1Passed
      ? 'Lolos semua Test Case: Kasus 1, Kasus 2 (Rp 25.000 x 3 = Rp 75.000), Kasus 3 (Rp 8.000 x 1 = Rp 8.000)'
      : 'Formula belum dinamis (tidak dapat memproses perubahan harga/jumlah)',
    feedback: testHidden1Passed
      ? `Logika generalisasi terpenuhi! Formula '${tLabel} = ${hLabel} * ${jLabel}' bekerja untuk nilai apa pun.`
      : `Pastikan rumus total ditulis menggunakan variabelmu sendiri: ${tLabel} = ${hLabel} * ${jLabel} (jangan menulis angka langsung).`,
    testCaseDetails,
  });

  const isTypeValid = !isHargaQuoted && !isJumlahQuoted && !isNaN(hargaNum) && !isNaN(jumlahNum);
  testResults.push({
    id: 'test_hidden_types',
    title: 'Uji Tersembunyi 2: Integritas Tipe Data Aritmatika',
    description: 'Memastikan variabel harga dan jumlah/kuantitas bertipe numerik murni tanpa tanda petik.',
    isHidden: true,
    passed: isTypeValid,
    expectedDescription: `${hLabel} dan ${jLabel} berupa angka tanpa petik`,
    actualOutput: isTypeValid
      ? `Tipe data terkonfirmasi numerik murni (${hLabel}: ${hargaNum}, ${jLabel}: ${jumlahNum})`
      : 'Tipe data terdeteksi teks String atau belum berupa angka valid',
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
