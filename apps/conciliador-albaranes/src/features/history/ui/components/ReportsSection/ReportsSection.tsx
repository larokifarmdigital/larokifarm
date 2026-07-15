'use client';

import { useState, useTransition } from 'react';
import type { Role } from '@/core/shared';
import { formatDate } from '@/shared/lib/format';

export interface ReportView {
  id: string;
  note: string;
  status: 'OPEN' | 'RESOLVED';
  createdAt: string;
  author: { id: string; name: string; email: string };
  resolvedNote: string | null;
  resolvedAt: string | null;
  resolvedBy: { id: string; name: string; email: string } | null;
}

const MAX_NOTE_LEN = 2000;

export function ReportsSection({
  comparisonId,
  initialReports,
  currentUser,
}: {
  comparisonId: string;
  initialReports: ReportView[];
  currentUser: { id: string; role: Role };
}) {
  const [reports, setReports] = useState<ReportView[]>(initialReports);
  const [showForm, setShowForm] = useState(false);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const isSuperAdmin = currentUser.role === 'SUPER_ADMIN';

  const submitReport = () => {
    setError(null);
    const trimmed = note.trim();
    if (!trimmed) {
      setError('Describe el error para enviar el reporte.');
      return;
    }
    startTransition(async () => {
      const res = await fetch(`/api/comparisons/${comparisonId}/reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: trimmed }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error ?? 'No se pudo enviar el reporte.');
        return;
      }
      setReports((prev) => [data.report, ...prev]);
      setNote('');
      setShowForm(false);
    });
  };

  return (
    <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Reportes
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            ¿Detectaste un error o una discrepancia falsa? Repórtalo para que el
            equipo lo revise.
          </p>
        </div>
        {!showForm && (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-sm transition-colors hover:bg-slate-50"
          >
            <FlagIcon />
            Reportar error
          </button>
        )}
      </header>

      {showForm && (
        <div className="mb-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <label
            htmlFor="report-note"
            className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-600"
          >
            Descripción del error
          </label>
          <textarea
            id="report-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={MAX_NOTE_LEN}
            rows={4}
            placeholder="Ej: la fila 4 no es una discrepancia real, el PDF viene partido en 2 páginas y la app lo cuenta como duplicado."
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-400"
            disabled={pending}
          />
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs text-slate-500 tabular-nums">
              {note.length} / {MAX_NOTE_LEN}
            </span>
            {error && (
              <span className="text-xs font-medium text-red-600">{error}</span>
            )}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={submitReport}
              disabled={pending || !note.trim()}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pending ? 'Enviando…' : 'Enviar reporte'}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setNote('');
                setError(null);
              }}
              disabled={pending}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {reports.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
          Todavía no hay reportes para esta comparación.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {reports.map((r) => (
            <ReportItem
              key={r.id}
              report={r}
              isSuperAdmin={isSuperAdmin}
              onResolve={(resolved) =>
                setReports((prev) =>
                  prev.map((x) => (x.id === resolved.id ? resolved : x)),
                )
              }
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function ReportItem({
  report,
  isSuperAdmin,
  onResolve,
}: {
  report: ReportView;
  isSuperAdmin: boolean;
  onResolve: (r: ReportView) => void;
}) {
  const [showResolveForm, setShowResolveForm] = useState(false);
  const [resolveNote, setResolveNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const isOpen = report.status === 'OPEN';

  const submitResolve = () => {
    setError(null);
    const trimmed = resolveNote.trim();
    if (!trimmed) {
      setError('Describe cómo se solucionó.');
      return;
    }
    startTransition(async () => {
      const res = await fetch(`/api/reports/${report.id}/resolve`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolvedNote: trimmed }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error ?? 'No se pudo marcar como solucionado.');
        return;
      }
      onResolve(data.report);
      setShowResolveForm(false);
      setResolveNote('');
    });
  };

  return (
    <li
      className={`rounded-xl border p-4 ${
        isOpen
          ? 'border-amber-200 bg-amber-50/50'
          : 'border-emerald-200 bg-emerald-50/40'
      }`}
    >
      <header className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {isOpen ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              Abierto
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800">
              <CheckIcon />
              Solucionado
            </span>
          )}
          <span className="text-xs text-slate-500">
            {report.author.name} · {formatDate(report.createdAt)}
          </span>
        </div>
      </header>

      <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-800">
        {report.note}
      </p>

      {report.status === 'RESOLVED' && report.resolvedBy && (
        <div className="mt-3 rounded-lg border border-emerald-200 bg-white p-3">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-emerald-700">
            Resolución · {report.resolvedBy.name}
            {report.resolvedAt && ` · ${formatDate(report.resolvedAt)}`}
          </p>
          {report.resolvedNote && (
            <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-700">
              {report.resolvedNote}
            </p>
          )}
        </div>
      )}

      {isOpen && isSuperAdmin && (
        <div className="mt-3">
          {!showResolveForm ? (
            <button
              type="button"
              onClick={() => setShowResolveForm(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-sm font-medium text-emerald-700 transition-colors hover:bg-emerald-50"
            >
              <CheckIcon />
              Marcar como solucionado
            </button>
          ) : (
            <div className="rounded-lg border border-emerald-200 bg-white p-3">
              <label
                htmlFor={`resolve-${report.id}`}
                className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-600"
              >
                Nota de resolución
              </label>
              <textarea
                id={`resolve-${report.id}`}
                value={resolveNote}
                onChange={(e) => setResolveNote(e.target.value)}
                maxLength={MAX_NOTE_LEN}
                rows={3}
                placeholder="Ej: se ajustó el parser para el caso PDF partido en 2 páginas. Vuelve a subir la comparación."
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-400"
                disabled={pending}
              />
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs text-slate-500 tabular-nums">
                  {resolveNote.length} / {MAX_NOTE_LEN}
                </span>
                {error && (
                  <span className="text-xs font-medium text-red-600">
                    {error}
                  </span>
                )}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={submitResolve}
                  disabled={pending || !resolveNote.trim()}
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {pending ? 'Guardando…' : 'Confirmar solución'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowResolveForm(false);
                    setResolveNote('');
                    setError(null);
                  }}
                  disabled={pending}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </li>
  );
}

function FlagIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
      <line x1="4" x2="4" y1="22" y2="15" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}
