/**
 * Sincroniza reseñas de Google Business Profile → Sanity.
 *
 * - Cron: 2x al día (06:00 y 18:00 UTC) → recorre TODAS las farmacias con
 *   `googleLocationName` rellenado y hace upsert de sus reseñas en Sanity.
 * - HTTP POST /sync con `Authorization: Bearer <SYNC_SECRET>` → ejecuta lo
 *   mismo a demanda (útil para pruebas y para el primer sync).
 * - HTTP GET / → healthcheck minimal.
 *
 * Cada reseña se guarda como `resenaGoogle` con _id determinista
 * `resena-<reviewId>`, lo que permite re-ejecutar el sync sin duplicar.
 *
 * Si una reseña deja de estar en Google, se marca `eliminadaEnGoogle: true`
 * en lugar de borrarse (trazabilidad editorial).
 */

interface Env {
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  GOOGLE_REFRESH_TOKEN: string;
  SANITY_PROJECT_ID: string;
  SANITY_DATASET: string;
  SANITY_API_VERSION: string;
  SANITY_WRITE_TOKEN: string;
  SYNC_SECRET: string;
}

// ── Google OAuth + Business Profile ────────────────────────────────────────

async function obtenerAccessToken(env: Env): Promise<string> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      refresh_token: env.GOOGLE_REFRESH_TOKEN,
      grant_type: 'refresh_token',
    }),
  });
  if (!res.ok) {
    throw new Error(`[google] refresh_token falló: ${res.status} ${await res.text()}`);
  }
  const data = (await res.json()) as { access_token?: string };
  if (!data.access_token) throw new Error('[google] respuesta sin access_token');
  return data.access_token;
}

interface GoogleReview {
  name: string; // accounts/X/locations/Y/reviews/Z
  reviewId: string;
  reviewer?: { displayName?: string; profilePhotoUrl?: string };
  starRating?: 'STAR_RATING_UNSPECIFIED' | 'ONE' | 'TWO' | 'THREE' | 'FOUR' | 'FIVE';
  comment?: string;
  createTime?: string;
  updateTime?: string;
  reviewReply?: { comment?: string; updateTime?: string };
}

const STAR_TO_NUMBER: Record<string, number> = {
  ONE: 1,
  TWO: 2,
  THREE: 3,
  FOUR: 4,
  FIVE: 5,
};

/**
 * Google auto-traduce las reseñas en idiomas distintos al de la cuenta y devuelve
 * el `comment` en uno de estos formatos:
 *
 *   A) "(Translated by Google) <traducción> (Original) <original>"
 *      → cortamos en "(Original)" y nos quedamos con lo de después.
 *
 *   B) "<original> (Translated by Google) <traducción>"
 *      (sin marcador "(Original)") → cortamos en "(Translated by Google)" y
 *      nos quedamos con lo de antes.
 *
 * Nos quedamos siempre con el texto que el cliente realmente escribió.
 */
function extraerOriginal(comment: string | undefined): string {
  if (!comment) return '';
  const idxOriginal = comment.indexOf('(Original)');
  if (idxOriginal !== -1) {
    return comment.slice(idxOriginal + '(Original)'.length).trim();
  }
  const idxTraducido = comment.indexOf('(Translated by Google)');
  if (idxTraducido !== -1) {
    return comment.slice(0, idxTraducido).trim();
  }
  return comment.trim();
}

async function listarResenasGoogle(
  accessToken: string,
  locationName: string,
): Promise<GoogleReview[]> {
  // La API v4 sigue siendo la única que expone reviews. Paginación con pageToken.
  const reviews: GoogleReview[] = [];
  let pageToken: string | undefined;
  do {
    const url = new URL(`https://mybusiness.googleapis.com/v4/${locationName}/reviews`);
    url.searchParams.set('pageSize', '50');
    if (pageToken) url.searchParams.set('pageToken', pageToken);
    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
      throw new Error(
        `[google] reviews.list ${locationName} → ${res.status} ${await res.text()}`,
      );
    }
    const data = (await res.json()) as {
      reviews?: GoogleReview[];
      nextPageToken?: string;
    };
    if (data.reviews) reviews.push(...data.reviews);
    pageToken = data.nextPageToken;
  } while (pageToken);
  return reviews;
}

