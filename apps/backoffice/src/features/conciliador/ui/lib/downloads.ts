import { zipSync } from 'fflate';

const MIME_XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

export function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

// HACK: copiamos a ArrayBuffer propio para sortear el clash Uint8Array<ArrayBufferLike> ↔ BlobPart de TS 5.9.
function aBlob(bytes: Uint8Array, type: string): Blob {
  const ab = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(ab).set(bytes);
  return new Blob([ab], { type });
}

function descargarBlob(nombre: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function descargarXlsx(nombre: string, base64: string): void {
  descargarBlob(nombre, aBlob(base64ToBytes(base64), MIME_XLSX));
}

export function descargarZip(
  archivos: Array<{ nombre: string; base64: string }>,
  nombreZip = 'conciliacion.zip',
): void {
  const entradas: Record<string, Uint8Array> = {};
  for (const a of archivos) {
    let nombre = a.nombre;
    let n = 1;
    while (entradas[nombre]) {
      nombre = a.nombre.replace(/(\.[^.]+)?$/, `_${n++}$1`);
    }
    entradas[nombre] = base64ToBytes(a.base64);
  }
  const zipped = zipSync(entradas);
  descargarBlob(nombreZip, aBlob(zipped, 'application/zip'));
}
