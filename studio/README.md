# larokifarm-studio

Sanity Studio compartido entre los mini-proyectos de `larokifarm/`. Dos workspaces dentro del mismo proyecto Sanity (`yovi040n`):

| Workspace | Dataset | Usado por |
|---|---|---|
| `cima-chat` | `cima` | `widgets/cima-chat` |
| `calendario-vacunas` | `calendario` | `apps/calendario-vacunas` |

## Primer arranque (una sola vez)

```bash
cd studio
npm install

# Login en Sanity (la primera vez)
npx sanity login

# Preparar los dos datasets (cima + calendario)
# Sanity crea automáticamente "production" al hacer un proyecto.
# El plan free permite 2 datasets total, así que liberamos el slot de production.
npx sanity dataset delete production       # vacío, lo creó Sanity solo
npx sanity dataset create cima --visibility public
npx sanity dataset create calendario --visibility public
npx sanity dataset list                    # verificar que están y son public
```

> Si algún `delete`/`visibility` falla por la versión del CLI (3.x), entra en sanity.io/manage → proyecto → Datasets y haz la misma operación desde la UI en 30 segundos.

## Día a día

```bash
npm run dev          # studio local en http://localhost:3333
npm run build        # build de producción
npm run deploy       # despliega a {nombre}.sanity.studio
```

## Importar el seed inicial (una sola vez)

```bash
# Catálogo CIMA: 28 principios activos + 12 síntomas + 7 perfiles
node seed/build-cima.mjs   # regenera el NDJSON si modificas el script
npm run seed:cima

# Calendarios de vacunación
npm run seed:calendario
```

> ⚠️ Los comandos `seed:*` usan `--replace` en el primer fichero. Si el dataset ya tiene datos editados, **NO ejecutes seed** otra vez sin confirmar primero (borrarías el trabajo del cliente).

## Variable de entorno opcional

Si despliegas a otro proyecto Sanity sin tocar código:

```bash
SANITY_STUDIO_PROJECT_ID=otro_id npm run dev
```

Por defecto usa `yovi040n` (larokifarm).

## Estructura

```
studio/
├── sanity.config.ts        # 2 workspaces (cima-chat + calendario-vacunas)
├── sanity.cli.ts           # default dataset = cima
├── schemas/
│   ├── cima/               # síntomas, perfiles, principios activos
│   │   ├── sintoma.ts
│   │   ├── perfil.ts
│   │   ├── principioActivo.ts
│   │   └── index.ts
│   └── calendario/         # comunidad, vacuna, entrada, etc.
│       └── index.ts
└── seed/
    ├── build-cima.mjs      # regenera cima-initial.ndjson
    ├── cima-initial.ndjson
    ├── comun-estatal-2026.ndjson
    ├── cataluna-2026.ndjson
    └── esqueletos-ccaa.ndjson
```
