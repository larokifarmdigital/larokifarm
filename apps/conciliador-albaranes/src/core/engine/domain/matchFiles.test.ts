import { describe, expect, it } from 'vitest';
import { fileKey, fileKindFromName, matchFiles, type FileItem } from './matchFiles';

describe('fileKindFromName', () => {
  it('clasifica por extensión', () => {
    expect(fileKindFromName('a.pdf')).toBe('pdf');
    expect(fileKindFromName('a.PDF')).toBe('pdf');
    expect(fileKindFromName('a.xlsx')).toBe('excel');
    expect(fileKindFromName('a.xls')).toBe('excel');
    expect(fileKindFromName('a.txt')).toBeNull();
  });
});

describe('fileKey', () => {
  it('ignora extensión, tildes y palabras de rol', () => {
    expect(fileKey('DENTAID_albaran.pdf')).toBe('dentaid');
    expect(fileKey('DENTAID_pedido.xlsx')).toBe('dentaid');
    expect(fileKey('Aragó - albarán.pdf')).toBe('arago');
  });
});

describe('matchFiles', () => {
  const items = (names: string[]): FileItem[] =>
    names.map((n) => ({ name: n, kind: fileKindFromName(n)! })).filter((i) => i.kind);

  it('empareja PDF + Excel por nombre', () => {
    const { pairs, unmatched } = matchFiles(
      items(['DENTAID_albaran.pdf', 'DENTAID_pedido.xlsx', 'CINFA_alb.pdf', 'CINFA_ped.xlsx']),
    );
    expect(pairs).toHaveLength(2);
    expect(unmatched).toHaveLength(0);
    expect(pairs.map((p) => p.key).sort()).toEqual(['cinfa', 'dentaid']);
  });

  it('deja sueltos los que no casan', () => {
    const { pairs, unmatched } = matchFiles(
      items(['DENTAID_albaran.pdf', 'OTRO_pedido.xlsx']),
    );
    expect(pairs).toHaveLength(0);
    expect(unmatched).toHaveLength(2);
  });

  it('un albarán sin su pedido queda suelto', () => {
    const { pairs, unmatched } = matchFiles(
      items(['DENTAID_albaran.pdf', 'DENTAID_pedido.xlsx', 'SOLO_albaran.pdf']),
    );
    expect(pairs).toHaveLength(1);
    expect(unmatched.map((s) => s.name)).toEqual(['SOLO_albaran.pdf']);
  });

  it('agrupa varios PDFs con la misma clave en un único par (albarán + factura)', () => {
    const { pairs, unmatched } = matchFiles(
      items(['NESTLE_albaran.pdf', 'NESTLE_factura.pdf', 'NESTLE_pedido.xlsx']),
    );
    expect(pairs).toHaveLength(1);
    expect(unmatched).toHaveLength(0);
    expect(pairs[0].pdfs).toHaveLength(2);
    expect(pairs[0].pdfs.map((p) => p.name).sort()).toEqual([
      'NESTLE_albaran.pdf',
      'NESTLE_factura.pdf',
    ]);
  });
});
