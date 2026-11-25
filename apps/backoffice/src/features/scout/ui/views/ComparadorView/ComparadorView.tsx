'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/shared/components/atoms/Button';
import { NavIcon } from '@/shared/components/atoms/NavIcon';
import { ANCHO_PAGINA, PageHeader } from '@/shared/components/molecules/PageHeader';
import { cn } from '@/shared/lib/cn';
import type { Candidato, Oferta } from '@/core/precios/domain';
import {
  buscarProductoAction,
  consultarCnAction,
  type ResultadoBusqueda,
} from '../../../actions/comparadorActions';
import { ListaCandidatos } from '../../components/ListaCandidatos';
import { AvisoReceta, TarjetaProducto } from '../../components/TarjetaProducto';
import { TablaPrecios } from '../../components/TablaPrecios';
import { ReportarIncidenciaBoton } from '../../components/ReportarIncidencia';
import { EUR, mejorVerificado } from '../../lib/precios';

type ConsultaAbierta = Extract<ResultadoBusqueda, { estado: 'producto' }>;
type Candidatos = Extract<ResultadoBusqueda, { estado: 'candidatos' }>;

/** Una web que no contesta en este tiempo pasa a "Error" (el servidor sigue y guarda si llega). */
const ESPERA_MAX_MS = 30_000;

function conTiempoMax<T>(p: Promise<T>): Promise<T> {
  return Promise.race([p, new Promise<T>((_, rej) => setTimeout(() => rej(new Error('timeout')), ESPERA_MAX_MS))]);
}

/** Ruta de API (no server action): las server actions van en cola y aquí se necesitan en paralelo. */
async function consultarFarmaciaApi(checkId: string, clave: string): Promise<Oferta | null> {
  const res = await fetch(`/api/precios/${encodeURIComponent(checkId)}/${encodeURIComponent(clave)}`, { method: 'POST' });
  if (!res.ok) return null;
  return ((await res.json()) as { oferta: Oferta }).oferta;
}

function ofertaError(clave: string): Oferta {
  return { farmacia: clave, estado: 'error', precio: null, precioAntes: null, url: null, nombreFicha: null, nota: null, consultadoEn: new Date().toISOString() };
}

