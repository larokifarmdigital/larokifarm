'use client';

import { useId, useState, useTransition } from 'react';
import { Modal, ModalAcciones } from '@/shared/components/molecules/Modal';
import { Label } from '@/shared/components/atoms/Label';
import { cn } from '@/shared/lib/cn';
import { OpcionEleccion } from '@/shared/components/atoms/OpcionEleccion';
import type { FarmaciaOpcion, RolCuenta, UserAccount } from '@/core/users/domain';
import { MODULOS, MODULO_LABEL, type Modulo } from '@/core/shared';

export type DatosCuenta = { nombre: string; email: string; rol: RolCuenta; farmaciaIds: string[]; modulos: Modulo[] };

const DESCRIPCION_MODULO: Record<Modulo, string> = {
  conciliador: 'Subir albaranes y pedidos, conciliarlos y ver el historial.',
  comparador: 'Buscar precios de otras farmacias online.',
};

type Resultado = { ok: true } | { ok: false; error: string; fieldErrors?: Record<string, string> };

/**
 * Crear o editar una cuenta del personal de farmacia. El correo solo se escribe
 * al crear. Necesita al menos una farmacia (los mismos permisos en todas) y se
 * marca qué puede hacer: editar la web (= rol responsable; sin marcar, solo
 * consulta) y los módulos (un usuario nuevo empieza sin ninguno). La cuenta de
 * administración (solo hay una) solo cambia de nombre aquí.
 */
