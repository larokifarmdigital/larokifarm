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
  restablecerContrasenaAction,
} from '../../../actions/usuariosActions';
import { ETIQUETA_ROL } from '../../lib/roles';
import { CuentaDialog, type DatosCuenta } from '../CuentaDialog';
import { ContrasenaTemporalDialog } from '../ContrasenaTemporalDialog';

const SIN_FARMACIA = '__sin__';
const ROLES: RolCuenta[] = ['admin', 'manager', 'viewer'];
const CHIP_ROL: Record<RolCuenta, string> = { admin: 'chip-accent', manager: 'chip-green', viewer: 'chip-neutral' };

/** "Torrents, Chamarro" — todas sus farmacias (pocas por persona), o null si ninguna. */
const nombresFarmacias = (c: UserAccount) => (c.farmacias.length ? c.farmacias.map((f) => f.nombre).join(', ') : null);

const sinAcentos = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

type Temporal = { id: string; nombre: string; email: string; contrasena: string; nueva: boolean } | null;
type Estado = '' | 'activos' | 'desactivados';

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
  const [estado, setEstado] = useState<Estado>('');
  /** undefined = cerrado · null = crear · cuenta = editar */
  const [editando, setEditando] = useState<UserAccount | null | undefined>(undefined);
  const [confirmar, setConfirmar] = useState<UserAccount | null>(null);
  const [restablecer, setRestablecer] = useState<UserAccount | null>(null);
  const [temporal, setTemporal] = useState<Temporal>(null);
  const [, startTransition] = useTransition();

  // Activos primero; luego por farmacia ("Sin farmacia" al final) y por nombre.
  const filtradas = useMemo(() => {
    const q = sinAcentos(texto.trim());
    const nombreFarmacia = (c: UserAccount) => nombresFarmacias(c) ?? '\uffff';
    return cuentas
      .filter((c) => {
        if (farmacia === SIN_FARMACIA ? c.farmacias.length > 0 : farmacia && !c.farmacias.some((f) => f.id === farmacia)) return false;
        if (rolFiltro && c.rol !== rolFiltro) return false;
        if (estado === 'activos' && !c.activo) return false;
        if (estado === 'desactivados' && c.activo) return false;
        return !q || sinAcentos(`${c.nombre} ${c.email}`).includes(q);
      })
      .sort(
        (x, y) =>
          Number(y.activo) - Number(x.activo) ||
          nombreFarmacia(x).localeCompare(nombreFarmacia(y), 'es') ||
          x.nombre.localeCompare(y.nombre, 'es'),
      );
  }, [cuentas, texto, farmacia, rolFiltro, estado]);

  const hayFiltros = !!texto.trim() || !!farmacia || !!rolFiltro || !!estado;

  function quitarFiltros() {
    setTexto('');
    setFarmacia('');
    setRolFiltro('');
    setEstado('');
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
    const res = await editarUsuarioAction(editando.id, { nombre: datos.nombre, rol: datos.rol, farmaciaIds: datos.farmaciaIds });
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
      toast.success(activo ? `${c.nombre} puede volver a entrar` : `${c.nombre} ya no puede entrar`);
      setConfirmar(null);
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

  const estadoDe = (activo: boolean) => (
    <span className={cn('inline-flex items-center gap-1.5 text-[13.5px]', activo ? 'text-[var(--color-green-ink)]' : 'text-[var(--color-muted)]')}>
      <span aria-hidden className={cn('h-2 w-2 rounded-full', activo ? 'bg-[var(--color-green-ink)]' : 'bg-[var(--color-muted)]')} />
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
              { value: '', label: 'Todos los estados' },
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
            activos={[farmacia, rolFiltro, estado].filter(Boolean).length}
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
            ? 'No hay usuarios con estos filtros.'
            : hayFiltros
              ? `${filtradas.length} de ${cuentas.length} usuarios`
              : `${cuentas.length} ${cuentas.length === 1 ? 'usuario' : 'usuarios'}`}
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
          <h2 className="m-0 text-[17px] font-bold text-[var(--color-ink)]">Nadie coincide</h2>
          <p className="m-0 text-[14.5px] text-[var(--color-muted)]">Prueba con otro nombre, otra farmacia u otro rol.</p>
          {hayFiltros && (
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
                  <tr key={c.id} className={cn('transition-colors hover:bg-[var(--color-surface-2)]', !c.activo && 'bg-[var(--color-surface-2)]/60')}>
                    <td className="px-5 py-3">
                      <span className="flex items-center gap-2">
                        {nombreDe(c, cn('font-semibold', c.activo ? 'text-[var(--color-ink)]' : 'text-[var(--color-ink-2)]'))}
                        {c.id === miId && <span className="chip chip-neutral">Tú</span>}
                      </span>
                      <span className="block text-[13px] text-[var(--color-muted)] break-all">{c.email}</span>
                    </td>
                    <td className="px-3 py-3 text-[var(--color-ink-2)]">
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
              <li key={c.id} className={cn('card p-4', !c.activo && 'bg-[var(--color-surface-2)]')}>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  {nombreDe(c, 'text-[15px] font-semibold text-[var(--color-ink)]')}
                  {c.id === miId && <span className="chip chip-neutral">Tú</span>}
                  <span className={cn('chip', CHIP_ROL[c.rol])}>{ETIQUETA_ROL[c.rol]}</span>
                </div>
                <p className="m-0 mt-1 text-[13.5px] text-[var(--color-muted)] break-all">{c.email}</p>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <div className="min-w-0 text-[13.5px]">
                    <p className="m-0 text-[var(--color-ink-2)]">{nombresFarmacias(c) ?? 'Sin farmacia'}</p>
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
