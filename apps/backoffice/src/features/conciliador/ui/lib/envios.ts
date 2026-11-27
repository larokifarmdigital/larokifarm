import { fileKindFromName, matchFiles, type UploadKind } from '@/core/engine';

/**
 * Un "envío" = lo que ha mandado un proveedor (1..N PDF: albarán, factura…)
 * + el pedido de la farmacia (1..N Excel). Es la unidad que se comprueba.
 */
export interface ArchivoCargado {
  id: string;
  file: File;
  name: string;
  kind: UploadKind;
}

export interface Envio {
  id: string;
  label: string;
  pdfs: ArchivoCargado[];
  excels: ArchivoCargado[];
  /** El sistema lo juntó sin coincidencia de nombre: pedir que se compruebe. */
  juntadoPorNosotros: boolean;
}

const uid = () => crypto.randomUUID();

export function aArchivo(file: File): ArchivoCargado | null {
  const kind = fileKindFromName(file.name);
  return kind ? { id: uid(), file, name: file.name, kind } : null;
}

export const quitarExtension = (n: string) => n.replace(/\.[^.]+$/, '');

export function nombrePorDefecto(pdfs: ArchivoCargado[], excels: ArchivoCargado[]): string {
  return quitarExtension(pdfs[0]?.name ?? excels[0]?.name ?? 'Envío');
}

export const estaCompleto = (e: Envio) => e.pdfs.length > 0 && e.excels.length > 0;

function nuevoEnvio(pdfs: ArchivoCargado[], excels: ArchivoCargado[], juntado = false): Envio {
  return { id: uid(), label: nombrePorDefecto(pdfs, excels), pdfs, excels, juntadoPorNosotros: juntado };
}

/**
 * Reparte archivos nuevos en envíos SIN MEZCLAR PROVEEDORES A CIEGAS.
 *
 * 1. Los que coinciden por nombre (DENTAID_albaran.pdf ↔ DENTAID_pedido.xlsx)
 *    forman un envío completo.
 * 2. Con los sueltos (los nuevos + los de envíos aún incompletos):
 *    - Si hay UN único Excel suelto, todos los PDFs sueltos van con él
 *      (si son varios PDFs se marca "juntado por nosotros" para revisarlo).
 *    - Si no, cada archivo suelto queda en su propio envío incompleto y la
 *      persona elige a mano "¿Qué pedido es?" (juntarlos a ciegas mezclaría proveedores).
 */
export function repartir(envios: Envio[], nuevos: ArchivoCargado[]): Envio[] {
  const completos = envios.filter(estaCompleto);
  const incompletos = envios.filter((e) => !estaCompleto(e));

  const { pairs, unmatched } = matchFiles(nuevos);
  const resultado = [...completos, ...pairs.map((p) => nuevoEnvio(p.pdfs, [p.excel]))];

  const sueltos = [...incompletos.flatMap((e) => [...e.pdfs, ...e.excels]), ...unmatched];
  const pdfs = sueltos.filter((a) => a.kind === 'pdf');
  const excels = sueltos.filter((a) => a.kind === 'excel');

  if (excels.length === 1 && pdfs.length >= 1) {
    resultado.push(nuevoEnvio(pdfs, excels, pdfs.length > 1));
  } else {
    // Conserva los nombres que la persona ya hubiera puesto a sus envíos incompletos
    for (const e of incompletos) resultado.push(e);
    const yaEstan = new Set(incompletos.flatMap((e) => [...e.pdfs, ...e.excels].map((a) => a.id)));
    for (const a of unmatched) {
      if (!yaEstan.has(a.id)) {
        resultado.push(a.kind === 'pdf' ? nuevoEnvio([a], []) : nuevoEnvio([], [a]));
      }
    }
  }
  return resultado;
}

/** Mueve los archivos de `origenId` al envío `destinoId` y elimina el origen. */
export function unir(envios: Envio[], destinoId: string, origenId: string): Envio[] {
  const origen = envios.find((e) => e.id === origenId);
  if (!origen) return envios;
  return envios
    .filter((e) => e.id !== origenId)
    .map((e) =>
      e.id === destinoId
        ? { ...e, pdfs: [...e.pdfs, ...origen.pdfs], excels: [...e.excels, ...origen.excels] }
        : e,
    );
}

/** Quita un archivo; si el envío se queda vacío, desaparece. */
export function quitarArchivo(envios: Envio[], envioId: string, archivoId: string): Envio[] {
  return envios
    .map((e) =>
      e.id === envioId
        ? { ...e, pdfs: e.pdfs.filter((a) => a.id !== archivoId), excels: e.excels.filter((a) => a.id !== archivoId) }
        : e,
    )
    .filter((e) => e.pdfs.length + e.excels.length > 0);
}

/** Añade archivos a un envío concreto (botón "Añadir" de un hueco vacío). */
export function anadirA(envios: Envio[], envioId: string, nuevos: ArchivoCargado[]): Envio[] {
  return envios.map((e) =>
    e.id === envioId
      ? {
          ...e,
          pdfs: [...e.pdfs, ...nuevos.filter((a) => a.kind === 'pdf')],
          excels: [...e.excels, ...nuevos.filter((a) => a.kind === 'excel')],
        }
      : e,
  );
}

export function sanitizarNombre(s: string): string {
  return s.replace(/[\\/:*?"<>|]+/g, '').trim();
}