export function ComparadorView({ cnInicial, autoConsultar }: { cnInicial?: string; autoConsultar?: boolean }) {
  const [texto, setTexto] = useState(cnInicial ?? '');
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [candidatos, setCandidatos] = useState<Candidatos | null>(null);
  const [elegido, setElegido] = useState<Candidato | null>(null);
  const [consulta, setConsulta] = useState<ConsultaAbierta | null>(null);
  const [ofertas, setOfertas] = useState<Record<string, Oferta>>({});
  const [anuncio, setAnuncio] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const productoRef = useRef<HTMLHeadingElement>(null);
  const candidatosRef = useRef<HTMLHeadingElement>(null);
  const ronda = useRef(0);
  // El foco se mueve tras pintar (useEffect), no en el mismo tick del setState:
  // si no, el destino aún no existe y el foco se queda en "Buscar".
  const [foco, setFoco] = useState<{ a: 'producto' | 'candidatos' | 'buscador'; n: number } | null>(null);
  const enfocar = (a: 'producto' | 'candidatos' | 'buscador') => setFoco((f) => ({ a, n: (f?.n ?? 0) + 1 }));
  useEffect(() => {
    if (!foco) return;
    ({ producto: productoRef, candidatos: candidatosRef, buscador: inputRef })[foco.a].current?.focus();
  }, [foco]);

  const terminado = !!consulta && consulta.farmacias.every((f) => ofertas[f.clave]);
  const nombres = Object.fromEntries((consulta?.farmacias ?? []).map((f) => [f.clave, f.nombre]));

  const abrir = useCallback((c: ConsultaAbierta) => {
    const yo = ++ronda.current;
    setConsulta(c);
    setOfertas({});
    enfocar('producto');
    if (c.farmacias.length === 0) {
      setAnuncio('Medicamento con receta: no se vende online.');
      return;
    }
    setAnuncio(`Consultando ${c.farmacias.length} farmacias…`);
    const recibidas: Record<string, Oferta> = {};
    const poner = (o: Oferta) => {
      if (ronda.current !== yo) return; // llegó tarde de una consulta anterior
      recibidas[o.farmacia] = o;
      setOfertas((prev) => ({ ...prev, [o.farmacia]: o }));
    };
    Promise.all(
      c.farmacias.map((f) =>
        conTiempoMax(consultarFarmaciaApi(c.checkId, f.clave))
          .then((o) => poner(o ?? ofertaError(f.clave)))
          .catch(() => poner(ofertaError(f.clave))),
      ),
    ).then(() => {
      if (ronda.current !== yo) return;
      const lista = Object.values(recibidas);
      const mejor = mejorVerificado(lista);
      const n = lista.filter((o) => o.estado === 'verificado' && o.precio != null).length;
      const donde = lista.find((o) => o.estado === 'verificado' && o.precio === mejor);
      setAnuncio(
        mejor == null
          ? 'Consulta terminada: ningún precio verificado.'
          : `Consulta terminada: ${n} ${n === 1 ? 'precio verificado' : 'precios verificados'}. El más barato, ${EUR.format(mejor)} en ${c.farmacias.find((f) => f.clave === donde?.farmacia)?.nombre}.`,
      );
    });
  }, []);

  const tratar = useCallback(
    (r: ResultadoBusqueda, opts?: { desdeCandidato?: boolean }) => {
      if (r.estado === 'error') {
        setError(r.error);
        setConsulta(null);
        enfocar('buscador');
        return;
      }
      setError(null);
      if (r.estado === 'candidatos') {
        setConsulta(null);
        setElegido(null);
        setCandidatos(r);
        enfocar('candidatos');
        return;
      }
      if (!opts?.desdeCandidato) {
        setCandidatos(null);
        setElegido(null);
      }
      abrir(r);
    },
    [abrir],
  );

  async function correr(fn: () => Promise<ResultadoBusqueda>, opts?: { desdeCandidato?: boolean }) {
    if (ocupado) return;
    setOcupado(true);
    try {
      tratar(await fn(), opts);
    } catch {
      tratar({ estado: 'error', error: 'No hemos podido identificar el producto ahora mismo. Inténtalo de nuevo en unos minutos.' });
    } finally {
      setOcupado(false);
    }
  }

  function buscar(e: React.FormEvent) {
    e.preventDefault();
    if (!texto.trim()) {
      setError('Escribe un código o un nombre.');
      inputRef.current?.focus();
      return;
    }
    void correr(() => buscarProductoAction(texto));
  }

  function elegir(c: Candidato) {
    setElegido(c);
    void correr(() => consultarCnAction(c.cn, candidatos?.texto ?? c.cn), { desdeCandidato: true });
  }

  function volverAConsultar() {
    if (!consulta) return;
    void correr(() => consultarCnAction(consulta.producto.cn, consulta.producto.cn), { desdeCandidato: !!elegido });
  }

  // "Volver a consultar" desde el historial: /scout?cn=…&auto=1 → se lanza una vez
  // y se limpia la URL para que recargar no repita las consultas.
  const autoHecho = useRef(false);
  useEffect(() => {
    if (!autoConsultar || !cnInicial || autoHecho.current) return;
    autoHecho.current = true;
    // History API nativa (Next la integra): router.replace se pisaba con la server action.
    window.history.replaceState(null, '', `/scout?cn=${cnInicial}`);
    void correr(() => consultarCnAction(cnInicial, cnInicial));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const errorId = 'buscador-error';
  const ayudaId = 'buscador-ayuda';

  return (
    <div className={cn(ANCHO_PAGINA, 'pt-6 pb-10')}>
      <PageHeader
        titulo="Comparar precio"
        descripcion="Mira a cuánto venden un producto otras farmacias online. Solo damos un precio por bueno si su web muestra el mismo código."
      />

      <div className="flex flex-col gap-4 sm:gap-5">
        <form role="search" onSubmit={buscar} noValidate className="card p-5 sm:p-6">
          <label htmlFor="buscador-producto" className="label mb-2 block">
            Producto
          </label>
          <div className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1 min-w-0">
              <NavIcon
                name="MagnifyingGlass"
                size={17}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)]"
              />
              <input
                id="buscador-producto"
                ref={inputRef}
                type="search"
                className="field pl-9"
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                autoComplete="off"
                spellCheck={false}
                maxLength={120}
                aria-invalid={!!error || undefined}
                aria-describedby={error ? `${errorId} ${ayudaId}` : ayudaId}
              />
            </div>
            <Button type="submit" variant="accent" className="w-full sm:w-auto" aria-disabled={ocupado || undefined}>
              {ocupado ? 'Buscando…' : 'Buscar'}
            </Button>
          </div>
          <p id={ayudaId} className="m-0 mt-2 text-[13px] text-[var(--color-muted)]">
            Código nacional (6 cifras), código de barras (13 cifras) o parte del nombre.
          </p>
          {error && (
            <p id={errorId} className="m-0 mt-2 text-[13.5px] text-[var(--color-red-ink)]">
              {error}
            </p>
          )}
        </form>

        {candidatos && !elegido && (
            <ListaCandidatos
              candidatos={candidatos.candidatos}
              hayMas={candidatos.hayMas}
              texto={candidatos.texto}
              onElegir={elegir}
              tituloRef={candidatosRef}
              deshabilitado={ocupado}
            />
        )}

        {consulta && (!candidatos || elegido) && (
          <>
            <TarjetaProducto
              producto={consulta.producto}
              ofertas={Object.values(ofertas)}
              totalFarmacias={consulta.farmacias.length}
              terminado={terminado}
              creadaEn={consulta.creadaEn}
              tituloRef={productoRef}
              nombresFarmacia={nombres}
              volver={
                candidatos && elegido ? (
                  <button
                    type="button"
                    onClick={() => {
                      setElegido(null);
                      enfocar('candidatos');
                    }}
                    className="inline-flex min-h-11 sm:min-h-8 items-center gap-1.5 text-[14px] font-medium text-[var(--color-ink-2)] hover:text-[var(--color-ink)]"
                  >
                    <NavIcon name="ArrowLeft" size={15} />
                    Otros productos con «{candidatos.texto}»
                  </button>
                ) : undefined
              }
              accion={
                terminado ? (
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <ReportarIncidenciaBoton
                      className="w-full sm:w-auto"
                      contexto={{
                        que: 'Consulta de precio',
                        titulo: `${consulta.producto.nombre} (CN ${consulta.producto.cn})`,
                        enlace: `/scout/historial/${consulta.checkId}`,
                      }}
                    />
                    {consulta.producto.tipo !== 'receta' && (
                      <Button type="button" variant="secondary" className="w-full sm:w-auto" onClick={volverAConsultar} aria-disabled={ocupado || undefined}>
                        <NavIcon name="ArrowsClockwise" size={16} />
                        Volver a consultar
                      </Button>
                    )}
                  </div>
                ) : undefined
              }
            />
            {consulta.producto.tipo === 'receta' ? (
              <AvisoReceta precioOficial={consulta.precioOficial} />
            ) : (
              <section className="card p-5 sm:p-6" aria-labelledby="precios-titulo">
                <h2 id="precios-titulo" className="m-0 text-[17px] font-semibold text-[var(--color-ink)]">
                  Precio en otras farmacias
                </h2>
                <p className="m-0 mt-1 mb-4 text-[14px] text-[var(--color-ink-2)]">
                  Buscamos el producto en {consulta.farmacias.length} farmacias online y comprobamos el código en cada ficha.
                </p>
                <TablaPrecios
                  filas={consulta.farmacias.map((f) => ({ clave: f.clave, nombre: f.nombre, oferta: ofertas[f.clave] }))}
                  terminado={terminado}
                />
              </section>
            )}
          </>
        )}
      </div>

      <p role="status" aria-live="polite" className="sr-only">
        {anuncio}
      </p>
    </div>
  );
}
