# Checklist de lanzamiento y SEO — Farmacia Torrents

Documento operativo para llevar la web a producción y posicionarla en Google, Bing y motores de IA (ChatGPT, Perplexity, Claude, Gemini).

**Sitio:** https://farmaciatorrents.zpjstudio.com
**Stack:** Astro + Sanity (CMS)
**Última actualización:** mayo 2026

---

## Fase 0 — Checklist técnico antes de desplegar

Marcar antes de hacer push a producción.

- [ ] `SITE_URL` en `.env` apunta al dominio definitivo (actual: `https://farmaciatorrents.zpjstudio.com`). Si cambia el dominio, actualizar y rebuild.
- [ ] `pnpm build` se ejecuta sin errores (`pnpm astro check` + `pnpm build`).
- [ ] Probar en local con `pnpm preview` que se ven:
  - [ ] Home con Hero, Features, Servicios, About, FAQs, Contacto, Footer.
  - [ ] `/aviso-legal` carga con datos reales.
  - [ ] `/politica-privacidad` carga con datos reales.
  - [ ] `/robots.txt` muestra la URL real (no `farmaciatorrents.example`).
  - [ ] `/llms.txt` muestra horarios y servicios reales.
  - [ ] `/sitemap-index.xml` lista las páginas.
- [ ] [Rich Results Test](https://search.google.com/test/rich-results) detecta `Pharmacy` + `FAQPage` schemas.
- [ ] [PageSpeed Insights](https://pagespeed.web.dev) muestra Performance / Accessibility / Best Practices / SEO en verde (>90).

---

## Fase 1 — Contenido en Sanity (rellenar antes de lanzar)

Estos campos son los que más impactan en SEO y en cómo te muestran las IAs.

### 1.1. Campo `descripcionCorta` (meta description)

Elegir UNA de estas tres opciones y pegarla en Sanity → Farmacia → "Descripción corta":

- **Opción A (recomendada — branding + ubicación + servicios)**
  > Farmacia Torrents en el Eixample (Barcelona). Productos infantiles, dermocosmética, fórmulas magistrales y atención farmacéutica personalizada.

- **Opción B (foco familias)**
  > Tu farmacia de confianza en Barcelona. Especializados en salud infantil, dermocosmética y atención familiar cercana. Horario amplio L-D.

- **Opción C (más descriptiva, mejor para LLMs)**
  > Farmacia comunitaria en el Eixample (Barcelona). Asesoramiento farmacéutico, productos infantiles y cuidado integral para toda la familia.

- [ ] Pegada en Sanity y publicada.

### 1.2. Campo `imagenOg` (previsualización al compartir)

- [ ] Subir imagen JPG/PNG **1200×630 px**, sin transparencia, peso < 1 MB.
- [ ] Mostrar logo + foto representativa o composición de marca.
- [ ] Evitar texto pequeño (WhatsApp recorta).
- [ ] Verificar después en [opengraph.xyz](https://www.opengraph.xyz/) pegando la URL del sitio.

### 1.3. Imágenes del Hero y "Sobre nosotros"

- [ ] Subir 3-4 imágenes de calidad en **Imágenes principales (Hero)**.
- [ ] Subir 3-4 imágenes en **Imágenes "Sobre nosotros"** (diferentes a las del Hero).
- [ ] **En cada imagen, rellenar el campo "Texto alternativo (alt)"** con frases descriptivas:
  - Ejemplos para Hero: "Fachada de Farmacia Torrents en el Eixample", "Interior de la zona de pediatría", "Sección de dermocosmética".
  - Ejemplos para Sobre nosotros: "Equipo de farmacéuticos atendiendo a un cliente", "Zona de asesoramiento personalizado".

### 1.4. Bloque "Sobre nosotros"

- [ ] Título (las 2 últimas palabras salen resaltadas en azul). Ej.: "Una farmacia para familias".
- [ ] Años de experiencia (badge del número).
- [ ] Puntos destacados: 4-6 frases cortas con check verde.

### 1.5. Descripción larga (cuerpo del Sobre nosotros)

- [ ] Rellenar campo "Descripción larga" en Sanity (Portable Text).
- [ ] 2-3 párrafos con la historia/valores de la farmacia. Soporta `<strong>`, `<em>`, `<h2>`, `<h3>`.

### 1.6. FAQs

Mínimo 4, máximo 8. Si no tienes inspiración, copia/pega de aquí y ajusta a tus datos:

- [ ] **¿Cuál es el horario de Farmacia Torrents?** — Abrimos de lunes a viernes de 08:00 a 22:00 y los sábados y domingos de 09:00 a 22:00. Para atención fuera de horario, consulta el cuadrante de farmacias de guardia de Barcelona.
- [ ] **¿Dónde está ubicada la farmacia?** — Estamos en Carrer de Roger de Flor 166, en el Eixample de Barcelona (08013). Acceso fácil en metro (L4, Verdaguer) y autobús.
- [ ] **¿Hacéis guardias 24 horas?** — [Personalizar]. Para localizar la farmacia de guardia 24h más cercana, consulta el buscador del Colegio Oficial de Farmacéuticos de Barcelona o llama al 010.
- [ ] **¿Puedo recoger mi receta electrónica con la tarjeta sanitaria?** — Sí, atendemos recetas electrónicas del CatSalut y de otras comunidades. Trae tu tarjeta sanitaria. Si el medicamento no está disponible, lo encargamos para el día siguiente.
- [ ] **¿Ofrecéis asesoramiento sobre productos para bebés y niños?** — Sí, estamos especializados en salud infantil: alimentación, pañales, dermocosmética pediátrica, vitaminas, fiebre, cólicos del lactante y calendario de vacunación.
- [ ] **¿Tenéis servicio de fórmulas magistrales?** — [Personalizar]. Preparamos fórmulas magistrales bajo prescripción médica (dermatológicas, pediátricas, capilares). Plazo habitual: 24-48h.
- [ ] **¿Puedo pedir un medicamento si no lo tenéis en stock?** — Sí. Lo encargamos al mayorista y suele llegar al día siguiente laborable antes de las 10:00. Te avisamos por teléfono o WhatsApp cuando llegue.
- [ ] **¿Aceptáis pago con tarjeta, Bizum o solo efectivo?** — Aceptamos efectivo, tarjeta (Visa, Mastercard) y Bizum. También gestionamos el copago sanitario directamente con la tarjeta sanitaria.
- [ ] **¿Cómo puedo contactar sin pasar físicamente?** — WhatsApp al [tu número] para consultas rápidas. También por teléfono en horario de apertura y por email en [tu email].
- [ ] **¿Hacéis test rápidos o servicios sanitarios in situ?** — [Personalizar]: presión arterial, glucemia, colesterol, peso/IMC, test de embarazo, etc.

### 1.7. Limpieza del dataset

- [ ] En Sanity Studio, abrir la farmacia y eliminar el campo huérfano `geo` (botón "Remove field" en el aviso amarillo).
- [ ] Eliminar también la imagen antigua del campo `imagen` (ya no se usa, solo `imagenes`).

### 1.8. Horarios y servicios

- [ ] Verificar que **Horarios de apertura** en Sanity refleja la realidad (con la lógica de agrupación, lo que se muestra en la web depende 100% de lo que pongas aquí).
- [ ] Verificar que **Servicios** está completo (mínimo 4-6 servicios con icono, nombre y descripción corta).

---

## Fase 2 — Plan semanal SEO (5 días, 30-60 min al día)

### Lunes — Fundamentos de indexación

#### Google Search Console (15 min)

- [ ] Abrir [search.google.com/search-console](https://search.google.com/search-console).
- [ ] Click en "Añadir propiedad" → elegir tipo "Dominio" (no "Prefijo de URL").
- [ ] Introducir el dominio sin `https://` ni `/`.
- [ ] Verificar añadiendo un registro **TXT en el DNS** del proveedor del dominio. Ejemplo del valor: `google-site-verification=...`.
- [ ] Esperar 5-30 min y pulsar "Verificar".
- [ ] Una vez verificado, ir a **Sitemaps** → enviar `sitemap-index.xml`.
- [ ] Ir a **Inspección de URL** → pegar la URL principal → pulsar "Solicitar indexación".

#### Bing Webmaster Tools (10 min)

- [ ] Abrir [bing.com/webmasters](https://www.bing.com/webmasters).
- [ ] Iniciar sesión con cuenta Microsoft (crearla si no tienes).
- [ ] Añadir sitio.
- [ ] **Atajo recomendado:** "Import from Google Search Console" → autoriza una vez → todas las propiedades y sitemaps se importan automáticamente.
- [ ] Si no usas el atajo: verificar dominio (BingSiteAuth.xml o meta tag) y enviar `sitemap-index.xml`.
- [ ] **Importante para ChatGPT:** Bing es el backbone de ChatGPT Search. Este paso es el de mayor impacto en aparecer en ChatGPT.

---

### Martes — SEO local: Google Business Profile + Bing Places

#### Google Business Profile (45-60 min, +verificación postal de varios días)

- [ ] Abrir [business.google.com](https://business.google.com).
- [ ] Buscar el nombre de la farmacia. Si ya existe ficha (Google las crea automáticamente), pulsar **"Solicitar este negocio"**. Si no, crear ficha nueva.
- [ ] Datos a rellenar:
  - [ ] Nombre exacto: "Farmacia Torrents".
  - [ ] Categoría principal: **Farmacia**.
  - [ ] Categorías secundarias (hasta 9): Parafarmacia, Tienda de productos para bebés, Tienda de dermocosmética, etc.
  - [ ] Dirección completa.
  - [ ] Zona de servicio (radio o barrios cubiertos).
  - [ ] Teléfono + web + WhatsApp.
  - [ ] Horarios (incluyendo festivos especiales).
  - [ ] **Subir 10-15 fotos como mínimo**: fachada, escaparate, interior (varias zonas), equipo, productos destacados, logo.
  - [ ] Descripción del negocio (750 caracteres máximo). Reutiliza la descripción larga de Sanity adaptada.
  - [ ] Atributos: "Acceso para silla de ruedas", "Aparcamiento cercano", etc.
  - [ ] Activar mensajería desde Google.
- [ ] **Verificación**: Google enviará una postal con código a la dirección (5-15 días) o pedirá llamada/SMS. Esperar y verificar.
- [ ] Una vez verificada, **publicar el primer "Post"** (anuncio, novedad, campaña).

#### Bing Places (15 min)

- [ ] Abrir [bingplaces.com](https://www.bingplaces.com).
- [ ] **Atajo:** "Import from Google" → trae todos los datos de Google Business Profile en un clic.
- [ ] Verificar email/teléfono y publicar.
- [ ] Pocos negocios usan Bing Places → ventaja competitiva real en ChatGPT Search.

---

### Miércoles — Datos estructurados para IAs

#### Wikidata (30 min)

Las IAs (ChatGPT, Claude, Perplexity, Gemini) entrenan masivamente con Wikidata. Una entrada bien hecha aquí = te conocen aunque no crawleen tu web.

- [ ] Crear cuenta en [wikidata.org](https://www.wikidata.org).
- [ ] Pulsar "Create a new Item".
- [ ] Etiqueta: "Farmacia Torrents". Descripción: "farmacia comunitaria en Barcelona, España".
- [ ] Añadir las siguientes propiedades (statements):
  - [ ] `instance of` (P31) → `community pharmacy` (Q56038019) o `pharmacy` (Q108325).
  - [ ] `country` (P17) → `Spain`.
  - [ ] `located in administrative entity` (P131) → `Eixample`.
  - [ ] `coordinate location` (P625) → lat/lng exactos.
  - [ ] `street address` (P6375) → dirección completa.
  - [ ] `postal code` (P281) → 08013.
  - [ ] `phone number` (P1329) → con prefijo +34.
  - [ ] `official website` (P856) → URL.
  - [ ] `inception` (P571) → año de apertura si lo sabes.
- [ ] Guardar y publicar.

#### OpenStreetMap (15 min)

- [ ] Crear cuenta en [openstreetmap.org](https://www.openstreetmap.org).
- [ ] Buscar la dirección. Si la farmacia ya está marcada, editarla. Si no, crear nodo.
- [ ] Etiquetas (tags) clave:
  - [ ] `amenity=pharmacy`
  - [ ] `name=Farmacia Torrents`
  - [ ] `phone=+34 932 461 228`
  - [ ] `opening_hours=Mo-Fr 08:00-22:00; Sa-Su 09:00-22:00` (formato OSM)
  - [ ] `website=https://farmaciatorrents.zpjstudio.com`
  - [ ] `wheelchair=yes/no`
  - [ ] `addr:street`, `addr:housenumber`, `addr:postcode`, `addr:city`
- [ ] Guardar el changeset con un comentario tipo "Actualizo datos de farmacia local".

---

### Jueves — Directorios sectoriales y backlinks

Cada uno suma 15-30 min. Hacer los que apliquen.

- [ ] **Colegio Oficial de Farmacéuticos de Barcelona** ([cofb.cat](https://www.cofb.cat)) — verificar que la ficha pública del colegio está actualizada con web y teléfono.
- [ ] **Doctoralia** ([doctoralia.es](https://www.doctoralia.es)) — alta gratuita si el titular ofrece consulta farmacéutica.
- [ ] **Páginas Amarillas** ([paginasamarillas.es](https://www.paginasamarillas.es)) — añadir o actualizar ficha gratuita.
- [ ] **qdq.com** ([qdq.com](https://www.qdq.com)) — alta gratuita.
- [ ] **Trusted Shops / opiniones** (opcional, si os interesa recopilar reviews fuera de Google).
- [ ] **Local Cylex/Yelp** (rellena automáticamente desde GBP en muchos casos).

**Backlinks orgánicos** (no en un día, pero plantar la semilla):
- [ ] Contactar 3-5 webs locales (escuelas infantiles cercanas, centros de pediatría, blogs de maternidad de Barcelona) y proponer enlace mutuo o aparecer como "comercio recomendado".

---

### Viernes — Monitoreo y rutina

#### Probar visibilidad

Abrir ChatGPT, Perplexity y Claude (con búsqueda web activada en cada uno) y probar:

- [ ] "¿Qué farmacias hay en el Eixample de Barcelona?"
- [ ] "Farmacia con productos infantiles en Barcelona"
- [ ] "Farmacia Torrents Barcelona horario"
- [ ] "Farmacias abiertas hasta las 22 en Barcelona"

Anotar dónde apareces y dónde no. Si no apareces en ninguno todavía, **es normal** — la indexación tarda 1-4 semanas.

#### Configurar alertas

- [ ] **Bing Webmaster Tools** → activar notificaciones por email (errores de crawl, cambios de ranking).
- [ ] **Google Search Console** → activar emails de problemas críticos.
- [ ] **Google Alerts** ([google.com/alerts](https://www.google.com/alerts)) → crear alerta para "Farmacia Torrents Barcelona" para enterarte de menciones.

#### Establecer rutina

Crear recordatorio recurrente en el calendario:

- [ ] **Lunes cada semana — 15 min**: revisar Search Console (errores nuevos), responder reseñas Google.
- [ ] **Primer lunes del mes — 30 min**: publicar 1 post en Google Business Profile (campaña, novedad, consejo).
- [ ] **Cada 3 meses — 1 h**: auditar PageSpeed Insights y Rich Results Test, refrescar fotos en GBP, revisar FAQs en Sanity.

---

## Fase 3 — Rutinas recurrentes (después de la primera semana)

### Semanal (Lunes, 15 min)

- [ ] Search Console: revisar "Cobertura", errores nuevos, palabras clave principales.
- [ ] Google Business Profile: responder TODAS las reseñas (positivas con un "gracias", negativas con empatía y solución).
- [ ] Bing Webmaster Tools: revisar errores de crawl.

### Mensual (Primer lunes, 30 min)

- [ ] Publicar 1 post nuevo en Google Business Profile.
- [ ] Actualizar al menos 1 foto en GBP (las más recientes ganan visibilidad).
- [ ] Si hubo cambios en servicios/horarios, propagar a GBP, Wikidata, OSM y Sanity.

### Trimestral (1 vez cada 3 meses, 1 h)

- [ ] PageSpeed Insights + Rich Results Test.
- [ ] Revisar/ampliar FAQs en Sanity (basadas en preguntas reales recibidas).
- [ ] Revisar `descripcionCorta` y SEO de toda la web.
- [ ] Probar visibilidad en ChatGPT/Perplexity/Claude con búsquedas nuevas.

---

## Datos clave para tener a mano

| Recurso | URL |
|---|---|
| Sitio | https://farmaciatorrents.zpjstudio.com |
| Sitemap | https://farmaciatorrents.zpjstudio.com/sitemap-index.xml |
| robots.txt | https://farmaciatorrents.zpjstudio.com/robots.txt |
| llms.txt | https://farmaciatorrents.zpjstudio.com/llms.txt |
| Aviso legal | https://farmaciatorrents.zpjstudio.com/aviso-legal |
| Política de privacidad | https://farmaciatorrents.zpjstudio.com/politica-privacidad |
| Sanity Studio | (la URL de tu instalación de Studio) |

---

## Herramientas externas

| Servicio | URL | Coste | Cuándo |
|---|---|---|---|
| Google Search Console | search.google.com/search-console | Gratis | Lunes |
| Bing Webmaster Tools | bing.com/webmasters | Gratis | Lunes |
| Google Business Profile | business.google.com | Gratis | Martes |
| Bing Places | bingplaces.com | Gratis | Martes |
| Wikidata | wikidata.org | Gratis | Miércoles |
| OpenStreetMap | openstreetmap.org | Gratis | Miércoles |
| Rich Results Test | search.google.com/test/rich-results | Gratis | Verificación |
| PageSpeed Insights | pagespeed.web.dev | Gratis | Verificación |
| OpenGraph Preview | opengraph.xyz | Gratis | Verificación |
| Google Alerts | google.com/alerts | Gratis | Viernes |

---

## Notas finales

- **Tiempo total estimado**: 4-6 horas la primera semana, ~1 h/semana en mantenimiento.
- **Coste total**: 0 €.
- **Cuándo verás resultados**: Bing/ChatGPT empiezan a citarte en 1-4 semanas. Google Maps en 1-7 días si la verificación es rápida. SEO orgánico (búsquedas no marca) tarda 2-6 meses.
- **Lo más impactante para ChatGPT**: Bing Webmaster Tools + Wikidata + GBP. Si solo hay tiempo para 3 cosas, son estas.
- **Para revisar progreso**: cada 2 semanas, repetir las búsquedas en ChatGPT/Perplexity/Claude del viernes y comparar.
