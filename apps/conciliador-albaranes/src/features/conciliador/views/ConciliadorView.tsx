'use client';

import { useEffect, useMemo, useState } from 'react';
import { conciliarPares, ConciliarError, type ParEnvio } from '../api/conciliar';
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
  /** 1..N PDFs del MISMO envío (albarán + factura + …). Vacío = par incompleto. */
  pdfs: Cargado[];
  excel: Cargado | null;
}

const uid = () => crypto.randomUUID();

/** Clave de acceso recordada en el navegador del cliente (persiste tras F5 / reabrir). */
const CLAVE_STORAGE_KEY = 'conciliador.acceso_clave';

function aCargado(file: File): Cargado | null {
  const tipo = tipoPorNombre(file.name);
  if (!tipo) return null;
  return { id: uid(), file, nombre: file.name, tipo };
}

/** Nombre por defecto del par: clave compartida, o nombre del primer archivo sin extensión. */
function etiquetaPorDefecto(pdfs: Cargado[], excel: Cargado | null): string {
  const base = pdfs[0]?.nombre ?? excel?.nombre ?? '';
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
  const [modalAbierto, setModalAbierto] = useState(false);
  const [errorModal, setErrorModal] = useState<string | null>(null);

  // Cargar la clave guardada tras el montaje (en useEffect, no en el initializer,
  // para no provocar un desajuste de hidratación con el render del servidor).
  useEffect(() => {
    const guardada = localStorage.getItem(CLAVE_STORAGE_KEY);
    if (guardada) setClave(guardada);
  }, []);

  const completos = useMemo(() => pares.filter((p) => p.pdfs.length > 0 && p.excel), [pares]);
  const incompletos = pares.length - completos.length;

  function agregar(files: File[]) {
    setResultados(null);
    setError(null);
    const nuevos = files.map(aCargado).filter((c): c is Cargado => c !== null);
    if (nuevos.length === 0) return;

    // Se calcula fuera de los updaters (nunca un setState dentro de otro: React
    // ejecuta los updaters dos veces en dev y duplicaría los pares).
    let { pares: np, sueltos: ns } = emparejar([...sueltos, ...nuevos]);

    // Conveniencia: si lo que queda suelto es N PDFs y exactamente 1 Excel sin
    // pareja por nombre, los agrupamos en un único par (caso típico: subes los
    // 2 PDFs de un proveedor + su Excel con nombres que no comparten clave).
    const pdfsSueltos = ns.filter((s) => s.tipo === 'pdf');
    const excelsSueltos = ns.filter((s) => s.tipo === 'excel');
    if (pdfsSueltos.length >= 1 && excelsSueltos.length === 1) {
      np = [...np, { pdfs: pdfsSueltos, excel: excelsSueltos[0], clave: '' }];
      ns = [];
    }

    if (np.length > 0) {
      setPares((prev) => [
        ...prev,
        ...np.map((p) => ({
          id: uid(),
          etiqueta: etiquetaPorDefecto(p.pdfs, p.excel),
          pdfs: p.pdfs,
          excel: p.excel,
        })),
      ]);
    }
    setSueltos(ns);
  }

  function quitarPar(id: string) {
    setPares((prev) => prev.filter((p) => p.id !== id));
  }

  // Sacar un PDF concreto de un par → vuelve a "sueltos".
  function sacarPdfDePar(parId: string, pdfId: string) {
    const par = pares.find((p) => p.id === parId);
    const sacado = par?.pdfs.find((p) => p.id === pdfId);
    if (!sacado) return;
    setPares((prev) =>
      prev.map((p) => (p.id === parId ? { ...p, pdfs: p.pdfs.filter((x) => x.id !== pdfId) } : p)),
    );
    setSueltos((prev) => (prev.some((s) => s.id === sacado.id) ? prev : [...prev, sacado]));
  }

  // Sacar el Excel de un par → vuelve a "sueltos".
  function sacarExcelDePar(parId: string) {
    const par = pares.find((p) => p.id === parId);
    const sacado = par?.excel;
    if (!sacado) return;
    setPares((prev) => prev.map((p) => (p.id === parId ? { ...p, excel: null } : p)));
    setSueltos((prev) => (prev.some((s) => s.id === sacado.id) ? prev : [...prev, sacado]));
  }

  function asignarSuelto(sueltoId: string, parId: string) {
    const suelto = sueltos.find((s) => s.id === sueltoId);
    if (!suelto) return;
    setPares((prev) =>
      prev.map((p) => {
        if (p.id !== parId) return p;
        if (suelto.tipo === 'pdf') return { ...p, pdfs: [...p.pdfs, suelto] };
        return { ...p, excel: suelto };
      }),
    );
    setSueltos((prev) => prev.filter((s) => s.id !== sueltoId));
  }

  function nuevoPar(sueltoId: string) {
    const suelto = sueltos.find((s) => s.id === sueltoId);
    if (!suelto) return;
    const pdfs = suelto.tipo === 'pdf' ? [suelto] : [];
    const excel = suelto.tipo === 'excel' ? suelto : null;
    setPares((prev) => [
      ...prev,
      { id: uid(), etiqueta: etiquetaPorDefecto(pdfs, excel), pdfs, excel },
    ]);
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

  // Ejecuta la conciliación con la clave indicada. Devuelve el desenlace para que
  // quien llama decida la UI (abrir el modal, mostrar error en el modal, etc.).
  async function ejecutarComparar(claveUsar?: string): Promise<'ok' | 'noAutorizado' | 'error'> {
    setCargando(true);
    setError(null);
    setResultados(null);
    try {
      const envio: ParEnvio[] = completos.map((p) => ({
        etiqueta: p.etiqueta.trim() || etiquetaPorDefecto(p.pdfs, p.excel) || 'Par',
        pdfs: p.pdfs.map((pdf) => pdf.file),
        xlsx: p.excel!.file,
      }));
      const { resumen } = await conciliarPares(envio, claveUsar || undefined);
      setResultados(resumen);
      // La clave funcionó (no hubo 401) → recordarla para no volver a pedirla.
      if (claveUsar) localStorage.setItem(CLAVE_STORAGE_KEY, claveUsar);
      return 'ok';
    } catch (e) {
      if (e instanceof ConciliarError && e.status === 401) {
        // La clave guardada ya no sirve (o no había): bórrala y pídela.
        localStorage.removeItem(CLAVE_STORAGE_KEY);
        return 'noAutorizado';
      }
      setError(e instanceof Error ? e.message : 'Error al conciliar');
      return 'error';
    } finally {
      setCargando(false);
    }
  }

  async function comparar() {
    if (completos.length === 0) return;
    const r = await ejecutarComparar(clave || undefined);
    if (r === 'noAutorizado') {
      setErrorModal(null);
      setModalAbierto(true);
    }
  }

  // Reintenta con la clave tecleada en el modal.
  async function confirmarClave(claveIngresada: string) {
    const limpia = claveIngresada.trim();
    if (!limpia) return;
    const r = await ejecutarComparar(limpia);
    if (r === 'ok') {
      setClave(limpia);
      setModalAbierto(false);
    } else if (r === 'noAutorizado') {
      setErrorModal('Clave incorrecta. Inténtalo de nuevo.');
    } else {
      // Error distinto (red, servidor): cierra el modal y muestra el error general.
      setModalAbierto(false);
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
                onSacarPdf={sacarPdfDePar}
                onSacarExcel={sacarExcelDePar}
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

      {modalAbierto && (
        <ModalClave
          cargando={cargando}
          error={errorModal}
          onConfirmar={confirmarClave}
          onCerrar={() => setModalAbierto(false)}
        />
      )}
    </main>
  );
}

function ModalClave({
  cargando,
  error,
  onConfirmar,
  onCerrar,
}: {
  cargando: boolean;
  error: string | null;
  onConfirmar: (clave: string) => void;
  onCerrar: () => void;
}) {
  const [valor, setValor] = useState('');

  // Cerrar con Escape.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCerrar();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onCerrar]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-clave-titulo"
      onClick={onCerrar}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault();
          onConfirmar(valor);
        }}
        className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl"
      >
        <div className="mb-4 flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sky-600">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </span>
          <div className="min-w-0">
            <h2 id="modal-clave-titulo" className="text-lg font-bold text-slate-900">
              Clave de acceso
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Introduce la clave para usar el conciliador. Se recordará en este equipo.
            </p>
          </div>
        </div>

        <input
          type="password"
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          placeholder="Clave de acceso"
          aria-label="Clave de acceso"
          autoFocus
          autoComplete="current-password"
          className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-100 focus:outline-none"
        />

        {error && <p className="mt-2 text-sm font-medium text-red-600">{error}</p>}

        <div className="mt-5 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCerrar}
            className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={cargando || valor.trim().length === 0}
            className="rounded-lg bg-sky-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {cargando ? 'Comprobando…' : 'Entrar y comparar'}
          </button>
        </div>
      </form>
    </div>
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
  onSacarPdf,
  onSacarExcel,
  onQuitar,
  onRenombrar,
}: {
  par: Par;
  onSacarPdf: (parId: string, pdfId: string) => void;
  onSacarExcel: (parId: string) => void;
  onQuitar: (id: string) => void;
  onRenombrar: (id: string, etiqueta: string) => void;
}) {
  const completo = par.pdfs.length > 0 && par.excel;
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
        {par.pdfs.length === 0 ? (
          <Hueco tipo="pdf" />
        ) : (
          par.pdfs.map((pdf) => (
            <Chip
              key={pdf.id}
              nombre={pdf.nombre}
              tipo="pdf"
              onQuitar={() => onSacarPdf(par.id, pdf.id)}
            />
          ))
        )}
        {par.excel ? (
          <Chip nombre={par.excel.nombre} tipo="excel" onQuitar={() => onSacarExcel(par.id)} />
        ) : (
          <Hueco tipo="excel" />
        )}
      </div>
      {par.pdfs.length > 1 && (
        <p className="mt-2 text-xs text-slate-500">
          🔀 Los {par.pdfs.length} PDFs se fusionarán en un único informe (albarán + factura del mismo envío).
        </p>
      )}
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
  // Para PDFs: cualquier par (puede llevar varios). Para Excels: solo pares sin Excel.
  const disponibles = pares.filter((p) => (suelto.tipo === 'pdf' ? true : !p.excel));
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
      {r.error && (
        <div className="border-t border-red-100 bg-red-50 px-4 py-3">
          <div className="flex items-start gap-2.5">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mt-0.5 shrink-0 text-red-500"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" x2="12" y1="8" y2="12" />
              <line x1="12" x2="12.01" y1="16" y2="16" />
            </svg>
            <p className="text-sm leading-relaxed text-red-800">{r.error}</p>
          </div>
        </div>
      )}
      {abierto && r.detalle && <DetalleTabla lineas={r.detalle.lineas} />}
      {abierto && r.detalle?.lineasCrudas && r.detalle.lineasCrudas.length > 0 && (
        <DebugExtraccion lineas={r.detalle.lineasCrudas} />
      )}
    </li>
  );
}

