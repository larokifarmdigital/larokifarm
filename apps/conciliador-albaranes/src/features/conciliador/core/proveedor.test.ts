import { describe, expect, it } from 'vitest';
import { mismoProveedor, normalizarProveedor } from './proveedor';

describe('normalizarProveedor', () => {
  it('quita sufijos societarios y normaliza', () => {
    expect(normalizarProveedor('Dentaid S.L.')).toBe('DENTAID');
    expect(normalizarProveedor('DENTAID')).toBe('DENTAID');
    expect(normalizarProveedor('Cinfa S.L.U.')).toBe('CINFA');
    expect(normalizarProveedor('Laboratorios XYZ, S.A.')).toBe('LABORATORIOS XYZ');
  });

  it('quita tildes y espacios sobrantes', () => {
    expect(normalizarProveedor('  Farmacéutica  Aragó  ')).toBe('FARMACEUTICA ARAGO');
  });

  it('Sociedad Limitada / Anónima escritas completas', () => {
    expect(normalizarProveedor('Acme Sociedad Limitada')).toBe('ACME');
    expect(normalizarProveedor('Acme Sociedad Anónima Unipersonal')).toBe('ACME');
  });

  it('vacío', () => {
    expect(normalizarProveedor('')).toBe('');
    expect(normalizarProveedor(null)).toBe('');
    expect(normalizarProveedor(undefined)).toBe('');
  });

  it('no rompe nombres que contienen SL/SA dentro de una palabra', () => {
    expect(normalizarProveedor('Slater Pharma')).toBe('SLATER PHARMA');
  });
});

describe('mismoProveedor', () => {
  it('empareja variantes del mismo proveedor', () => {
    expect(mismoProveedor('Dentaid S.L.', 'DENTAID')).toBe(true);
    expect(mismoProveedor('CINFA S.L.U.', 'Cinfa')).toBe(true);
  });

  it('distingue proveedores distintos', () => {
    expect(mismoProveedor('Dentaid', 'Cinfa')).toBe(false);
  });

  it('dos vacíos no emparejan', () => {
    expect(mismoProveedor('', '')).toBe(false);
    expect(mismoProveedor(undefined, undefined)).toBe(false);
  });
});