export function CuentaDialog({
  open,
  onOpenChange,
  cuenta,
  farmacias,
  onGuardar,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** null = crear. */
  cuenta: UserAccount | null;
  farmacias: FarmaciaOpcion[];
  onGuardar: (datos: DatosCuenta) => Promise<Resultado>;
}) {
  const id = useId();
  const [nombre, setNombre] = useState(cuenta?.nombre ?? '');
  const [email, setEmail] = useState(cuenta?.email ?? '');
  // "Editar la web" se guarda como rol: marcada = responsable.
  const esAdmin = cuenta?.rol === 'admin';
  const [editaWeb, setEditaWeb] = useState(cuenta ? cuenta.rol !== 'viewer' : true);
  const rol: RolCuenta = esAdmin ? 'admin' : editaWeb ? 'manager' : 'viewer';
  const [farmaciaIds, setFarmaciaIds] = useState<string[]>(cuenta?.farmacias.map((f) => f.id) ?? []);
  const [modulos, setModulos] = useState<Modulo[]>(cuenta?.modulos ?? []);
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [pendiente, startTransition] = useTransition();
  const crear = cuenta === null;

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    setErrorGeneral(null);
    startTransition(async () => {
      const res = await onGuardar({ nombre, email, rol, farmaciaIds, modulos });
      if (res.ok) return;
      setErrores(res.fieldErrors ?? {});
      setErrorGeneral(res.fieldErrors && Object.keys(res.fieldErrors).length ? null : res.error);
      // Foco al primer campo con error
      const primero = res.fieldErrors && Object.keys(res.fieldErrors)[0];
      if (primero) requestAnimationFrame(() => document.getElementById(`${id}-${primero}`)?.focus());
    });
  }

  function alternarFarmacia(fid: string) {
    setFarmaciaIds((ids) => (ids.includes(fid) ? ids.filter((x) => x !== fid) : [...ids, fid]));
  }

  function alternarModulo(m: Modulo) {
    setModulos((ms) => (ms.includes(m) ? ms.filter((x) => x !== m) : [...ms, m]));
  }

  const err = (k: string) => errores[k];
  const describe = (k: string, extra?: string) =>
    [err(k) ? `${id}-${k}-error` : null, extra].filter(Boolean).join(' ') || undefined;
  const errorCampo = (k: string) =>
    err(k) ? (
      <p id={`${id}-${k}-error`} className="m-0 mt-1.5 text-[13px] text-[var(--color-red-ink)]">
        {err(k)}
      </p>
    ) : null;

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={crear ? 'Nuevo usuario' : `Editar a ${cuenta.nombre}`}
      description={
        crear
          ? 'Al crearlo te daremos una contraseña temporal para que se la pases.'
          : `Correo de acceso: ${cuenta.email}`
      }
      footer={
        <ModalAcciones
          onCancelar={() => onOpenChange(false)}
          textoPrincipal={crear ? 'Crear usuario' : 'Guardar cambios'}
          textoEnviando="Guardando…"
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
          <Label htmlFor={`${id}-nombre`} required>
            Nombre y apellidos
          </Label>
          <input
            id={`${id}-nombre`}
            className="field"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            autoComplete="off"
            maxLength={80}
            required
            aria-invalid={!!err('nombre')}
            aria-describedby={describe('nombre')}
          />
          {errorCampo('nombre')}
        </div>

        {crear && (
          <div>
            <Label htmlFor={`${id}-email`} required>
              Correo electrónico
            </Label>
            <input
              id={`${id}-email`}
              type="email"
              className="field"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="off"
              spellCheck={false}
              maxLength={120}
              required
              aria-invalid={!!err('email')}
              aria-describedby={describe('email', `${id}-email-ayuda`)}
            />
            <p id={`${id}-email-ayuda`} className="m-0 mt-1.5 text-[13px] text-[var(--color-muted)]">
              Con este correo entrará al backoffice.
            </p>
            {errorCampo('email')}
          </div>
        )}

        {esAdmin ? (
          // Solo hay una cuenta de administración (gestión): no se elige ni se quita aquí.
          <p className="m-0 border-t border-[var(--color-hairline)] pt-5 text-[14px] leading-[1.5] text-[var(--color-ink-2)]">
            Es la cuenta de administración: ve todas las farmacias, gestiona los usuarios y puede usarlo todo.
          </p>
        ) : (
          <div className="flex flex-col gap-5 border-t border-[var(--color-hairline)] pt-5">
            <fieldset
              className="m-0 min-w-0 border-0 p-0"
              aria-describedby={describe('farmaciaIds', `${id}-farmacias-ayuda`)}
              aria-invalid={!!err('farmaciaIds')}
            >
              <legend className="label mb-1">
                <span>
                  Farmacias que lleva
                  <span aria-hidden className="ml-1 text-[var(--color-red-ink)] text-[1.3em] font-bold leading-none align-[-0.05em]">
                  *
                </span>
                <span className="sr-only">, obligatorio</span>
                </span>
              </legend>
              <div className={cn('flex flex-col', farmacias.length >= 7 && 'sm:grid sm:grid-cols-2 sm:gap-x-4')}>
                {farmacias.map((f, i) => (
                  <OpcionEleccion
                    key={f.id}
                    tipo="checkbox"
                    // Destino del foco si el servidor devuelve un error en las farmacias
                    id={i === 0 ? `${id}-farmaciaIds` : undefined}
                    marcado={farmaciaIds.includes(f.id)}
                    onChange={() => alternarFarmacia(f.id)}
                    titulo={f.nombre}
                  />
                ))}
              </div>
              <p id={`${id}-farmacias-ayuda`} className="m-0 mt-1.5 text-[13px] text-[var(--color-muted)]">
                Puede llevar varias; tendrá los mismos permisos en todas.
              </p>
              {errorCampo('farmaciaIds')}
            </fieldset>

            <fieldset className="m-0 min-w-0 border-0 p-0" aria-describedby={describe('modulos', `${id}-permisos-ayuda`)}>
              <legend className="label mb-1">Qué puede hacer</legend>
              <div className="flex flex-col">
                <OpcionEleccion
                  tipo="checkbox"
                  // Destino del foco si el servidor devuelve un error en el rol
                  id={`${id}-rol`}
                  marcado={editaWeb}
                  onChange={() => setEditaWeb((v) => !v)}
                  titulo="Editar la web de su farmacia"
                  descripcion="Horario, servicios, fotos y textos. Sin marcar, la web no le aparece."
                />
                {MODULOS.map((m, i) => (
                  <OpcionEleccion
                    key={m}
                    tipo="checkbox"
                    id={i === 0 ? `${id}-modulos` : undefined}
                    marcado={modulos.includes(m)}
                    onChange={() => alternarModulo(m)}
                    titulo={MODULO_LABEL[m]}
                    descripcion={DESCRIPCION_MODULO[m]}
                  />
                ))}
              </div>
              <p id={`${id}-permisos-ayuda`} className="m-0 mt-1.5 text-[13px] text-[var(--color-muted)]">
                Solo verá lo que marques aquí.
              </p>
              {errorCampo('rol')}
              {errorCampo('modulos')}
            </fieldset>
          </div>
        )}
      </form>
    </Modal>
  );
}