// ── Sanity REST helpers ────────────────────────────────────────────────────

function sanityUrl(env: Env, kind: 'query' | 'mutate'): string {
  return `https://${env.SANITY_PROJECT_ID}.api.sanity.io/v${env.SANITY_API_VERSION}/data/${kind}/${env.SANITY_DATASET}`;
}

async function sanityFetch<T>(
  env: Env,
  query: string,
  params: Record<string, unknown> = {},
): Promise<T> {
  const res = await fetch(sanityUrl(env, 'query'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.SANITY_WRITE_TOKEN}`,
    },
    body: JSON.stringify({ query, params }),
  });
  if (!res.ok) {
    throw new Error(`[sanity] query falló: ${res.status} ${await res.text()}`);
  }
  const data = (await res.json()) as { result: T };
  return data.result;
}

interface SanityMutation {
  createOrReplace?: Record<string, unknown>;
  patch?: { id: string; set?: Record<string, unknown> };
}

async function sanityMutate(env: Env, mutations: SanityMutation[]): Promise<void> {
  if (mutations.length === 0) return;
  // La API de Sanity acepta lotes grandes pero por seguridad partimos en chunks de 100.
  for (let i = 0; i < mutations.length; i += 100) {
    const chunk = mutations.slice(i, i + 100);
    const res = await fetch(sanityUrl(env, 'mutate'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.SANITY_WRITE_TOKEN}`,
      },
      body: JSON.stringify({ mutations: chunk }),
    });
    if (!res.ok) {
      throw new Error(`[sanity] mutate falló: ${res.status} ${await res.text()}`);
    }
  }
}

// ── Lógica de sync ─────────────────────────────────────────────────────────

interface FarmaciaConLocation {
  _id: string;
  nombre: string;
  googleLocationName: string;
}

interface ResenaExistente {
  _id: string;
  googleReviewId: string;
  eliminadaEnGoogle?: boolean;
  oculta?: boolean;
  destacada?: boolean;
  autorFotoAssetRef?: string;
}

interface SanityImageRef {
  _type: 'image';
  asset: { _type: 'reference'; _ref: string };
}

/**
 * Descarga el avatar de Google y lo sube a los assets de Sanity para evitar
 * llamar a `lh3.googleusercontent.com` desde el browser (política cero-cookies).
 *
 * Sanity deduplica por hash SHA-1, así que re-subir la misma imagen no consume
 * almacenamiento adicional. Devuelve null si la descarga o subida fallan —
 * en ese caso el doc queda sin avatar y el frontend cae al inicial del nombre.
 */
async function subirAvatarASanity(
  env: Env,
  fotoUrl: string,
): Promise<SanityImageRef | null> {
  try {
    const imgRes = await fetch(fotoUrl, {
      headers: { 'User-Agent': 'larokifarm-google-resenas/0.1' },
    });
    if (!imgRes.ok) {
      console.warn(`[avatar] download ${imgRes.status} → ${fotoUrl}`);
      return null;
    }
    const contentType = imgRes.headers.get('content-type') || 'image/jpeg';
    const cuerpo = await imgRes.arrayBuffer();

    const uploadUrl = `https://${env.SANITY_PROJECT_ID}.api.sanity.io/v${env.SANITY_API_VERSION}/assets/images/${env.SANITY_DATASET}`;
    const upRes = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'Content-Type': contentType,
        Authorization: `Bearer ${env.SANITY_WRITE_TOKEN}`,
      },
      body: cuerpo,
    });
    if (!upRes.ok) {
      console.warn(`[avatar] upload ${upRes.status} ${(await upRes.text()).slice(0, 200)}`);
      return null;
    }
    const data = (await upRes.json()) as { document?: { _id?: string } };
    const ref = data.document?._id;
    if (!ref) return null;
    return { _type: 'image', asset: { _type: 'reference', _ref: ref } };
  } catch (err) {
    console.warn(`[avatar] error: ${err instanceof Error ? err.message : err}`);
    return null;
  }
}

function docIdParaReview(reviewName: string): string {
  // reviewName = accounts/X/locations/Y/reviews/Z → "resena-Z"
  const ultimo = reviewName.split('/').pop() ?? reviewName;
  // Sanity _id solo acepta [A-Za-z0-9_.-]
  const limpio = ultimo.replace(/[^A-Za-z0-9_.-]/g, '');
  return `resena-${limpio}`;
}

