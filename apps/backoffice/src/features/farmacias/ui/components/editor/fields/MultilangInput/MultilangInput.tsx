'use client';

import { useId } from 'react';
import type { MultilangText } from '@/core/shared';
import { Input } from '@/shared/components/atoms/Input';
import { Label } from '@/shared/components/atoms/Label';
import { useFarmaciaEditor } from '@/features/farmacias/ui/context/EditorContext';
import { LocaleChip } from '@/features/farmacias/ui/components/editor/status/LocaleChip';
import { computeLocaleStatus } from '@/features/farmacias/ui/lib/i18nStatus';

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
