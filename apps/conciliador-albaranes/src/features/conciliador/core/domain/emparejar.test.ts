import { describe, expect, it } from 'vitest';
import { claveArchivo, emparejar, tipoPorNombre, type ItemArchivo } from './emparejar';

describe('tipoPorNombre', () => {
  it('clasifica por extensión', () => {
    expect(tipoPorNombre('a.pdf')).toBe('pdf');
    expect(tipoPorNombre('a.PDF')).toBe('pdf');
    expect(tipoPorNombre('a.xlsx')).toBe('excel');
    expect(tipoPorNombre('a.xls')).toBe('excel');
    expect(tipoPorNombre('a.txt')).toBeNull();
  });
});

describe('claveArchivo', () => {
  it('ignora extensión, tildes y palabras de rol', () => {
    expect(claveArchivo('DENTAID_albaran.pdf')).toBe('dentaid');
    expect(claveArchivo('DENTAID_pedido.xlsx')).toBe('dentaid');
    expect(claveArchivo('Aragó - albarán.pdf')).toBe('arago');
  });
});

describe('emparejar', () => {
  const items = (nombres: string[]): ItemArchivo[] =>
    nombres.map((n) => ({ nombre: n, tipo: tipoPorNombre(n)! })).filter((i) => i.tipo);

  it('empareja PDF + Excel por nombre', () => {
    const { pares, sueltos } = emparejar(
      items(['DENTAID_albaran.pdf', 'DENTAID_pedido.xlsx', 'CINFA_alb.pdf', 'CINFA_ped.xlsx']),
    );
    expect(pares).toHaveLength(2);
    expect(sueltos).toHaveLength(0);
    expect(pares.map((p) => p.clave).sort()).toEqual(['cinfa', 'dentaid']);
  });

  it('deja sueltos los que no casan', () => {
    const { pares, sueltos } = emparejar(
      items(['DENTAID_albaran.pdf', 'OTRO_pedido.xlsx']),
    );
    expect(pares).toHaveLength(0);
    expect(sueltos).toHaveLength(2);
  });

  it('un albarán sin su pedido queda suelto', () => {
    const { pares, sueltos } = emparejar(
      items(['DENTAID_albaran.pdf', 'DENTAID_pedido.xlsx', 'SOLO_albaran.pdf']),
    );
    expect(pares).toHaveLength(1);
    expect(sueltos.map((s) => s.nombre)).toEqual(['SOLO_albaran.pdf']);
  });

  it('agrupa varios PDFs con la misma clave en un único par (albarán + factura)', () => {
    const { pares, sueltos } = emparejar(
      items(['NESTLE_albaran.pdf', 'NESTLE_factura.pdf', 'NESTLE_pedido.xlsx']),
    );
    expect(pares).toHaveLength(1);
    expect(sueltos).toHaveLength(0);
    expect(pares[0].pdfs).toHaveLength(2);
    expect(pares[0].pdfs.map((p) => p.nombre).sort()).toEqual([
      'NESTLE_albaran.pdf',
      'NESTLE_factura.pdf',
    ]);
  });
});
