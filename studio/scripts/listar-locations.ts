/**
 * Lista las cuentas y locations de Google Business Profile accesibles con el
 * `refresh_token` configurado. Sirve para encontrar el `googleLocationName`
 * (formato `accounts/X/locations/Y`) que hay que pegar en cada doc `farmacia`
 * de Sanity en el campo "Google Business Profile · Resource name".
 *
 * Uso:
 *   GOOGLE_CLIENT_ID=... GOOGLE_CLIENT_SECRET=... GOOGLE_REFRESH_TOKEN=... \
 *     pnpm exec sanity exec scripts/listar-locations.ts --with-user-token
 *
 * (No usa Sanity, pero `sanity exec` carga el runtime y permite ejecutar TS
 * directo sin instalar nada más).
 */

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN;

if (!CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN) {
  console.error(
    'Faltan variables. Define GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET y GOOGLE_REFRESH_TOKEN ' +
      'antes de ejecutar.',
  );
  process.exit(1);
}

async function obtenerAccessToken(): Promise<string> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: CLIENT_ID!,
      client_secret: CLIENT_SECRET!,
      refresh_token: REFRESH_TOKEN!,
      grant_type: 'refresh_token',
    }),
  });
  if (!res.ok) {
    throw new Error(`refresh_token falló: ${res.status} ${await res.text()}`);
  }
  const data = (await res.json()) as { access_token?: string };
  if (!data.access_token) throw new Error('respuesta sin access_token');
  return data.access_token;
}

interface Account {
  name: string;
  accountName?: string;
  type?: string;
}

interface Location {
  name: string;
  title?: string;
}

async function listarCuentas(token: string): Promise<Account[]> {
  const cuentas: Account[] = [];
  let pageToken: string | undefined;
  do {
    const url = new URL('https://mybusinessaccountmanagement.googleapis.com/v1/accounts');
    if (pageToken) url.searchParams.set('pageToken', pageToken);
    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      throw new Error(`accounts.list → ${res.status} ${await res.text()}`);
    }
    const data = (await res.json()) as { accounts?: Account[]; nextPageToken?: string };
    if (data.accounts) cuentas.push(...data.accounts);
    pageToken = data.nextPageToken;
  } while (pageToken);
  return cuentas;
}

async function listarLocations(token: string, accountName: string): Promise<Location[]> {
  const locations: Location[] = [];
  let pageToken: string | undefined;
  do {
    const url = new URL(
      `https://mybusinessbusinessinformation.googleapis.com/v1/${accountName}/locations`,
    );
    url.searchParams.set('readMask', 'name,title');
    url.searchParams.set('pageSize', '100');
    if (pageToken) url.searchParams.set('pageToken', pageToken);
    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      // Si la cuenta no tiene locations devuelve 200 con lista vacía; un 403/404
      // suele indicar permisos insuficientes en esa cuenta concreta.
      const body = await res.text();
      console.error(`  ✖ locations.list en ${accountName}: ${res.status} ${body.slice(0, 200)}`);
      return locations;
    }
    const data = (await res.json()) as { locations?: Location[]; nextPageToken?: string };
    if (data.locations) locations.push(...data.locations);
    pageToken = data.nextPageToken;
  } while (pageToken);
  return locations;
}

async function main() {
  console.log('→ Obteniendo access_token…');
  const token = await obtenerAccessToken();

  console.log('→ Listando cuentas accesibles…\n');
  const cuentas = await listarCuentas(token);
  if (cuentas.length === 0) {
    console.log(
      'Ninguna cuenta accesible con este refresh_token. ¿La cuenta de OAuth está añadida como ' +
        'Gestor/Propietario en alguna ficha de Google Business Profile?',
    );
    return;
  }

  for (const cuenta of cuentas) {
    console.log(`Cuenta: ${cuenta.name}  (${cuenta.accountName ?? '—'}, type=${cuenta.type ?? '—'})`);
    const locs = await listarLocations(token, cuenta.name);
    if (locs.length === 0) {
      console.log('  (sin locations accesibles)');
    } else {
      for (const l of locs) {
        // l.name aquí viene como "locations/Y" — la concatenamos con la cuenta
        // para formar el "accounts/X/locations/Y" que pide el schema Sanity.
        const resourceName = l.name.startsWith('accounts/')
          ? l.name
          : `${cuenta.name}/${l.name}`;
        console.log(`  · ${resourceName}  "${l.title ?? '(sin título)'}"`);
      }
    }
    console.log('');
  }

  console.log(
    'Copia el `accounts/X/locations/Y` que corresponda a cada farmacia y pégalo en\n' +
      'Sanity Studio → Farmacia → Reseñas → "Google Business Profile · Resource name".',
  );
}

main().catch((err) => {
  console.error('Falló:', err);
  process.exit(1);
});
