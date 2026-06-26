# Infraestructura confirmada — Conciliador de Albaranes (DigitalOcean)

> Documento de referencia para Claude Code. Define el VPS y los servicios contratados
> en DigitalOcean para el despliegue del conciliador multi-tenant.
> **Sustituye la sección 2 ("Stack recomendado") y la sección 5.4 ("Despliegue") del
> plan `conciliador-albaranes-MULTITENANT.md` en lo que se refiere a coste, BD y backups.**

---

## 1. Servicios contratados en DigitalOcean

| Servicio | Configuración | Precio |
|---|---|---|
| **Droplet** | Basic **Premium Intel**, 2 vCPU, **4 GB RAM**, **120 GB NVMe SSD**, 4 TB transfer | $32/mes |
| **Managed PostgreSQL** | Plan básico (1 GB RAM, 10 GB disk), 1 nodo, PostgreSQL 16 | $15/mes |
| **Droplet Backups** | Backups automáticos semanales del droplet (20% del precio del droplet) | $6/mes |
| **Spaces** | 250 GB de almacenamiento de objetos (S3-compatible) | $5/mes |
| **Backblaze B2** (off-site) | Backup cifrado de BD fuera de DigitalOcean | $1/mes |
| **TOTAL** | | **$59/mes** |

**Región:** Frankfurt (FRA1) — UE, cumple RGPD.
**Anual estimado:** $708.

---

## 2. Cambios respecto al plan original

Estas son las divergencias respecto a `conciliador-albaranes-MULTITENANT.md §2`:

### 2.1 Droplet: Premium Intel en lugar de Regular

- **Antes:** Basic Regular 4 GB / 80 GB SSD a $24/mes.
- **Ahora:** Basic Premium Intel 4 GB / **120 GB NVMe** a $32/mes.
- **Motivo:** la app no es BD-intensiva en el droplet (la BD vive fuera, en el Managed),
  pero sí procesa lotes grandes de PDFs y Excels en memoria y disco temporal.
  Premium Intel aporta **120 GB de disco** (vs 80 GB) para holgura de logs, imágenes
  Docker, uploads en curso y caché, además de **CPU algo más rápida** para acelerar
  el parseo de PDFs/XLSX antes de mandarlos a Gemini. Los $8/mes extra se justifican
  por margen operativo, no por velocidad de Postgres.

### 2.2 PostgreSQL: Managed en lugar de auto-hospedado

- **Antes:** PostgreSQL en el mismo droplet vía Docker Compose.
- **Ahora:** **Managed PostgreSQL de DigitalOcean** (servicio externo al droplet).
- **Motivo:**
  - El proyecto se traspasará al cliente. Managed elimina la carga de administrar
    Postgres al sucesor (backups, parches, versiones, vigilancia de disco).
  - Aislamiento de recursos: la BD no compite con la app por RAM/CPU del droplet.
  - Alta disponibilidad y backups diarios incluidos.
  - Sector farmacéutico: los datos de historial (lotes, caducidades, comparaciones)
    merecen una BD gestionada profesionalmente.

**Implicaciones para el código y el despliegue:**

- El servicio `postgres` desaparece del `docker-compose.yml` de producción.
- `DATABASE_URL` apunta al **pooler** del cluster Managed (puerto 25061, SSL obligatorio).
- **`DIRECT_DATABASE_URL`** apunta al endpoint directo (puerto 25060) — necesario para
  que `prisma migrate deploy` funcione (el pooler en modo Transaction no soporta los
  advisory locks que Prisma usa al migrar). Ver §5 y §6.
- Las migraciones se ejecutan con `prisma migrate deploy` al arrancar el contenedor.
- Las connection strings viven en `.env` del droplet (no commiteado) y se obtienen del
  panel de DigitalOcean → Databases → Connection details.
- Configurar **Trusted Sources** en el panel del cluster: añadir la IP del droplet
  como única fuente autorizada para conectar a la BD.
  **Atención operativa:** si se reaprovisiona el droplet (cambio de tamaño, región,
  recreación) la IP pública cambia y hay que actualizar Trusted Sources, si no la app
  no podrá conectar a la BD.
- Habilitar **connection pooling** del propio Managed (modo Transaction) y conectar
  Prisma al pooler para queries normales, al puerto directo solo para migraciones.

### 2.3 Backups: capas múltiples

**Tres capas que se complementan:**

1. **Managed PostgreSQL backups automáticos** (incluido en el plan $15)
   - Diarios, retención 7 días.
   - Restauración con un clic desde el panel.
   - Protege ante: corrupción reciente, error humano de las últimas 24h-7d.

2. **`pg_dump` semanal a Spaces** (coste $0 — cabe en el bucket ya pagado)
   - Cron en el host del droplet: `pg_dump → gpg (cifrado) → s3cmd put`.
   - Retención configurable (sugerido: 12 semanas).
   - Protege ante: necesidad de un punto de restauración más antiguo que los 7 días
     del Managed (p.ej. "el dashboard de uso lleva mal un mes y queremos comparar").

