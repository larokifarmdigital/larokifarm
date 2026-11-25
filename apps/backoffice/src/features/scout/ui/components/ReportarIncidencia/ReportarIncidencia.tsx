'use client';

import { useId, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/shared/components/atoms/Button';
import { Label } from '@/shared/components/atoms/Label';
import { NavIcon } from '@/shared/components/atoms/NavIcon';
import { Modal, ModalAcciones } from '@/shared/components/molecules/Modal';
import { CapturasField, subirCapturas, useCapturas } from '@/shared/components/molecules/Capturas';
import { SUPPORT_EMAIL } from '@/shared/lib/support';
import { WEB3FORMS_KEY, enviarCorreo } from '@/shared/lib/web3forms';
import { useAyuda } from '@/features/shell';

/** De qué es la incidencia: sale en el correo con su enlace. */
export type ContextoIncidencia = {
  /** "Consulta de precio" | "Lista de precios" */
  que: string;
  /** Producto con su CN, o nombre de la lista. */
  titulo: string;
  /** Ruta interna (p. ej. /scout/historial/<id>). */
  enlace: string;
};

const MAX_TEXTO = 2000;

/** Botón "Reportar un problema" + su modal (búsqueda y detalle del historial). */
export function ReportarIncidenciaBoton({ contexto, className }: { contexto: ContextoIncidencia; className?: string }) {
  const [abierto, setAbierto] = useState(false);
  return (
    <>
      <Button type="button" variant="secondary" className={className} onClick={() => setAbierto(true)} aria-haspopup="dialog">
        <NavIcon name="Flag" size={16} />
        Reportar un problema
      </Button>
      {abierto && <ReportarIncidenciaDialog contexto={contexto} onClose={() => setAbierto(false)} />}
    </>
  );
}

export function ReportarIncidenciaDialog({ contexto, onClose }: { contexto: ContextoIncidencia; onClose: () => void }) {
  const id = useId();
  const { usuario } = useAyuda();
  const [texto, setTexto] = useState('');
  const capturas = useCapturas();
  const [error, setError] = useState<string | null>(null);
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [progreso, setProgreso] = useState<string | null>(null);
  const [pendiente, startTransition] = useTransition();

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setErrorGeneral(null);
    const limpio = texto.trim();
    if (limpio.length < 5) {
      setError('Cuéntanos qué pasa (al menos unas palabras).');
      document.getElementById(`${id}-texto`)?.focus();
      return;
    }
    if (!WEB3FORMS_KEY) {
      setErrorGeneral(
        process.env.NODE_ENV !== 'production'
          ? 'Solo en local: falta NEXT_PUBLIC_WEB3FORMS_KEY en apps/backoffice/.env.local (y reiniciar pnpm dev).'
          : SUPPORT_EMAIL
            ? `No se puede enviar ahora. Escríbenos a ${SUPPORT_EMAIL}.`
            : 'No se puede enviar ahora. Inténtalo más tarde.',
      );
      return;
    }
    startTransition(async () => {
      let urls: string[];
      try {
        urls = await subirCapturas(capturas.capturas, 'precios', setProgreso);
      } catch (err) {
        setProgreso(null);
        setErrorGeneral(`${(err as Error).message} Quita esa captura o inténtalo de nuevo.`);
        return;
      }
      setProgreso('Enviando…');
      const ok = await enviarCorreo({
        asunto: `[Backoffice] Incidencia en precios — ${contexto.titulo}`,
        deParte: 'Backoffice Larokifarm',
        responderA: usuario?.email,
        campos: {
          'Qué pasa': limpio,
          Dónde: `${contexto.que}: ${contexto.titulo}`,
          Enlace: `${window.location.origin}${contexto.enlace}`,
          Capturas: urls.length ? urls.join('\n') : 'Ninguna',
          'Lo reporta': usuario ? `${usuario.nombre} <${usuario.email}>` : '—',
          Farmacia: usuario?.farmacias ?? '—',
        },
      });
      setProgreso(null);
      if (!ok) {
        setErrorGeneral(
          SUPPORT_EMAIL ? `No se ha podido enviar. Inténtalo de nuevo o escribe a ${SUPPORT_EMAIL}.` : 'No se ha podido enviar. Inténtalo de nuevo.',
        );
        return;
      }
      onClose();
      toast.success('Incidencia enviada', { description: 'La revisaremos y te responderemos por correo.' });
    });
  }

  return (
    <Modal
      open
      onOpenChange={(o) => !o && !pendiente && onClose()}
      title="Reportar un problema"
      description={`${contexto.que}: ${contexto.titulo}`}
      footer={
        <ModalAcciones
          onCancelar={onClose}
          textoPrincipal="Enviar"
          textoEnviando={progreso ?? 'Enviando…'}
          enviando={pendiente}
          form={`${id}-form`}
        />
      }
    >
      <form
        id={`${id}-form`}
        onSubmit={enviar}
        noValidate
        className="flex flex-col gap-4"
        onPaste={capturas.alPegar}
      >
        {errorGeneral && (
          <p role="alert" className="m-0 rounded-[8px] bg-[var(--color-red-soft)] px-3 py-2 text-[13.5px] text-[var(--color-red-ink)]">
            {errorGeneral}
          </p>
        )}
        <div>
          <Label htmlFor={`${id}-texto`} required>
            ¿Qué pasa?
          </Label>
          <textarea
            id={`${id}-texto`}
            className="field min-h-[120px] resize-y py-2.5"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            maxLength={MAX_TEXTO}
            required
            placeholder="Por ejemplo: el precio de Farmacia Barata es de otro tamaño (500 ml en vez de 75 ml)."
            aria-invalid={!!error}
            aria-describedby={error ? `${id}-error` : undefined}
          />
          {error && (
            <p id={`${id}-error`} className="m-0 mt-1.5 text-[13px] text-[var(--color-red-ink)]">
              {error}
            </p>
          )}
        </div>

        <CapturasField estado={capturas} idBase={id} deshabilitado={pendiente} />
      </form>
    </Modal>
  );
}
