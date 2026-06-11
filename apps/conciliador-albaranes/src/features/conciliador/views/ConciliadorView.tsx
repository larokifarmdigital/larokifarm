'use client';

import { useMemo, useState } from 'react';
import { conciliarPares, type ParEnvio } from '../api/conciliar';
import type { ResultadoPar } from '../api/contrato';
import { Dropzone } from '../components/Dropzone';
import { estadoTexto } from '../core/comparar';
import { claveArchivo, emparejar, tipoPorNombre, type TipoArchivo } from '../core/emparejar';
import type { LineaConciliada } from '../core/tipos';
import { descargarXlsx, descargarZip } from '../lib/descargas';

interface Cargado {
  id: string;
  file: File;
  nombre: string;
  tipo: TipoArchivo;
}
interface Par {
  id: string;
  etiqueta: string;
  pdf: Cargado | null;
  excel: Cargado | null;
}

const uid = () => crypto.randomUUID();

function aCargado(file: File): Cargado | null {
  const tipo = tipoPorNombre(file.name);
  if (!tipo) return null;
  return { id: uid(), file, nombre: file.name, tipo };
}

/** Nombre por defecto del par: clave compartida, o nombre del archivo sin extensión. */
function etiquetaPorDefecto(pdf: Cargado | null, excel: Cargado | null): string {
  const base = pdf?.nombre ?? excel?.nombre ?? '';
  const clave = claveArchivo(base);
  return clave ? clave.toUpperCase() : base.replace(/\.[^.]+$/, '');
}

