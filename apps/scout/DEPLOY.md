# Deploy Scout en Vercel

Guía paso a paso para desplegar Scout (comparador de precios farmacéuticos) en Vercel.

## Requisitos previos

- Cuenta en Vercel (o de la organización).
- Repo en GitHub con el código actualizado (rama `main`).
- API keys en mano:
  - **`SCRAPER_API_KEY`** (obligatoria) — de https://scraperapi.com
  - **`GEMINI_API_KEY`** (obligatoria) — de https://aistudio.google.com/apikey

## 1. Pre-flight local

Antes de tocar Vercel, verificá 3 cosas:

```bash
# .env NO debe estar trackeado en git
git ls-files | grep -E "\.env$" && echo "⚠️ Falta ignorar .env" || echo "✅ OK"

# .gitignore debe cubrir .env
grep -E "^\.env" .gitignore

# Build local pasa sin errores
pnpm build
```

## 2. Login en Vercel

1. https://vercel.com/signup
2. Login con GitHub. Se recomienda usar la cuenta de la organización (`larokifarmdigital`)
   para que el proyecto quede bajo la marca del cliente.

## 3. Import Project

1. Dashboard → **Add New → Project**
2. **Import Git Repository** → seleccionar `larokifarmdigital/larokifarm`
3. Si es el primer proyecto, Vercel pide autorizar acceso al repo específico en GitHub.

## 4. Configure Project (⚠️ paso crítico)

Como es un monorepo, hay que apuntar bien la raíz del proyecto:

| Campo               | Valor                                    |
| ------------------- | ---------------------------------------- |
| Project Name        | `scout`                                  |
| Framework Preset    | Next.js (auto)                           |
| **Root Directory**  | **`apps/scout`** ← ⚠️ imprescindible     |
| Build Command       | dejar auto (`next build`)                |
| Install Command     | dejar auto (detecta `pnpm-lock.yaml`)    |
| Output Directory    | dejar auto (`.next`)                     |
| Node.js Version     | **22.x** (o última LTS)                  |

## 5. Environment Variables

Expandir **Environment Variables** antes de deployar:

| Key                | Value                        | Environments                     |
| ------------------ | ---------------------------- | -------------------------------- |
| `SCRAPER_API_KEY`  | tu key de ScraperAPI         | Production + Preview + Development |
| `GEMINI_API_KEY`   | tu key de Gemini             | Production + Preview + Development |

**Ojo**: Vercel encripta estas variables. Solo se ven en preview si activás
"Sensitive" (recomendado para producción).

## 6. Deploy

Click **Deploy**. Vercel:

1. Clona el repo (~10 s)
2. Corre `pnpm install` (~30 s)
3. Corre `next build` (~1-2 min)
4. Despliega en `scout-xxx.vercel.app`

**Tiempo total**: 2-3 minutos.

Si algo falla, Vercel muestra el log completo del build en tiempo real.

## 7. Verificación en producción

Abrí la URL desplegada y comprobá:

- [ ] Empty state muestra productos sugeridos.
- [ ] Buscar **"Fisiocrem Gel Forte 50 ml"** devuelve resultados reales.
- [ ] Dark / light / system toggle funciona en el header.
- [ ] En móvil Chrome: botón "Escanear" abre la cámara.
- [ ] Historial se guarda al buscar → click en item del historial muestra el reporte
      con banner "Precios guardados en tu navegador".
- [ ] En Chrome móvil: menú → "Instalar app" (PWA).

Si una búsqueda dispara `timeout`, revisá **Deployments → Function Logs**.

## 8. Custom domain (opcional)

Cuando el cliente tenga su dominio (ej. `scout.torrent.es`):

1. Project → **Settings → Domains**
2. Añadir el dominio.
3. Vercel devuelve 1 registro DNS (CNAME o A) para configurar en el proveedor de DNS.
4. En 5-15 min queda listo con SSL automático (Let's Encrypt).

## 9. Auto-deploy con git

Ya está activo por defecto:

- **Push a `main`** → auto-deploy a producción.
- **Pull Requests** → preview URLs automáticos (útil para mostrar cambios al cliente).
- **Rollback** en 1 click desde el dashboard.

## 10. Speed Insights + Analytics (opcional, gratis)

Ambos se activan con 1 click en el dashboard:

- **Analytics** → tráfico y user agents.
- **Speed Insights** → Core Web Vitals (LCP, CLS, INP).

## Tiers de Vercel

| Tier        | Coste     | Timeout server actions      | Uso comercial permitido |
| ----------- | --------- | --------------------------- | ----------------------- |
| Hobby       | Free      | 60 s (con `maxDuration=60`) | ❌ No                    |
| Pro         | $20/mes   | Hasta 300 s                 | ✅ Sí                    |
| Enterprise  | Custom    | Personalizado               | ✅ Sí                    |

**Nota**: para uso facturable a un cliente, técnicamente hay que estar en Pro.
Empezá en Hobby para validación, migrá a Pro cuando el cliente firme.

## Problemas típicos

| Síntoma                              | Causa                            | Fix                                        |
| ------------------------------------ | -------------------------------- | ------------------------------------------ |
| Build error `Cannot find module '@/…'` | Root directory mal setteado      | Verificar Root = `apps/scout`              |
| Página blanca                        | Falta `SCRAPER_API_KEY`          | Settings → Env Vars → Redeploy             |
| Búsqueda timeout                     | Vercel cortó a 10 s              | Ya arreglado con `maxDuration=60` en `page.tsx` |
| CIMA dice "no encontrado" pero CN existe | Producto de parafarmacia         | Comportamiento esperado (CIMA solo cubre medicamentos regulados) |
| Escáner no funciona                  | Navegador sin `BarcodeDetector`  | Manejado: se muestra mensaje "usá Chrome/Edge" |

## Configuración clave del proyecto

- `apps/scout/src/app/page.tsx` — declara `maxDuration = 60` para evitar el timeout
  de 10 s por defecto de Vercel Hobby en las server actions.
- `apps/scout/public/manifest.webmanifest` — para que la app sea installable como PWA.
- `apps/scout/next.config.ts` — sin ajustes especiales; usa turbopack por defecto.

## Contacto de emergencia

- **ScraperAPI status**: https://status.scraperapi.com
- **Vercel status**: https://www.vercel-status.com
- **Google Gemini status**: https://status.cloud.google.com

## Estimación de créditos ScraperAPI por búsqueda

- Búsqueda estándar (1 producto): ~75-150 créditos.
- Con free tier (5.000/mes): ~30-60 búsquedas al mes.
- Con Hobby ($49/mes, 100.000 créditos): ~600-1300 búsquedas al mes.
