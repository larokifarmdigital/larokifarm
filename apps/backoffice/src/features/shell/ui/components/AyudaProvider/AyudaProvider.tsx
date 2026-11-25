'use client';

import { usePathname } from 'next/navigation';
import { createContext, useCallback, useContext, useId, useMemo, useState, useTransition, type ReactNode } from 'react';
import { toast } from 'sonner';
import { Modal, ModalAcciones } from '@/shared/components/molecules/Modal';
import { Label } from '@/shared/components/atoms/Label';
import { Select } from '@/shared/components/atoms/Select';
import { Button } from '@/shared/components/atoms/Button';
import { NavIcon } from '@/shared/components/atoms/NavIcon';
import { SUPPORT_EMAIL, supportMailto } from '@/shared/lib/support';
import { WEB3FORMS_KEY, enviarCorreo } from '@/shared/lib/web3forms';
import type { ShellInfo } from '../../lib/shellInfo';

type Ayuda = { disponible: boolean; abrir: () => void };
const AyudaContext = createContext<Ayuda>({ disponible: false, abrir: () => {} });

/** "Ayuda y soporte" del menú: abre el formulario (o el correo si no hay Web3Forms). */
export function useAyuda(): Ayuda {
  return useContext(AyudaContext);
}

const MOTIVOS = [
  { value: 'problema', label: 'Algo no funciona' },
  { value: 'duda', label: 'Tengo una duda' },
  { value: 'idea', label: 'Una idea o sugerencia' },
];
const MAX = 2000;

export function AyudaProvider({ shell, children }: { shell: ShellInfo; children: ReactNode }) {
  const [abierto, setAbierto] = useState(false);
  // Siempre un modal: con Web3Forms, el formulario; sin él, el correo de soporte.
  const abrir = useCallback(() => setAbierto(true), []);
  const valor = useMemo(() => ({ disponible: !!(WEB3FORMS_KEY || SUPPORT_EMAIL), abrir }), [abrir]);
  return (
    <AyudaContext.Provider value={valor}>
      {children}
      {abierto &&
        (WEB3FORMS_KEY ? (
          <AyudaDialog shell={shell} onClose={() => setAbierto(false)} />
        ) : (
          <ContactoDialog onClose={() => setAbierto(false)} />
        ))}
    </AyudaContext.Provider>
  );
}

const AVISO_DEV =
  process.env.NODE_ENV !== 'production'
    ? 'Solo en local: falta NEXT_PUBLIC_WEB3FORMS_KEY en apps/backoffice/.env.local (y reiniciar pnpm dev) para enviar el formulario.'
    : null;

/** Sin Web3Forms: el correo de soporte, para escribir desde su programa de correo o copiarlo. */
function ContactoDialog({ onClose }: { onClose: () => void }) {
  const mailto = supportMailto('Ayuda con el backoffice');
  const [copiado, setCopiado] = useState(false);
  async function copiar() {
    try {
      await navigator.clipboard.writeText(SUPPORT_EMAIL ?? '');
      setCopiado(true);
      toast.success('Correo copiado');
    } catch {
      toast.error('No se ha podido copiar. Selecciónalo y cópialo a mano.');
    }
  }
  return (
    <Modal
      open
      onOpenChange={(o) => !o && onClose()}
      title="Ayuda y soporte"
      description="Escríbenos y te responderemos lo antes posible."
      maxWidth="sm"
      footer={
        <div className="flex w-full gap-2 sm:justify-end">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1 sm:flex-none">
            Cerrar
          </Button>
          {mailto && (
            <Button asChild variant="accent" className="flex-1 sm:flex-none">
              <a href={mailto}>Abrir mi correo</a>
            </Button>
          )}
        </div>
      }
    >
      <div className="flex flex-col gap-3">
        <p className="m-0 text-[14px] text-[var(--color-ink-2)]">Nuestro correo de soporte:</p>
        <div className="flex flex-wrap items-center gap-2">
          <span className="select-all break-all rounded-[8px] bg-[var(--color-surface-2)] px-3 py-2 text-[15px] font-semibold text-[var(--color-ink)]">
            {SUPPORT_EMAIL}
          </span>
          <Button type="button" variant="secondary" onClick={copiar}>
            <NavIcon name={copiado ? 'Check' : 'Copy'} size={16} />
            {copiado ? 'Copiado' : 'Copiar'}
          </Button>
        </div>
        {AVISO_DEV && (
          <p className="m-0 rounded-[8px] bg-[var(--color-yellow-soft)] px-3 py-2 text-[13px] text-[var(--color-yellow-ink)]">{AVISO_DEV}</p>
        )}
      </div>
    </Modal>
  );
}

