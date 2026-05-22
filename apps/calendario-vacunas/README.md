# Calendario de Vacunación por CCAA

Mini-app standalone con los calendarios de vacunación de cada Comunidad Autónoma de España.
Construida con **Astro** (sitio estático) + **Sanity CMS** (free tier) para que el cliente
edite los calendarios desde un panel sin tocar código.

> Plan completo del proyecto: `~/.claude/plans/en-otro-chat-con-peaceful-bentley.md`

## Estructura

```
calendario-vacunas/
├── src/                  # Frontend Astro
│   ├── pages/            # Rutas: / (índice CCAA) y /[comunidad]
│   ├── components/       # Componentes Astro (grid, tabla, secciones)
│   ├── lib/sanity.ts     # Cliente Sanity + queries GROQ tipadas
│   └── styles/global.css
├── studio/               # Sanity Studio (panel del cliente)
│   ├── schemas/          # Modelo de datos (comunidad, vacuna, dosis, ...)
│   └── sanity.config.ts
├── seed/                 # Datos iniciales en NDJSON
│   ├── comun-estatal-2026.ndjson  # Calendario común CISNS
│   ├── cataluna-2026.ndjson       # Cataluña (ajustar antes de prod)
│   └── esqueletos-ccaa.ndjson     # 17 CCAA + Ceuta/Melilla vacías
├── astro.config.mjs
└── package.json
```

## Setup inicial (una sola vez)

### 1. Crear proyecto en Sanity

1. Crea cuenta gratis en https://www.sanity.io/.
2. Crea un proyecto nuevo (`Create project`). Apunta el `projectId` (formato `xxxxxxxx`).
3. En el panel del proyecto, ve a `API` → `CORS Origins` y añade `http://localhost:4321` y la URL de producción.

### 2. Variables de entorno

Crea `.env` en la raíz del proyecto:

```
PUBLIC_SANITY_PROJECT_ID=xxxxxxxx
PUBLIC_SANITY_DATASET=production
SANITY_STUDIO_PROJECT_ID=xxxxxxxx
```

### 3. Instalar dependencias

```bash
npm install
npm --prefix studio install
```

### 4. Importar datos iniciales

```bash
# Login una vez en Sanity CLI
npx --prefix studio sanity login

# Importar seeds (calendario común + Cataluña + esqueletos)
npm run seed
```

### 5. Desplegar Studio (panel del cliente)

```bash
npm run studio:deploy
# Te preguntará el hostname → usa algo como "farmacia-vacunas"
# Studio queda accesible en https://farmacia-vacunas.sanity.studio
```

Invita al cliente como editor desde el panel de Sanity (`Members` → `Invite`).

## Desarrollo local

```bash
# Frontend
npm run dev
# → http://localhost:4321

# Studio (en otra terminal)
npm run studio
# → http://localhost:3333
```

Editar en Studio + publicar → recargar Astro local refleja los cambios (vienen de la API CDN).

## Build y despliegue

```bash
npm run build
# → dist/ con el sitio estático
```

Deploy recomendado: **Vercel** o **Netlify** (gratis). Conecta el repo, indica el directorio
`apps/calendario-vacunas/` como root, comando `npm run build`, output `dist`.

### Webhook Sanity → redeploy automático

En el panel Sanity → `API` → `Webhooks` → `Create webhook`:
- URL: el `Deploy Hook` de Vercel/Netlify para este proyecto.
- Trigger on: `Create`, `Update`, `Delete`.
- Filter: `_type == "comunidad" || _type == "vacuna" || _type == "dosis" || _type == "enfermedad"`.

Resultado: cada vez que el cliente publique un cambio, el sitio se reconstruye en ~30s.

## Para el cliente

Ver `CLIENTE.md` con el mini tutorial paso a paso del Studio.
