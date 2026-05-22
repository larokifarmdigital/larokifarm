export interface ProfileDef {
  id: string;
  label: string;
  emoji: string;
  safe: Set<string>;
  warning?: string;
}

const ALL_ADULT = new Set([
  'paracetamol', 'ibuprofeno', 'naproxeno', 'diclofenaco',
  'loratadina', 'cetirizina', 'ebastina', 'bilastina',
  'omeprazol', 'almagato', 'famotidina', 'ranitidina',
  'dextrometorfano', 'ambroxol', 'cloperastina', 'guaifenesina',
  'oximetazolina', 'xilometazolina', 'fenilefrina', 'suero',
  'dimetindeno', 'hidrocortisona', 'aciclovir',
  'lactulosa', 'macrogol', 'bisacodilo',
  'loperamida', 'racecadotrilo',
]);

export const PROFILES: ProfileDef[] = [
  {
    id: 'bebe',
    label: 'Bebé (<2 años)',
    emoji: '👶',
    safe: new Set(['paracetamol', 'ibuprofeno', 'suero']),
    warning: 'En menores de 6 meses consulta SIEMPRE al pediatra antes de administrar cualquier medicamento.',
  },
  {
    id: 'nino',
    label: 'Niño (2-11 años)',
    emoji: '🧒',
    safe: new Set([
      'paracetamol', 'ibuprofeno', 'suero',
      'loratadina', 'cetirizina',
      'dextrometorfano', 'ambroxol',
    ]),
    warning: 'Las dosis pediátricas dependen del peso. Consulta el prospecto o pregunta al farmacéutico.',
  },
  {
    id: 'adolescente',
    label: 'Adolescente (12-17)',
    emoji: '🧑‍🎓',
    safe: new Set([
      'paracetamol', 'ibuprofeno', 'naproxeno',
      'loratadina', 'cetirizina', 'ebastina', 'bilastina',
      'dextrometorfano', 'ambroxol', 'cloperastina',
      'oximetazolina', 'xilometazolina', 'suero',
      'omeprazol', 'almagato', 'famotidina',
      'dimetindeno', 'aciclovir',
      'loperamida', 'lactulosa', 'macrogol',
    ]),
    warning: 'Evita la aspirina (ácido acetilsalicílico) en menores de 16 años.',
  },
  {
    id: 'adulto',
    label: 'Adulto',
    emoji: '🧑',
    safe: ALL_ADULT,
  },
  {
    id: 'embarazada',
    label: 'Embarazada',
    emoji: '🤰',
    safe: new Set(['paracetamol']),
    warning: 'Durante el embarazo solo se considera de uso generalmente seguro el paracetamol. Consulta SIEMPRE a tu médico o matrona antes de tomar nada.',
  },
  {
    id: 'lactancia',
    label: 'Lactancia',
    emoji: '🤱',
    safe: new Set(['paracetamol', 'ibuprofeno']),
    warning: 'Durante la lactancia paracetamol e ibuprofeno son los de elección a corto plazo. Consulta a tu médico para tratamientos prolongados.',
  },
  {
    id: 'mayor',
    label: '+65 años',
    emoji: '👴',
    safe: new Set([
      'paracetamol',
      'loratadina', 'cetirizina', 'bilastina',
      'omeprazol', 'famotidina',
      'dextrometorfano', 'ambroxol',
      'suero', 'oximetazolina',
      'aciclovir', 'lactulosa', 'macrogol',
    ]),
    warning: 'En mayores de 65 años hay que tener especial cuidado con AINEs (ibuprofeno, naproxeno) por su impacto renal y digestivo. Consulta antes con tu médico.',
  },
];

export function profileById(id: string): ProfileDef | undefined {
  return PROFILES.find((p) => p.id === id);
}

export function activosFor(symptomActivos: string[], profileSafe: Set<string>): string[] {
  return symptomActivos.filter((a) => profileSafe.has(a));
}
