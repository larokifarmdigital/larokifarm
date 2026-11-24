'use client';

import { useId, useMemo, useState, useTransition } from 'react';
import {
  RowActionsItem,
  RowActionsMenu,
  RowActionsNote,
  RowActionsSeparator,
} from '@/shared/components/molecules/RowActionsMenu';
import { toast } from 'sonner';
import { Button } from '@/shared/components/atoms/Button';
import { NavIcon } from '@/shared/components/atoms/NavIcon';
import { PageHeader, ANCHO_PAGINA } from '@/shared/components/molecules/PageHeader';
import { ConfirmDialog } from '@/shared/components/molecules/ConfirmDialog';
import { cn } from '@/shared/lib/cn';
import type { FarmaciaOpcion, RolCuenta, UserAccount } from '@/core/users/domain';
import { Select } from '@/shared/components/atoms/Select';
import { FiltrosMovil } from '@/shared/components/molecules/FiltrosMovil';
import {
  cambiarActivoUsuarioAction,
  crearUsuarioAction,
  editarUsuarioAction,
  eliminarUsuarioAction,
  restablecerContrasenaAction,
} from '../../../actions/usuariosActions';
import { ETIQUETA_ROL } from '../../lib/roles';
import { CuentaDialog, type DatosCuenta } from '../CuentaDialog';
import { ContrasenaTemporalDialog } from '../ContrasenaTemporalDialog';

const SIN_FARMACIA = '__sin__';
const ROLES: RolCuenta[] = ['admin', 'manager', 'viewer'];
// Un color por rol, sin chocar con el verde/gris del estado.
const CHIP_ROL: Record<RolCuenta, string> = { admin: 'chip-violet', manager: 'chip-blue', viewer: 'chip-neutral' };

/** "Gestión Larokifarm" → "GL". */
const iniciales = (nombre: string) =>
  nombre
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('');

function Avatar({ c }: { c: UserAccount }) {
  return (
    <span
      aria-hidden
      className={cn(
        'grid h-9 w-9 shrink-0 place-items-center rounded-full text-[13px] font-semibold',
        c.activo
          ? 'bg-[var(--color-blue-soft)] text-[var(--color-blue-ink)]'
          : 'border border-dashed border-[var(--color-hairline-strong)] text-[var(--color-muted)]',
      )}
    >
      {iniciales(c.nombre)}
    </span>
  );
}

/** "Torrents, Chamarro" — todas sus farmacias (pocas por persona), o null si ninguna. */
const nombresFarmacias = (c: UserAccount) => (c.farmacias.length ? c.farmacias.map((f) => f.nombre).join(', ') : null);

const sinAcentos = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

type Temporal = { id: string; nombre: string; email: string; contrasena: string; nueva: boolean } | null;
// Por defecto solo activos: los desactivados se consultan a propósito.
type Estado = 'activos' | 'desactivados';
const ESTADO_INICIAL: Estado = 'activos';

/** Tabla (escritorio) y tarjetas (móvil) conviven en el DOM: elige el visible. */
function visible(selector: string) {
  return [...document.querySelectorAll<HTMLElement>(selector)].find((el) => el.offsetParent !== null) ?? null;
}

/** Tras cerrar un diálogo que se abrió sin disparador visible: foco a la fila de esa persona. */
function enfocarFila(id: string) {
  setTimeout(() => {
    (visible(`[data-acciones="${id}"]`) ?? visible(`[data-editar="${id}"]`))?.focus();
  }, 60);
}

