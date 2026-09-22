'use client';

import { useId } from 'react';
import type { MultilangText } from '@/types/content';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { useFarmaciaEditor } from './EditorContext';
import { LocaleChip } from './LocaleChip';
import { computeLocaleStatus } from './i18nStatus';

export function MultilangInput({
  label,
  value,
  onChange,
  placeholder,
  required,
  help,
}: {
  label: string;
  value: MultilangText;
  onChange: (v: MultilangText) => void;
  placeholder?: string;
  required?: boolean;
  help?: string;
}) {
  const { currentLocale, farmacia } = useFarmaciaEditor();
  const id = useId();
  const current = value[currentLocale] ?? '';
  const status = computeLocaleStatus(value, currentLocale, farmacia.idiomasActivos);

  return (
    <div>
      <Label htmlFor={id} required={required} hint={<LocaleChip locale={currentLocale} status={status} />}>
        {label}
      </Label>
      <Input
        id={id}
        value={current}
        onChange={(e) => onChange({ ...value, [currentLocale]: e.target.value })}
        placeholder={placeholder}
      />
      {help && <p className="help">{help}</p>}
    </div>
  );
}
