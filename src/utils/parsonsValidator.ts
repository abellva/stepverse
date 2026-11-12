// Adaptive & Conditional Validator for Parsons Problems (Levels 1, 2, 3)
// CT Component: Algorithm Design (Shute et al., 2017)

export interface ParsonsBlockL1 {
  id: string;
  code: string;
  isDistractor?: boolean;
  order: number; // 1-5, 0 for distractor
  hint?: string;
}

export interface ParsonsBlockL2 {
  id: string;
  template: string; // e.g. "nama_barang = {0}"
  fieldTypes: ('string' | 'number' | 'variable_pair' | 'variable')[];
  isDistractor?: boolean;
  order: number;
  hint?: string;
}

export const PARSONS_L1_BLOCKS: ParsonsBlockL1[] = [
  { id: 'p1_nama',   code: 'nama_barang = "Nasi Goreng"', order: 1 },
  { id: 'p1_harga',  code: 'harga_satuan = 15000',        order: 2 },
  { id: 'p1_jumlah', code: 'jumlah = 2',                  order: 3 },
  { id: 'p1_total',  code: 'total = harga_satuan * jumlah', order: 4 },
  { id: 'p1_print',  code: 'print("Total belanja:", total)', order: 5 },
  // Distractors
  { id: 'p1_d1', code: 'harga_satuan = "15000"', isDistractor: true, order: 0, hint: 'Tipe data harga harus angka integer (tanpa tanda petik), bukan string teks.' },
  { id: 'p1_d2', code: 'total = harga_satuan + jumlah', isDistractor: true, order: 0, hint: 'Untuk menghitung total belanja kasir, gunakan perkalian (*), bukan penjumlahan (+).' },
];

export const PARSONS_L2_BLOCKS: ParsonsBlockL2[] = [
  {
    id: 'p2_nama',
    template: 'nama_barang = {0}',
    fieldTypes: ['string'],
    order: 1,
    hint: 'Nama barang bebas (misal: "nasgor", "Nasi Goreng"), asalkan diapit tanda petik sebagai tipe data String.',
  },
  {
    id: 'p2_harga',
    template: 'harga_satuan = {0}',
    fieldTypes: ['number'],
    order: 2,
    hint: 'Harga satuan bebas (misal: 150, 15000), asalkan berupa angka positif tanpa tanda petik.',
  },
  {
    id: 'p2_jumlah',
    template: 'jumlah = {0}',
    fieldTypes: ['number'],
    order: 3,
    hint: 'Jumlah barang bebas (misal: 1, 2, 5), asalkan berupa bilangan bulat tanpa tanda petik.',
  },
  {
    id: 'p2_total',
    template: 'total = {0} * {1}',
    fieldTypes: ['variable_pair'],
    order: 4,
    hint: 'Kalikan variabel harga_satuan dan jumlah.',
  },
  {
    id: 'p2_print',
    template: 'print("Total belanja:", {0})',
    fieldTypes: ['variable'],
    order: 5,
    hint: 'Cetak variabel total belanja.',
  },
  // Distractor block (addition instead of multiplication)
  {
    id: 'p2_d1',
    template: 'total = {0} + {1}',
    fieldTypes: ['variable_pair'],
    isDistractor: true,
    order: 0,
    hint: 'Formula salah: gunakan perkalian (*), jangan gunakan baris penjumlahan (+)!',
  },
];

