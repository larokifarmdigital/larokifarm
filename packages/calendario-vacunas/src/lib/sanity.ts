import { crearSanityClient } from '@larokifarm/sanity-client';
import type { PortableBlock, PortableSpan, PortableMarkDef } from '@larokifarm/sanity-client';
import type { Lang } from './i18n';

// Re-exportamos las utilidades compartidas para consumidores del package.
export {
  localizar,
  imagenSanity,
  portableTextAHtml,
} from '@larokifarm/sanity-client';
export type {
  EntradaI18n,
  LocalizedString,
  LocalizedText,
  LocalizedPortableText,
  PortableBlock,
} from '@larokifarm/sanity-client';

const projectId = import.meta.env.PUBLIC_SANITY_PROJECT_ID || 'TU_PROJECT_ID';
const dataset = import.meta.env.PUBLIC_SANITY_DATASET || 'production';

export const sanity = crearSanityClient({ projectId, dataset });

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

/**
 * Resuelve un campo i18n (array v5 del plugin sanity-plugin-internationalized-array)
 * a string plano, con fallback al castellano y luego al primer valor disponible.
 */
const i18n = (campo: string) =>
  `coalesce(${campo}[language==$lang][0].value, ${campo}[language=="es"][0].value, ${campo}[0].value)`;

const COMUNIDAD_RESUMEN_PROJECTION = `
  _id,
  "nombre": ${i18n('nombre')},
  "slug": slug.current,
  tipo,
  vigencia
`;

const COMUNIDAD_DETALLE_PROJECTION = `
  ${COMUNIDAD_RESUMEN_PROJECTION},
  fuenteOficial,
  "notaCabecera": ${i18n('notaCabecera')},
  gruposEdad[]{
    _key,
    nombre,
    "descripcion": ${i18n('descripcion')},
    entradas[]{
      _key,
      "notaEspecifica": ${i18n('notaEspecifica')},
      vacuna->{
        _id,
        "nombre": ${i18n('nombre')},
        nombreCorto,
        via,
        "notaGeneral": ${i18n('notaGeneral')},
        enfermedadesPrevenidas[]->{
          _id,
          "nombre": ${i18n('nombre')},
          "descripcion": ${i18n('descripcion')}
        }
      },
      dosis->{
        _id,
        "etiqueta": ${i18n('etiqueta')},
        numero,
        "edadAplicacion": ${i18n('edadAplicacion')}
      }
    }
  }
`;

export async function listarComunidades(lang: Lang = 'es'): Promise<ComunidadResumen[]> {
  return sanity.fetch(
    `*[_type == "comunidad"] | order(tipo asc, nombre[language=="es"][0].value asc) { ${COMUNIDAD_RESUMEN_PROJECTION} }`,
    { lang },
  );
}

export async function obtenerComunidad(
  slug: string,
  lang: Lang = 'es',
): Promise<Comunidad | null> {
  return sanity.fetch(
    `*[_type == "comunidad" && slug.current == $slug][0] { ${COMUNIDAD_DETALLE_PROJECTION} }`,
    { slug, lang },
  );
}

export type FarmaciaPartner = {
  _id: string;
  nombre: string;
  url?: string;
  ciudad?: string;
  logoUrl?: string;
  descripcionCorta?: string;
};

export async function listarFarmaciasPartner(): Promise<FarmaciaPartner[]> {
  return sanity.fetch(`
    *[_type == "farmaciaPartner" && defined(farmacia)]
      | order(orden asc, farmacia->nombre asc) {
      _id,
      "nombre": farmacia->nombre,
      "url": farmacia->contacto.web,
      "ciudad": farmacia->direccion.ciudad,
      "logoUrl": farmacia->logo.asset->url,
      "descripcionCorta": farmacia->descripcionCorta.es
    }
  `);
}

export type FuenteCategoria =
  | 'estatal'
  | 'autonomica'
  | 'internacional'
  | 'sociedad';

export type FuenteOficial = {
  _id: string;
  nombre: string;
  url: string;
  descripcion?: string;
  categoria: FuenteCategoria;
  comunidadNombre?: string;
  comunidadSlug?: string;
};

export async function listarFuentesOficiales(lang: Lang = 'es'): Promise<FuenteOficial[]> {
  return sanity.fetch(
    `
    *[_type == "fuenteOficial"]
      | order(categoria asc, orden asc, nombre asc) {
      _id,
      nombre,
      url,
      descripcion,
      categoria,
      "comunidadNombre": coalesce(comunidad->nombre[language==$lang][0].value, comunidad->nombre[language=="es"][0].value, comunidad->nombre[0].value),
      "comunidadSlug": comunidad->slug.current
    }
  `,
    { lang },
  );
}

export type PaginaLegalSlug = 'aviso-legal' | 'politica-privacidad';

/**
 * Reutilizamos los tipos Portable Text del package compartido para mantener
 * una sola definición canónica del shape de bloques de Sanity.
 */
export type PortableTextMark = PortableMarkDef;
export type PortableTextSpan = PortableSpan;
export type PortableTextBlock = PortableBlock;

export type PaginaLegal = {
  _id: string;
  slug: PaginaLegalSlug;
  titulo: string;
  actualizadoEl?: string;
  contenido: PortableTextBlock[];
};

export async function obtenerPaginaLegal(
  slug: PaginaLegalSlug,
): Promise<PaginaLegal | null> {
  return sanity.fetch(
    `*[_type == "paginaLegal" && slug == $slug][0] {
      _id, slug, titulo, actualizadoEl, contenido
    }`,
    { slug },
  );
}
