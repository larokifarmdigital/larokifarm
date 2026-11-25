'use client';

import { useId, useState, useTransition } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { toast } from 'sonner';
import { WEB3FORMS_KEY, enviarCorreo } from '@/shared/lib/web3forms';
import { CapturasField, subirCapturas, useCapturas, type Captura } from '@/shared/components/molecules/Capturas';
import { NavIcon } from '@/shared/components/atoms/NavIcon';
import { cn } from '@/shared/lib/cn';
import { formatDate } from '@/shared/lib/format';
import { BTN_ACCENT, BTN_SECUNDARIO } from '../../lib/botones';

export interface ReportView {
  id: string;
  note: string;
  status: 'OPEN' | 'RESOLVED';
  createdAt: string;
  author: { id: string; name: string };
  resolvedNote: string | null;
  resolvedAt: string | null;
  resolvedBy: { id: string; name: string } | null;
}

const MAX_NOTE_LEN = 2000;

/* ------------------------------------------------------------------ */
/* Botón + diálogo "Reportar un error"                                 */
/* ------------------------------------------------------------------ */

/**
 * Lo pone cada tarjeta de resultado (nueva conciliación e historial) junto a
 * sus acciones. El formulario va en un diálogo: Radix devuelve el foco al
 * botón al cerrar (hay Dialog.Trigger).
 */
export function ReportarError({
  comparisonId,
  onCreado,
  className,
}: {
  comparisonId: string;
  onCreado: (r: ReportView) => void;
  className?: string;
}) {
  const [abierto, setAbierto] = useState(false);

  return (
    <Dialog.Root open={abierto} onOpenChange={setAbierto}>
      <Dialog.Trigger asChild>
        <button type="button" className={cn(BTN_SECUNDARIO, className)}>
          <NavIcon name="Flag" size={16} />
          Reportar un error
        </button>
      </Dialog.Trigger>
      {abierto && (
        <FormularioNota
          titulo="Reportar un error"
          descripcion="Cuéntanos qué está mal en esta conciliación. Lo revisará el equipo y la respuesta aparecerá aquí."
          etiqueta="¿Qué está mal?"
          placeholder="Por ejemplo: el Sensibio H2O sí ha llegado, pero sale como que falta."
          textoEnviar="Enviar reporte"
          conCapturas
          enviar={async (nota, capturas) => {
            // Primero las capturas: si alguna falla no se guarda el reporte a medias.
            let urls: string[] = [];
            try {
              urls = await subirCapturas(capturas, 'albaranes');
            } catch (err) {
              return `${(err as Error).message} Quita esa captura o inténtalo de nuevo.`;
            }
            const res = await fetch(`/api/comparisons/${comparisonId}/reports`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ note: nota }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) return data?.error ?? 'No se pudo enviar el reporte. Inténtalo de nuevo.';
            onCreado(data.report as ReportView);
            setAbierto(false);
            toast.success('Reporte enviado. Te responderemos en esta conciliación.');
            // Aviso por correo al administrador. El reporte ya está guardado:
            // si el correo falla no se molesta a quien reporta.
            if (data.aviso) void avisarPorCorreo(comparisonId, nota, data.aviso, urls);
            return null;
          }}
        />
      )}
    </Dialog.Root>
  );
}

type Aviso = { farmacia: string; proveedor: string; envio: string; persona: string; email: string };

async function avisarPorCorreo(comparisonId: string, nota: string, a: Aviso, capturas: string[]) {
  if (!WEB3FORMS_KEY) {
    // En local se avisa a quien desarrolla; en producción, quien reporta no tiene que ver esto.
    if (process.env.NODE_ENV !== 'production') {
      toast.warning('El reporte se ha guardado, pero no se ha enviado el correo', {
        description: 'Falta NEXT_PUBLIC_WEB3FORMS_KEY en apps/backoffice/.env.local (y reiniciar pnpm dev).',
      });
    } else console.warn('[reportes] falta NEXT_PUBLIC_WEB3FORMS_KEY: no se envía el aviso por correo');
    return;
  }
  const ok = await enviarCorreo({
    asunto: `[Backoffice] Error reportado — ${a.proveedor} · ${a.farmacia}`,
    deParte: 'Backoffice Larokifarm',
    responderA: a.email || undefined,
    campos: {
      'Qué está mal': nota.trim(),
      Farmacia: a.farmacia,
      Proveedor: a.envio ? `${a.proveedor} (${a.envio})` : a.proveedor,
      'Lo reporta': a.email ? `${a.persona} <${a.email}>` : a.persona,
      Conciliación: `${window.location.origin}/albaranes/historial/${comparisonId}`,
      Capturas: capturas.length ? capturas.join('\n') : 'Ninguna',
    },
  });
  if (!ok) console.warn('[reportes] no se pudo enviar el aviso por correo');
}

