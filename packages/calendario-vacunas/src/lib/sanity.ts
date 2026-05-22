import { createClient, type ClientConfig } from '@sanity/client';

const projectId = import.meta.env.PUBLIC_SANITY_PROJECT_ID || 'TU_PROJECT_ID';
const dataset = import.meta.env.PUBLIC_SANITY_DATASET || 'production';

const config: ClientConfig = {
  projectId,
  dataset,
  apiVersion: '2024-10-01',
  useCdn: false,
  perspective: 'published',
};

export const sanity = createClient(config);

export type Enfermedad = {
  _id: string;
  nombre: string;
  descripcion?: string;
};

export type Vacuna = {
  _id: string;
  nombre: string;
  nombreCorto?: string;
  via?: 'intramuscular' | 'subcutanea' | 'oral' | 'intranasal';
  notaGeneral?: string;
  enfermedadesPrevenidas?: Enfermedad[];
};

export type Dosis = {
  _id: string;
  etiqueta: string;
  numero?: string;
  edadAplicacion: string;
};

export type Entrada = {
  _key: string;
  vacuna: Vacuna;
  dosis: Dosis;
  notaEspecifica?: string;
};

export type GrupoEdadNombre =
  | 'lactantes'
  | 'infancia'
  | 'adolescencia'
  | 'adultos'
  | 'embarazadas'
  | 'mayores';

export type GrupoEdad = {
  _key: string;
  nombre: GrupoEdadNombre;
  descripcion?: string;
  entradas?: Entrada[];
};

export type ComunidadTipo = 'autonomica' | 'ciudad-autonoma' | 'comun-estatal';

export type ComunidadResumen = {
  _id: string;
  nombre: string;
  slug: string;
  tipo: ComunidadTipo;
  vigencia?: string;
};

export type Comunidad = ComunidadResumen & {
  fuenteOficial?: string;
  notaCabecera?: string;
  gruposEdad?: GrupoEdad[];
};

const COMUNIDAD_RESUMEN_PROJECTION = `
  _id,
  nombre,
  "slug": slug.current,
  tipo,
  vigencia
`;

const COMUNIDAD_DETALLE_PROJECTION = `
  ${COMUNIDAD_RESUMEN_PROJECTION},
  fuenteOficial,
  notaCabecera,
  gruposEdad[]{
    _key,
    nombre,
    descripcion,
    entradas[]{
      _key,
      notaEspecifica,
      vacuna->{
        _id,
        nombre,
        nombreCorto,
        via,
        notaGeneral,
        enfermedadesPrevenidas[]->{ _id, nombre, descripcion }
      },
      dosis->{ _id, etiqueta, numero, edadAplicacion }
    }
  }
`;

export async function listarComunidades(): Promise<ComunidadResumen[]> {
  return sanity.fetch(
    `*[_type == "comunidad"] | order(tipo asc, nombre asc) { ${COMUNIDAD_RESUMEN_PROJECTION} }`,
  );
}

export async function obtenerComunidad(slug: string): Promise<Comunidad | null> {
  return sanity.fetch(
    `*[_type == "comunidad" && slug.current == $slug][0] { ${COMUNIDAD_DETALLE_PROJECTION} }`,
    { slug },
  );
}

export type FarmaciaPartner = {
  _id: string;
  nombre: string;
  url?: string;
  ciudad?: string;
  logoUrl?: string;
};

export async function listarFarmaciasPartner(): Promise<FarmaciaPartner[]> {
  return sanity.fetch(`
    *[_type == "farmaciaPartner" && defined(farmacia)]
      | order(orden asc, farmacia->nombre asc) {
      _id,
      "nombre": farmacia->nombre,
      "url": farmacia->contacto.web,
      "ciudad": farmacia->direccion.ciudad,
      "logoUrl": farmacia->logo.asset->url
    }
  `);
}
