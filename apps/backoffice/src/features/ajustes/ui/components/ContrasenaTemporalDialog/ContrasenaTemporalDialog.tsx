'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Modal } from '@/shared/components/molecules/Modal';
import { Button } from '@/shared/components/atoms/Button';
import { NavIcon } from '@/shared/components/atoms/NavIcon';

/**
 * Muestra UNA vez la contraseña temporal recién generada. No se guarda en
 * ningún sitio: al cerrar este diálogo desaparece.
 */
export function ContrasenaTemporalDialog({
  datos,
  onClose,
}: {
  datos: { nombre: string; email: string; contrasena: string; nueva: boolean } | null;
  onClose: () => void;
}) {
  const [copiada, setCopiada] = useState(false);

  async function copiar() {
    if (!datos) return;
    try {
      await navigator.clipboard.writeText(datos.contrasena);
      setCopiada(true);
      toast.success('Contraseña copiada');
    } catch {
      toast.error('No se pudo copiar: selecciónala y cópiala a mano');
    }
  }

  return (
    <Modal
      open={!!datos}
      onOpenChange={(o) => {
        if (!o) {
          setCopiada(false);
          onClose();
        }
      }}
      title={datos?.nueva ? `${datos.nombre} ya tiene cuenta` : `Nueva contraseña para ${datos?.nombre ?? ''}`}
      description="Pásale estos datos. La contraseña solo se muestra ahora: cuando cierres esta ventana no se podrá volver a ver."
      maxWidth="sm"
      footer={
        <Button type="button" variant="accent" onClick={onClose}>
          Hecho
        </Button>
      }
    >
      {datos && (
        <div className="flex flex-col gap-3">
        <dl className="m-0 flex flex-col gap-3">
          <div>
            <dt className="text-[13px] text-[var(--color-muted)]">Correo de acceso</dt>
            <dd className="m-0 text-[15px] font-medium text-[var(--color-ink)] break-all">{datos.email}</dd>
          </div>
          <div>
            <dt className="text-[13px] text-[var(--color-muted)]">Contraseña temporal</dt>
            <dd className="m-0 mt-1">
              <div role="group" aria-label="Contraseña temporal" className="flex flex-wrap items-center gap-2">
              <code className="rounded-[8px] bg-[var(--color-surface-2)] px-3 py-2 font-mono-tabular text-[18px] tracking-[0.04em] text-[var(--color-ink)] select-all">
                {datos.contrasena}
              </code>
              <Button type="button" variant="secondary" onClick={copiar}>
                <NavIcon name={copiada ? 'Check' : 'Copy'} size={16} />
                {copiada ? 'Copiada' : 'Copiar'}
              </Button>
              <span role="status" className="sr-only">{copiada ? 'Contraseña copiada' : ''}</span>
              </div>
            </dd>
          </div>
        </dl>
          <p className="m-0 rounded-[8px] bg-[var(--color-surface-2)] px-3 py-2 text-[13.5px] leading-[1.5] text-[var(--color-ink-2)]">
            Dile que, al entrar, la cambie desde el menú con su nombre → <strong>Cambiar mi contraseña</strong>.
          </p>
        </div>
      )}
    </Modal>
  );
}