/** Validates Level 1 placed block IDs */
export function validateParsonsL1(placedIds: string[]): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Check for distractors
  for (const id of placedIds) {
    const block = PARSONS_L1_BLOCKS.find((b) => b.id === id);
    if (block?.isDistractor) {
      errors.push(block.hint || `Baris "${block.code}" adalah pengecoh.`);
    }
  }

  // Check required non-distractor count
  const required = PARSONS_L1_BLOCKS.filter((b) => !b.isDistractor);
  if (placedIds.length !== required.length) {
    errors.push(`Program kasir harus terdiri dari ${required.length} baris kode.`);
    return { isValid: false, errors };
  }

  // Check logical order
  const idxNama = placedIds.indexOf('p1_nama');
  const idxHarga = placedIds.indexOf('p1_harga');
  const idxJumlah = placedIds.indexOf('p1_jumlah');
  const idxTotal = placedIds.indexOf('p1_total');
  const idxPrint = placedIds.indexOf('p1_print');

  if (idxNama === -1 || idxHarga === -1 || idxJumlah === -1 || idxTotal === -1 || idxPrint === -1) {
    errors.push('Ada baris kode utama yang belum dimasukkan.');
    return { isValid: false, errors };
  }

  if (idxHarga > idxTotal || idxJumlah > idxTotal) {
    errors.push('Variabel harga_satuan dan jumlah harus didefinisikan sebelum baris perhitungan total.');
  }

  if (idxTotal > idxPrint) {
    errors.push('Variabel total harus dihitung terlebih dahulu sebelum dicetak oleh print().');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/** Adaptive, Rule-Based Validator for Level 2 */
export function validateParsonsL2(
  placed: { id: string; filledBlanks: string[] }[]
): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  const placedIds = placed.map((p) => p.id);

  // 1. Check for distractor blocks
  for (const p of placed) {
    const block = PARSONS_L2_BLOCKS.find((b) => b.id === p.id);
    if (block?.isDistractor) {
      errors.push(block.hint || 'Terdapat baris pengecoh yang keliru dimasukkan.');
    }
  }

  // 2. Check complete count
  const required = PARSONS_L2_BLOCKS.filter((b) => !b.isDistractor);
  if (placed.length !== required.length) {
    errors.push(`Susunlah ${required.length} baris kode lengkap tanpa kartu pengecoh.`);
    return { isValid: false, errors };
  }

  // 3. Check order
  const idxHarga = placedIds.indexOf('p2_harga');
  const idxJumlah = placedIds.indexOf('p2_jumlah');
  const idxTotal = placedIds.indexOf('p2_total');
  const idxPrint = placedIds.indexOf('p2_print');

  if (idxHarga > idxTotal || idxJumlah > idxTotal) {
    errors.push('Variabel harga_satuan dan jumlah harus didefinisikan sebelum menghitung total.');
  }
  if (idxTotal > idxPrint) {
    errors.push('Hitung total belanja sebelum baris print().');
  }

  // 4. Adaptive, Conditional syntax & semantic checks on blanks
  for (const p of placed) {
    const block = PARSONS_L2_BLOCKS.find((b) => b.id === p.id);
    if (!block || block.isDistractor) continue;

    // Check nama_barang (Must be String with quotes)
    if (block.id === 'p2_nama') {
      const val = (p.filledBlanks[0] || '').trim();
      if (!val) {
        errors.push('Isian nama_barang masih kosong.');
      } else {
        const isQuoted =
          (val.startsWith('"') && val.endsWith('"') && val.length >= 2) ||
          (val.startsWith("'") && val.endsWith("'") && val.length >= 2);
        if (!isQuoted) {
          errors.push(
            `Isian "${val}" belum sesuai kaidah String. Teks nama barang harus diapit tanda petik, contoh: "${val}" atau '${val}'.`
          );
        }
      }
    }

    // Check harga_satuan (Must be a positive Number without quotes)
    if (block.id === 'p2_harga') {
      const val = (p.filledBlanks[0] || '').trim();
      if (!val) {
        errors.push('Isian harga_satuan masih kosong.');
      } else if (val.startsWith('"') || val.startsWith("'") || val.endsWith('"') || val.endsWith("'")) {
        errors.push(
          `Nilai ${val} diberi tanda petik. Tipe data harga harus berupa angka Integer tanpa tanda petik agar dapat dikalikan.`
        );
      } else {
        const num = Number(val);
        if (isNaN(num) || num <= 0) {
          errors.push(`Nilai harga_satuan "${val}" tidak valid. Masukkan angka positif (contoh: 150 atau 15000).`);
        }
      }
    }

    // Check jumlah (Must be a positive integer without quotes)
    if (block.id === 'p2_jumlah') {
      const val = (p.filledBlanks[0] || '').trim();
      if (!val) {
        errors.push('Isian jumlah masih kosong.');
      } else if (val.startsWith('"') || val.startsWith("'") || val.endsWith('"') || val.endsWith("'")) {
        errors.push(`Jumlah beli ${val} diberi tanda petik. Masukkan angka bulat tanpa petik.`);
      } else {
        const num = Number(val);
        if (isNaN(num) || !Number.isInteger(num) || num <= 0) {
          errors.push(`Nilai jumlah "${val}" harus berupa angka bulat positif (contoh: 1, 2, 5).`);
        }
      }
    }

    // Check total variables: total = {0} * {1}
    if (block.id === 'p2_total') {
      const v0 = (p.filledBlanks[0] || '').trim();
      const v1 = (p.filledBlanks[1] || '').trim();

      const validPairs =
        (v0 === 'harga_satuan' && v1 === 'jumlah') ||
        (v0 === 'jumlah' && v1 === 'harga_satuan');

      if (!v0 || !v1) {
        errors.push('Variabel pada baris total = ... * ... belum lengkap diisi.');
      } else if (!validPairs) {
        errors.push(
          `Kombinasi "${v0} * ${v1}" belum tepat. Gunakan variabel: harga_satuan * jumlah.`
        );
      }
    }

    // Check print: print("Total belanja:", {0})
    if (block.id === 'p2_print') {
      const val = (p.filledBlanks[0] || '').trim();
      if (!val) {
        errors.push('Isian pada perintah print() masih kosong.');
      } else if (val !== 'total') {
        errors.push(`Nilai yang dicetak adalah "${val}". Variabel yang harus dicetak adalah total.`);
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
