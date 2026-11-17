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
  const nearingLimit = maxLength && current.length >= maxLength * 0.9;

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
        aria-describedby={showError ? showError.errorId : undefined}
        className={cn('field resize-y min-h-[80px]', showError && '!border-[var(--color-red-ink)]')}
      />
      {showError && <FieldError {...showError} />}
      <div className="flex justify-between mt-1.5">
        <p className="help">{help ?? ' '}</p>
        {maxLength && (
          <p
            className={cn(
              'text-[11px]',
              nearingLimit ? 'text-[var(--color-yellow-ink)]' : 'text-[var(--color-muted-2)]',
            )}
          >
            {current.length}/{maxLength}
          </p>
        )}
      </div>
    </div>
  );
}
