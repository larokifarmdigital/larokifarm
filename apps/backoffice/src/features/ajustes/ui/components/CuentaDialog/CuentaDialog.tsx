'use client';

import { useId, useState, useTransition } from 'react';
import { Modal, ModalAcciones } from '@/shared/components/molecules/Modal';
import { Label } from '@/shared/components/atoms/Label';
import { cn } from '@/shared/lib/cn';
import { IndicadorEleccion } from '@/shared/components/atoms/IndicadorEleccion';
import type { FarmaciaOpcion, RolCuenta, UserAccount } from '@/core/users/domain';
import { MODULOS, MODULO_LABEL, type Modulo } from '@/core/shared';
import { DESCRIPCION_ROL, ETIQUETA_ROL } from '../../lib/roles';

export type DatosCuenta = { nombre: string; email: string; rol: RolCuenta; farmaciaIds: string[]; modulos: Modulo[] };

const DESCRIPCION_MODULO: Record<Modulo, string> = {
  conciliador: 'Subir albaranes y pedidos, conciliarlos y ver el historial.',
  comparador: 'Buscar precios de otras farmacias online.',
};

type Resultado = { ok: true } | { ok: false; error: string; fieldErrors?: Record<string, string> };

/**
 * Crear o editar una cuenta. El correo solo se escribe al crear (es el usuario
 * de acceso). Responsable y Solo consulta necesitan al menos una farmacia (el
 * mismo permiso en todas); el administrador no. Los módulos se marcan uno a
 * uno (un usuario nuevo empieza sin ninguno); el administrador los tiene todos.
 */
