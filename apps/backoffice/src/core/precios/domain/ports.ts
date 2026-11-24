import type { Candidato, Consulta, ConsultaResumen, FarmaciaOnline, Oferta, Producto, TipoProducto } from './models';

/** Resultado de un adaptador, sin la farmacia ni la hora (los pone quien lo llama). */
export type ResultadoFarmacia = Omit<Oferta, 'farmacia' | 'consultadoEn'>;

export interface AdaptadorFarmacia extends FarmaciaOnline {
  buscar(producto: Producto): Promise<ResultadoFarmacia>;
}

/** CIMA (AEMPS): solo medicamentos. La parafarmacia no está. */
export interface CatalogoMedicamentos {
  porCn(cn: string): Promise<{ cn: string; nombre: string; tipo: Exclude<TipoProducto, 'parafarmacia'> } | null>;
  porNombre(texto: string): Promise<Candidato[]>;
}

/** Catálogo de parafarmacia (una farmacia online que devuelve el CN en su buscador). */
export interface CatalogoParafarmacia {
  porCn(cn: string): Promise<{ nombre: string } | null>;
  porNombre(texto: string): Promise<Candidato[]>;
}

/** Precio oficial (PVP con IVA) de los medicamentos financiados. */
export interface PrecioOficialPort {
  deCn(cn: string): Promise<number | null>;
}

export interface NuevaConsulta {
  userId: string;
  consulta: string;
  producto: Producto;
  precioOficial: number | null;
  /** Hecha por una lista (no sale en el historial de "Comparar precio"). */
  desdeLista?: boolean;
}

export interface PriceCheckRepository {
  crear(c: NuevaConsulta): Promise<string>;
  guardarOferta(checkId: string, o: Oferta): Promise<void>;
  obtener(id: string): Promise<Consulta | null>;
  listar(opts: FiltrosHistorial & { pagina: number; porPagina: number }): Promise<{ items: ConsultaResumen[]; total: number }>;
}

export type ResultadoHistorial = 'con_precio' | 'sin_precio' | 'receta';

export interface FiltrosHistorial {
  texto?: string;
  desde?: Date;
  /** Exclusivo. */
  hasta?: Date;
  resultado?: ResultadoHistorial;
}
