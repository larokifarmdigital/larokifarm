import type { RespuestaConciliacion } from '../../core/http/contrato';

export interface ParEnvio {
  etiqueta: string;
  /** 1 o N PDFs del MISMO envío (albarán + factura + …). Se fusionan en el server. */
  pdfs: File[];
  xlsx: File;
}

/** Error de la API que conserva el status HTTP (para distinguir el 401 de no autorizado). */
export class ConciliarError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'ConciliarError';
  }
}

/** Llama a `POST /api/conciliar` con los pares completos. */
export async function conciliarPares(
  pares: ParEnvio[],
  claveAcceso?: string,
): Promise<RespuestaConciliacion> {
  const fd = new FormData();
  pares.forEach((p, i) => {
    for (const pdf of p.pdfs) fd.append(`pdfs_${i}`, pdf);
    fd.append(`xlsx_${i}`, p.xlsx);
    fd.append(`label_${i}`, p.etiqueta);
  });

  const res = await fetch('/api/conciliar', {
    method: 'POST',
    body: fd,
    headers: claveAcceso ? { 'x-acceso-clave': claveAcceso } : undefined,
  });

  if (!res.ok) {
    const j = (await res.json().catch(() => ({}))) as { error?: string };
    throw new ConciliarError(j.error ?? `Error ${res.status}`, res.status);
  }
  return res.json() as Promise<RespuestaConciliacion>;
}
