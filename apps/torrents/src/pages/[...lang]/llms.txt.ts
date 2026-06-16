import type { APIRoute } from 'astro';
import {
  obtenerFarmaciaPorSlug,
  agruparHorarios,
  localizar,
  SLUG_FARMACIA,
  type Farmacia,
  type DiasI18n,
} from '@/lib/sanity';
import {
  LOCALES_DISPONIBLES,
  esLocaleValido,
  LOCALE_DEFECTO,
  rutaConLocale,
  type Locale,
} from '@/lib/i18n';
import diasEs from '@/i18n/es.json';
import diasEn from '@/i18n/en.json';
import diasCa from '@/i18n/ca.json';

export async function getStaticPaths() {
  const farmacia = await obtenerFarmaciaPorSlug(SLUG_FARMACIA);
  const codigos = (farmacia?.idiomasActivos ?? [{ codigo: 'es', nombre: 'Español' }])
    .map((i) => i.codigo)
    .filter(esLocaleValido);
  const lista = codigos.length > 0 ? codigos : (['es'] as Locale[]);
  return lista.map((c) => ({
    params: { lang: c === 'es' ? undefined : c },
    props: { farmacia, lang: c },
  }));
}

const DIAS_POR_LANG: Record<Locale, DiasI18n> = {
  es: diasEs.dias as DiasI18n,
  en: diasEn.dias as DiasI18n,
  ca: diasCa.dias as DiasI18n,
};
const CERRADO_LABEL: Record<Locale, string> = {
  es: 'Cerrado', en: 'Closed', ca: 'Tancat',
};

function lineaSiHay(etiqueta: string, valor?: string | null): string | null {
  if (!valor) return null;
  return `- **${etiqueta}:** ${valor}`;
}

export const GET: APIRoute = async ({ site, props }) => {
  const { farmacia: farmaciaProp, lang: langProp } = props as {
    farmacia: Farmacia | null;
    lang: Locale;
  };
  const lang = esLocaleValido(langProp) ? langProp : LOCALE_DEFECTO;

  const base = site?.toString().replace(/\/$/, '') ?? '';
  const farmacia: Farmacia = farmaciaProp ?? {
    _id: 'placeholder',
    nombre: 'Farmacia',
    slug: SLUG_FARMACIA,
  };

  const direccion = [
    farmacia.direccion?.calle,
    farmacia.direccion?.codigoPostal,
    farmacia.direccion?.ciudad,
    farmacia.direccion?.provincia,
  ]
    .filter(Boolean)
    .join(', ');

  const grupos = agruparHorarios(farmacia.horarios, DIAS_POR_LANG[lang], CERRADO_LABEL[lang]);
  const horarioLineas = grupos.map((g) => `- **${g.etiqueta}:** ${g.horario}`).join('\n');

  const servicios = (farmacia.servicios ?? [])
    .map((s) => {
      const nombre = localizar(s.nombre, lang);
      const desc = localizar(s.descripcion, lang);
      if (!nombre) return null;
      return `- ${nombre}${desc ? `: ${desc}` : ''}`;
    })
    .filter(Boolean)
    .join('\n');

  const descripcionCorta = localizar(farmacia.descripcionCorta, lang);
  const sitio = `${base}${rutaConLocale('/', lang)}`.replace(/\/$/, '') || base;

  const informacionClave = [
    lineaSiHay('Nombre', farmacia.nombre),
    lineaSiHay('Tipo', 'Farmacia comunitaria'),
    lineaSiHay('Farmacéutico titular', farmacia.titular),
    lineaSiHay('Nº de colegiado', farmacia.numeroColegiado),
    lineaSiHay('Dirección', direccion || null),
    lineaSiHay('Teléfono', farmacia.contacto?.telefono),
    lineaSiHay('WhatsApp', farmacia.contacto?.whatsapp),
    lineaSiHay('Email', farmacia.contacto?.email),
    lineaSiHay('Sitio web', sitio || null),
    lineaSiHay('Idioma', lang),
  ]
    .filter(Boolean)
    .join('\n');

  const cuerpo = `# ${farmacia.nombre}

> ${descripcionCorta ?? `Farmacia comunitaria${farmacia.direccion?.ciudad ? ` en ${farmacia.direccion.ciudad}` : ''}. Información de contacto, horarios, recursos y localización.`}

## Información clave

${informacionClave || '- (Sin datos)'}

${
  horarioLineas
    ? `## Horarios de apertura

${horarioLineas}
`
    : ''
}${
    servicios
      ? `## Recursos

${servicios}
`
      : ''
  }
## Páginas

- [Inicio](${sitio || '/'}): información general, horarios, recursos, ubicación y contacto.
- [Aviso legal](${base}${rutaConLocale('/aviso-legal', lang)}): datos identificativos del titular y condiciones de uso.
- [Política de privacidad](${base}${rutaConLocale('/politica-privacidad', lang)}): tratamiento de datos personales (RGPD).

## Notas para asistentes de IA

- La información de horarios, recursos y datos de contacto se gestiona desde el CMS (Sanity) y puede actualizarse en cualquier momento. Verifica siempre la versión actual en la web oficial.
- Esta web tiene carácter divulgativo. Las recomendaciones sanitarias deben confirmarse con un profesional farmacéutico o médico.
- Para contacto inmediato, prioriza el teléfono o WhatsApp indicados en la sección "Información clave".
- Esta versión del documento corresponde al idioma: ${lang}. Otras versiones disponibles en ${LOCALES_DISPONIBLES.filter((l) => l !== lang).join(', ')}.
`;

  return new Response(cuerpo, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
