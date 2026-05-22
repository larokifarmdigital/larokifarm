export interface SymptomDef {
  id: string;
  label: string;
  emoji: string;
  activos: string[];
}

export const SYMPTOMS: SymptomDef[] = [
  { id: 'fiebre',     label: 'Fiebre',                emoji: '🤒', activos: ['paracetamol', 'ibuprofeno'] },
  { id: 'cabeza',     label: 'Dolor de cabeza',       emoji: '🤕', activos: ['paracetamol', 'ibuprofeno', 'naproxeno'] },
  { id: 'muscular',   label: 'Dolor muscular',        emoji: '💪', activos: ['ibuprofeno', 'diclofenaco', 'naproxeno', 'paracetamol'] },
  { id: 'congestion', label: 'Congestión nasal',      emoji: '🤧', activos: ['oximetazolina', 'xilometazolina', 'suero', 'fenilefrina'] },
  { id: 'tos',        label: 'Tos',                   emoji: '😷', activos: ['dextrometorfano', 'ambroxol', 'cloperastina', 'guaifenesina'] },
  { id: 'alergia',    label: 'Alergia',               emoji: '🌼', activos: ['loratadina', 'cetirizina', 'ebastina', 'bilastina'] },
  { id: 'acidez',     label: 'Acidez / ardor',        emoji: '🔥', activos: ['omeprazol', 'almagato', 'famotidina', 'ranitidina'] },
  { id: 'menstrual',  label: 'Dolor menstrual',       emoji: '🩸', activos: ['ibuprofeno', 'naproxeno', 'paracetamol'] },
  { id: 'picaduras',  label: 'Picaduras',             emoji: '🦟', activos: ['dimetindeno', 'hidrocortisona'] },
  { id: 'herpes',     label: 'Herpes labial',         emoji: '💋', activos: ['aciclovir'] },
  { id: 'estrenido',  label: 'Estreñimiento',         emoji: '🚽', activos: ['lactulosa', 'macrogol', 'bisacodilo'] },
  { id: 'gastro',     label: 'Diarrea',               emoji: '💧', activos: ['loperamida', 'racecadotrilo'] },
];

export function symptomById(id: string): SymptomDef | undefined {
  return SYMPTOMS.find((s) => s.id === id);
}
