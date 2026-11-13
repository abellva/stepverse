import { describe, it, expect } from 'vitest';
import { runCodeTests } from '../testRunner';
import { ExecutionResult } from '../../services/pyodideService';

describe('Python Code Test Runner', () => {
  it('passes all visible and hidden tests when valid Python code with standard values is executed', () => {
    const validCode = `
nama_barang = "Nasi Goreng"
harga_satuan = 15000
jumlah = 2
total = harga_satuan * jumlah
print("Total belanja:", total)
`;

    const mockExecResult: ExecutionResult = {
      status: 'success',
      stdout: 'Total belanja: 30000\n',
      stderr: '',
      variables: {
        nama_barang: 'Nasi Goreng',
        harga_satuan: 15000,
        jumlah: 2,
        total: 30000,
      },
      executionTimeMs: 12,
    };

    const summary = runCodeTests(validCode, mockExecResult);
    expect(summary.overallPass).toBe(true);
    expect(summary.visiblePassed).toBe(3);
    expect(summary.hiddenPassed).toBe(2);
  });

  it('passes adaptively when user writes custom values like "nasgor" and 150', () => {
    const customCode = `
nama_barang = "nasgor"
harga_satuan = 150
jumlah = 2
total = harga_satuan * jumlah
print("Total belanja:", total)
`;

    const mockExecResult: ExecutionResult = {
      status: 'success',
      stdout: 'Total belanja: 300\n',
      stderr: '',
      variables: {
        nama_barang: 'nasgor',
        harga_satuan: 150,
        jumlah: 2,
        total: 300,
      },
      executionTimeMs: 10,
    };

    const summary = runCodeTests(customCode, mockExecResult);
    expect(summary.overallPass).toBe(true);
    expect(summary.visiblePassed).toBe(3);
    expect(summary.hiddenPassed).toBe(2);
    expect(summary.testResults[0].actualOutput).toContain('nasgor');
    expect(summary.testResults[1].actualOutput).toContain('150');
  });

  it('fails with conditional feedback when string lacks quotes: nama_barang = nasgor', () => {
    const unquotedCode = `
nama_barang = nasgor
harga_satuan = 150
jumlah = 2
total = harga_satuan * jumlah
print("Total belanja:", total)
`;

    const mockExecResult: ExecutionResult = {
      status: 'error',
      stdout: '',
      stderr: "NameError: name 'nasgor' is not defined",
      variables: {},
      executionTimeMs: 5,
    };

    const summary = runCodeTests(unquotedCode, mockExecResult);
    const testNama = summary.testResults.find((t) => t.id === 'test_nama');
    expect(testNama?.passed).toBe(false);
    expect(testNama?.feedback).toContain('tanda petik');
  });

  it('fails with conditional feedback when price is quoted: harga_satuan = "150"', () => {
    const quotedPriceCode = `
nama_barang = "nasgor"
harga_satuan = "150"
jumlah = 2
total = harga_satuan * jumlah
print("Total belanja:", total)
`;

    const mockExecResult: ExecutionResult = {
      status: 'success',
      stdout: 'Total belanja: 150150\n',
      stderr: '',
      variables: {
        nama_barang: 'nasgor',
        harga_satuan: '150',
        jumlah: 2,
        total: '150150',
      },
      executionTimeMs: 10,
    };

    const summary = runCodeTests(quotedPriceCode, mockExecResult);
    const testCalc = summary.testResults.find((t) => t.id === 'test_calc');
    expect(testCalc?.passed).toBe(false);
    expect(testCalc?.feedback).toContain('tanda petik');
  });

  it('fails generalization test if total is hardcoded without formula', () => {
    const hardcodedCode = `
nama_barang = "nasgor"
harga_satuan = 150
jumlah = 2
total = 300
print("Total belanja:", total)
`;

    const mockExecResult: ExecutionResult = {
      status: 'success',
      stdout: 'Total belanja: 300\n',
      stderr: '',
      variables: {
        nama_barang: 'nasgor',
        harga_satuan: 150,
        jumlah: 2,
        total: 300,
      },
      executionTimeMs: 10,
    };

    const summary = runCodeTests(hardcodedCode, mockExecResult);
    expect(summary.overallPass).toBe(false);
    expect(summary.testResults.find((t) => t.id === 'test_hidden_generalization')?.passed).toBe(false);
  });

  it('passes adaptively when user uses flexible variable names (menu, hrg, jml) and reversed multiplication order', () => {
    const flexibleCode = `
menu = "Bakso Mercon"
hrg = 12000
jml = 3
total = jml * hrg
print("Total bayar:", total)
`;

    const mockExecResult: ExecutionResult = {
      status: 'success',
      stdout: 'Total bayar: 36000\n',
      stderr: '',
      variables: {
        menu: 'Bakso Mercon',
        hrg: 12000,
        jml: 3,
        total: 36000,
      },
      executionTimeMs: 11,
    };

    const summary = runCodeTests(flexibleCode, mockExecResult);
    expect(summary.overallPass).toBe(true);
    expect(summary.visiblePassed).toBe(3);
    expect(summary.hiddenPassed).toBe(2);
    expect(summary.testResults[0].actualOutput).toContain('Bakso Mercon');
    expect(summary.testResults[1].actualOutput).toContain('12000');
  });
});
