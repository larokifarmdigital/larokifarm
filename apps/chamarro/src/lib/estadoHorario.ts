/**
 * Estado "abierto / cerrado" de la farmacia con la hora de Madrid. La web es
 * estática: los datos se preparan en el build (`horariosParaEstado`,
 * `textosEstado`) y el cálculo se hace en el navegador (`calcularEstado`).
 * Lo usan la tarjeta del Hero y el horario del Footer. Este archivo va al
 * navegador: sin imports del build (i18n, contenido).
 */

export type TramoEstado = { apertura: string; cierre: string };
export type DiaEstado = { dia: string; cerrado: boolean; tramos: TramoEstado[] };
export type TextosEstado = {
  abierto: string;
  cerrado: string;
  cierra: string;
  abreHoy: string;
  abreManana: string;
};

/** Solo en el navegador. */
export function calcularEstado(
  horarios: DiaEstado[],
  tx: TextosEstado,
  fecha = new Date(),
): { abierto: boolean; titulo: string; detalle: string } {
  const partes = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Madrid', weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(fecha);
  const get = (k: string) => partes.find((p) => p.type === k)?.value ?? '';
  const codigos = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
  const hoy = codigos.indexOf(get('weekday').slice(0, 2));
  const ahora = (Number(get('hour')) % 24) * 60 + Number(get('minute'));
  const min = (h: string) => {
    const [a, b] = h.split(':').map(Number);
    return a * 60 + (b || 0);
  };
  const tramosDe = (i: number) => {
    const d = horarios.find((h) => h.dia === codigos[(i + 7) % 7]);
    return d && !d.cerrado ? d.tramos : [];
  };

  const actual = tramosDe(hoy).find((tr) => ahora >= min(tr.apertura) && ahora < min(tr.cierre));
  if (actual) return { abierto: true, titulo: tx.abierto, detalle: tx.cierra.replace('{hora}', actual.cierre) };

  const luego = tramosDe(hoy).find((tr) => min(tr.apertura) > ahora);
  const manana = tramosDe(hoy + 1)[0];
  return {
    abierto: false,
    titulo: tx.cerrado,
    detalle: luego
      ? tx.abreHoy.replace('{hora}', luego.apertura)
      : manana
        ? tx.abreManana.replace('{hora}', manana.apertura)
        : '',
  };
}
