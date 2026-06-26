import { describe, expect, it } from 'vitest';
import { limpiarCN, num } from './numeros';

describe('limpiarCN', () => {
  it('quita no numéricos y deja 6 dígitos', () => {
    expect(limpiarCN('369694.4')).toBe('369694');
    expect(limpiarCN('154054.6')).toBe('154054');
    expect(limpiarCN('154054')).toBe('154054');
  });

  it('maneja códigos cortos y vacíos', () => {
    expect(limpiarCN('123')).toBe('123');
    expect(limpiarCN('')).toBe('');
    expect(limpiarCN(null)).toBe('');
    expect(limpiarCN(undefined)).toBe('');
    expect(limpiarCN('C.N. 154054-6')).toBe('154054');
  });

  it('acepta números', () => {
    expect(limpiarCN(154054)).toBe('154054');
  });
});

describe('num', () => {
  it('pasa números tal cual', () => {
    expect(num(2.45)).toBe(2.45);
    expect(num(0)).toBe(0);
    expect(num(21)).toBe(21);
  });

  it('coma decimal española', () => {
    expect(num('2,45')).toBe(2.45);
    expect(num('21,00')).toBe(21);
  });

  it('separador de miles + coma decimal', () => {
    expect(num('1.234,56')).toBe(1234.56);
  });

  it('porcentaje', () => {
    expect(num('21,00%')).toBe(21);
    expect(num('21%')).toBe(21);
  });

  it('punto decimal anglosajón', () => {
    expect(num('154054.6')).toBe(154054.6);
    expect(num('2.45')).toBe(2.45);
  });

  it('vacío o basura → 0', () => {
    expect(num('')).toBe(0);
    expect(num(null)).toBe(0);
    expect(num(undefined)).toBe(0);
    expect(num('abc')).toBe(0);
  });
});
