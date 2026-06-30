import { describe, expect, it } from 'vitest';
import { cleanNationalCode, parseNumber } from './numbers';

describe('cleanNationalCode', () => {
  it('quita no numéricos y deja 6 dígitos', () => {
    expect(cleanNationalCode('369694.4')).toBe('369694');
    expect(cleanNationalCode('154054.6')).toBe('154054');
    expect(cleanNationalCode('154054')).toBe('154054');
  });

  it('maneja códigos cortos y vacíos', () => {
    expect(cleanNationalCode('123')).toBe('123');
    expect(cleanNationalCode('')).toBe('');
    expect(cleanNationalCode(null)).toBe('');
    expect(cleanNationalCode(undefined)).toBe('');
    expect(cleanNationalCode('C.N. 154054-6')).toBe('154054');
  });

  it('acepta números', () => {
    expect(cleanNationalCode(154054)).toBe('154054');
  });
});

describe('parseNumber', () => {
  it('pasa números tal cual', () => {
    expect(parseNumber(2.45)).toBe(2.45);
    expect(parseNumber(0)).toBe(0);
    expect(parseNumber(21)).toBe(21);
  });

  it('coma decimal española', () => {
    expect(parseNumber('2,45')).toBe(2.45);
    expect(parseNumber('21,00')).toBe(21);
  });

  it('separador de miles + coma decimal', () => {
    expect(parseNumber('1.234,56')).toBe(1234.56);
  });

  it('porcentaje', () => {
    expect(parseNumber('21,00%')).toBe(21);
    expect(parseNumber('21%')).toBe(21);
  });

  it('punto decimal anglosajón', () => {
    expect(parseNumber('154054.6')).toBe(154054.6);
    expect(parseNumber('2.45')).toBe(2.45);
  });

  it('vacío o basura → 0', () => {
    expect(parseNumber('')).toBe(0);
    expect(parseNumber(null)).toBe(0);
    expect(parseNumber(undefined)).toBe(0);
    expect(parseNumber('abc')).toBe(0);
  });
});
