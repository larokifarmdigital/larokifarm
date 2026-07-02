'use client';

import { useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';

interface ExcelViewerProps {
  /** Blob local (subida) o URL remota (historial en R2). */
  file: File | string;
}

interface SheetData {
  name: string;
  rows: (string | number | boolean | null)[][];
}

async function fetchArrayBuffer(src: File | string): Promise<ArrayBuffer> {
  if (typeof src === 'string') {
    const res = await fetch(src);
    if (!res.ok) throw new Error(`HTTP ${res.status} al descargar el Excel`);
    return await res.arrayBuffer();
  }
  return await src.arrayBuffer();
}

export default function ExcelViewer({ file }: ExcelViewerProps) {
  const [sheets, setSheets] = useState<SheetData[]>([]);
  const [activeSheet, setActiveSheet] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchArrayBuffer(file)
      .then((buf) => {
        if (cancelled) return;
        const wb = XLSX.read(buf, { type: 'array' });
        const parsed: SheetData[] = wb.SheetNames.map((name) => {
          const sheet = wb.Sheets[name];
          const rows = XLSX.utils.sheet_to_json<(string | number | boolean | null)[]>(
            sheet,
            { header: 1, defval: null, blankrows: false },
          );
          return { name, rows };
        });
        setSheets(parsed);
        setActiveSheet(0);
        setLoading(false);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : 'No se pudo leer el archivo.');
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [file]);

  const current = sheets[activeSheet];

  const columnCount = useMemo(() => {
    if (!current) return 0;
    return current.rows.reduce((max, r) => Math.max(max, r.length), 0);
  }, [current]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center gap-2 text-sm text-slate-500">
        <span
          className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600"
          aria-hidden
        />
        Cargando Excel…
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center px-6 text-center text-sm text-red-700">
        {error}
      </div>
    );
  }

  if (!current || current.rows.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-slate-500">
        La hoja está vacía.
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden bg-white">
      {sheets.length > 1 && (
        <div className="flex shrink-0 overflow-x-auto border-b border-slate-200 bg-slate-50 px-2">
          {sheets.map((s, i) => {
            const active = i === activeSheet;
            return (
              <button
                key={i}
                type="button"
                onClick={() => setActiveSheet(i)}
                className={`shrink-0 border-b-2 px-3 py-2 text-xs font-medium ${
                  active
                    ? 'border-slate-700 text-slate-900'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
                style={
                  active
                    ? { borderBottomColor: 'var(--brand-primary)' }
                    : undefined
                }
              >
                {s.name}
              </button>
            );
          })}
        </div>
      )}

      <div className="flex-1 overflow-auto">
        <table className="w-full min-w-max border-separate border-spacing-0 text-xs">
          <thead className="sticky top-0 z-10 bg-slate-100">
            <tr>
              <th className="sticky left-0 z-20 border-b border-r border-slate-200 bg-slate-100 px-2 py-1 text-center text-[10px] font-semibold text-slate-500">
                #
              </th>
              {Array.from({ length: columnCount }, (_, c) => (
                <th
                  key={c}
                  className="border-b border-r border-slate-200 bg-slate-100 px-2 py-1 text-center text-[10px] font-semibold text-slate-500"
                >
                  {excelColumnLetter(c)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {current.rows.map((row, r) => (
              <tr key={r} className="hover:bg-slate-50">
                <td className="sticky left-0 z-10 border-b border-r border-slate-200 bg-slate-50 px-2 py-1 text-center text-[10px] font-medium text-slate-500">
                  {r + 1}
                </td>
                {Array.from({ length: columnCount }, (_, c) => {
                  const v = row[c];
                  const display =
                    v === null || v === undefined
                      ? ''
                      : typeof v === 'number'
                        ? formatNumber(v)
                        : String(v);
                  return (
                    <td
                      key={c}
                      className="border-b border-r border-slate-200 px-2 py-1 text-slate-800"
                      style={
                        typeof v === 'number' ? { textAlign: 'right' } : undefined
                      }
                    >
                      {display}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="shrink-0 border-t border-slate-100 bg-slate-50 px-3 py-1.5 text-[11px] text-slate-500">
        {current.rows.length} fila{current.rows.length === 1 ? '' : 's'} ·{' '}
        {columnCount} columna{columnCount === 1 ? '' : 's'}
      </p>
    </div>
  );
}

function excelColumnLetter(idx: number): string {
  let n = idx;
  let s = '';
  while (n >= 0) {
    s = String.fromCharCode(65 + (n % 26)) + s;
    n = Math.floor(n / 26) - 1;
  }
  return s;
}

function formatNumber(n: number): string {
  if (Number.isInteger(n)) return n.toString();
  return n.toLocaleString('es-ES', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 4,
  });
}
