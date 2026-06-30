import { describe, expect, it } from 'vitest';
import { normalizeSupplier, sameSupplier } from './supplier';

describe('normalizeSupplier', () => {
  it('quita sufijos societarios y normaliza', () => {
    expect(normalizeSupplier('Dentaid S.L.')).toBe('DENTAID');
    expect(normalizeSupplier('DENTAID')).toBe('DENTAID');
    expect(normalizeSupplier('Cinfa S.L.U.')).toBe('CINFA');
    expect(normalizeSupplier('Laboratorios XYZ, S.A.')).toBe('LABORATORIOS XYZ');
  });

  it('quita tildes y espacios sobrantes', () => {
    expect(normalizeSupplier('  Farmacéutica  Aragó  ')).toBe('FARMACEUTICA ARAGO');
  });

  it('Sociedad Limitada / Anónima escritas completas', () => {
    expect(normalizeSupplier('Acme Sociedad Limitada')).toBe('ACME');
    expect(normalizeSupplier('Acme Sociedad Anónima Unipersonal')).toBe('ACME');
  });

  it('vacío', () => {
    expect(normalizeSupplier('')).toBe('');
    expect(normalizeSupplier(null)).toBe('');
    expect(normalizeSupplier(undefined)).toBe('');
  });

  it('no rompe nombres que contienen SL/SA dentro de una palabra', () => {
    expect(normalizeSupplier('Slater Pharma')).toBe('SLATER PHARMA');
  });
});

describe('sameSupplier', () => {
  it('empareja variantes del mismo proveedor', () => {
    expect(sameSupplier('Dentaid S.L.', 'DENTAID')).toBe(true);
    expect(sameSupplier('CINFA S.L.U.', 'Cinfa')).toBe(true);
  });

  it('distingue proveedores distintos', () => {
    expect(sameSupplier('Dentaid', 'Cinfa')).toBe(false);
  });

  it('dos vacíos no emparejan', () => {
    expect(sameSupplier('', '')).toBe(false);
    expect(sameSupplier(undefined, undefined)).toBe(false);
  });
});