/* ------------------------------------------------------------------ */
/* Lista de reportes (no se pinta si no hay ninguno)                   */
/* ------------------------------------------------------------------ */

export function ReportsList({
  reports,
  isSuperAdmin,
  onResuelto,
  nivel = 3,
  enTarjeta = false,
}: {
  reports: ReportView[];
  isSuperAdmin: boolean;
  onResuelto: (r: ReportView) => void;
  /** 2 en el detalle del historial (bajo el h1); 3 en la tarjeta de la fase 2 (bajo un h2). */
  nivel?: 2 | 3;
  /** En su propia tarjeta (detalle y resultado) en vez de como franja de otra. */
  enTarjeta?: boolean;
}) {
  const tituloId = useId();
  const Titulo = nivel === 2 ? 'h2' : 'h3';
  if (reports.length === 0) return null;

  return (
    <section
      aria-labelledby={tituloId}
      className={enTarjeta ? 'card p-4 sm:p-6' : 'border-t border-[var(--color-hairline)] px-4 py-4 sm:px-5'}
    >
      <Titulo id={tituloId} className="m-0 mb-3 text-[15px] font-semibold text-[var(--color-ink)]">
        {reports.length === 1 ? 'Reporte de error' : `Reportes de error (${reports.length})`}
      </Titulo>
      <ul className="flex flex-col gap-3">
        {reports.map((r) => (
          <ReportItem key={r.id} report={r} isSuperAdmin={isSuperAdmin} onResuelto={onResuelto} />
        ))}
      </ul>
    </section>
  );
}

function ReportItem({
  report,
  isSuperAdmin,
  onResuelto,
}: {
  report: ReportView;
  isSuperAdmin: boolean;
  onResuelto: (r: ReportView) => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const pendiente = report.status === 'OPEN';

  return (
    <li className="rounded-[10px] border border-[var(--color-hairline)] bg-[var(--color-surface)] p-3.5 sm:p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className={cn('chip', pendiente ? 'chip-yellow' : 'chip-green')}>
          {pendiente ? 'Pendiente de revisar' : 'Solucionado'}
        </span>
        <span className="text-[13px] text-[var(--color-muted)]">
          {report.author.name} · {formatDate(report.createdAt)}
        </span>
      </div>
      <p className="m-0 mt-2 whitespace-pre-wrap break-words text-[14.5px] leading-relaxed text-[var(--color-ink)]">
        {report.note}
      </p>

      {!pendiente && report.resolvedNote && (
        <div className="mt-3 rounded-[8px] bg-[var(--color-green-soft)] px-3 py-2.5">
          <p className="m-0 text-[13px] font-semibold text-[var(--color-green-ink)]">
            Respuesta{report.resolvedBy ? ` de ${report.resolvedBy.name}` : ''}
            {report.resolvedAt ? ` · ${formatDate(report.resolvedAt)}` : ''}
          </p>
          <p className="m-0 mt-1 whitespace-pre-wrap break-words text-[14px] leading-relaxed text-[var(--color-ink)]">
            {report.resolvedNote}
          </p>
        </div>
      )}

      {pendiente && isSuperAdmin && (
        <Dialog.Root open={abierto} onOpenChange={setAbierto}>
          <Dialog.Trigger asChild>
            <button type="button" className={cn(BTN_SECUNDARIO, 'mt-3')}>
              <NavIcon name="Check" size={16} />
              Marcar como solucionado
            </button>
          </Dialog.Trigger>
          {abierto && (
            <FormularioNota
              titulo="Marcar como solucionado"
              descripcion="Explica qué se ha hecho. Quien lo reportó verá esta respuesta en la conciliación."
              etiqueta="¿Cómo se ha solucionado?"
              placeholder="Por ejemplo: corregido el código del producto. Vuelve a subir el albarán para comprobarlo."
              textoEnviar="Marcar como solucionado"
              enviar={async (nota) => {
                const res = await fetch(`/api/reports/${report.id}/resolve`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ resolvedNote: nota }),
                });
                const data = await res.json().catch(() => ({}));
                if (!res.ok) return data?.error ?? 'No se pudo guardar. Inténtalo de nuevo.';
                onResuelto(data.report as ReportView);
                setAbierto(false);
                toast.success('Reporte marcado como solucionado.');
                return null;
              }}
            />
          )}
        </Dialog.Root>
      )}
    </li>
  );
}

