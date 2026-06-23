import { describe, expect, it } from 'vitest';
import { fusionarAlbaranes } from './fusionarAlbaranes';
import type { AlbaranData, LineaAlbaran } from './tipos';

function linea(p: Partial<LineaAlbaran>): LineaAlbaran {
  return {
    descripcion: '',
    cantidad: 0,
    precio_unitario: 0,
    ...p,
  };
}

describe('fusionarAlbaranes', () => {
  it('lista vacía → AlbaranData vacío', () => {
    const r = fusionarAlbaranes([]);
    expect(r.lineas).toEqual([]);
    expect(r.numero_albaran).toBe('');
  });

  it('un solo PDF → devuelve el mismo sin cambios', () => {
    const a: AlbaranData = {
      numero_albaran: 'A1',
      tipo_documento: 'albaran',
      lineas: [linea({ codigo_ean: '1111', descripcion: 'P', cantidad: 1, precio_unitario: 1 })],
    };
    expect(fusionarAlbaranes([a])).toBe(a);
  });

  // Caso NESTLE: albarán y factura comparten el mismo set de productos, con
  // EAN y código interno en ambos. El albarán manda en cantidad; la factura
  // manda en precio y descuento.
  it('NESTLE: albarán (cantidad) + factura (precio/descuento) → fusión completa', () => {
    const albaran: AlbaranData = {
      numero_albaran: '8116029044',
      tipo_documento: 'albaran',
      lineas: [
        linea({
          codigo: '12578223',
          codigo_ean: '7613032875305',
          descripcion: 'NAN OPTIPRO 2',
          cantidad: 6,
          precio_unitario: 0,
        }),
        linea({
          codigo: '12568654',
          codigo_ean: '7613035854444',
          descripcion: 'NAN SUPREMEPRO 1',
          cantidad: 18,
          precio_unitario: 0,
        }),
      ],
    };
    const factura: AlbaranData = {
      numero_albaran: '8116029044',
      tipo_documento: 'factura',
      lineas: [
        linea({
          codigo: '12578223',
          codigo_ean: '7613032875305',
          codigo_nacional: '156495.5',
          descripcion: 'NAN OPTIPRO 2 800g',
          cantidad: 6,
          precio_unitario: 23.34,
          descuento: 21.5, // 20 + 1.5 sumados por Gemini
        }),
        linea({
          codigo: '12568654',
          codigo_ean: '7613035854444',
          codigo_nacional: '183880.3',
          descripcion: 'NAN SUPREMEpro 1 800g',
          cantidad: 18,
          precio_unitario: 39.54,
          descuento: 21.5,
        }),
      ],
    };

    const r = fusionarAlbaranes([albaran, factura]);
    expect(r.lineas).toHaveLength(2);

    const optipro = r.lineas.find((l) => l.codigo === '12578223')!;
    expect(optipro.cantidad).toBe(6);
    expect(optipro.precio_unitario).toBe(23.34); // ← factura
    expect(optipro.descuento).toBe(21.5); // ← factura
    expect(optipro.codigo_ean).toBe('7613032875305'); // ← albarán
    expect(optipro.codigo_nacional).toBe('156495.5'); // ← factura

    const supremepro = r.lineas.find((l) => l.codigo === '12568654')!;
    expect(supremepro.cantidad).toBe(18);
    expect(supremepro.precio_unitario).toBe(39.54);
  });

  // Caso PEROX: la factura SOLO trae código interno. Sin union-find por todos
  // los identificadores, no habría cómo cruzar las líneas. Si la fusión
  // funciona, la línea de la factura aporta tarifa y descuento; la del
  // albarán aporta cantidad, EAN y C.N.
  it('PEROX: cruce por solo código interno cuando la factura no trae EAN/CN', () => {
    const albaran: AlbaranData = {
      numero_albaran: 'ALU-523836',
      tipo_documento: 'albaran',
      lineas: [
        linea({
          codigo: 'UN14080',
          codigo_ean: '8431456140804',
          codigo_nacional: '164624.8',
          descripcion: 'ICO JERINGA INS. 1ML',
          cantidad: 200,
          precio_unitario: 22.31, // neto, lo que Gemini ve en la columna Precio
        }),
        linea({
          codigo: '102032003',
          codigo_ean: '8430442000191',
          codigo_nacional: '172981.1',
          descripcion: 'MUSSVITAL ESSEN QUITAESMALTE 150ML',
          cantidad: 12,
          precio_unitario: 2.05,
        }),
      ],
    };
    const factura: AlbaranData = {
      numero_albaran: 'FA-487169',
      tipo_documento: 'factura',
      lineas: [
        linea({
          codigo: 'UN14080',
          // sin EAN, sin C.N. — el caso difícil
          descripcion: 'ICO JERINGA INS. 1ML + AGUJA 25G 0,5X16',
          cantidad: 200,
          precio_unitario: 37.18, // tarifa general
          descuento: 40,
        }),
        linea({
          codigo: '102032003',
          descripcion: 'MUSSVITAL ESSEN QUITAESMALTE 150ML',
          cantidad: 12,
          precio_unitario: 3.42,
          descuento: 40,
        }),
      ],
    };

    const r = fusionarAlbaranes([albaran, factura]);
    expect(r.lineas).toHaveLength(2);

    const jeringa = r.lineas.find((l) => l.codigo === 'UN14080')!;
    expect(jeringa.cantidad).toBe(200);
    expect(jeringa.precio_unitario).toBe(37.18); // ← factura (tarifa, no neto)
    expect(jeringa.descuento).toBe(40); // ← factura
    expect(jeringa.codigo_ean).toBe('8431456140804'); // ← albarán
    expect(jeringa.codigo_nacional).toBe('164624.8'); // ← albarán (factura no lo trae)

    const mussvital = r.lineas.find((l) => l.codigo === '102032003')!;
    expect(mussvital.precio_unitario).toBe(3.42);
    expect(mussvital.descuento).toBe(40);
    expect(mussvital.cantidad).toBe(12);
  });

  // El albarán y la factura pueden tener identificadores distintos rellenos
  // por línea: si una trae solo EAN y la otra trae solo C.N. del mismo
  // producto, NO se cruzan. Es una limitación aceptada para v1 — en la
  // práctica al menos un identificador suele coincidir.
  it('NO se cruzan líneas que no comparten ningún identificador', () => {
    const a: AlbaranData = {
      numero_albaran: 'A1',
      tipo_documento: 'albaran',
      lineas: [linea({ codigo_ean: '1111', descripcion: 'P', cantidad: 5, precio_unitario: 1 })],
    };
    const b: AlbaranData = {
      numero_albaran: 'A1',
      tipo_documento: 'factura',
      lineas: [linea({ codigo_nacional: '222222', descripcion: 'P', cantidad: 5, precio_unitario: 1 })],
    };
    const r = fusionarAlbaranes([a, b]);
    expect(r.lineas).toHaveLength(2); // dos líneas separadas
  });

  // Una línea del albarán que comparte EAN con una de la factura, y otra
  // línea de la factura que comparte código interno con la primera del
  // albarán → todas en un mismo grupo (transitividad por union-find).
  it('union-find transitivo: A↔B por EAN, B↔C por código interno → todo un grupo', () => {
    const a: AlbaranData = {
      numero_albaran: 'A1',
      tipo_documento: 'albaran',
      lineas: [
        linea({ codigo: 'XCOD', codigo_ean: '1111', descripcion: 'P', cantidad: 10, precio_unitario: 0 }),
      ],
    };
    const b: AlbaranData = {
      numero_albaran: 'A1',
      tipo_documento: 'factura',
      lineas: [
        linea({ codigo_ean: '1111', descripcion: 'P', cantidad: 10, precio_unitario: 5, descuento: 10 }),
        linea({ codigo: 'XCOD', descripcion: 'P', cantidad: 10, precio_unitario: 6, descuento: 15 }),
      ],
    };
    const r = fusionarAlbaranes([a, b]);
    // 3 líneas de entrada, todas unidas por EAN o código → 1 línea fusionada
    expect(r.lineas).toHaveLength(1);
  });

  // Si solo hay descuentos en la factura, el campo debe llegar al fusionado.
  // Validamos también que descuento 0 explícito de la factura se respeta.
  it('descuento 0 explícito de la factura se respeta (no se busca en el albarán)', () => {
    const albaran: AlbaranData = {
      numero_albaran: 'A1',
      tipo_documento: 'albaran',
      lineas: [linea({ codigo_ean: '1111', cantidad: 10, precio_unitario: 0, descuento: 5 })],
    };
    const factura: AlbaranData = {
      numero_albaran: 'A1',
      tipo_documento: 'factura',
      lineas: [linea({ codigo_ean: '1111', cantidad: 10, precio_unitario: 10, descuento: 0 })],
    };
    const r = fusionarAlbaranes([albaran, factura]);
    expect(r.lineas[0].descuento).toBe(0); // factura manda, aunque sea 0
  });
});
