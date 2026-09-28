'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { NavIcon } from '@/features/shell/NavIcon';
import {
  fileKindFromName,
  matchFiles,
  type FileItem,
  type MatchedPair,
} from '@/lib/conciliador/matchFiles';
import { Dropzone } from './Dropzone';

// Adjuntamos el File original al FileItem para poder mostrar tamaño y, más
// adelante (1.C.3), enviarlo al worker.
type StagedFile = FileItem & { file: File; id: string };

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

type Props = {
  standaloneUrl: string;
};

export function NuevaConciliacionView({ standaloneUrl }: Props) {
  const [staged, setStaged] = useState<StagedFile[]>([]);

  function addFiles(incoming: File[]) {
    setStaged((prev) => {
      const seen = new Set(prev.map((s) => s.name + ':' + s.file.size));
      const next = [...prev];
      for (const f of incoming) {
        const kind = fileKindFromName(f.name);
        if (!kind) continue; // ignoramos formatos no soportados en silencio
        const dedupeKey = f.name + ':' + f.size;
        if (seen.has(dedupeKey)) continue;
        seen.add(dedupeKey);
        next.push({
          id: crypto.randomUUID(),
          name: f.name,
          kind,
          file: f,
        });
      }
      return next;
    });
  }

  function removeStaged(id: string) {
    setStaged((prev) => prev.filter((s) => s.id !== id));
  }

  function reset() {
    setStaged([]);
  }

  const { pairs, unmatched } = useMemo(() => matchFiles(staged), [staged]);

  const hasFiles = staged.length > 0;
  const canRun = pairs.length > 0;

  return (
    <div className="max-w-[960px] mx-auto px-3 sm:px-6 lg:px-8 pt-8 sm:pt-12 pb-16 sm:pb-24 space-y-8">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <Link
            href="/albaranes"
            className="text-[13px] text-[var(--color-muted)] hover:text-[var(--color-ink-2)] inline-flex items-center gap-1"
          >
            <NavIcon name="CaretRight" size={11} className="rotate-180" />
            Volver a albaranes
          </Link>
          <h1 className="h-display m-0 mt-2">Nueva conciliación</h1>
          <p className="mt-2 text-[14px] text-[var(--color-muted)] m-0 max-w-[560px]">
            Sube los albaranes (PDF) y los pedidos (Excel). Se emparejan por nombre.
          </p>
        </div>
      </header>

      {/* Dropzone */}
      <Dropzone onFiles={addFiles} />

      {/* Pares detectados */}
      {hasFiles && (
        <section>
          <div className="flex items-end justify-between mb-3">
            <h2 className="text-[16px] leading-tight tracking-[-0.02em] font-medium text-[var(--color-ink)] m-0">
              Pares detectados{' '}
              <span className="text-[var(--color-muted)] font-normal">({pairs.length})</span>
            </h2>
            {staged.length > 0 && (
              <button
                type="button"
                onClick={reset}
                className="text-[13px] text-[var(--color-muted)] hover:text-[var(--color-red-ink)] underline underline-offset-[3px] decoration-transparent hover:decoration-current"
              >
                Vaciar
              </button>
            )}
          </div>

          {pairs.length === 0 ? (
            <div className="card p-6 text-center">
              <p className="text-[13.5px] text-[var(--color-muted)] m-0">
                Aún no hay ningún par completo. Necesitas al menos un PDF y un Excel con
                claves de nombre coincidentes.
              </p>
            </div>
          ) : (
            <ul className="space-y-2">
              {pairs.map((pair) => (
                <PairCard key={pair.key} pair={pair} onRemove={removeStaged} />
              ))}
            </ul>
          )}
        </section>
      )}

      {/* Unmatched */}
      {unmatched.length > 0 && (
        <section>
          <h3 className="text-[14px] font-medium text-[var(--color-ink-2)] m-0 mb-2">
            Sin emparejar ({unmatched.length})
          </h3>
          <ul className="space-y-1.5">
            {unmatched.map((u) => {
              const staged_ = u as StagedFile;
              return (
                <li
                  key={staged_.id}
                  className="card px-4 py-2.5 flex items-center gap-3 border-l-2 border-l-[var(--color-yellow-ink,#B45309)]"
                >
                  <NavIcon
                    name="Info"
                    size={14}
                    className="text-[var(--color-muted)] shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-[13.5px] text-[var(--color-ink)] truncate">
                      {staged_.name}
                    </div>
                    <div className="text-[11.5px] text-[var(--color-muted)]">
                      {staged_.kind === 'pdf'
                        ? 'PDF sin Excel correspondiente'
                        : 'Excel sin PDF correspondiente'}{' '}
                      · {formatBytes(staged_.file.size)}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeStaged(staged_.id)}
                    aria-label={`Quitar ${staged_.name}`}
                    className="flex h-7 w-7 items-center justify-center rounded-[4px] text-[var(--color-muted)] hover:text-[var(--color-red-ink)] hover:bg-[var(--color-surface-sunken)]"
                  >
                    <NavIcon name="X" size={13} />
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* Ejecutar */}
      {hasFiles && (
        <section className="border-t border-[var(--color-hairline)] pt-6">
          <div className="rounded-[8px] border border-[var(--color-accent-tint)] bg-[var(--color-accent-soft)] px-5 py-4 mb-4">
            <div className="flex items-start gap-3">
              <NavIcon
                name="Info"
                size={16}
                weight="fill"
                className="text-[var(--color-accent)] shrink-0 mt-0.5"
              />
              <div className="flex-1">
                <p className="text-[13.5px] font-medium text-[var(--color-ink)] m-0">
                  El botón de ejecutar aún no está conectado al worker.
                </p>
                <p className="text-[13px] text-[var(--color-ink-2)] m-0 mt-1 leading-[1.55]">
                  Llegará en Fase 1.C.3 (JWT compartido con el worker del conciliador).
                  Mientras tanto, para ejecutar una conciliación real usa el conciliador
                  standalone en otra pestaña.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <p className="text-[13px] text-[var(--color-muted)] m-0">
              {canRun
                ? `${pairs.length} par(es) listo(s) para conciliar`
                : 'Necesitas al menos un par completo para ejecutar'}
            </p>
            <div className="flex items-center gap-2">
              <Button asChild variant="secondary">
                <a href={standaloneUrl} target="_blank" rel="noopener noreferrer">
                  <NavIcon name="ArrowSquareOut" size={13} />
                  Abrir standalone
                </a>
              </Button>
              <Button variant="accent" disabled title="Disponible en Fase 1.C.3">
                Ejecutar conciliación
                <NavIcon name="CaretRight" size={13} />
              </Button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

function PairCard({
  pair,
  onRemove,
}: {
  pair: MatchedPair<StagedFile>;
  onRemove: (id: string) => void;
}) {
  const totalBytes = pair.pdfs.reduce((s, p) => s + p.file.size, 0) + pair.excel.file.size;

  return (
    <li className="card p-4 border-l-2 border-l-[var(--color-accent)]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <NavIcon
              name="Check"
              size={14}
              weight="bold"
              className="text-[var(--color-accent)]"
            />
            <span className="font-mono-tabular text-[13px] text-[var(--color-ink)] font-medium truncate">
              {pair.key}
            </span>
            <span className="chip chip-neutral">{formatBytes(totalBytes)}</span>
          </div>
          <div className="mt-2.5 space-y-1.5">
            {pair.pdfs.map((pdf) => (
              <div
                key={pdf.id}
                className="flex items-center gap-2 text-[13px] text-[var(--color-ink-2)]"
              >
                <span className="chip chip-neutral text-[10.5px] font-mono-tabular">PDF</span>
                <span className="truncate flex-1">{pdf.name}</span>
                <span className="text-[11.5px] text-[var(--color-muted)] font-mono-tabular">
                  {formatBytes(pdf.file.size)}
                </span>
                <button
                  type="button"
                  onClick={() => onRemove(pdf.id)}
                  aria-label={`Quitar ${pdf.name}`}
                  className="flex h-6 w-6 items-center justify-center rounded-[4px] text-[var(--color-muted)] hover:text-[var(--color-red-ink)] hover:bg-[var(--color-surface-sunken)]"
                >
                  <NavIcon name="X" size={12} />
                </button>
              </div>
            ))}
            <div className="flex items-center gap-2 text-[13px] text-[var(--color-ink-2)]">
              <span className="chip chip-neutral text-[10.5px] font-mono-tabular">XLSX</span>
              <span className="truncate flex-1">{pair.excel.name}</span>
              <span className="text-[11.5px] text-[var(--color-muted)] font-mono-tabular">
                {formatBytes(pair.excel.file.size)}
              </span>
              <button
                type="button"
                onClick={() => onRemove(pair.excel.id)}
                aria-label={`Quitar ${pair.excel.name}`}
                className="flex h-6 w-6 items-center justify-center rounded-[4px] text-[var(--color-muted)] hover:text-[var(--color-red-ink)] hover:bg-[var(--color-surface-sunken)]"
              >
                <NavIcon name="X" size={12} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </li>
  );
}
