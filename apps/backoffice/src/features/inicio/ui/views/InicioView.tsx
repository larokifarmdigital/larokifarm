import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth, getCurrentUser } from '@/core/auth';
import { canEditContent } from '@/core/auth/domain';
import { getFarmaciaRepository, type FarmaciaSummary } from '@/core/farmacias';
import { getComparisonRepository, type ComparisonRow } from '@/core/comparisons';
import { getReportRepository, type OpenReportItem } from '@/core/reports';
import { scopeFromSession } from '@/core/shared';
import { FarmaciaAvatar } from '@/features/farmacias/ui/components/FarmaciasList/FarmaciaAvatar';
import { PageHeader, ANCHO_PAGINA } from '@/shared/components/molecules/PageHeader';
import { NavIcon, type IconName } from '@/shared/components/atoms/NavIcon';
import { formatRelativeDate } from '@/shared/lib/format';
import { landingUrl } from '@/shared/lib/landingUrl';
import { cn } from '@/shared/lib/cn';

/* ------------------------------------------------------------------ */
/* Estado de la web en lenguaje llano                                  */
/* ------------------------------------------------------------------ */

type EstadoWeb = { texto: string; detalle?: string; tono: 'ok' | 'aviso' | 'neutro' };

/** Margen para no confundir el propio guardado de "publicar" con un cambio. */
const MARGEN_MS = 60_000;

function tieneCambiosSinPublicar(f: FarmaciaSummary): boolean {
  if (f.status !== 'published' || !f.ultimaPublicacion) return false;
  return new Date(f.updatedAt).getTime() - new Date(f.ultimaPublicacion).getTime() > MARGEN_MS;
}

function estadoWeb(f: FarmaciaSummary): EstadoWeb {
  if (f.status === 'archived') return { texto: 'Archivada', detalle: 'No se muestra en internet', tono: 'neutro' };
  if (f.status === 'draft') return { texto: 'Borrador', detalle: 'Todavía no está publicada', tono: 'aviso' };
  if (tieneCambiosSinPublicar(f)) {
    return {
      texto: 'Tienes cambios sin publicar',
      detalle: `Último cambio ${formatRelativeDate(f.updatedAt)}`,
      tono: 'aviso',
    };
  }
  return {
    texto: 'Publicada y al día',
    detalle: f.ultimaPublicacion ? `Publicada ${formatRelativeDate(f.ultimaPublicacion)}` : undefined,
    tono: 'ok',
  };
}

const TONO: Record<EstadoWeb['tono'], string> = {
  ok: 'bg-[var(--color-green-soft)] text-[var(--color-green-ink)]',
  aviso: 'bg-[var(--color-yellow-soft)] text-[var(--color-yellow-ink)]',
  neutro: 'bg-[var(--color-surface-sunken)] text-[var(--color-ink-2)]',
};

