/**
 * Auto-matching of files by name (Mode B). Pairs a PDF (delivery note) with
 * an Excel (order) when they share a filename "key": the basename without
 * extension, normalized and with role words (delivery-note / order / …)
 * removed. So "DENTAID_albaran.pdf" pairs with "DENTAID_pedido.xlsx".
 */

const ROLE_WORDS = new Set([
  'albaran', 'albaranes', 'alb', 'pedido', 'pedidos', 'ped', 'order', 'orders',
  'factura', 'conciliacion',
]);

export type UploadKind = 'pdf' | 'excel';

export function fileKindFromName(name: string): UploadKind | null {
  if (/\.pdf$/i.test(name)) return 'pdf';
  if (/\.(xlsx|xlsm|xls)$/i.test(name)) return 'excel';
  return null;
}

/** Matching key: basename, without diacritics, role words or separators. */
export function fileKey(name: string): string {
  const base = name
    .replace(/\.[^.]+$/, '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
  return base
    .split(' ')
    .filter((t) => t && !ROLE_WORDS.has(t))
    .join('');
}

export interface FileItem {
  name: string;
  kind: UploadKind;
}

export interface MatchedPair<T> {
  /** 1..N PDFs with the same key (multi-PDF case: delivery note + invoice of the same shipment). */
  pdfs: T[];
  excel: T;
  key: string;
}

/**
 * Pairs PDFs with Excels by filename key. Several PDFs with the SAME key
 * (e.g. `NESTLE_albaran.pdf` + `NESTLE_factura.pdf`) go into the same pair.
 * An Excel can only belong to one pair; if two Excels share a key, the
 * second one stays unmatched. Whatever is not paired goes to `unmatched`.
 */
export function matchFiles<T extends FileItem>(
  items: T[],
): { pairs: Array<MatchedPair<T>>; unmatched: T[] } {
  const pdfsByKey = new Map<string, T[]>();
  const excelByKey = new Map<string, T>();
  const unmatched: T[] = [];

  for (const it of items) {
    const k = fileKey(it.name);
    if (!k) {
      unmatched.push(it);
      continue;
    }
    if (it.kind === 'pdf') {
      const arr = pdfsByKey.get(k) ?? [];
      arr.push(it);
      pdfsByKey.set(k, arr);
    } else {
      if (excelByKey.has(k)) unmatched.push(it);
      else excelByKey.set(k, it);
    }
  }

  const pairs: Array<MatchedPair<T>> = [];
  for (const [key, pdfs] of pdfsByKey) {
    const excel = excelByKey.get(key);
    if (excel) {
      pairs.push({ pdfs, excel, key });
      excelByKey.delete(key);
    } else {
      unmatched.push(...pdfs);
    }
  }
  for (const excel of excelByKey.values()) unmatched.push(excel);

  return { pairs, unmatched };
}