function sanear(s: string): string {
  return s.replace(/[\\/:*?"<>|]+/g, '').trim();
}

export function ConciliadorView() {
  const [pares, setPares] = useState<Par[]>([]);
  const [sueltos, setSueltos] = useState<Cargado[]>([]);
  const [cargando, setCargando] = useState(false);
  const [resultados, setResultados] = useState<ResultadoPar[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [clave, setClave] = useState('');

  const completos = useMemo(() => pares.filter((p) => p.pdf && p.excel), [pares]);
  const incompletos = pares.length - completos.length;

  function agregar(files: File[]) {
    setResultados(null);
    setError(null);
    const nuevos = files.map(aCargado).filter((c): c is Cargado => c !== null);
    if (nuevos.length === 0) return;

    // Se calcula fuera de los updaters (nunca un setState dentro de otro: React
    // ejecuta los updaters dos veces en dev y duplicaría los pares).
    let { pares: np, sueltos: ns } = emparejar([...sueltos, ...nuevos]);

    // Conveniencia: si queda exactamente 1 PDF y 1 Excel sueltos, emparéjalos
    // aunque sus nombres no casen (caso típico de un único proveedor por lote).
    const pdf1 = ns.filter((s) => s.tipo === 'pdf');
    const xls1 = ns.filter((s) => s.tipo === 'excel');
    if (pdf1.length === 1 && xls1.length === 1) {
      np = [...np, { pdf: pdf1[0], excel: xls1[0], clave: '' }];
      ns = [];
    }

    if (np.length > 0) {
      setPares((prev) => [
        ...prev,
        ...np.map((p) => ({
          id: uid(),
          etiqueta: etiquetaPorDefecto(p.pdf, p.excel),
          pdf: p.pdf,
          excel: p.excel,
        })),
      ]);
    }
    setSueltos(ns);
  }

  function quitarPar(id: string) {
    setPares((prev) => prev.filter((p) => p.id !== id));
  }

  // Sacar un archivo de un par → vuelve a "sueltos". Se calcula FUERA del updater
  // para no duplicar (los updaters de React se ejecutan dos veces en dev).
  function sacarDePar(parId: string, tipo: TipoArchivo) {
    const par = pares.find((p) => p.id === parId);
    const sacado = par ? (tipo === 'pdf' ? par.pdf : par.excel) : null;
    if (!sacado) return;
    setPares((prev) => prev.map((p) => (p.id === parId ? { ...p, [tipo]: null } : p)));
    setSueltos((prev) => (prev.some((s) => s.id === sacado.id) ? prev : [...prev, sacado]));
  }

  function asignarSuelto(sueltoId: string, parId: string) {
    const suelto = sueltos.find((s) => s.id === sueltoId);
    if (!suelto) return;
    setPares((prev) => prev.map((p) => (p.id === parId ? { ...p, [suelto.tipo]: suelto } : p)));
    setSueltos((prev) => prev.filter((s) => s.id !== sueltoId));
  }

  function nuevoPar(sueltoId: string) {
    const suelto = sueltos.find((s) => s.id === sueltoId);
    if (!suelto) return;
    const pdf = suelto.tipo === 'pdf' ? suelto : null;
    const excel = suelto.tipo === 'excel' ? suelto : null;
    setPares((prev) => [...prev, { id: uid(), etiqueta: etiquetaPorDefecto(pdf, excel), pdf, excel }]);
    setSueltos((prev) => prev.filter((s) => s.id !== sueltoId));
  }

  function quitarSuelto(sueltoId: string) {
    setSueltos((prev) => prev.filter((s) => s.id !== sueltoId));
  }

  function renombrar(parId: string, etiqueta: string) {
    setPares((prev) => prev.map((p) => (p.id === parId ? { ...p, etiqueta } : p)));
  }

  function limpiar() {
    setPares([]);
    setSueltos([]);
    setResultados(null);
    setError(null);
  }

  async function comparar() {
    if (completos.length === 0) return;
    setCargando(true);
    setError(null);
    setResultados(null);
    try {
      const envio: ParEnvio[] = completos.map((p) => ({
        etiqueta: p.etiqueta.trim() || etiquetaPorDefecto(p.pdf, p.excel) || 'Par',
        pdf: p.pdf!.file,
        xlsx: p.excel!.file,
      }));
      const { resumen } = await conciliarPares(envio, clave || undefined);
      setResultados(resumen);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al conciliar');
    } finally {
      setCargando(false);
    }
  }

  const informes = (resultados ?? []).filter((r) => r.informeBase64);

  return (
    <main className="mx-auto max-w-[1440px] px-6 py-12">
      <header className="mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight">Conciliador de Albaranes</h1>
        <p className="mt-2 text-slate-600">
          Sube los albaranes (PDF) y los pedidos (Excel), empareja y compara.
        </p>
      </header>

      <Dropzone onArchivos={agregar} />

      {(pares.length > 0 || sueltos.length > 0) && (
        <section className="mt-8 space-y-6">
          <div className="space-y-3">
            <h2 className="text-sm font-bold tracking-wide text-slate-500 uppercase">
              Pares ({completos.length} listo{completos.length === 1 ? '' : 's'})
            </h2>
            {pares.map((p) => (
              <ParFila
                key={p.id}
                par={p}
                onSacar={sacarDePar}
                onQuitar={quitarPar}
                onRenombrar={renombrar}
              />
            ))}
            {pares.length === 0 && <p className="text-sm text-slate-500">Aún no hay pares.</p>}
          </div>

          {sueltos.length > 0 && (
            <div className="space-y-2 rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <h2 className="text-sm font-bold text-amber-700">
                Sin emparejar ({sueltos.length}) — asígnalos a un par o crea uno nuevo
              </h2>
              {sueltos.map((s) => (
                <SueltoFila
                  key={s.id}
                  suelto={s}
                  pares={pares}
                  onAsignar={asignarSuelto}
                  onNuevo={nuevoPar}
                  onQuitar={quitarSuelto}
                />
              ))}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-4 border-t border-slate-200 pt-4">
            <input
              type="password"
              value={clave}
              onChange={(e) => setClave(e.target.value)}
              placeholder="Clave de acceso (si aplica)"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={comparar}
              disabled={cargando || completos.length === 0}
              className="rounded-lg bg-sky-600 px-5 py-2.5 font-semibold text-white shadow-sm transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {cargando ? 'Comparando…' : `Comparar ${completos.length} par${completos.length === 1 ? '' : 'es'}`}
            </button>
            <button type="button" onClick={limpiar} className="text-sm text-slate-500 hover:text-slate-700">
              Limpiar todo
            </button>
            {incompletos > 0 && (
              <span className="text-sm text-amber-600">
                {incompletos} par(es) incompleto(s) no se compararán.
              </span>
            )}
          </div>
        </section>
      )}

      {error && (
        <p className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {resultados && (
        <section className="mt-10 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">Resultados</h2>
            {informes.length > 1 && (
              <button
                type="button"
                onClick={() =>
                  descargarZip(
                    informes.map((r) => ({
                      nombre: `${sanear(r.etiqueta) || 'informe'}.xlsx`,
                      base64: r.informeBase64!,
                    })),
                  )
                }
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-50"
              >
                Descargar todo (ZIP)
              </button>
            )}
          </div>
          <ul className="space-y-2">
            {resultados.map((r) => (
              <ResultadoFila key={r.id} r={r} />
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}

function Chip({ nombre, tipo, onQuitar }: { nombre: string; tipo: TipoArchivo; onQuitar?: () => void }) {
  return (
    <span className="inline-flex max-w-full items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-sm">
      <span className={`rounded px-1 text-xs font-bold ${tipo === 'pdf' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-700'}`}>
        {tipo === 'pdf' ? 'PDF' : 'XLS'}
      </span>
      <span className="min-w-0 truncate">{nombre}</span>
      {onQuitar && (
        <button type="button" onClick={onQuitar} aria-label="Quitar" className="text-slate-400 hover:text-red-500">
          ×
        </button>
      )}
    </span>
  );
}

function Hueco({ tipo }: { tipo: TipoArchivo }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-slate-300 px-2.5 py-1 text-sm text-slate-400">
      Falta {tipo === 'pdf' ? 'el albarán (PDF)' : 'el pedido (Excel)'}
    </span>
  );
}

function ParFila({
  par,
  onSacar,
  onQuitar,
  onRenombrar,
}: {
  par: Par;
  onSacar: (parId: string, tipo: TipoArchivo) => void;
  onQuitar: (id: string) => void;
  onRenombrar: (id: string, etiqueta: string) => void;
}) {
  const completo = par.pdf && par.excel;
  return (
    <div className={`rounded-2xl border bg-white p-3 ${completo ? 'border-slate-200' : 'border-amber-300'}`}>
      <div className="mb-2 flex items-center gap-2">
        <span className="text-lg" aria-hidden="true">
          {completo ? '🔗' : '⚠️'}
        </span>
        <label className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-slate-300 bg-slate-50 px-2.5 py-1.5 focus-within:border-sky-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-sky-100">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-slate-400" aria-hidden="true">
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" />
          </svg>
          <input
            value={par.etiqueta}
            onChange={(e) => onRenombrar(par.id, e.target.value)}
            placeholder="Nombre del par (clic para editar)"
            aria-label="Nombre del par"
            className="min-w-0 flex-1 bg-transparent text-sm font-bold text-slate-800 placeholder:font-normal placeholder:text-slate-400 focus:outline-none"
          />
        </label>
        <button
          type="button"
          onClick={() => onQuitar(par.id)}
          aria-label="Eliminar par"
          title="Eliminar par"
          className="shrink-0 rounded-lg p-2 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M3 6h18" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            <line x1="10" x2="10" y1="11" y2="17" />
            <line x1="14" x2="14" y1="11" y2="17" />
          </svg>
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {par.pdf ? <Chip nombre={par.pdf.nombre} tipo="pdf" onQuitar={() => onSacar(par.id, 'pdf')} /> : <Hueco tipo="pdf" />}
        {par.excel ? <Chip nombre={par.excel.nombre} tipo="excel" onQuitar={() => onSacar(par.id, 'excel')} /> : <Hueco tipo="excel" />}
      </div>
    </div>
  );
}

function SueltoFila({
  suelto,
  pares,
  onAsignar,
  onNuevo,
  onQuitar,
}: {
  suelto: Cargado;
  pares: Par[];
  onAsignar: (sueltoId: string, parId: string) => void;
  onNuevo: (sueltoId: string) => void;
  onQuitar: (sueltoId: string) => void;
}) {
  const disponibles = pares.filter((p) => (suelto.tipo === 'pdf' ? !p.pdf : !p.excel));
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Chip nombre={suelto.nombre} tipo={suelto.tipo} />
      <select
        defaultValue=""
        onChange={(e) => {
          const v = e.target.value;
          if (v === '__nuevo') onNuevo(suelto.id);
          else if (v) onAsignar(suelto.id, v);
          e.currentTarget.value = '';
        }}
        className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm"
      >
        <option value="" disabled>
          Mover a…
        </option>
        <option value="__nuevo">Nuevo par</option>
        {disponibles.map((p) => (
          <option key={p.id} value={p.id}>
            {p.etiqueta || `Par ${pares.indexOf(p) + 1}`}
          </option>
        ))}
      </select>
      <button type="button" onClick={() => onQuitar(suelto.id)} className="text-sm text-slate-400 hover:text-red-500">
        Descartar
      </button>
    </div>
  );
}

function ResultadoFila({ r }: { r: ResultadoPar }) {
  const [abierto, setAbierto] = useState(false);
  const estilo =
    r.estado === 'OK'
      ? 'bg-green-100 text-green-700'
      : r.estado === 'DISCREPANCIAS'
        ? 'bg-amber-100 text-amber-700'
        : 'bg-red-100 text-red-700';
  const texto =
    r.estado === 'OK'
      ? '✅ Todo coincide'
      : r.estado === 'DISCREPANCIAS'
        ? `⚠️ ${r.nDiscrepancias} discrepancia${r.nDiscrepancias === 1 ? '' : 's'}`
        : '⛔ Error';

  const nombreDescarga = `${sanear(r.etiqueta) || 'informe'}.xlsx`;

  return (
    <li className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="flex flex-wrap items-center gap-3 px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{r.etiqueta || r.proveedor}</p>
          {r.proveedor && r.etiqueta !== r.proveedor && (
            <p className="truncate text-xs text-slate-500">Proveedor detectado: {r.proveedor}</p>
          )}
          {r.error && <p className="text-sm text-red-600">{r.error}</p>}
        </div>
        <span className={`rounded-full px-3 py-1 text-sm font-semibold ${estilo}`}>{texto}</span>
        {r.detalle && (
          <button
            type="button"
            onClick={() => setAbierto((v) => !v)}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold hover:bg-slate-50"
          >
            {abierto ? 'Ocultar' : 'Previsualizar'}
          </button>
        )}
        {r.informeBase64 && (
          <button
            type="button"
            onClick={() => descargarXlsx(nombreDescarga, r.informeBase64!)}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold hover:bg-slate-50"
          >
            Descargar
          </button>
        )}
      </div>
      {abierto && r.detalle && <DetalleTabla lineas={r.detalle.lineas} />}
    </li>
  );
}

function celda(v: number | null): string {
  return v === null ? '—' : String(v);
}

const TH = 'px-3 py-2.5 font-semibold whitespace-nowrap';

function DetalleTabla({ lineas }: { lineas: LineaConciliada[] }) {
  // Resalta el par de celdas (pedido/albarán) cuando ese campo es la discrepancia.
  const marca = (l: LineaConciliada, campo: 'unidades' | 'precio' | 'descuento') =>
    l.discrepancias.includes(campo) ? 'bg-red-200 font-bold text-red-800' : '';

  return (
    <div className="overflow-x-auto border-t border-slate-200">
      <table className="w-full min-w-[820px] text-sm">
        <thead>
          <tr className="bg-slate-800 text-left text-xs tracking-wide text-white uppercase">
            <th className={TH}>C.N.</th>
            <th className={TH}>Descripción</th>
            <th className={`${TH} text-right`}>Uds ped.</th>
            <th className={`${TH} text-right`}>Uds alb.</th>
            <th className={`${TH} text-right`}>Precio ped.</th>
            <th className={`${TH} text-right`}>Precio alb.</th>
            <th className={`${TH} text-right`}>Dto ped.</th>
            <th className={`${TH} text-right`}>Dto alb.</th>
            <th className={TH}>Estado / motivo</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {lineas.map((l) => {
            const filaMal = l.estado !== 'OK';
            return (
              <tr key={l.cn} className={filaMal ? 'bg-red-50' : 'odd:bg-white even:bg-slate-50/60'}>
                <td className="px-3 py-2 font-medium">{l.cn}</td>
                <td className="px-3 py-2">{l.descripcion}</td>
                <td className={`px-3 py-2 text-right ${marca(l, 'unidades')}`}>{celda(l.udsPedido)}</td>
                <td className={`px-3 py-2 text-right ${marca(l, 'unidades')}`}>{celda(l.udsAlbaran)}</td>
                <td className={`px-3 py-2 text-right ${marca(l, 'precio')}`}>{celda(l.precioPedido)}</td>
                <td className={`px-3 py-2 text-right ${marca(l, 'precio')}`}>{celda(l.precioAlbaran)}</td>
                <td className={`px-3 py-2 text-right ${marca(l, 'descuento')}`}>{celda(l.dtoPedido)}</td>
                <td className={`px-3 py-2 text-right ${marca(l, 'descuento')}`}>{celda(l.dtoAlbaran)}</td>
                <td className="px-3 py-2 whitespace-nowrap">
                  <span
                    className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      l.estado === 'OK'
                        ? 'bg-green-100 text-green-700'
                        : l.estado === 'DISCREPANCIA'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {estadoTexto(l)}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