function DebugExtraccion({ lineas }: { lineas: NonNullable<ResultadoPar['detalle']>['lineasCrudas'] }) {
  if (!lineas) return null;
  return (
    <details className="border-t border-slate-200 bg-slate-50 px-4 py-2 text-xs">
      <summary className="cursor-pointer font-semibold text-slate-500">
        🔎 Ver lo que leyó Gemini del PDF ({lineas.length} líneas) — debug
      </summary>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full min-w-[720px]">
          <thead>
            <tr className="text-left text-slate-400">
              <th className="px-2 py-1">C.N.</th>
              <th className="px-2 py-1">EAN</th>
              <th className="px-2 py-1">Descripción</th>
              <th className="px-2 py-1 text-right">UDS</th>
              <th className="px-2 py-1 text-right">PVL</th>
              <th className="px-2 py-1 text-right">DTO</th>
              <th className="px-2 py-1 text-right">BONIF</th>
            </tr>
          </thead>
          <tbody className="font-mono">
            {lineas.map((l, i) => (
              <tr key={i} className="border-t border-slate-200">
                <td className="px-2 py-1">{l.codigo_nacional || l.codigo || '—'}</td>
                <td className="px-2 py-1">{l.codigo_ean || '—'}</td>
                <td className="px-2 py-1 font-sans">{l.descripcion}</td>
                <td className="px-2 py-1 text-right">{l.cantidad}</td>
                <td className="px-2 py-1 text-right">{l.precio_unitario}</td>
                <td className="px-2 py-1 text-right">{l.descuento ?? 0}</td>
                <td className="px-2 py-1 text-right">{l.bonificacion ?? 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
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
            <th className={TH}>Código</th>
            <th className={TH}>Descripción</th>
            <th className={`${TH} text-right`}>Uds ped.</th>
            <th className={`${TH} text-right`}>Uds alb.</th>
            <th className={`${TH} text-right`}>Bonif.</th>
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
                <td className="px-3 py-2 text-right text-emerald-700">
                  {l.bonifAlbaran ? `+${l.bonifAlbaran}` : '—'}
                </td>
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