async function mapearResenaADoc(
  env: Env,
  review: GoogleReview,
  farmaciaId: string,
  ahora: string,
  flagsEditoriales: { oculta?: boolean; destacada?: boolean },
  fotoExistenteRef: string | undefined,
) {
  const rating = review.starRating ? STAR_TO_NUMBER[review.starRating] : 0;

  // Si ya tenemos el asset en Sanity de un sync anterior, reutilizamos —
  // evitamos descargar/subir cada vez. Solo subimos cuando es nueva.
  let autorFoto: SanityImageRef | undefined;
  if (fotoExistenteRef) {
    autorFoto = { _type: 'image', asset: { _type: 'reference', _ref: fotoExistenteRef } };
  } else if (review.reviewer?.profilePhotoUrl) {
    autorFoto = (await subirAvatarASanity(env, review.reviewer.profilePhotoUrl)) ?? undefined;
  }

  return {
    _id: docIdParaReview(review.name),
    _type: 'resenaGoogle',
    farmacia: { _type: 'reference', _ref: farmaciaId },
    googleReviewId: review.name,
    autorNombre: review.reviewer?.displayName ?? 'Anónimo',
    ...(autorFoto ? { autorFoto } : {}),
    rating: rating || 1,
    comentario: extraerOriginal(review.comment),
    fechaPublicacion: review.createTime,
    fechaActualizacion: review.updateTime,
    fechaSincronizacion: ahora,
    eliminadaEnGoogle: false,
    // Flags editoriales: se preservan entre syncs (no se sobreescriben con false).
    oculta: flagsEditoriales.oculta === true,
    destacada: flagsEditoriales.destacada === true,
    ...(review.reviewReply?.comment
      ? { respuestaOwner: review.reviewReply.comment }
      : {}),
    ...(review.reviewReply?.updateTime
      ? { respuestaOwnerFecha: review.reviewReply.updateTime }
      : {}),
  };
}

interface SyncResultadoFarmacia {
  farmacia: string;
  location: string;
  nuevasOActualizadas: number;
  marcadasEliminadas: number;
  total: number;
}

async function sincronizarFarmacia(
  env: Env,
  accessToken: string,
  farmacia: FarmaciaConLocation,
): Promise<SyncResultadoFarmacia> {
  console.log(
    `[sync] ${farmacia.nombre} (${farmacia._id}) → ${farmacia.googleLocationName}`,
  );

  const [resenasGoogle, resenasSanity] = await Promise.all([
    listarResenasGoogle(accessToken, farmacia.googleLocationName),
    sanityFetch<ResenaExistente[]>(
      env,
      '*[_type=="resenaGoogle" && farmacia._ref == $farmaciaId]{_id, googleReviewId, eliminadaEnGoogle, oculta, destacada, "autorFotoAssetRef": autorFoto.asset._ref}',
      { farmaciaId: farmacia._id },
    ),
  ]);

  const ahora = new Date().toISOString();
  const idsActualesGoogle = new Set(resenasGoogle.map((r) => r.name));

  // Map por reviewId para preservar lo que ya conocemos: flags editoriales y
  // el asset ref del avatar (evita re-descargar cada sync).
  const flagsPorReviewId = new Map<string, { oculta?: boolean; destacada?: boolean }>();
  const fotoPorReviewId = new Map<string, string>();
  for (const r of resenasSanity) {
    flagsPorReviewId.set(r.googleReviewId, { oculta: r.oculta, destacada: r.destacada });
    if (r.autorFotoAssetRef) fotoPorReviewId.set(r.googleReviewId, r.autorFotoAssetRef);
  }

  // Construimos los docs en paralelo (las descargas/subidas de avatares son IO-bound).
  const docs = await Promise.all(
    resenasGoogle.map((review) =>
      mapearResenaADoc(
        env,
        review,
        farmacia._id,
        ahora,
        flagsPorReviewId.get(review.name) ?? {},
        fotoPorReviewId.get(review.name),
      ),
    ),
  );

  const mutations: SanityMutation[] = [];
  for (const doc of docs) {
    mutations.push({ createOrReplace: doc });
  }

  // Marca como eliminada cualquier reseña que existía en Sanity y ya no está en Google.
  let marcadasEliminadas = 0;
  for (const existente of resenasSanity) {
    if (!idsActualesGoogle.has(existente.googleReviewId) && !existente.eliminadaEnGoogle) {
      mutations.push({
        patch: {
          id: existente._id,
          set: { eliminadaEnGoogle: true, fechaSincronizacion: ahora },
        },
      });
      marcadasEliminadas++;
    }
  }

  await sanityMutate(env, mutations);

  return {
    farmacia: farmacia.nombre,
    location: farmacia.googleLocationName,
    nuevasOActualizadas: resenasGoogle.length,
    marcadasEliminadas,
    total: resenasSanity.length + resenasGoogle.length - resenasSanity.length,
  };
}

