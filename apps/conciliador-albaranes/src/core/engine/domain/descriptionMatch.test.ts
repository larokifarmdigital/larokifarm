import { describe, expect, it } from 'vitest';
import {
  descriptionMatches,
  descriptionSimilarity,
  normalizeDescriptionTokens,
} from './descriptionMatch';

describe('descriptionMatch — casos reales de Zambon', () => {
  it('ULTRA-LEVURA 250MG 20 CAPS ↔ ULTRA-LEVURA 250MG 20CPS -BL-', () => {
    expect(descriptionMatches(
      'ULTRA-LEVURA 250MG 20 CAPS',
      'ULTRA-LEVURA 250MG 20CPS -BL-',
    )).toBe(true);
  });

  it('ULTRA-LEVURA 250MG 20 SOB ↔ ULTRA-LEVURA 250MG 20SOBRES', () => {
    expect(descriptionMatches(
      'ULTRA-LEVURA 250MG 20 SOB',
      'ULTRA-LEVURA 250MG 20SOBRES',
    )).toBe(true);
  });

  it('ESPIDIFEN 600MG 40 SOB MENTA EFG ↔ ESPIDIFEN 600MG MENTA EFG 40SOB', () => {
    // Orden distinto de palabras — Jaccard 1.0 tras normalizar.
    expect(descriptionMatches(
      'ESPIDIFEN 600MG 40 SOB MENTA EFG',
      'ESPIDIFEN 600MG MENTA EFG 40SOB',
    )).toBe(true);
  });

  it('ESPIDIDOL 400 MG MENTA 20 SOB ↔ ESPIDIDOL 400MG MENTA 20SOB', () => {
    expect(descriptionMatches(
      'ESPIDIDOL 400 MG MENTA 20 SOB',
      'ESPIDIDOL 400MG MENTA 20SOB',
    )).toBe(true);
  });

  it('FLUTOX JARABE 200ML ↔ FLUTOX 3,54MG/ML JARABE 200ML S/R', () => {
    expect(descriptionMatches(
      'FLUTOX JARABE 200ML',
      'FLUTOX 3,54MG/ML JARABE 200ML S/R',
    )).toBe(true);
  });

  it('ULTRA-LEVURA 250MG 10 CAPS ↔ ULTRA-LEVURA 250MG 10CPS -BL-', () => {
    expect(descriptionMatches(
      'ULTRA-LEVURA 250MG 10 CAPS',
      'ULTRA-LEVURA 250MG 10CPS -BL-',
    )).toBe(true);
  });

  it('FLUIMUCIL FORTE 600MG 20 COMP. EFV ↔ FLUIMUCIL FORTE 600MG 20CPR EFV', () => {
    expect(descriptionMatches(
      'FLUIMUCIL FORTE 600MG 20 COMP. EFV',
      'FLUIMUCIL FORTE 600MG 20CPR EFV',
    )).toBe(true);
  });

  it('ESPIDIDOL 400MG 18 COMP ↔ ESPIDIDOL 400MG 18 COMP REC', () => {
    expect(descriptionMatches(
      'ESPIDIDOL 400MG 18 COMP',
      'ESPIDIDOL 400MG 18 COMP REC',
    )).toBe(true);
  });
});

