import { useEffect, useRef } from 'preact/hooks';

interface Props {
  value: string;
  onInput: (v: string) => void;
  onClear: () => void;
  otcOnly: boolean;
  onOtcToggle: (v: boolean) => void;
  isCN: boolean;
  autoFocus?: boolean;
}

export function SearchBar({
  value,
  onInput,
  onClear,
  otcOnly,
  onOtcToggle,
  isCN,
  autoFocus,
}: Props) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (autoFocus) ref.current?.focus();
  }, [autoFocus]);

  return (
    <div class="cima-search-wrap">
      <div class="cima-search">
        <span class="cima-search-icon" aria-hidden="true">🔍</span>
        <input
          ref={ref}
          type="search"
          placeholder={isCN ? 'Código Nacional…' : 'Buscar medicamento o CN'}
          value={value}
          onInput={(e) => onInput((e.currentTarget as HTMLInputElement).value)}
          aria-label="Buscar medicamento o código nacional"
        />
        {value && (
          <button class="cima-search-clear" onClick={onClear} aria-label="Limpiar búsqueda">×</button>
        )}
      </div>
      <div class="cima-search-tools">
        <label class="cima-toggle">
          <input
            type="checkbox"
            checked={otcOnly}
            onChange={(e) => onOtcToggle((e.currentTarget as HTMLInputElement).checked)}
          />
          <span>Solo sin receta</span>
        </label>
        {isCN && <span class="cima-mode-pill">Buscando por CN</span>}
      </div>
    </div>
  );
}

export function isCNQuery(q: string): boolean {
  const trimmed = q.trim();
  return /^\d{4,7}$/.test(trimmed);
}
