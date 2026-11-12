// Friendly Indonesian error translator for Python exceptions
// CT Component: Debugging (Shute et al., 2017)

export interface TranslatedError {
  type: string;
  originalMessage: string;
  friendlyTitle: string;
  friendlyExplanation: string;
  suggestion: string;
}

export function translatePythonError(rawError: string): TranslatedError {
  const errStr = rawError || '';

  if (errStr.includes('SyntaxError')) {
    return {
      type: 'SyntaxError',
      originalMessage: errStr,
      friendlyTitle: 'Kesalahan Tata Tulis (SyntaxError)',
      friendlyExplanation:
        'Python tidak dapat memahami baris kodenya karena ada aturan penulisan yang terlewat.',
      suggestion:
        'Periksa apakah ada tanda kurung () yang belum ditutup, tanda petik ("...") yang tidak berpasangan, atau tanda operator yang hilang.',
    };
  }

  if (errStr.includes('IndentationError')) {
    return {
      type: 'IndentationError',
      originalMessage: errStr,
      friendlyTitle: 'Kesalahan Spasi Baris (IndentationError)',
      friendlyExplanation:
        'Jarak spasi di awal baris tidak sejajar atau tidak sesuai format Python.',
      suggestion:
        'Pastikan baris kode dasar dimulai tepat dari kolom paling kiri (tanpa spasi di awal baris).',
    };
  }

  if (errStr.includes('NameError')) {
    // Extract variable name if possible (e.g. name 'xyz' is not defined)
    const match = errStr.match(/name '([^']+)' is not defined/);
    const varName = match ? match[1] : 'suatu variabel';
    return {
      type: 'NameError',
      originalMessage: errStr,
      friendlyTitle: 'Nama Tidak Dikenal (NameError)',
      friendlyExplanation:
        `Variabel atau perintah "${varName}" belum pernah dibuat sebelumnya atau terdapat salah ketik (typo).`,
      suggestion:
        `Pastikan variabel "${varName}" sudah didefinisikan terlebih dahulu sebelum digunakan, dan perhatikan huruf besar/kecilnya.`,
    };
  }

  if (errStr.includes('TypeError')) {
    return {
      type: 'TypeError',
      originalMessage: errStr,
      friendlyTitle: 'Tipe Data Tidak Cocok (TypeError)',
      friendlyExplanation:
        'Operasi aritmatika atau fungsi mencoba menggabungkan tipe data yang tidak cocok.',
      suggestion:
        'Pastikan harga_satuan dan jumlah berupa angka (integer/float), bukan teks String yang diapit tanda petik.',
    };
  }

  if (errStr.includes('ZeroDivisionError')) {
    return {
      type: 'ZeroDivisionError',
      originalMessage: errStr,
      friendlyTitle: 'Pembagian dengan Nol (ZeroDivisionError)',
      friendlyExplanation:
        'Komputer tidak dapat melakukan pembagian bilangan dengan angka 0.',
      suggestion: 'Pastikan nilai pembagi lebih besar dari 0.',
    };
  }

  return {
    type: 'Error',
    originalMessage: errStr,
    friendlyTitle: 'Terjadi Kesalahan Eksekusi',
    friendlyExplanation: 'Program menemui kendala saat dijalankan oleh komputer.',
    suggestion: 'Pelajari pesan error di atas dan tinjau kembali langkah algoritma yang kamu buat.',
  };
}