3. **Backblaze B2 off-site** (~$1/mes)
   - Mismo `pg_dump` semanal sube también a B2 con `restic`.
   - Protege ante el escenario raro pero real: DigitalOcean tiene un incidente grave
     en FRA1 *o* suspende la cuenta por un falso positivo. Sin esto, perderías
     droplet + BD + Spaces de golpe.

4. **DigitalOcean Droplet Backups** (semanales, $6/mes)
   - Backup del sistema y la configuración del droplet, no de los datos.
   - Permite restaurar el droplet completo si se rompe el sistema operativo.

**Resumen:** el Managed cubre el día a día, el `pg_dump` semanal extiende la ventana
temporal sin coste, y B2 te protege de quedarte sin nada si DigitalOcean falla.

---

## 3. Stack actualizado completo (reemplaza tabla §2 del MULTITENANT.md)

| Pieza | Elección | Notas |
|---|---|---|
| Framework | Next.js 15 (App Router) | Sin cambios respecto al plan original. |
| Runtime | Node.js 22 LTS en VPS | Sin cambios. |
| Auth | Auth.js v5 + bcrypt | Sin cambios. |
| **BD** | **PostgreSQL 16 Managed (DigitalOcean Databases)** | **Cambio.** No corre en el droplet. |
| ORM | Prisma 5 | Sin cambios. **Doble conexión**: pooler + directo (ver §5). |
| Storage de archivos | DigitalOcean Spaces (250 GB) | Sin cambios. Sirve también para `pg_dump` semanales. |
| Cifrado de API keys BYOK | `crypto.subtle` (AES-GCM) | Sin cambios. |
| Reverse proxy + TLS | Caddy 2 | Sin cambios. |
| Orquestación prod | Docker Compose (app + caddy) | **Cambio.** Sin servicio `postgres`. |
| **Orquestación dev** | **Docker Compose dev (app + postgres local)** | **Nuevo.** Ver §7. |
| **Backups BD** | **Managed (diarios) + pg_dump a Spaces (semanal) + B2 (off-site)** | **Cambio.** 3 capas. |
| **Backups droplet** | **DigitalOcean Backups semanales** | **Cambio.** En lugar de B2 para droplet. |
| Observabilidad | Logs `pino` → stdout → `docker logs` | Sin cambios. |
| Migraciones | `prisma migrate deploy` al arrancar | Sin cambios. Usa `DIRECT_DATABASE_URL`. |

---

## 4. `docker-compose.yml` ajustado (producción)

```yaml
services:
  app:
    build: .
    restart: unless-stopped
    environment:
      - DATABASE_URL=${DATABASE_URL}                 # pooler, puerto 25061
      - DIRECT_DATABASE_URL=${DIRECT_DATABASE_URL}   # directo, puerto 25060 (migraciones)
      - AUTH_SECRET=${AUTH_SECRET}
      - ENCRYPTION_KEY=${ENCRYPTION_KEY}
      - SPACES_ENDPOINT=${SPACES_ENDPOINT}
      - SPACES_KEY=${SPACES_KEY}
      - SPACES_SECRET=${SPACES_SECRET}
      - SPACES_BUCKET=${SPACES_BUCKET}
      - GEMINI_API_KEY=${GEMINI_API_KEY}
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 5s
      retries: 3
    networks: [internal]

  caddy:
    image: caddy:2-alpine
    restart: unless-stopped
    ports: ["80:80", "443:443"]
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy_data:/data
      - caddy_config:/config
    networks: [internal]

networks:
  internal:

volumes:
  caddy_data:
  caddy_config:
```

> Nota: ya no hay servicio `postgres` ni volumen `postgres_data` en producción.
> La BD vive en DigitalOcean Databases como servicio externo gestionado.

---

## 5. Variables de entorno (actualizar `env.ts` y `.env.example`)

```bash
# App
AUTH_SECRET=                  # openssl rand -base64 32
ENCRYPTION_KEY=               # 32 bytes base64 — AES-GCM para BYOK
GEMINI_API_KEY=               # key global por defecto

# Managed PostgreSQL (DO Databases) — DOS URLs
DATABASE_URL="postgresql://doadmin:PASS@db-pool-fra1-XXXXX.b.db.ondigitalocean.com:25061/defaultdb?sslmode=require"
# ↑ Connection POOL en modo Transaction (puerto 25061). Para queries normales del día a día.

DIRECT_DATABASE_URL="postgresql://doadmin:PASS@db-fra1-XXXXX.b.db.ondigitalocean.com:25060/defaultdb?sslmode=require"
# ↑ Conexión DIRECTA (puerto 25060). Para `prisma migrate deploy` (el pooler no
#   soporta los advisory locks que Prisma usa al migrar).

# Spaces (S3-compatible) — sirve para archivos del historial Y backups de BD
SPACES_ENDPOINT="https://fra1.digitaloceanspaces.com"
SPACES_KEY=
SPACES_SECRET=
SPACES_BUCKET="conciliador"

# Backblaze B2 (off-site backups)
B2_ACCOUNT_ID=
B2_APPLICATION_KEY=
B2_BUCKET="conciliador-backups"
RESTIC_PASSWORD=              # cifra los backups antes de subirlos
```