export function CuentaDialog({
  open,
  onOpenChange,
  cuenta,
  farmacias,
  esUnoMismo,
  onGuardar,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** null = crear. */
  cuenta: UserAccount | null;
  farmacias: FarmaciaOpcion[];
  esUnoMismo: boolean;
  onGuardar: (datos: DatosCuenta) => Promise<Resultado>;
}) {
  const id = useId();
  const [nombre, setNombre] = useState(cuenta?.nombre ?? '');
  const [email, setEmail] = useState(cuenta?.email ?? '');
  const [rol, setRol] = useState<RolCuenta>(cuenta?.rol ?? 'manager');
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

        <fieldset className="m-0 min-w-0 border-0 p-0" aria-describedby={describe('rol', esUnoMismo ? `${id}-rol-yo` : undefined)}>
          <legend className="label mb-2">
            <span>
              Qué puede hacer
              <span aria-hidden className="ml-1 text-[var(--color-red-ink)] text-[1.3em] font-bold leading-none align-[-0.05em]">
                *
              </span>
              <span className="sr-only">, obligatorio</span>
            </span>
          </legend>
          <div className="flex flex-col gap-2">
            {(['manager', 'viewer', 'admin'] as const).map((r) => {
              const bloqueado = esUnoMismo && r !== 'admin';
              return (
                <label
                  key={r}
                  className={cn(
                    'flex items-start gap-3 rounded-[10px] border px-3.5 py-3 min-h-11 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-[var(--color-accent)] has-[:focus-visible]:outline-offset-2',
                    rol === r
                      ? 'border-[var(--color-accent)] bg-[var(--color-accent-soft)]'
                      : 'border-[var(--color-control-border)] bg-[var(--color-surface)]',
                    bloqueado ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer',
                  )}
                >
                  <input
                    type="radio"
                    // Destino del foco si el servidor devuelve un error en el rol
                    id={rol === r ? `${id}-rol` : undefined}
                    name={`${id}-rol`}
                    value={r}
                    checked={rol === r}
                    disabled={bloqueado}
                    onChange={() => setRol(r)}
                    className="sr-only cursor-pointer"
                  />
                  <IndicadorEleccion tipo="radio" marcado={rol === r} desactivado={bloqueado} />
                  <span className="min-w-0">
                    <span className="block text-[14.5px] font-semibold text-[var(--color-ink)]">{ETIQUETA_ROL[r]}</span>
                    <span className="block text-[13.5px] leading-[1.45] text-[var(--color-ink-2)]">{DESCRIPCION_ROL[r]}</span>
                  </span>
                </label>
              );
            })}
          </div>
          {esUnoMismo && (
            <p id={`${id}-rol-yo`} className="m-0 mt-1.5 text-[13px] text-[var(--color-muted)]">
              Es tu cuenta: no puedes quitarte el rol de administrador.
            </p>
          )}
          {errorCampo('rol')}
        </fieldset>

        <fieldset
          className="m-0 min-w-0 border-0 p-0"
          aria-describedby={describe('farmaciaIds', `${id}-farmacias-ayuda`)}
          aria-invalid={!!err('farmaciaIds')}
        >
          <legend className="label mb-2">
            <span>
              Farmacias que lleva
              {rol !== 'admin' && (
                <>
                  <span aria-hidden className="ml-1 text-[var(--color-red-ink)] text-[1.3em] font-bold leading-none align-[-0.05em]">
                    *
                  </span>
                  <span className="sr-only">, obligatorio</span>
                </>
              )}
            </span>
          </legend>
          <div className="flex flex-col gap-2">
            {farmacias.map((f, i) => {
              const marcada = farmaciaIds.includes(f.id);
              return (
                <label
                  key={f.id}
                  className={cn(
                    'flex items-center gap-3 rounded-[10px] border px-3.5 py-2.5 min-h-11 cursor-pointer has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-[var(--color-accent)] has-[:focus-visible]:outline-offset-2',
                    marcada
                      ? 'border-[var(--color-accent)] bg-[var(--color-accent-soft)]'
                      : 'border-[var(--color-control-border)] bg-[var(--color-surface)]',
                  )}
                >
                  <input
                    type="checkbox"
                    // Destino del foco si el servidor devuelve un error en las farmacias
                    id={i === 0 ? `${id}-farmaciaIds` : undefined}
                    checked={marcada}
                    onChange={() => alternarFarmacia(f.id)}
                    className="sr-only cursor-pointer"
                  />
                  <IndicadorEleccion tipo="checkbox" marcado={marcada} />
                  <span className="text-[14.5px] text-[var(--color-ink)]">{f.nombre}</span>
                </label>
              );
            })}
          </div>
          <p id={`${id}-farmacias-ayuda`} className="m-0 mt-1.5 text-[13px] text-[var(--color-muted)]">
            {rol === 'admin'
              ? 'El administrador ve todas las farmacias aunque no marques ninguna.'
              : 'Puede llevar varias; tendrá el mismo permiso en todas.'}
          </p>
          {errorCampo('farmaciaIds')}
        </fieldset>

        <fieldset className="m-0 min-w-0 border-0 p-0" aria-describedby={describe('modulos', `${id}-modulos-ayuda`)}>
          <legend className="label mb-2">Módulos que puede usar</legend>
          {rol === 'admin' ? (
            <p id={`${id}-modulos-ayuda`} className="m-0 text-[13.5px] text-[var(--color-ink-2)]">
              El administrador puede usar todos los módulos.
            </p>
          ) : (
            <>
              <div className="flex flex-col gap-2">
                {MODULOS.map((m, i) => {
                  const marcado = modulos.includes(m);
                  return (
                    <label
                      key={m}
                      className={cn(
                        'flex items-start gap-3 rounded-[10px] border px-3.5 py-3 min-h-11 cursor-pointer has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-[var(--color-accent)] has-[:focus-visible]:outline-offset-2',
                        marcado
                          ? 'border-[var(--color-accent)] bg-[var(--color-accent-soft)]'
                          : 'border-[var(--color-control-border)] bg-[var(--color-surface)]',
                      )}
                    >
                      <input
                        type="checkbox"
                        id={i === 0 ? `${id}-modulos` : undefined}
                        checked={marcado}
                        onChange={() => alternarModulo(m)}
                        className="sr-only cursor-pointer"
                      />
                      <IndicadorEleccion tipo="checkbox" marcado={marcado} />
                      <span className="min-w-0">
                        <span className="block text-[14.5px] font-semibold text-[var(--color-ink)]">{MODULO_LABEL[m]}</span>
                        <span className="block text-[13.5px] leading-[1.45] text-[var(--color-ink-2)]">{DESCRIPCION_MODULO[m]}</span>
                      </span>
                    </label>
                  );
                })}
              </div>
              <p id={`${id}-modulos-ayuda`} className="m-0 mt-1.5 text-[13px] text-[var(--color-muted)]">
                Sin ninguno marcado, solo verá la web de su farmacia.
              </p>
            </>
          )}
          {errorCampo('modulos')}
        </fieldset>
      </form>
    </Modal>
  );
}
