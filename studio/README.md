# larokifarm-studio

Sanity Studio compartido entre los proyectos de `larokifarm/`. Dos workspaces dentro del mismo proyecto Sanity (`yovi040n`):

| Workspace | Dataset | Usado por |
|---|---|---|
| `cima-chat` | `cima` | `widgets/cima-chat` |
| `farmacias` | `calendario` | `apps/torrents`, `apps/chamarro` |

> El dataset sigue llamándose `calendario` por herencia histórica. Renombrarlo a `farmacias` es un cambio cosmético pendiente (`sanity dataset copy` + actualizar clientes de las apps).

## Primer arranque (una sola vez)

```bash
cd studio
npm install

# Login en Sanity (la primera vez)
npx sanity login

# Preparar los dos datasets
# Sanity crea automáticamente "production" al hacer un proyecto.
npx sanity dataset delete production       # vacío, lo creó Sanity solo
npx sanity dataset create cima --visibility public
npx sanity dataset create calendario --visibility public
npx sanity dataset list                    # verificar
```

## Día a día

```bash
npm run dev          # studio local en http://localhost:3333
npm run build        # build de producción
npm run deploy       # despliega a {nombre}.sanity.studio
```

## Importar el seed inicial (una sola vez)

```bash
# Catálogo CIMA: principios activos + síntomas + perfiles
node seed/build-cima.mjs   # regenera el NDJSON si modificas el script
npm run seed:cima
```

> ⚠️ `seed:cima` usa `--replace`. Si el dataset `cima` ya tiene datos editados, **NO** lo ejecutes otra vez sin confirmar primero.

## Variable de entorno opcional

Si despliegas a otro proyecto Sanity sin tocar código:

```bash
SANITY_STUDIO_PROJECT_ID=otro_id npm run dev
```

Por defecto usa `yovi040n` (larokifarm).

## Estructura

```
studio/
├── sanity.config.ts        # 2 workspaces (cima-chat + farmacias)
├── sanity.cli.ts           # default dataset = cima
├── structure.ts            # menú del workspace farmacias
├── schemas/
│   ├── cima/               # síntomas, perfiles, principios activos
│   ├── farmacias/          # farmacia, resenaGoogle, iconoLucide
│   ├── idiomas/            # catálogo de idiomas
│   └── lib/                # helpers (validaciones i18n, iconoLucide)
├── scripts/                # utilities de mantenimiento
├── migrations/             # migraciones de datos
└── seed/
    ├── build-cima.mjs
    └── cima-initial.ndjson
```
