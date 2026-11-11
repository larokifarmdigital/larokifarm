'use client';

import { IconoSVG } from '@/components/ui/IconoSVG';
import { NavIcon } from '@/features/shell/NavIcon';
import { cn } from '@/lib/utils';

/**
 * Mini-mockup "live preview" al lado del input que está editando el user.
 * Objetivo: atacar el miedo real "no sé si se verá en la web".
 *
 * NO es pixel-perfect de la landing: es un recordatorio visual de case/weight/shape
 * para que la farmacéutica confirme que está rellenando lo correcto antes de guardar.
 */

type FeatureValue = {
  titulo: string;
  descripcion?: string;
  icono?: string;
};

type Props =
  | { kind: 'heroChip'; value: string }
  | { kind: 'heroTitulo'; value: string }
  | { kind: 'featureCard'; value: FeatureValue };

const CONTAINER_BASE =
  'rounded-[var(--radius-md)] border border-[var(--color-hairline)] bg-[var(--color-surface-sunken)] p-3 h-full';
const STAGE_BASE =
  'rounded-[var(--radius-sm)] bg-[var(--color-surface)] border border-[var(--color-hairline)]/60 px-4 py-4 flex items-center justify-center min-h-[72px]';

export function FieldPreview(props: Props) {
  return (
    <div className={CONTAINER_BASE}>
      <div className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--color-muted-2)]">
        <NavIcon name="MagnifyingGlassPlus" size={10} />
        Vista previa en la web
      </div>
      <div className={STAGE_BASE}>{renderPreview(props)}</div>
    </div>
  );
}

function renderPreview(props: Props) {
  if (props.kind === 'heroChip') {
    const text = props.value?.trim();
    if (!text) {
      return (
        <span className="italic text-[12px] text-[var(--color-muted-2)]">
          El chip aparecerá aquí
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-accent)]/25 bg-[var(--color-accent-soft)] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--color-accent-ink)]">
        <NavIcon name="MapPin" size={10} weight="bold" />
        <span className="truncate max-w-[200px]">{text}</span>
      </span>
    );
  }

  if (props.kind === 'heroTitulo') {
    const text = props.value?.trim();
    if (!text) {
      return (
        <span className="italic text-[12px] text-[var(--color-muted-2)]">
          Tu título aparecerá aquí
        </span>
      );
    }
    return (
      <span
        className={cn(
          'block text-center text-[18px] font-extrabold tracking-[-0.02em] leading-[1.1] text-[var(--color-accent-ink)]',
          text.length > 24 && 'text-[16px]',
          text.length > 40 && 'text-[14px]',
        )}
      >
        {text}
      </span>
    );
  }

  // featureCard
  const { titulo, descripcion, icono } = props.value;
  const hasTitle = !!titulo?.trim();
  const hasDesc = !!descripcion?.trim();
  const isClock = icono === 'clock';
  return (
    <div className="flex items-center gap-3 w-full">
      <div
        className={cn(
          'h-11 w-11 shrink-0 rounded-[10px] flex items-center justify-center',
          icono
            ? 'bg-[var(--color-accent-soft)] text-[var(--color-accent)]'
            : 'bg-[var(--color-surface-sunken)] text-[var(--color-muted-2)]',
        )}
      >
        {icono ? (
          <IconoSVG nombre={icono} size={22} />
        ) : (
          <NavIcon name="Image" size={14} />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div
          className={cn(
            'text-[14px] font-extrabold leading-tight truncate',
            hasTitle
              ? 'text-[var(--color-ink)]'
              : 'italic text-[var(--color-muted-2)] font-normal',
          )}
        >
          {hasTitle ? titulo : 'Título de la tarjeta'}
        </div>
        {hasDesc ? (
          <div className="mt-0.5 text-[12px] text-[var(--color-muted)] leading-tight line-clamp-2">
            {descripcion}
          </div>
        ) : isClock ? (
          <div className="mt-0.5 text-[12px] italic text-[var(--color-muted-2)] leading-tight">
            Mostrará el horario auto-calculado
          </div>
        ) : null}
      </div>
    </div>
  );
}
