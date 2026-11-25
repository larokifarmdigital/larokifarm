import { descriptionSimilarity } from './descriptionMatch';
import { cleanNationalCode, cnCandidates, rescueNationalCode } from './numbers';
import type { DeliveryNoteLine, OrderLine } from './types';

// NOTE: Gemini a veces «presta» el C.N. de otra fila a una que no lo trae
// impreso. Caso Bayer QF00134580: «PROMO SUPRADYN ENERGY 120» y «SUPRADYN
// ENERGY 30 EFERVESCENTE» solo tienen el código interno, pero salieron con el
// C.N. de «GINE-CANESTEN 500 MG CAPSULA» y de «SUPRADYN ENERGY 30 COMP». Al
// agrupar por C.N. se sumaban las unidades (44+4, 10+5) y salía una diferencia
// de cantidades falsa.
//
// Regla: un mismo C.N. en varias filas con códigos internos DISTINTOS es
// imposible (cada artículo tiene su C.N.). Se queda en la fila que mejor
// encaja con la línea del pedido de ese C.N. (mismas unidades y descripción
// más parecida; si empatan, la primera) y se borra del resto. Esas filas pasan
// a cruzarse por descripción, unidades y precio (2ª pasada de reconcile).
// Mismo C.N. con el mismo interno (o sin interno) son lotes del mismo
// artículo y no se tocan.

function lineCns(l: DeliveryNoteLine): string[] {
  const principal = cleanNationalCode(rescueNationalCode(l.nationalCode, l.code));
  const all = cnCandidates([l.nationalCode, ...(l.codes ?? []), l.code, l.ean]);
  return principal ? [principal, ...all.filter((c) => c !== principal)] : all;
}

function internalCode(l: DeliveryNoteLine): string {
  return (l.code ?? '').trim();
}

function withoutCn(l: DeliveryNoteLine, cn: string): DeliveryNoteLine {
  const keep = (raw: string | undefined): boolean => !raw || !cnCandidates([raw]).includes(cn);
  return {
    ...l,
    nationalCode: cleanNationalCode(l.nationalCode) === cn ? '' : l.nationalCode,
    ean: keep(l.ean) ? l.ean : '',
    codes: l.codes?.filter((c) => keep(c)),
  };
}

export function dropBorrowedCodes(
  lines: DeliveryNoteLine[],
  orderLines: OrderLine[],
): DeliveryNoteLine[] {
  const byCn = new Map<string, number[]>();
  lines.forEach((l, i) => {
    for (const cn of lineCns(l)) {
      const idxs = byCn.get(cn) ?? [];
      idxs.push(i);
      byCn.set(cn, idxs);
    }
  });

  const result = [...lines];
  for (const [cn, idxs] of byCn) {
    const internals = new Set(idxs.map((i) => internalCode(lines[i])).filter(Boolean));
    if (idxs.length < 2 || internals.size < 2) continue;

    const order = orderLines.find((o) => cleanNationalCode(o.productCode) === cn);
    let owner = idxs[0];
    if (order) {
      let best = -1;
      for (const i of idxs) {
        const sameUnits = Math.abs(lines[i].quantity - order.units) < 0.001 ? 1 : 0;
        const score = sameUnits * 10 + descriptionSimilarity(lines[i].description, order.description ?? '');
        if (score > best) {
          best = score;
          owner = i;
        }
      }
    }
    const ownerCode = internalCode(lines[owner]);
    for (const i of idxs) {
      const code = internalCode(lines[i]);
      if (i !== owner && code && code !== ownerCode) result[i] = withoutCn(result[i], cn);
    }
  }
  return result;
}