export function UsuariosGestion({
  cuentas,
  farmacias,
  miId,
}: {
  cuentas: UserAccount[];
  farmacias: FarmaciaOpcion[];
  miId: string;
}) {
  const buscadorId = useId();
  const farmaciaFiltroId = useId();
  const rolFiltroId = useId();
  const estadoFiltroId = useId();
  const [texto, setTexto] = useState('');
  const [farmacia, setFarmacia] = useState('');
  const [rolFiltro, setRolFiltro] = useState('');
  // Por defecto "Todos": no escondemos a nadie; los desactivados van al final y atenuados.
  const [estado, setEstado] = useState<Estado>(ESTADO_INICIAL);
  /** undefined = cerrado · null = crear · cuenta = editar */
  const [editando, setEditando] = useState<UserAccount | null | undefined>(undefined);
  const [confirmar, setConfirmar] = useState<UserAccount | null>(null);
  const [restablecer, setRestablecer] = useState<UserAccount | null>(null);
  const [eliminar, setEliminar] = useState<UserAccount | null>(null);
  const [temporal, setTemporal] = useState<Temporal>(null);
  const [, startTransition] = useTransition();

  // Activos primero; luego por farmacia ("Sin farmacia" al final) y por nombre.
  // Coincidencias sin mirar el estado: sirven para avisar de las del otro estado.
  const coinciden = useMemo(() => {
    const q = sinAcentos(texto.trim());
    return cuentas.filter((c) => {
      if (farmacia === SIN_FARMACIA ? c.farmacias.length > 0 : farmacia && !c.farmacias.some((f) => f.id === farmacia)) return false;
      if (rolFiltro && c.rol !== rolFiltro) return false;
      return !q || sinAcentos(`${c.nombre} ${c.email}`).includes(q);
    });
  }, [cuentas, texto, farmacia, rolFiltro]);

  const filtradas = useMemo(() => {
    const nombreFarmacia = (c: UserAccount) => nombresFarmacias(c) ?? '\uffff';
    return coinciden
      .filter((c) => (estado === 'activos' ? c.activo : !c.activo))
      .sort(
        (x, y) =>
          Number(y.activo) - Number(x.activo) ||
          nombreFarmacia(x).localeCompare(nombreFarmacia(y), 'es') ||
          x.nombre.localeCompare(y.nombre, 'es'),
      );
  }, [coinciden, estado]);

  const enOtroEstado = coinciden.length - filtradas.length;
  const totalEstado = cuentas.filter((c) => (estado === 'activos' ? c.activo : !c.activo)).length;
  const nombreEstado = estado === 'activos' ? 'activos' : 'desactivados';
  const otroEstado: Estado = estado === 'activos' ? 'desactivados' : 'activos';

  // «Activos» es el punto de partida, no cuenta como filtro.
  const hayFiltros = !!texto.trim() || !!farmacia || !!rolFiltro || estado !== ESTADO_INICIAL;

  function quitarFiltros() {
    setTexto('');
    setFarmacia('');
    setRolFiltro('');
    setEstado(ESTADO_INICIAL);
    document.getElementById(buscadorId)?.focus();
  }

  async function guardar(datos: DatosCuenta) {
    if (editando === null) {
      const res = await crearUsuarioAction(datos);
      if (!res.ok) return res;
      setEditando(undefined);
      setTemporal({ id: res.data.cuenta.id, nombre: res.data.cuenta.nombre, email: res.data.cuenta.email, contrasena: res.data.contrasenaTemporal, nueva: true });
      return { ok: true as const };
    }
    if (!editando) return { ok: true as const };
    const res = await editarUsuarioAction(editando.id, {
      nombre: datos.nombre,
      rol: datos.rol,
      farmaciaIds: datos.farmaciaIds,
      modulos: datos.modulos,
    });
    if (!res.ok) return res;
    setEditando(undefined);
    toast.success('Cambios guardados', { description: 'Se aplican en su próximo acceso o en unos minutos.' });
    return { ok: true as const };
  }

  function cambiarActivo(c: UserAccount, activo: boolean) {
    startTransition(async () => {
      const res = await cambiarActivoUsuarioAction(c.id, activo);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(activo ? `${c.nombre} puede volver a entrar` : `${c.nombre} ya no puede entrar`, {
        description: activo ? 'Pasa a la lista de activos.' : 'Pasa a la lista de desactivados.',
      });
      setConfirmar(null);
      // La fila sale de la lista actual: el foco va al buscador para no perderse.
      requestAnimationFrame(() => document.getElementById(buscadorId)?.focus());
    });
  }

  function hacerEliminar(c: UserAccount) {
    startTransition(async () => {
      const res = await eliminarUsuarioAction(c.id);
      setEliminar(null);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(`Cuenta de ${c.nombre} eliminada`);
      // La fila desaparece: el foco va al buscador para no perderse.
      requestAnimationFrame(() => document.getElementById(buscadorId)?.focus());
    });
  }

  function hacerRestablecer(c: UserAccount) {
    startTransition(async () => {
      const res = await restablecerContrasenaAction(c.id);
      setRestablecer(null);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setTemporal({ id: c.id, nombre: c.nombre, email: c.email, contrasena: res.data.contrasenaTemporal, nueva: false });
    });
  }

  /**
   * UN solo punto de entrada para las acciones de la fila: el menú "⋯"
   * (Editar primero; desactivar al final y separado). El nombre también abre Editar.
   */
  function acciones(c: UserAccount) {
    const yo = c.id === miId;
    return (
      <RowActionsMenu label={`Acciones para ${c.nombre}`} triggerProps={{ 'data-acciones': c.id }}>
        <RowActionsItem icon="PencilSimple" onSelect={() => setEditando(c)}>
          Editar
        </RowActionsItem>
        {yo ? (
          <RowActionsNote>Tu contraseña se cambia desde el menú con tu nombre, arriba a la derecha.</RowActionsNote>
        ) : (
          <>
            {c.activo && (
              <RowActionsItem icon="Key" onSelect={() => setRestablecer(c)}>
                Nueva contraseña temporal
              </RowActionsItem>
            )}
            <RowActionsSeparator />
            {c.activo ? (
              <RowActionsItem icon="UserMinus" peligro onSelect={() => setConfirmar(c)}>
                Desactivar
              </RowActionsItem>
            ) : (
              <RowActionsItem icon="UserCheck" onSelect={() => cambiarActivo(c, true)}>
                Reactivar
              </RowActionsItem>
            )}
            {c.tieneHistorial ? (
              <RowActionsNote>Tiene conciliaciones guardadas: no se puede eliminar, solo desactivar.</RowActionsNote>
            ) : (
              <RowActionsItem icon="Trash" peligro onSelect={() => setEliminar(c)}>
                Eliminar
              </RowActionsItem>
            )}
          </>
        )}
      </RowActionsMenu>
    );
  }

  /** Nombre = acción principal (Editar). Botón real: teclado y lector lo entienden. */
  const nombreDe = (c: UserAccount, clase: string) => (
    <button
      type="button"
      data-editar={c.id}
      onClick={() => setEditando(c)}
      aria-label={`Editar a ${c.nombre}`}
      className={cn(
        'min-h-11 min-w-11 md:min-h-0 md:min-w-0 -my-1 py-1 rounded-[4px] text-left hover:text-[var(--color-accent)] hover:underline underline-offset-2',
        clase,
      )}
    >
      {c.nombre}
    </button>
  );

  // Mismo lenguaje que «Publicada» en Farmacias: etiqueta con punto.
  const estadoDe = (activo: boolean) => (
    <span className={cn('chip whitespace-nowrap', activo ? 'chip-green' : 'chip-neutral')}>
      <span aria-hidden className={cn('h-1.5 w-1.5 rounded-full', activo ? 'bg-[var(--color-green-ink)]' : 'bg-[var(--color-muted)]')} />
      {activo ? 'Activo' : 'Desactivado'}
    </span>
  );

  /** Selects de filtro: en línea en escritorio y dentro de "Filtros" en móvil (ids distintos). */
  const controles = (sufijo: string, etiquetaVisible: boolean) => {
    const etiqueta = etiquetaVisible ? 'mb-1.5 block text-[14px] font-medium text-[var(--color-ink-2)]' : 'sr-only';
    return (
      <>
        <div className={etiquetaVisible ? '' : 'md:w-[220px]'}>
          <label htmlFor={farmaciaFiltroId + sufijo} className={etiqueta}>
            Farmacia
          </label>
          <Select
            id={farmaciaFiltroId + sufijo}
            value={farmacia}
            onValueChange={setFarmacia}
            options={[
              { value: '', label: 'Todas las farmacias' },
              ...farmacias.map((f) => ({ value: f.id, label: f.nombre })),
              { value: SIN_FARMACIA, label: 'Sin farmacia' },
            ]}
          />
        </div>
        <div className={etiquetaVisible ? '' : 'md:w-[200px]'}>
          <label htmlFor={rolFiltroId + sufijo} className={etiqueta}>
            Rol
          </label>
          <Select
            id={rolFiltroId + sufijo}
            value={rolFiltro}
            onValueChange={setRolFiltro}
            options={[{ value: '', label: 'Todos los roles' }, ...ROLES.map((r) => ({ value: r, label: ETIQUETA_ROL[r] }))]}
          />
        </div>
        <div className={etiquetaVisible ? '' : 'md:w-[180px]'}>
          <label htmlFor={estadoFiltroId + sufijo} className={etiqueta}>
            Estado
          </label>
          <Select
            id={estadoFiltroId + sufijo}
            value={estado}
            onValueChange={(v) => setEstado(v as Estado)}
            options={[
              { value: 'activos', label: 'Activos' },
              { value: 'desactivados', label: 'Desactivados' },
            ]}
          />
        </div>
      </>
    );
  };

  return (
    <div className={cn(ANCHO_PAGINA, 'pt-6 pb-10')}>
      <PageHeader
        titulo="Usuarios"
        descripcion="Quién puede entrar al backoffice y qué puede hacer en cada farmacia."
        accion={
          <Button type="button" variant="accent" onClick={() => setEditando(null)} data-foco-tras-modal>
            <NavIcon name="Plus" size={16} />
            Nuevo usuario
          </Button>
        }
      />

      <div role="search" aria-label="Filtrar usuarios" className="mb-3 flex items-center gap-2 md:flex-wrap">
        <div className="relative min-w-0 flex-1 md:min-w-[220px]">
          <label htmlFor={buscadorId} className="sr-only">
            Buscar por nombre o correo
          </label>
          <NavIcon
            name="MagnifyingGlass"
            size={17}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)]"
          />
          <input
            id={buscadorId}
            type="search"
            className="field pl-9"
            placeholder="Buscar por nombre o correo"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            autoComplete="off"
          />
        </div>
        <div className="hidden md:contents">{controles('', false)}</div>
        <div className="shrink-0 md:hidden">
          <FiltrosMovil
            activos={[farmacia, rolFiltro, estado !== ESTADO_INICIAL].filter(Boolean).length}
            resultados={filtradas.length === 1 ? 'Ver 1 usuario' : `Ver ${filtradas.length} usuarios`}
            onQuitar={quitarFiltros}
          >
            {controles('-movil', true)}
          </FiltrosMovil>
        </div>
      </div>

      <div className="mb-3 flex min-h-11 items-center justify-between gap-3 px-1">
        <p role="status" className="m-0 text-[14px] text-[var(--color-muted)]">
          {filtradas.length === 0
            ? `No hay usuarios ${nombreEstado} con estos filtros.`
            : filtradas.length < totalEstado
              ? `${filtradas.length} de ${totalEstado} usuarios ${nombreEstado}`
              : `${totalEstado} ${totalEstado === 1 ? `usuario ${nombreEstado.slice(0, -1)}` : `usuarios ${nombreEstado}`}`}
        </p>
        {hayFiltros && filtradas.length > 0 && (
          <Button type="button" variant="ghost" size="sm" onClick={quitarFiltros}>
            <NavIcon name="X" size={14} />
            Quitar filtros
          </Button>
        )}
      </div>

      {filtradas.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 px-5 py-10 text-center">
          <h2 className="m-0 text-[17px] font-bold text-[var(--color-ink)]">
            {estado === 'activos' ? 'Ningún usuario activo coincide' : 'Ningún usuario desactivado coincide'}
          </h2>
          {enOtroEstado > 0 ? (
            <>
              <p className="m-0 text-[14.5px] text-[var(--color-muted)]">
                {enOtroEstado === 1
                  ? `Hay 1 usuario ${otroEstado.slice(0, -1)} que coincide.`
                  : `Hay ${enOtroEstado} usuarios ${otroEstado} que coinciden.`}
              </p>
              <Button type="button" variant="secondary" onClick={() => {
                  setEstado(otroEstado);
                  requestAnimationFrame(() => document.getElementById(buscadorId)?.focus());
                }}>
                Ver {otroEstado}
              </Button>
            </>
          ) : (
            <p className="m-0 text-[14.5px] text-[var(--color-muted)]">Prueba con otro nombre, otra farmacia u otro rol.</p>
          )}
          {hayFiltros && enOtroEstado === 0 && (
            <Button type="button" variant="secondary" onClick={quitarFiltros}>
              Quitar filtros
            </Button>
          )}
        </div>
      ) : (
        <>
          {/* Escritorio: tabla */}
          <div className="card hidden overflow-hidden p-0 md:block">
            <table className="w-full text-left text-[14px]">
              <caption className="sr-only">Usuarios del backoffice</caption>
              <thead>
                <tr className="border-b border-[var(--color-hairline)] bg-[var(--color-surface-2)] text-[12.5px] text-[var(--color-muted)]">
                  <th scope="col" className="px-5 py-2.5 font-semibold">Usuario</th>
                  <th scope="col" className="px-3 py-2.5 font-semibold">Farmacias</th>
                  <th scope="col" className="px-3 py-2.5 font-semibold">Rol</th>
                  <th scope="col" className="px-3 py-2.5 font-semibold">Estado</th>
                  <th scope="col" className="px-5 py-2.5">
                    <span className="sr-only">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-hairline)]">
                {filtradas.map((c) => (
                  <tr key={c.id} className="transition-colors hover:bg-[var(--color-surface-2)]">
                    <td className="px-5 py-3">
                      <span className="flex items-center gap-3">
                        <Avatar c={c} />
                        <span className="min-w-0">
                          <span className="flex items-center gap-2">
                            {nombreDe(c, cn('font-semibold', c.activo ? 'text-[var(--color-ink)]' : 'text-[var(--color-muted)]'))}
                            {c.id === miId && <span className="chip chip-accent">Tú</span>}
                          </span>
                          <span className="block text-[13px] text-[var(--color-muted)] break-all">{c.email}</span>
                        </span>
                      </span>
                    </td>
                    <td className={cn('px-3 py-3', c.activo ? 'text-[var(--color-ink-2)]' : 'text-[var(--color-muted)]')}>
                      {nombresFarmacias(c) ?? <span className="text-[var(--color-muted)]">Sin farmacia</span>}
                    </td>
                    <td className="px-3 py-3">
                      <span className={cn('chip whitespace-nowrap', CHIP_ROL[c.rol])}>{ETIQUETA_ROL[c.rol]}</span>
                    </td>
                    <td className="px-3 py-3">
                      {estadoDe(c.activo)}
                    </td>
                    <td className="w-16 px-5 py-3 text-right">
                      {acciones(c)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Móvil: tarjetas */}
          <ul className="m-0 flex list-none flex-col gap-2 p-0 md:hidden">
            {filtradas.map((c) => (
              <li key={c.id} className="card p-4">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <Avatar c={c} />
                  {nombreDe(c, cn('text-[15px] font-semibold', c.activo ? 'text-[var(--color-ink)]' : 'text-[var(--color-muted)]'))}
                  {c.id === miId && <span className="chip chip-accent">Tú</span>}
                  <span className={cn('chip', CHIP_ROL[c.rol])}>{ETIQUETA_ROL[c.rol]}</span>
                </div>
                <p className="m-0 mt-1 text-[13.5px] text-[var(--color-muted)] break-all">{c.email}</p>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <div className="min-w-0 text-[13.5px]">
                    <p className="m-0 mb-1.5 text-[var(--color-ink-2)]">{nombresFarmacias(c) ?? 'Sin farmacia'}</p>
                    {estadoDe(c.activo)}
                  </div>
                  {acciones(c)}
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      {editando !== undefined && (
        <CuentaDialog
          key={editando?.id ?? 'nuevo'}
          open
          onOpenChange={(o) => !o && setEditando(undefined)}
          cuenta={editando}
          farmacias={farmacias}
          esUnoMismo={editando?.id === miId}
          onGuardar={guardar}
        />
      )}

      <ConfirmDialog
        open={!!confirmar}
        onOpenChange={(o) => !o && setConfirmar(null)}
        title={`¿Desactivar a ${confirmar?.nombre ?? ''}?`}
        description="No podrá entrar al backoffice (como mucho en unos minutos se cierra su sesión abierta). Sus conciliaciones y reportes se conservan y puedes reactivarlo cuando quieras."
        confirmLabel="Desactivar"
        onConfirm={() => confirmar && cambiarActivo(confirmar, false)}
      />

      <ConfirmDialog
        open={!!eliminar}
        onOpenChange={(o) => !o && setEliminar(null)}
        title={`¿Eliminar la cuenta de ${eliminar?.nombre ?? ''}?`}
        description={`Se borra para siempre ${eliminar?.email ?? ''} y deja de poder entrar. No se puede deshacer. Si solo quieres que no entre por ahora, usa Desactivar.`}
        confirmLabel="Eliminar cuenta"
        onConfirm={() => eliminar && hacerEliminar(eliminar)}
      />

      <ConfirmDialog
        open={!!restablecer}
        onOpenChange={(o) => !o && setRestablecer(null)}
        title={`¿Nueva contraseña para ${restablecer?.nombre ?? ''}?`}
        description="Su contraseña actual dejará de funcionar. Te mostraremos una temporal para que se la pases."
        confirmLabel="Crear contraseña temporal"
        variant="accent"
        onConfirm={() => restablecer && hacerRestablecer(restablecer)}
      />

      <ContrasenaTemporalDialog
        datos={temporal}
        onClose={() => {
          if (temporal) enfocarFila(temporal.id);
          setTemporal(null);
        }}
      />
    </div>
  );
}