En `prisma/schema.prisma`:

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_DATABASE_URL")
}
```

`ACCESO_CLAVE` queda eliminado (sustituido por login con Auth.js).

---

## 6. Pasos de aprovisionamiento en DigitalOcean

Orden recomendado para que cuando Claude Code despliegue, todo esté listo:

1. **Crear Project** "Laroki — Conciliador" para agrupar los recursos.
2. **Crear Droplet** Basic Premium Intel 4GB/2vCPU/120GB en Frankfurt.
   - Ubuntu 22.04 LTS.
   - SSH key añadida.
   - Activar Backups en el mismo asistente (suma $6).
3. **Crear Managed Database PostgreSQL 16** en Frankfurt.
   - Plan básico 1 GB / 1 vCPU / 10 GB.
   - En "Trusted Sources" añadir el droplet creado.
   - Copiar **dos** connection strings:
     - La del **Connection Pool** (modo Transaction) → `DATABASE_URL`.
     - La **directa** → `DIRECT_DATABASE_URL`.
4. **Crear Spaces bucket** `conciliador` en Frankfurt.
   - Generar Spaces access keys (Settings → Spaces Keys).
5. **Crear cuenta Backblaze B2** + bucket `conciliador-backups`.
   - Generar Application Key con acceso solo a ese bucket.
6. **Apuntar el dominio** al droplet (A record).
7. **Configurar cron de backup semanal** en el host del droplet (no en contenedor):
   ```bash
   # Domingos 3:00 AM
   0 3 * * 0 /opt/conciliador/scripts/backup-db.sh
   ```
   El script hace `pg_dump → gpg` y sube a Spaces (con `s3cmd`) y a B2 (con `restic`).
8. **Desplegar** con `docker compose up -d --build`. Las migraciones se aplican solas
   al arrancar el contenedor.

---

## 7. Desarrollo local — Postgres en Docker (NO al Managed)

Para programar en local **no se conecta al Managed de producción** (consume conexiones
del pooler, riesgo de tocar datos reales, no funciona sin internet). En su lugar:

`docker-compose.dev.yml` en la raíz del proyecto:

```yaml
services:
  postgres-dev:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_USER: conciliador
      POSTGRES_PASSWORD: conciliador
      POSTGRES_DB: conciliador_dev
    ports: ["5432:5432"]
    volumes:
      - postgres_dev_data:/var/lib/postgresql/data

volumes:
  postgres_dev_data:
```

Flujo de desarrollo:

```bash
docker compose -f docker-compose.dev.yml up -d   # levanta Postgres local
pnpm prisma migrate dev                          # aplica migraciones a la BD local
pnpm dev                                          # arranca Next.js apuntando a localhost
```

`.env.local` (no commiteado):

```bash
DATABASE_URL="postgresql://conciliador:conciliador@localhost:5432/conciliador_dev"
DIRECT_DATABASE_URL="postgresql://conciliador:conciliador@localhost:5432/conciliador_dev"
# (en local los dos apuntan a lo mismo, no hay pooler)
```

---

## 8. Coste total resumen

```
Droplet Premium Intel 4GB        $32
Managed PostgreSQL 1GB           $15
DO Backups (droplet)              $6
Spaces 250 GB                     $5
Backblaze B2 (backup off-site)    $1
─────────────────────────────────────
TOTAL                            $59 / mes
                                $708 / año
```

**No incluye:** consumo de Gemini API (facturado aparte; cada negocio puede usar su
propia API key BYOK, o consumir la global como fallback).

---

## 9. Alertas operativas para el sucesor

Cosas a vigilar desde el panel de DigitalOcean cuando el proyecto se traspase:

- **Postgres `cache_hit_ratio`**: si baja del **99%** durante varios días, subir el
  plan del cluster a **2 GB RAM (~$30/mes)**. Es un upgrade en caliente, sin downtime.
  Probablemente no haga falta antes de 2 años con 5 farmacias.
- **Postgres disco usado**: subir cuando supere el **70%** de los 10 GB.
- **Droplet RAM/CPU**: si la app se queda corta, subir a 8 GB (~$48/mes).
- **Spaces almacenamiento**: alerta cuando supere **200 GB** (de los 250 incluidos);
  cada GB extra son $0.02/mes — no es urgente pero conviene vigilar.
- **Trusted Sources del cluster**: si la IP del droplet cambia tras un cambio de tamaño
  o región, actualizar inmediatamente o la app deja de poder conectar.

---

## 10. Lo que NO cambia del plan original

Para que quede claro qué partes del `MULTITENANT.md` siguen vigentes tal cual:

- **Modelo de datos Prisma** (§3): idéntico.
- **Roles y RBAC** (§4): idéntico.
- **Reorganización de carpetas** (§5.1): idéntica.
- **Cambios en `extraerAlbaran` y `/api/conciliar`** (§5.2): idénticos.
- **Pantallas nuevas** (§5.3): idénticas.
- **Fases de implementación** (§6): idénticas.
- **Verificación end-to-end** (§8): idéntica, ajustando que la BD es externa.