function AyudaDialog({ shell, onClose }: { shell: ShellInfo; onClose: () => void }) {
  const id = useId();
  const pathname = usePathname();
  const [motivo, setMotivo] = useState('problema');
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [pendiente, startTransition] = useTransition();
  const farmacias = shell.miFarmacia ? shell.miFarmacia.nombre : shell.misFarmacias?.join(', ') || (shell.rol === 'admin' ? 'Administración' : '—');

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setErrorGeneral(null);
    const texto = mensaje.trim();
    if (texto.length < 5) {
      setError('Cuéntanos qué pasa (al menos unas palabras).');
      document.getElementById(`${id}-mensaje`)?.focus();
      return;
    }
    startTransition(async () => {
      const etiqueta = MOTIVOS.find((m) => m.value === motivo)!.label;
      const ok = await enviarCorreo({
        asunto: `[Backoffice] ${etiqueta} — ${shell.nombre}`,
        deParte: 'Backoffice Larokifarm',
        responderA: shell.email,
        campos: {
          Motivo: etiqueta,
          Mensaje: texto,
          Persona: `${shell.nombre} <${shell.email}>`,
          Farmacia: farmacias,
          'Estaba en': `${window.location.origin}${pathname}`,
        },
      });
      if (!ok) {
        setErrorGeneral(
          SUPPORT_EMAIL
            ? `No se ha podido enviar. Inténtalo de nuevo o escribe a ${SUPPORT_EMAIL}.`
            : 'No se ha podido enviar. Inténtalo de nuevo en un momento.',
        );
        return;
      }
      onClose();
      toast.success('Mensaje enviado', { description: `Te responderemos a ${shell.email}.` });
    });
  }

  return (
    <Modal
      open
      onOpenChange={(o) => !o && onClose()}
      title="Ayuda y soporte"
      description={`Escríbenos y te responderemos a ${shell.email}.`}
      footer={
        <ModalAcciones
          onCancelar={onClose}
          textoPrincipal="Enviar"
          textoEnviando="Enviando…"
          enviando={pendiente}
          form={`${id}-form`}
        />
      }
    >
      <form id={`${id}-form`} onSubmit={enviar} noValidate className="flex flex-col gap-4">
        {errorGeneral && (
          <p role="alert" className="m-0 rounded-[8px] bg-[var(--color-red-soft)] px-3 py-2 text-[13.5px] text-[var(--color-red-ink)]">
            {errorGeneral}
          </p>
        )}
        <div>
          <Label htmlFor={`${id}-motivo`}>¿En qué te ayudamos?</Label>
          <Select id={`${id}-motivo`} value={motivo} onValueChange={setMotivo} options={MOTIVOS} />
        </div>
        <div>
          <Label htmlFor={`${id}-mensaje`} required>
            Cuéntanos
          </Label>
          <textarea
            id={`${id}-mensaje`}
            className="field min-h-[140px] resize-y py-2.5"
            value={mensaje}
            onChange={(e) => setMensaje(e.target.value)}
            maxLength={MAX}
            required
            placeholder={
              motivo === 'problema'
                ? 'Qué intentabas hacer y qué ha pasado. Por ejemplo: al subir el albarán de Cofares sale un error.'
                : motivo === 'duda'
                  ? 'Escribe tu pregunta.'
                  : '¿Qué te gustaría que hiciera el backoffice?'
            }
            aria-invalid={!!error}
            aria-describedby={[`${id}-ayuda`, error ? `${id}-error` : null].filter(Boolean).join(' ')}
          />
          <p id={`${id}-ayuda`} className="m-0 mt-1.5 flex justify-between gap-3 text-[13px] text-[var(--color-muted)]">
            <span>Se envía también en qué pantalla estabas, para ayudarte antes.</span>
            <span aria-hidden className="shrink-0 tabular-nums">
              {mensaje.length} / {MAX}
            </span>
          </p>
          {error && (
            <p id={`${id}-error`} className="m-0 mt-1.5 text-[13px] text-[var(--color-red-ink)]">
              {error}
            </p>
          )}
        </div>
      </form>
    </Modal>
  );
}
