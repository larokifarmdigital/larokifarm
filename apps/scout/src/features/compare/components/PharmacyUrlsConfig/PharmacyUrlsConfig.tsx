'use client';

import { useState } from 'react';
import { Button } from '@/shared/components/atoms/Button';
import { usePharmacyUrls, savePharmacyUrls } from './usePharmacyUrls';

function normalizeUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const withProtocol = trimmed.startsWith('http') ? trimmed : `https://${trimmed}`;
  try {
    const u = new URL(withProtocol);
    // Guardamos como "https://dominio" — sin path, sin trailing slash.
    return `${u.protocol}//${u.hostname}`;
  } catch {
    return null;
  }
}

export function PharmacyUrlsConfig() {
  const urls = usePharmacyUrls();
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);

  function handleAdd() {
    setError(null);
    const normalized = normalizeUrl(draft);
    if (!normalized) {
      setError('URL inválida. Ejemplo: https://www.atida.com');
      return;
    }
    if (urls.includes(normalized)) {
      setError('Ya está en la lista.');
      return;
    }
    savePharmacyUrls([...urls, normalized]);
    setDraft('');
  }

  function handleRemove(url: string) {
    savePharmacyUrls(urls.filter((u) => u !== url));
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    }
  }

  return (
    <section
      className="space-y-3 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"
      aria-label="Configuración de farmacias"
    >
      <header className="flex items-baseline justify-between">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          Farmacias configuradas
        </h2>
        <span className="text-xs text-zinc-500 dark:text-zinc-500">
          {urls.length} URL{urls.length === 1 ? '' : 's'}
        </span>
      </header>

      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        Añadí las URLs base de las farmacias donde querés buscar precios. Se guardan en este
        navegador. Ejemplo:{' '}
        <code className="rounded bg-zinc-100 px-1 py-0.5 font-mono text-[11px] dark:bg-zinc-800">
          https://www.atida.com
        </code>
      </p>

      <div className="flex gap-2">
        <input
          type="url"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="https://www.mifarmacia.com"
          className="flex-1 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
        />
        <Button type="button" onClick={handleAdd}>
          Añadir
        </Button>
      </div>

      {error && (
        <p className="text-xs text-rose-600 dark:text-rose-400" role="alert">
          {error}
        </p>
      )}

      {urls.length === 0 ? (
        <div className="rounded-md border border-dashed border-zinc-300 p-3 text-center text-xs text-zinc-500 dark:border-zinc-700">
          Aún no hay farmacias configuradas.
        </div>
      ) : (
        <ul className="space-y-1">
          {urls.map((url) => (
            <li
              key={url}
              className="flex items-center justify-between gap-2 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-900/50"
            >
              <span className="truncate font-mono text-xs text-zinc-700 dark:text-zinc-300">
                {url}
              </span>
              <button
                type="button"
                onClick={() => handleRemove(url)}
                className="shrink-0 rounded px-2 py-1 text-xs font-medium text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/30"
                aria-label={`Eliminar ${url}`}
              >
                Eliminar
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
