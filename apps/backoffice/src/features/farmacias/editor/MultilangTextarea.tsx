'use client';

import { useId } from 'react';
import type { MultilangText } from '@/types/content';
import { Label } from '@/components/ui/Label';
import { useFarmaciaEditor } from './EditorContext';
import { LocaleChip } from './LocaleChip';
import { computeLocaleStatus } from './i18nStatus';
import { cn } from '@/lib/utils';

export function MultilangTextarea({
  label,
  value,
  onChange,
  placeholder,
  rows = 3,
  maxLength,
  help,
}: {
  label: string;
  value: MultilangText;
  onChange: (v: MultilangText) => void;
  placeholder?: string;
  rows?: number;
  maxLength?: number;
  help?: string;
}) {
  const { currentLocale, farmacia } = useFarmaciaEditor();
  const id = useId();
  const current = value[currentLocale] ?? '';
  const status = computeLocaleStatus(value, currentLocale, farmacia.idiomasActivos);
  const nearingLimit = maxLength && current.length >= maxLength * 0.9;

  return (
    <div>
      <Label htmlFor={id} hint={<LocaleChip locale={currentLocale} status={status} />}>
        {label}
      </Label>
      <textarea
        id={id}
        value={current}
        onChange={(e) => onChange({ ...value, [currentLocale]: e.target.value })}
        placeholder={placeholder}
        rows={rows}
        maxLength={maxLength}
        className="field resize-y min-h-[80px]"
      />
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
