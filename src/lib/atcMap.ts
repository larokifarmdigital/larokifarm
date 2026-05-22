export const ACTIVO_TO_ATC: Record<string, string> = {
  paracetamol: 'N02BE01',
  ibuprofeno: 'M01AE01',
  naproxeno: 'M01AE02',
  diclofenaco: 'M01AB05',

  loratadina: 'R06AX13',
  cetirizina: 'R06AE07',
  ebastina: 'R06AX22',
  bilastina: 'R06AX29',
  dimetindeno: 'R06AB03',

  omeprazol: 'A02BC01',
  almagato: 'A02AD02',
  famotidina: 'A02BA03',
  ranitidina: 'A02BA02',

  dextrometorfano: 'R05DA09',
  ambroxol: 'R05CB06',
  cloperastina: 'R05DB21',
  guaifenesina: 'R05CA03',

  oximetazolina: 'R01AA05',
  xilometazolina: 'R01AA07',
  fenilefrina: 'R01AA04',

  hidrocortisona: 'D07AA02',
  aciclovir: 'D06BB03',

  lactulosa: 'A06AD11',
  macrogol: 'A06AD15',
  bisacodilo: 'A06AB02',

  loperamida: 'A07DA03',
  racecadotrilo: 'A07XA04',
};

export function atcFor(activo: string): string | undefined {
  return ACTIVO_TO_ATC[activo.toLowerCase()];
}
