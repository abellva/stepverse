import { describe, it, expect } from 'vitest';
import {
  validateParsonsL1,
  validateParsonsL2,
} from '../parsonsValidator';

describe('Parsons Problem Validator', () => {
  describe('Level 1: Reorder with Distractors', () => {
    it('passes when all required blocks are placed in logical order without distractors', () => {
      const correctOrder = [
        'p1_nama',
        'p1_harga',
        'p1_jumlah',
        'p1_total',
        'p1_print',
      ];
      const result = validateParsonsL1(correctOrder);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('fails when string distractor is included', () => {
      const withDistractor = [
        'p1_nama',
        'p1_d1', // distractor: harga_satuan = "15000"
        'p1_jumlah',
        'p1_total',
        'p1_print',
      ];
      const result = validateParsonsL1(withDistractor);
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('string'))).toBe(true);
    });

    it('fails when total is calculated before defining variables', () => {
      const wrongOrder = [
        'p1_total', // calculated too early
        'p1_nama',
        'p1_harga',
        'p1_jumlah',
        'p1_print',
      ];
      const result = validateParsonsL1(wrongOrder);
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('didefinisikan sebelum'))).toBe(true);
    });
  });

  describe('Level 2: Partial Lines with Blanks', () => {
    it('passes when blanks are correctly filled with standard values', () => {
      const placed = [
        { id: 'p2_nama', filledBlanks: ['"Nasi Goreng"'] },
        { id: 'p2_harga', filledBlanks: ['15000'] },
        { id: 'p2_jumlah', filledBlanks: ['2'] },
        { id: 'p2_total', filledBlanks: ['harga_satuan', 'jumlah'] },
        { id: 'p2_print', filledBlanks: ['total'] },
      ];
      const result = validateParsonsL2(placed);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('passes with custom adaptive student values like "nasgor" and 150', () => {
      const placed = [
        { id: 'p2_nama', filledBlanks: ['"nasgor"'] },
        { id: 'p2_harga', filledBlanks: ['150'] },
        { id: 'p2_jumlah', filledBlanks: ['2'] },
        { id: 'p2_total', filledBlanks: ['harga_satuan', 'jumlah'] },
        { id: 'p2_print', filledBlanks: ['total'] },
      ];
      const result = validateParsonsL2(placed);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('fails when string variable lacks quotes (violates string syntax)', () => {
      const placed = [
        { id: 'p2_nama', filledBlanks: ['nasgor'] }, // no quotes!
        { id: 'p2_harga', filledBlanks: ['150'] },
        { id: 'p2_jumlah', filledBlanks: ['2'] },
        { id: 'p2_total', filledBlanks: ['harga_satuan', 'jumlah'] },
        { id: 'p2_print', filledBlanks: ['total'] },
      ];
      const result = validateParsonsL2(placed);
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('tanda petik'))).toBe(true);
    });

    it('fails when price is quoted like string (violates numeric integer rule)', () => {
      const placed = [
        { id: 'p2_nama', filledBlanks: ['"nasgor"'] },
        { id: 'p2_harga', filledBlanks: ['"150"'] }, // quoted!
        { id: 'p2_jumlah', filledBlanks: ['2'] },
        { id: 'p2_total', filledBlanks: ['harga_satuan', 'jumlah'] },
        { id: 'p2_print', filledBlanks: ['total'] },
      ];
      const result = validateParsonsL2(placed);
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('tanda petik'))).toBe(true);
    });

    it('fails when total formula uses wrong variable or addition', () => {
      const placed = [
        { id: 'p2_nama', filledBlanks: ['"nasgor"'] },
        { id: 'p2_harga', filledBlanks: ['150'] },
        { id: 'p2_jumlah', filledBlanks: ['2'] },
        { id: 'p2_total', filledBlanks: ['harga_barang', 'jumlah'] }, // wrong variable name
        { id: 'p2_print', filledBlanks: ['total'] },
      ];
      const result = validateParsonsL2(placed);
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('belum tepat'))).toBe(true);
    });

    it('ensures every L2 block template has valid placeholders for blank calculation', async () => {
      const { PARSONS_L2_BLOCKS } = await import('../parsonsValidator');
      for (const block of PARSONS_L2_BLOCKS) {
        const matches = block.template.match(/\{(\d+)\}/g);
        expect(matches).not.toBeNull();
        expect(matches!.length).toBeGreaterThan(0);
        const blankCount = matches!.length;
        const initialBlanks = Array(blankCount).fill('');
        expect(initialBlanks.length).toBe(blankCount);
      }
    });
  });
});