function EstadoBadge({ estado }: { estado: EstadoWeb }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[13px] font-medium', TONO[estado.tono])}>
      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current" />
      {estado.texto}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Conciliaciones                                                      */
/* ------------------------------------------------------------------ */

function resultado(c: ComparisonRow): { texto: string; clase: string } {
  // Mismas palabras que el historial y el resultado de la conciliación.
  if (c.status === 'ERROR') return { texto: 'No se pudo comprobar', clase: 'chip-red' };
  if (c.numDiscrepancies === 0) return { texto: 'Todo coincide', clase: 'chip-green' };
  return {
    texto: `${c.numDiscrepancies} por revisar`,
    clase: 'chip-yellow',
  };
}

function ListaConciliaciones({ items, conFarmacia }: { items: ComparisonRow[]; conFarmacia: boolean }) {
  if (items.length === 0) {
    return (
      <p className="m-0 py-6 text-center text-[14px] text-[var(--color-muted)]">
        Aún no has conciliado ningún albarán.
      </p>
    );
  }
  return (
    <ul className="divide-y divide-[var(--color-hairline)]">
      {items.map((c) => {
        const r = resultado(c);
        return (
          <li key={c.id}>
            <Link
              href={`/albaranes/historial/${c.id}`}
              className="flex items-center gap-3 min-h-14 py-2.5 -mx-2 px-2 rounded-[8px] hover:bg-[var(--color-surface-2)] transition-colors"
            >
              <span className="flex-1 min-w-0">
                <span className="block text-[14.5px] font-medium text-[var(--color-ink)] truncate">
                  {c.supplier || c.label || 'Proveedor sin identificar'}
                </span>
                <span className="block text-[12.5px] text-[var(--color-muted)] truncate">
                  {/* Mismo criterio que el Historial: proveedor de título; nombre del envío, secundario */}
                  {[
                    c.label && c.label !== c.supplier ? c.label : null,
                    formatRelativeDate(c.createdAt.toISOString()),
                    conFarmacia ? c.business.name : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </span>
              </span>
              <span className={cn('chip shrink-0', r.clase)}>{r.texto}</span>
              <NavIcon name="CaretRight" size={13} className="text-[var(--color-muted-2)] shrink-0" />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/* ------------------------------------------------------------------ */
/* Piezas comunes                                                      */
/* ------------------------------------------------------------------ */

function Tarjeta({ titulo, accion, children, className }: {
  titulo: string;
  accion?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  // aria-labelledby separa por espacios: el id no puede llevarlos
  const id = `t-${titulo.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  return (
    <section className={cn('card p-5 sm:p-6', className)} aria-labelledby={id}>
      <div className="flex items-center justify-between gap-3 mb-4">
        <h2 id={id} className="m-0 text-[17px] font-semibold tracking-[-0.02em] text-[var(--color-ink)]">
          {titulo}
        </h2>
        {accion}
      </div>
      {children}
    </section>
  );
}

const BTN_PRIMARIO =
  'inline-flex items-center justify-center gap-2 min-h-11 px-4 rounded-[8px] bg-[var(--color-accent)] text-white text-[14.5px] font-semibold hover:bg-[var(--color-accent-hover)] transition-colors';
const BTN_SECUNDARIO =
  'inline-flex items-center justify-center gap-2 min-h-11 px-4 rounded-[8px] border border-[var(--color-hairline-strong)] bg-[var(--color-surface)] text-[var(--color-ink)] text-[14.5px] font-medium hover:bg-[var(--color-surface-2)] transition-colors';
const ENLACE = 'inline-flex min-h-11 sm:min-h-0 items-center gap-1 py-2 text-[14px] font-medium text-[var(--color-accent)] hover:underline underline-offset-2';

const ATAJOS: { hash: string; label: string; icon: IconName }[] = [
  { hash: '#horario', label: 'Horario', icon: 'Clock' },
  { hash: '#general', label: 'Contacto y dirección', icon: 'Storefront' },
  { hash: '#hero', label: 'Portada y fotos', icon: 'Image' },
  { hash: '#servicios', label: 'Servicios', icon: 'Check' },
  { hash: '#faqs', label: 'Preguntas frecuentes', icon: 'QuestionMark' },
  { hash: '#sobre', label: 'Quiénes somos', icon: 'UsersThree' },
];

/* ------------------------------------------------------------------ */
/* Vista                                                               */
/* ------------------------------------------------------------------ */

export async function InicioView() {
  const [session, user] = await Promise.all([auth(), getCurrentUser()]);
  if (!session?.user || !user) redirect('/login');

  const esAdmin = user.rol === 'admin';
  const scope = scopeFromSession(session);
  const [farmacias, conciliaciones, informes] = await Promise.all([
    getFarmaciaRepository().listFarmacias(),
    getComparisonRepository().list(scope, {}, { page: 1, pageSize: esAdmin ? 5 : 3 }),
    esAdmin ? getReportRepository().listOpen(5) : Promise.resolve([] as OpenReportItem[]),
  ]);
  const nombre = user.nombre.split(/\s+/)[0];

  return (
    <div className={cn(ANCHO_PAGINA, 'pt-6 pb-10')}>
      <PageHeader
        titulo={`Hola, ${nombre}`}
        descripcion={esAdmin ? 'Esto es lo que pasa en tus farmacias.' : (farmacias[0]?.nombre ?? 'Tu farmacia')}
      />

      {esAdmin ? (
        <InicioAdmin farmacias={farmacias} conciliaciones={conciliaciones.items} informes={informes} />
      ) : (
        <InicioFarmacia
          farmacia={farmacias[0]}
          conciliaciones={conciliaciones.items}
          puedeEditar={canEditContent(user)}
        />
      )}
    </div>
  );
}

function InicioFarmacia({ farmacia, conciliaciones, puedeEditar }: {
  farmacia?: FarmaciaSummary;
  conciliaciones: ComparisonRow[];
  puedeEditar: boolean;
}) {
  const web = farmacia ? landingUrl(farmacia.web) : undefined;
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1.15fr_1fr] gap-4 sm:gap-5 items-start">
      <Tarjeta titulo="Tu web">
        {farmacia ? (
          <>
            <div className="flex items-center gap-3.5">
              <FarmaciaAvatar farmacia={farmacia} size={40} />
              <div className="min-w-0">
                <div className="text-[16px] font-semibold text-[var(--color-ink)] truncate">{farmacia.nombre}</div>
                {estadoWeb(farmacia).detalle && (
                  <div className="text-[13px] text-[var(--color-muted)]">{estadoWeb(farmacia).detalle}</div>
                )}
              </div>
            </div>
            <div className="mt-4"><EstadoBadge estado={estadoWeb(farmacia)} /></div>

            <div className="mt-5 flex flex-col sm:flex-row gap-2.5">
              <Link href={`/farmacias/${farmacia.id}`} className={BTN_PRIMARIO}>
                <NavIcon name="PencilSimple" size={16} />
                {puedeEditar ? 'Editar mi web' : 'Ver contenido'}
              </Link>
              {web && (
                <a href={web} target="_blank" rel="noopener noreferrer" className={BTN_SECUNDARIO}>
                  <NavIcon name="ArrowSquareOut" size={16} />
                  Ver web
                </a>
              )}
            </div>

            {puedeEditar && (
              <>
                <h3 className="mt-6 mb-2 text-[13px] font-semibold text-[var(--color-muted)]">Ir directo a</h3>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {ATAJOS.map((a) => (
                    <li key={a.label}>
                      <Link
                        href={`/farmacias/${farmacia.id}${a.hash}`}
                        className="flex items-center gap-2.5 min-h-11 px-3 rounded-[8px] bg-[var(--color-surface-2)] text-[14px] text-[var(--color-ink)] hover:bg-[var(--color-surface-sunken)] transition-colors"
                      >
                        <NavIcon name={a.icon} size={16} className="text-[var(--color-accent)]" />
                        {a.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </>
        ) : (
          <p className="m-0 text-[14px] text-[var(--color-muted)]">
            Tu usuario todavía no tiene una farmacia asignada. Contacta con soporte.
          </p>
        )}
      </Tarjeta>

      <Tarjeta
        titulo="Albaranes"
        accion={<Link href="/albaranes/historial" className={ENLACE}>Ver historial</Link>}
      >
        <Link href="/albaranes" className={cn(BTN_PRIMARIO, 'w-full mb-3')}>
          <NavIcon name="Plus" size={16} />
          Nueva conciliación
        </Link>
        <ListaConciliaciones items={conciliaciones} conFarmacia={false} />
      </Tarjeta>
    </div>
  );
}

function InicioAdmin({ farmacias, conciliaciones, informes }: {
  farmacias: FarmaciaSummary[];
  conciliaciones: ComparisonRow[];
  informes: OpenReportItem[];
}) {
  const activas = farmacias.filter((f) => f.status !== 'archived');
  const pendientes = activas.filter((f) => f.status === 'draft' || tieneCambiosSinPublicar(f));
  const hayAvisos = pendientes.length > 0 || informes.length > 0;

  return (
    <div className="space-y-4 sm:space-y-5">
      <Tarjeta titulo="Requiere atención">
        {hayAvisos ? (
          <ul className="divide-y divide-[var(--color-hairline)]">
            {pendientes.map((f) => (
              <li key={f.id}>
                <Link
                  href={`/farmacias/${f.id}`}
                  className="flex items-center gap-3 min-h-14 py-2.5 -mx-2 px-2 rounded-[8px] hover:bg-[var(--color-surface-2)] transition-colors"
                >
                  <NavIcon name="Storefront" size={18} className="text-[var(--color-yellow-ink)] shrink-0" />
                  <span className="flex-1 min-w-0">
                    <span className="block text-[14.5px] font-medium text-[var(--color-ink)] truncate">{f.nombre}</span>
                    <span className="block text-[12.5px] text-[var(--color-muted)]">
                      {f.status === 'draft' ? 'Borrador sin publicar' : `Cambios sin publicar · ${formatRelativeDate(f.updatedAt)}`}
                    </span>
                  </span>
                  <span className="text-[13px] font-medium text-[var(--color-accent)] shrink-0">Revisar</span>
                </Link>
              </li>
            ))}
            {informes.map((r) => (
              <li key={r.id}>
                <Link
                  href={`/albaranes/historial/${r.comparisonId}`}
                  className="flex items-center gap-3 min-h-14 py-2.5 -mx-2 px-2 rounded-[8px] hover:bg-[var(--color-surface-2)] transition-colors"
                >
                  <NavIcon name="Warning" size={18} className="text-[var(--color-red-ink)] shrink-0" />
                  <span className="flex-1 min-w-0">
                    <span className="block text-[14.5px] font-medium text-[var(--color-ink)] truncate">
                      Error reportado · {r.supplier || 'Proveedor sin identificar'}
                    </span>
                    <span className="block text-[12.5px] text-[var(--color-muted)] truncate">
                      {r.businessName} · {formatRelativeDate(r.createdAt.toISOString())} · «{r.note}»
                    </span>
                  </span>
                  <span className="text-[13px] font-medium text-[var(--color-accent)] shrink-0">Revisar</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="m-0 flex items-center gap-2 text-[14.5px] text-[var(--color-green-ink)]">
            <NavIcon name="Check" size={16} /> Todo en orden: no hay nada pendiente.
          </p>
        )}
      </Tarjeta>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 items-start">
        <Tarjeta titulo="Farmacias" accion={<Link href="/farmacias" className={ENLACE}>Ver todas</Link>}>
          <ul className="divide-y divide-[var(--color-hairline)]">
            {activas.map((f) => {
              const e = estadoWeb(f);
              return (
                <li key={f.id}>
                  <Link
                    href={`/farmacias/${f.id}`}
                    className="flex items-center gap-3 min-h-14 py-2.5 -mx-2 px-2 rounded-[8px] hover:bg-[var(--color-surface-2)] transition-colors"
                  >
                    <FarmaciaAvatar farmacia={f} size={36} />
                    <span className="flex-1 min-w-0">
                      <span className="block text-[14.5px] font-medium text-[var(--color-ink)] truncate">{f.nombre}</span>
                      <span className="block text-[12.5px] text-[var(--color-muted)]">{e.texto}</span>
                    </span>
                    <NavIcon name="CaretRight" size={13} className="text-[var(--color-muted-2)] shrink-0" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </Tarjeta>

        <Tarjeta
          titulo="Últimas conciliaciones"
          accion={<Link href="/albaranes/historial" className={ENLACE}>Ver historial</Link>}
        >
          <ListaConciliaciones items={conciliaciones} conFarmacia />
        </Tarjeta>
      </div>
    </div>
  );
}