/* ------------------------------------------------------------------ */
/* Diálogo con una nota de texto                                       */
/* ------------------------------------------------------------------ */

function FormularioNota({
  titulo,
  descripcion,
  etiqueta,
  placeholder,
  textoEnviar,
  enviar,
  conCapturas = false,
}: {
  titulo: string;
  descripcion: string;
  etiqueta: string;
  placeholder: string;
  textoEnviar: string;
  /** Devuelve el mensaje de error, o null si ha ido bien. */
  enviar: (nota: string, capturas: Captura[]) => Promise<string | null>;
  /** Permite añadir capturas (pegar, arrastrar o elegir). */
  conCapturas?: boolean;
}) {
  const [nota, setNota] = useState('');
  const capturas = useCapturas();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const campoId = useId();
  const contadorId = useId();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const limpia = nota.trim();
    if (!limpia) {
      setError('Escribe algo antes de enviar.');
      return;
    }
    setError(null);
    startTransition(async () => {
      const fallo = await enviar(limpia, capturas.capturas);
      if (fallo) setError(fallo);
    });
  }

  return (
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-50 bg-slate-900/50" />
      <Dialog.Content
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          document.getElementById(campoId)?.focus();
        }}
        className="fixed left-1/2 top-1/2 z-50 max-h-[calc(100dvh-24px)] w-[calc(100%-24px)] max-w-[520px] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-[14px] bg-[var(--color-surface)] p-5 sm:p-6 shadow-2xl outline-none">
        <div className="flex items-start justify-between gap-3">
          <Dialog.Title className="m-0 text-[18px] font-bold tracking-[-0.01em] text-[var(--color-ink)]">{titulo}</Dialog.Title>
          <Dialog.Close
            aria-label="Cerrar"
            className="-mr-2 -mt-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-[8px] text-[var(--color-muted)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-ink)]"
          >
            <NavIcon name="X" size={18} />
          </Dialog.Close>
        </div>
        <Dialog.Description className="m-0 mt-1 text-[14px] leading-[1.5] text-[var(--color-muted)]">{descripcion}</Dialog.Description>

        <form onSubmit={onSubmit} onPaste={conCapturas ? capturas.alPegar : undefined} className="mt-4">
          <label htmlFor={campoId} className="mb-1.5 block text-[14px] font-medium text-[var(--color-ink)]">
            {etiqueta}
          </label>
          <textarea
            id={campoId}
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            maxLength={MAX_NOTE_LEN}
            rows={5}
            placeholder={placeholder}
            aria-describedby={contadorId}
            aria-invalid={error ? true : undefined}
            disabled={pending}
            className="field resize-y text-[15px] leading-[1.5]"
          />
          <p id={contadorId} className="m-0 mt-1 text-right text-[12.5px] tabular-nums text-[var(--color-muted)]">
            {nota.length} / {MAX_NOTE_LEN}
          </p>
          {conCapturas && (
            <div className="mt-3">
              <CapturasField estado={capturas} idBase={campoId} deshabilitado={pending} />
            </div>
          )}
          <p role="alert" className="m-0 min-h-0 text-[14px] text-[var(--color-red-ink)] empty:hidden">
            {error ?? ''}
          </p>
          <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Dialog.Close asChild>
              <button type="button" disabled={pending} className={BTN_SECUNDARIO}>
                Cancelar
              </button>
            </Dialog.Close>
            <button type="submit" disabled={pending} className={BTN_ACCENT}>
              {pending ? 'Enviando…' : textoEnviar}
            </button>
          </div>
        </form>
      </Dialog.Content>
    </Dialog.Portal>
  );
}
