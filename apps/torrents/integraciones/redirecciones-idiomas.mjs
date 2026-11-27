// Redirecciones de los idiomas del catálogo que la farmacia NO tiene activos: /en/… no da 404, lleva a la misma página en castellano.
// Se generan al acabar el build según las carpetas de dist/ (las rutas [...lang] solo existen para idiomas activos):
//   1. `_redirects` con 301 reales (Cloudflare Pages).
//   2. Una página HTML por ruta con meta refresh + canonical + noindex (Vercel y hostings que ignoran `_redirects`).
// Se hace aquí y no como página de Astro para que no entren en el sitemap.
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Mismo catálogo que src/lib/i18n.ts (sin el castellano, que es la raíz). */
const CATALOGO = ['en', 'ca', 'fr', 'de', 'it', 'pt', 'eu', 'gl'];
const SUBRUTAS = ['', 'resenas', 'aviso-legal', 'politica-privacidad'];

const esc = (v) =>
  String(v).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Origen del sitio validado (SITE_URL): solo http(s), sin ruta extra. Vacío si no es válido. */
function origenSeguro(site) {
  try {
    const u = new URL(site);
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.origin : '';
  } catch {
    return '';
  }
}

function htmlRedireccion(destino, absoluta) {
  destino = esc(destino);
  absoluta = esc(absoluta);
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="robots" content="noindex">
<meta http-equiv="refresh" content="0; url=${destino}">
<link rel="canonical" href="${absoluta}">
<title>Redirigiendo…</title>
</head>
<body><p><a href="${destino}">Ir a la página</a></p></body>
</html>
`;
}

export function redireccionesIdiomas() {
  let site = '';
  return {
    name: 'redirecciones-idiomas',
    hooks: {
      'astro:config:done': ({ config }) => {
        site = origenSeguro(config.site ?? '');
      },
      'astro:build:done': async ({ dir, logger }) => {
        const raiz = fileURLToPath(dir);
        const inactivos = CATALOGO.filter((c) => !existsSync(join(raiz, c, 'index.html')));
        if (inactivos.length === 0) return;

        for (const codigo of inactivos) {
          for (const sub of SUBRUTAS) {
            const destino = `/${sub}`;
            const carpeta = join(raiz, codigo, sub);
            await mkdir(carpeta, { recursive: true });
            await writeFile(join(carpeta, 'index.html'), htmlRedireccion(destino, `${site}${destino}`));
          }
        }

        // Reglas explícitas por página conocida (sin comodín /:splat: evita que
        // una ruta como /en//otro-sitio.com acabe en un destino "//otro-sitio.com").
        const reglas = inactivos
          .flatMap((c) =>
            SUBRUTAS.flatMap((sub) =>
              sub ? [`/${c}/${sub} /${sub} 301`, `/${c}/${sub}/ /${sub} 301`] : [`/${c} / 301`, `/${c}/ / 301`],
            ),
          )
          .join('\n');
        const ruta = join(raiz, '_redirects');
        const previo = existsSync(ruta) ? `${(await readFile(ruta, 'utf8')).trimEnd()}\n` : '';
        await writeFile(ruta, `${previo}# Idiomas no activos → castellano\n${reglas}\n`);
        logger.info(`Idiomas no activos redirigidos al castellano: ${inactivos.join(', ')}`);
      },
    },
  };
}