describe('descriptionMatch — falsos positivos que hay que rechazar', () => {
  it('PARACETAMOL 500MG 20 COMP ↔ PARACETAMOL 1G 10 COMP (dosis distinta, misma marca)', () => {
    // Primera palabra coincide pero dosis y cantidad divergen.
    expect(descriptionMatches(
      'PARACETAMOL 500MG 20 COMP',
      'PARACETAMOL 1G 10 COMP',
    )).toBe(false);
  });

  it('ULTRA-LEVURA 250MG 20 CAPS ↔ IBUPROFENO 400MG 20 COMP (marcas distintas)', () => {
    expect(descriptionMatches(
      'ULTRA-LEVURA 250MG 20 CAPS',
      'IBUPROFENO 400MG 20 COMP',
    )).toBe(false);
  });

  it('ESPIDIFEN 400MG 20 SOB ↔ ESPIDIDOL 400MG 20 SOB (marcas parecidas, distintas)', () => {
    // Primer token distinto (ESPIDIFEN vs ESPIDIDOL) → rechazo por safeguard.
    expect(descriptionMatches(
      'ESPIDIFEN 400MG 20 SOB',
      'ESPIDIDOL 400MG 20 SOB',
    )).toBe(false);
  });

  it('ULTRA-LEVURA 250MG 20 CAPS ↔ ULTRA-LEVURA 250MG 10 CAPS (misma marca, presentacion distinta)', () => {
    // Ambas son ULTRA-LEVURA, misma dosis, pero envases distintos (20 vs 10).
    // La regla numerica debe rechazarlas: el 20 no aparece en la otra.
    expect(descriptionMatches(
      'ULTRA-LEVURA 250MG 20 CAPS',
      'ULTRA-LEVURA 250MG 10 CAPS',
    )).toBe(false);
  });

  it('PARACETAMOL 500MG 20 COMP ↔ PARACETAMOL 500MG 30 COMP (mismo principio, distintos envases)', () => {
    expect(descriptionMatches(
      'PARACETAMOL 500MG 20 COMP',
      'PARACETAMOL 500MG 30 COMP',
    )).toBe(false);
  });

  it('ULTRA-LEVURA 250MG 20 CAPS ↔ ULTRA-LEVURA 250MG 20 SOB (misma marca+dosis+cantidad, formatos distintos)', () => {
    // Ambos son ULTRA-LEVURA de 20 unidades, misma dosis — pero uno es
    // cápsulas y otro sobres. Son SKUs distintos. Sin el safeguard de
    // FORMAT_TOKENS el overlap sube a 0.83 y cruzaban por error, mezclando
    // los grupos union-find de 710177 y 700755.
    expect(descriptionMatches(
      'ULTRA-LEVURA 250MG 20 CAPS',
      'ULTRA-LEVURA 250MG 20 SOB',
    )).toBe(false);
  });

  it('ULTRA-LEVURA 250MG 20CPS -BL- ↔ ULTRA-LEVURA 250MG 20SOBRES (mismo Zambon 710177 vs 700755)', () => {
    expect(descriptionMatches(
      'ULTRA-LEVURA 250MG 20CPS -BL-',
      'ULTRA-LEVURA 250MG 20SOBRES',
    )).toBe(false);
  });

  it('ESPIDIDOL 400MG MENTA 20SOB ↔ ESPIDIDOL 400MG 18 COMP (misma marca, formatos distintos)', () => {
    expect(descriptionMatches(
      'ESPIDIDOL 400MG MENTA 20SOB',
      'ESPIDIDOL 400MG 18 COMP',
    )).toBe(false);
  });

  it('rechaza descripciones vacias', () => {
    expect(descriptionMatches('', 'PARACETAMOL 500MG')).toBe(false);
    expect(descriptionMatches('PARACETAMOL 500MG', '')).toBe(false);
    expect(descriptionMatches('', '')).toBe(false);
  });
});

describe('descriptionSimilarity y normalizacion', () => {
  it('similarity = 1 para descripciones equivalentes tras normalizar', () => {
    expect(descriptionSimilarity(
      'ESPIDIDOL 400 MG MENTA 20 SOB',
      'ESPIDIDOL 400MG MENTA 20SOBRES',
    )).toBe(1);
  });

  it('tokeniza separando digitos y letras pegados', () => {
    expect(normalizeDescriptionTokens('20CPS')).toEqual(['20', 'cap']);
    expect(normalizeDescriptionTokens('400MG')).toEqual(['400', 'mg']);
  });

  it('normaliza sinonimos farma (CPS→cap, SOBRES→sob, CPR→comp)', () => {
    expect(normalizeDescriptionTokens('CAPS')).toEqual(['cap']);
    expect(normalizeDescriptionTokens('SOBRES')).toEqual(['sob']);
    expect(normalizeDescriptionTokens('CPR')).toEqual(['comp']);
    expect(normalizeDescriptionTokens('COMPRIMIDOS')).toEqual(['comp']);
  });
});
