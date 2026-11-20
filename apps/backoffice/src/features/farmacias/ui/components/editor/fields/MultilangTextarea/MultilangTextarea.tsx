'use client';

import { useId } from 'react';
import { Label } from '@/shared/components/atoms/Label';
import { useFarmaciaEditor } from '@/features/farmacias/ui/context/EditorContext';
import { LocaleChip } from '@/features/farmacias/ui/components/editor/status/LocaleChip';
import { computeLocaleStatus } from '@/features/farmacias/ui/lib/i18nStatus';
import { cn } from '@/shared/lib/cn';
import type { MultilangText } from '@/core/shared';
import { useFieldBinding } from '@/features/farmacias/ui/hooks/useFieldError';
import { FieldError } from '@/features/farmacias/ui/components/editor/fields/FieldError';
import { useEditingLocale } from '@/features/farmacias/ui/components/editor/fields/ModalLocaleScope';

export function MultilangTextarea({
  label,
  value,
  onChange,
  placeholder,
  rows = 3,
  maxLength,
  limiteRecomendado,
  help,
  required,
  field,
}: {
  label: string;
  value: MultilangText;
  onChange: (v: MultilangText) => void;
  placeholder?: string;
  rows?: number;
  maxLength?: number;
  /**
   * Límite orientativo: muestra el contador y avisa al pasarse, pero NO corta
   * el texto (con maxLength nativo, pegar un texto largo lo recortaba sin avisar).
   */
  limiteRecomendado?: number;
  help?: string;
  required?: boolean;
  /** Clave de validación (core/farmacias/domain/validation), p. ej. `descripcionCorta.es`. */
  field?: string;
}) {
  const { farmacia } = useFarmaciaEditor();
  const currentLocale = useEditingLocale();
  const { id, error } = useFieldBinding(field, useId());
  const showError = error?.message ? error : undefined;
  const current = value[currentLocale] ?? '';
  const status = computeLocaleStatus(value, currentLocale, farmacia.idiomasActivos);
  const limite = maxLength ?? limiteRecomendado;
  const pasado = limiteRecomendado !== undefined && current.length > limiteRecomendado;
  const nearingLimit = limite && current.length >= limite * 0.9;
  const contadorId = `${id}-contador`;
  // Solo se anuncia al cruzar un umbral, no a cada tecla.
  const aviso = !limite ? '' : pasado ? 'Has pasado el límite: Google cortará el final.' : nearingLimit ? 'Cerca del límite de caracteres.' : '';
  const describedBy = [showError?.errorId, limite ? contadorId : undefined].filter(Boolean).join(' ') || undefined;

  return (
    <div>
      <Label htmlFor={id} required={required} hint={<LocaleChip locale={currentLocale} status={status} />}>
        {label}
      </Label>
      <textarea
        id={id}
        value={current}
        onChange={(e) => onChange({ ...value, [currentLocale]: e.target.value })}
        placeholder={placeholder}
        rows={rows}
        maxLength={maxLength}
        onBlur={error?.inputProps.onBlur}
        aria-invalid={showError ? true : undefined}
        aria-describedby={describedBy}
        className={cn('field resize-y min-h-[80px]', showError && '!border-[var(--color-red-ink)]')}
      />
      {showError && <FieldError {...showError} />}
      <div className="flex justify-between mt-1.5">
        <p className="help">{help ?? ' '}</p>
        {limite && (
          <p
            id={contadorId}
            className={cn(
              'shrink-0 text-[12px]',
              pasado ? 'text-[var(--color-red-ink)]' : nearingLimit ? 'text-[var(--color-yellow-ink)]' : 'text-[var(--color-muted)]',
            )}
          >
            {current.length}/{limite}
            {pasado && <span> · Google cortará el final</span>}
          </p>
        )}
      </div>
      <p role="status" className="sr-only">
        {aviso}
      </p>
    </div>
  );
}