async function ejecutarSync(env: Env) {
  const farmacias = await sanityFetch<FarmaciaConLocation[]>(
    env,
    '*[_type=="farmacia" && defined(googleLocationName) && googleLocationName != ""]{_id, nombre, googleLocationName}',
  );
  console.log(`[sync] ${farmacias.length} farmacia(s) con googleLocationName`);

  if (farmacias.length === 0) {
    return { ok: true, farmacias: [], mensaje: 'No hay farmacias con googleLocationName' };
  }

  const accessToken = await obtenerAccessToken(env);

  const resultados: SyncResultadoFarmacia[] = [];
  const errores: { farmacia: string; error: string }[] = [];

  for (const f of farmacias) {
    try {
      const r = await sincronizarFarmacia(env, accessToken, f);
      resultados.push(r);
      console.log(
        `[sync] ✓ ${f.nombre}: ${r.nuevasOActualizadas} upsert, ${r.marcadasEliminadas} marcadas eliminadas`,
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[sync] ✖ ${f.nombre}: ${msg}`);
      errores.push({ farmacia: f.nombre, error: msg });
    }
  }

  return { ok: errores.length === 0, farmacias: resultados, errores };
}

// ── Entrypoints ────────────────────────────────────────────────────────────

function envIncompleto(env: Env): string | null {
  const requeridos: (keyof Env)[] = [
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'GOOGLE_REFRESH_TOKEN',
    'SANITY_PROJECT_ID',
    'SANITY_DATASET',
    'SANITY_API_VERSION',
    'SANITY_WRITE_TOKEN',
    'SYNC_SECRET',
  ];
  const faltan = requeridos.filter((k) => !env[k]);
  return faltan.length ? `Faltan vars/secrets: ${faltan.join(', ')}` : null;
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    console.log(`[entry] ${req.method} ${url.pathname}`);

    if (req.method === 'GET' && url.pathname === '/') {
      return new Response('larokifarm-google-resenas · POST /sync con bearer SYNC_SECRET', {
        status: 200,
      });
    }

    if (req.method !== 'POST' || url.pathname !== '/sync') {
      return new Response('Not found', { status: 404 });
    }

    const missing = envIncompleto(env);
    if (missing) {
      console.error(`[entry] ${missing}`);
      return new Response(missing, { status: 500 });
    }

    const auth = req.headers.get('authorization');
    const expected = `Bearer ${env.SYNC_SECRET}`;
    if (!auth || auth !== expected) {
      return new Response('Unauthorized', { status: 401 });
    }

    try {
      const result = await ejecutarSync(env);
      return Response.json(result, { status: result.ok ? 200 : 502 });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[entry] sync falló: ${msg}`);
      return new Response(`Sync failed: ${msg}`, { status: 500 });
    }
  },

  async scheduled(event: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    console.log(`[cron] ${event.cron} @ ${new Date(event.scheduledTime).toISOString()}`);
    const missing = envIncompleto(env);
    if (missing) {
      console.error(`[cron] ${missing}`);
      return;
    }
    ctx.waitUntil(
      ejecutarSync(env)
        .then((r) =>
          console.log(`[cron] resultado: ${JSON.stringify(r).slice(0, 500)}`),
        )
        .catch((err) =>
          console.error(`[cron] falló: ${err instanceof Error ? err.message : err}`),
        ),
    );
  },
} satisfies ExportedHandler<Env>;
