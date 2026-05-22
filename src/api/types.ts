export type DocTipo = 1 | 2;

export interface CimaDoc {
  tipo: DocTipo;
  url: string;
  urlHtml: string;
  secc: boolean;
  fecha: number;
}

export interface CimaEstado {
  aut?: number;
  rev?: number;
  susp?: number;
}

export interface CimaFoto {
  tipo: 'materialas' | 'formafarmac' | string;
  url: string;
  fecha: number;
}

export interface CimaMedicamentoListItem {
  nregistro: string;
  nombre: string;
  labtitular?: string;
  labcomercializador?: string;
  cpresc?: string;
  estado?: CimaEstado;
  comerc?: boolean;
  receta?: boolean;
  generico?: boolean;
  triangulo?: boolean;
  huerfano?: boolean;
  biosimilar?: boolean;
  conduc?: boolean;
  psum?: boolean;
  notas?: boolean;
  docs?: CimaDoc[];
  fotos?: CimaFoto[];
  vtm?: { id: number; nombre: string };
  dosis?: string;
  formaFarmaceutica?: { id: number; nombre: string };
}

export interface CimaAtc {
  codigo: string;
  nombre: string;
  nivel: number;
}

export interface CimaPrincipioActivo {
  id: number;
  codigo: string;
  nombre: string;
  cantidad?: string;
  unidad?: string;
  orden: number;
}

export interface CimaMedicamento extends CimaMedicamentoListItem {
  pactivos?: string;
  atcs?: CimaAtc[];
  principiosActivos?: CimaPrincipioActivo[];
}

export interface CimaNota {
  tipo: number;
  num: string;
  referencia: string;
  asunto: string;
  fecha: number;
  url: string;
}

export interface CimaProblemaSuministro {
  cn: string;
  nombre: string;
  tipoProblemaSuministro: number;
  fini?: number;
  ffin?: number;
  activo: boolean;
  observ?: string;
}

export interface CimaPresentacion {
  nregistro: string;
  cn: string;
  nombre: string;
  pactivos?: string;
  labtitular?: string;
  comerc?: boolean;
  receta?: boolean;
}

export interface CimaSearchFilters {
  receta?: 0 | 1;
  comerc?: 0 | 1;
  triangulo?: 0 | 1;
  generico?: 0 | 1;
  cn?: string;
  practiv?: string;
}

export interface CimaSearchResponse<T> {
  totalFilas: number;
  pagina: number;
  tamanioPagina: number;
  resultados: T[];
}

export interface CimaSeccion {
  seccion: string;
  titulo: string;
  orden: number;
}
