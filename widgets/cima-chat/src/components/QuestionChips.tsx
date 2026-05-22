import { chipsFor, type ChipDef, type DocMode } from '../lib/sections';
import type { CimaSeccion, DocTipo } from '../api/types';

interface Props {
  mode: DocMode;
  onModeChange: (m: DocMode) => void;
  ftSections: CimaSeccion[];
  prSections: CimaSeccion[];
  onAsk: (chip: ChipDef, tipo: DocTipo, seccion: string) => void;
  disabled?: boolean;
}

function has(list: CimaSeccion[], seccion: string): boolean {
  return list.some((s) => s.seccion === seccion);
}

export function QuestionChips({
  mode,
  onModeChange,
  ftSections,
  prSections,
  onAsk,
  disabled,
}: Props) {
  const chips = chipsFor(mode);
  const available = chips.map((chip) => {
    const primaryList = chip.tipo === 1 ? ftSections : prSections;
    if (has(primaryList, chip.seccion)) {
      return { chip, tipo: chip.tipo, seccion: chip.seccion };
    }
    if (chip.fallback) {
      const fbList = chip.fallback.tipo === 1 ? ftSections : prSections;
      if (has(fbList, chip.fallback.seccion)) {
        return { chip, tipo: chip.fallback.tipo, seccion: chip.fallback.seccion };
      }
    }
    return null;
  }).filter((x): x is { chip: ChipDef; tipo: DocTipo; seccion: string } => x !== null);

  return (
    <div class="cima-chips-block">
      <div class="cima-mode-tabs" role="tablist">
        <button
          role="tab"
          aria-selected={mode === 'patient'}
          class={`cima-mode-tab ${mode === 'patient' ? 'active' : ''}`}
          onClick={() => onModeChange('patient')}
        >
          Paciente
        </button>
        <button
          role="tab"
          aria-selected={mode === 'pro'}
          class={`cima-mode-tab ${mode === 'pro' ? 'active' : ''}`}
          onClick={() => onModeChange('pro')}
        >
          Profesional
        </button>
      </div>
      {available.length === 0 ? (
        <div class="cima-hint">No hay secciones consultables en este modo.</div>
      ) : (
        <div class="cima-chips">
          {available.map(({ chip, tipo, seccion }) => (
            <button
              key={chip.id}
              class="cima-chip"
              disabled={disabled}
              onClick={() => onAsk(chip, tipo, seccion)}
            >
              {chip.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
