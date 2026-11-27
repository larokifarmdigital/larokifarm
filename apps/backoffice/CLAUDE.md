# Backoffice larokifarm — contexto para Claude Code

Este archivo se carga automáticamente cuando el CWD está dentro de
`apps/backoffice`. Léelo primero en cualquier sesión nueva antes de tocar
archivos — evita re-leer las 500-1000 líneas del editor solo para orientarse.

## Stack

- **Next.js 16** (App Router) · **React 19** · **Tailwind v4**
- **pnpm** (nunca npm — dev server: `pnpm --filter backoffice dev` en `:3001`)
- **Radix UI** (Dialog, Popover, Tooltip, DropdownMenu, Tabs, Select, Switch, Slot)
- **Motion 13** (`import { motion, AnimatePresence } from 'motion/react'`)
- **Tiptap 2** para rich text i18n (Portable Text equivalent en storage: HTML por locale)
- **@dnd-kit** para drag-to-reorder
- **@phosphor-icons/react** — todos los iconos van vía `<NavIcon name="..." />`
- **next-auth v5** (adoptado de conciliador-albaranes)
- Login: usuarios reales de la tabla `users` (Neon compartida). No hay credenciales demo

## Paleta y DNA visual (actualizado 20-11-2026)

Todo en `src/app/globals.css` como CSS vars (`@theme`):
- **Fondo** `--color-bg #F4F7FB` (azul muy claro) · superficies `--color-surface`
  (blanco), `--color-surface-2 #EEF3F9`, `--color-surface-sunken #E4ECF4`.
- **Texto** `--color-ink #0B1829` · `--color-muted #5B6B82` · `--color-muted-2
  #5F6E85` (≥4,5:1 en todos los fondos; antes #8A98AE daba 2,6:1).
- **Acento** `--color-accent #1265b5` (azul) para acciones principales.
- **Tipo**: Gilroy (sans) + Geist Mono (`.font-mono-tabular`).
- **Capas CSS**: los estilos de componente (`.field`, `.card`, `.label`,
  `.chip`…) van DENTRO de `@layer components`, para que las utilidades de
  Tailwind que se les pasan manden. Fuera de capa pisaban `pl-9`/`pr-11` (la
  lupa tapaba el texto del buscador). El cursor de mano global y el anillo
  `:focus-visible` global están en `@layer base` (Tailwind v4 quitó el cursor
  de los `<button>`; fuera de capa, el anillo pisaba `focus-visible:*`).
- **Borde de controles** `--color-control-border #8294AB` (3,1:1, WCAG 1.4.11)
  para `.field` y chips; `--color-hairline*` solo para separadores decorativos.
- **Logo**: único sitio en `shared/components/atoms/BrandMark` (provisional).
- **Soporte**: `NEXT_PUBLIC_SUPPORT_EMAIL` (`shared/lib/support.ts`). Si no
  está definido, los enlaces de ayuda no se muestran.

## Estructura de carpetas (skill `nextjs-conventions`)

```
src/
├── app/            SOLO routing. Pages finas: params → View de la feature
├── core/           BACKEND por dominio (domain / application / infrastructure)
│   ├── shared/     Locale, LOCALES, LOCALE_LABELS, MultilangText, SaveResult
│   ├── auth/       Usuario · getCurrentUser/requireUser · Auth.js (authjs.ts
│   │               + authjs.config.ts ligero para src/proxy.ts)
│   ├── farmacias/  modelos (Farmacia, Servicio…), ports FarmaciaRepository +
│   │               ContentImageRepository, adapters Prisma/mock, use cases
│   │               (CreateFarmacia, Upload/Delete/Reorder/GetContentImage…)
│   └── storage/    StorageRepository + StorageR2/StorageLocal + getStorage()
├── features/       FRONTEND por pantalla: ui/{views,components,context,lib} + actions/
│   ├── farmacias/  lista, wizard y editor (ver abajo) · actions finas → core
│   ├── auth/  shell/  conciliador/  scout/  admin/
│   └── <x>/index.ts  API pública: lo que importan las pages
└── shared/         sin negocio: components/{atoms,molecules,templates},
                    lib/ (cn, format, slugify, sleep, prisma, iconCatalog), types/
```

Reglas:
- **Una carpeta por componente** con su `index.ts` (`Button/Button.tsx` +
  `index.ts`). Los subcomponentes privados viven dentro de la carpeta del
  padre (ej. `FarmaciasList/FarmaciasTable.tsx`) y no se exportan.
- **Cross-core solo por barrel** (`@/core/auth`, nunca `@/core/auth/application/…`).
  Grafo: shared ← auth ← farmacias → storage. Excepción documentada:
  `src/proxy.ts` (antes middleware, Next 16) importa
  `@/core/auth/infrastructure/authjs.config` directo para no cargar Prisma
  en cada petición. Debe ser `export default` (Next lo analiza estáticamente).
- **Client components**: tipos/valores de dominio desde `@/core/farmacias/domain`
  o `@/core/shared`. NUNCA `@/core/farmacias` (barrel server-only, arrastra Prisma).
- **Use cases solo donde hay lógica**. Listar/obtener/guardar/publicar/duplicar/
  archivar llaman directo a `getFarmaciaRepository()` (flag `USE_NEON_CONTENT`).
- **Naming**: dominio en español (calca los fields del antiguo Sanity — excepción del
  skill `naming-conventions`); carpetas estructurales y utils en inglés.

## Arquitectura del editor de farmacia

Todo en `src/features/farmacias/ui/components/editor/`, agrupado en
`navigation/` (TopBar, SectionSidebar, SectionPicker, SectionSheet,
SectionTitle, SectionSwitcher, MobileActionBar, ActionButtons), `status/`
(AutosaveIndicator, PublicacionEstado, EditorHealthChip, LocaleChip),
`fields/` (Multilang*, LangTabs, Tiptap, ImageGalleryField, HorarioSemanal,
TextosCabeceraFields, FilaLista + CabeceraColapsable, IconoField, FieldPreview)
y `sections/` (los *Tab). Estado en `ui/context/EditorContext.tsx`; secciones
en `ui/lib/sectionsConfig.ts`; i18n en `ui/lib/i18nStatus.ts`.

### Secciones (fase 4, 20-11-2026)
| Grupo | Sección (clave = hash) | Contenido |
|---|---|---|
| Tu farmacia | Horario (`horario`, entrada por defecto) | `HorarioTab` → horario semanal |
| Tu farmacia | Contacto y dirección (`general`) | nombre, titular, colegiado, logo, contacto, redes, dirección, Google Maps · bloque **Solo administrador**: identificador (cambio en modal) y mapa insertado |
| Tu farmacia | Idiomas de la web (`idiomas`) | idiomas activos, % traducido, añadir/desactivar/eliminar textos |
| Portada | Portada (`hero`) | etiqueta, frase principal, frase de apoyo, fotos, tarjetas sobre la foto (máx. 3) |
| Portada | Puntos fuertes (`features`) | tarjetas (máx. 6; reloj sin descripción = horario) |
| Contenido | Quiénes somos (`sobre`) | historia (Tiptap), fotos, puntos destacados, cabecera plegada |
| Contenido | Servicios (`servicios`) | lista primero, cabecera plegada |
| Contenido | Preguntas frecuentes (`faqs`) | lista primero, cabecera plegada |
| Contenido | Reseñas (`resenas`) | interruptor encima de los idiomas, reglas, mostrar/ocultar cada reseña, enlace Google (identificador GBP solo admin), cabecera plegada |
| Avanzado | Textos legales (`legal`) | aviso legal + privacidad (Tiptap i18n) |
| Avanzado | Google y redes sociales (`seo`) | título/descripción en Google + vista previa + imagen al compartir |
| Avanzado | Chat de medicamentos (`chat`, **solo SUPER_ADMIN**) | widget cima-chat: mostrar sí/no, posición, color (aviso si el blanco no llega a 4,5:1), nombre y logo de la cabecera, «Disponible» del inventario + vista previa |

Las claves no cambiaron: los hash antiguos (`#hero`, `#seo`…) siguen valiendo.

**Ciudad**: un solo campo, en la dirección. Al escribir se guardan a la vez
`direccion.ciudad` (lo que lee la web: `publicContent` usa `direccion.ciudad ??
ciudad`) y `ciudad` (lista y buscador del backoffice).

### Estado y publicación
- Dos ejes en la cabecera: **¿guardado?** (`AutosaveIndicator`: Guardando… /
  Guardado / No se ha podido guardar · Reintentar) y **¿en la web?**
  (`PublicacionEstado`: Publicada y al día / Cambios sin publicar / Sin
  publicar). `pendientePublicar` = `dirty || tieneCambiosSinPublicar(f)`
  (`updatedAt > ultimaPublicacion + 60 s`; `ultimaPublicacion` = `lastPublishedAt`,
  solo lectura).
- "Publicar cambios" (accent) solo aparece si hay algo que publicar; si no,
  "Ver mi web". Barra inferior móvil: estado + UNA acción de 44 px.
- `EditorHealthChip` = solo traducciones ("Faltan N traducciones"), oculto si la
  web tiene un idioma.

### Idiomas (catálogo cerrado, 21-11-2026)
- Catálogo en `core/shared/domain/i18n.ts` (`LOCALES`): es, en, ca, fr, de,
  it, pt, eu, gl (orden = el de la API pública; es/en/ca primero). Castellano
  = `LOCALE_PRINCIPAL`: raíz de la web, reserva y no se desactiva. Añadir un
  idioma al catálogo = también `apps/<landing>/src/i18n/<código>.json` y
  `LOCALES_DISPONIBLES` de cada landing (sus textos fijos).
- Sección **"Idiomas de la web"** (`#idiomas`, grupo Tu farmacia,
  `sections/IdiomasTab`): tabla (Idioma · Estado · Traducido · ⋯; en móvil,
  lista) con Principal / En la web / Desactivado ·
  textos guardados y % traducido (`resumenIdiomas` en `ui/lib/i18nStatus.ts`).
  Menú ⋯: Traducir/Revisar · Desactivar (activos) · Activar · Eliminar sus
  textos (solo desactivados). "Añadir idioma" → Modal con Select del catálogo.
- Acciones en `features/farmacias/actions/idiomasActions.ts`:
  `activarIdiomaAction`, `desactivarIdiomaAction`, `eliminarTraduccionesAction`.
  SUPER_ADMIN y responsable (manager) de esa farmacia; USER no. Tenant y
  permiso los vuelve a comprobar el repo; control optimista con `updatedAt`.
  Eliminar borra el idioma de todos los textos (`patchSinIdioma`, en
  `core/farmacias/application/idiomas.ts`) y del alt de las fotos. El
  autoguardado rechaza `idiomasActivos`.
- `LangTabs`: SOLO idiomas activos + botón "Gestionar idiomas" (→ #idiomas).
  Pulsar una pestaña nunca escribe. Con solo castellano: frase "Tu web está
  solo en castellano · Añadir otro idioma". Punto rojo = a ESTA sección le
  falta traducir. Chips/contadores con código (`LOCALE_CODIGO`), sin banderas.
- **Sugerir traducción (IA)**: `fields/SugerirTraduccion` bajo
  `MultilangInput`/`MultilangTextarea`/`TiptapField` (props `origen` +
  `locale`) cuando se edita un idioma ≠ castellano y hay texto en castellano.
  Borrador con "Usar esta traducción" / "Descartar"; nunca guarda sola.
  Servidor: `sugerirTraduccionAction` (`actions/traduccionActions.ts`) →
  `traducirTexto` (`core/farmacias/application/traducir.ts`, gemini-2.5-flash
  por fetch). Respeta el presupuesto mensual del conciliador (bloqueado =
  mensaje), clave Gemini del negocio o `GEMINI_API_KEY`, límite 40 por usuario
  cada 10 min (en memoria), HTML saneado. El coste va al log
  (`{evento:'traduccion', costeUsd…}`).
- Cambiar de idioma también funciona en solo consulta: `BotonIdioma` se pinta
  como `div role=button` cuando el editor está dentro del `fieldset disabled`.

### Solo consulta (USER)
- Editor dentro de `<fieldset disabled>`. Las filas de las listas (`FilaLista`)
  se abren igual para LEER (div role=button "Ver") y el `Modal` recibe
  `soloLectura`: campos desactivados, aviso "Solo consulta", pie solo "Cerrar",
  cuerpo enfocable. Títulos sin "Editar" ("Servicio", "Pregunta frecuente"…).

### Listas (servicios, preguntas, puntos fuertes, tarjetas, puntos)
- `FilaLista`: toda la fila abre Editar; escritorio = asa + Editar + Eliminar
  (32 px); móvil = menú "⋯" de 44 px con Editar / Subir / Bajar / Eliminar.
  Al añadir: va al final, se resalta y sale un aviso. Al máximo: texto
  explicativo en vez de botón desactivado.
- Modales: nombre/descripción primero; icono compacto (`IconoField`, nombres en
  castellano); enlace del servicio en "Opciones avanzadas".

### Permisos en el servidor (`saveFarmaciaPatchAction`)
- `slug`, `mapaUrl`, `googleLocationName`, `chat`: solo SUPER_ADMIN.
- Secciones con `soloAdmin` en `sectionsConfig.ts` (hoy `chat`): fuera de la
  navegación (`gruposVisibles`) y el hash `#chat` no las abre (`puedeVerSeccion`).
- `idiomasActivos`: solo con `activarIdiomaAction`.
- Publicar valida en el servidor (`PublishFarmaciaUseCase`); el menú de la lista
  ya no publica: "Abrir para publicar" lleva al editor.
- Rutas por rol (QA 20-11-2026): `/farmacias` es la lista del admin; el
  personal con UNA farmacia va a SU editor y con VARIAS ve la lista de las
  suyas ("Mis webs", sin archivar/eliminar/duplicar); `/farmacias/nueva`,
  `/admin/uso`, `/ajustes` e `/inventario` redirigen a `/inicio` si no eres
  SUPER_ADMIN. `/scout` va por módulo (abajo).
- Solo consulta (USER): `fieldset disabled` + Tiptap no editable
  (`aria-readonly`, sin barra) + sin "Empezar con un horario típico".

### Módulos por usuario (24-11-2026)
- Columna `users.modules` (`AppModule[]`: CONCILIADOR, COMPARADOR; migración
  `20261124100000_user_modules`, ya ejecutada en Neon). Los usuarios que había
  recibieron CONCILIADOR; los nuevos empiezan sin ninguno.
- SUPER_ADMIN los tiene TODOS sin casillas. Decisión única:
  `tieneModulo` (`core/shared/domain/modulos.ts`) / `usuarioTieneModulo(user, m)`.
- Servidor, leyendo la BD (efecto inmediato): pages con
  `requireModulo('conciliador'|'comparador')` (en cada page, no en el layout);
  APIs con `puedeUsarModulo(userId, m)` → 403 (`/api/conciliar`, `/api/files`,
  reportes). Menú (`requiresModulo` en `navConfig`) e Inicio usan la sesión
  (JWT con `modules`, se relee cada 5 min).
- Ajustes → Usuarios: casillas "Módulos que puede usar" en `CuentaDialog`
  (con rol Administrador, solo un texto). El log de `editar` anota los cambios.

### Sin roles que elegir (24-11-2026, decisión de gestión)
- Hay UNA sola cuenta de administración (SUPER_ADMIN, gestión). El servidor
  (`UserAccountsService`) rechaza crear otra o cambiar el tipo de una cuenta
  (`SOLO_UN_ADMIN`). En el modal, la cuenta de administración solo cambia de
  nombre.
- El resto es personal de farmacia: farmacias + "Qué puede hacer" =
  "Editar la web de su farmacia" (se guarda como el rol de siempre: marcada =
  BUSINESS_ADMIN/manager, sin marcar = USER/viewer; sin migración) + módulos.
- **La web es "editarla o nada"** (25-11-2026): sin "Editar la web" (rol
  viewer) no hay web en el backoffice: fuera del menú, sin tarjeta en Inicio y
  `/farmacias` y el editor redirigen a `/inicio` (`veLaWeb` en
  `core/auth/domain/models/Usuario.ts`). Inicio enseña solo sus módulos
  (tarjeta «Precios» si tiene el comparador) o "Todavía no tienes nada
  activado". El modo solo consulta del editor queda sin uso.
- Todo el personal de una farmacia ve TODAS sus conciliaciones
  (`scopeFromSession` devuelve `business` también para USER; el tipo
  `user` queda sin uso).
- Tabla de Usuarios: columna y filtro "Qué puede hacer" ("Editar web ·
  Albaranes · Precios", "Administración").

### Usuarios con varias farmacias (21-11-2026)
- Tabla `user_businesses` (PK userId+businessId). Mismo rol en todas.
  `users.businessId` sigue siendo la **farmacia principal** (la usa el
  conciliador antiguo): al cambiar la lista se conserva si sigue en ella; si
  no, pasa a ser la primera (o null).
- Sesión: el JWT lleva `businessIds` (se relee cada `AUTH_RECHECK_MS`; tokens
  antiguos sin el campo se releen ya). Permiso SIEMPRE con
  `puedeAccederFarmacia(session, id)` / `puedeAccederFarmaciaUsuario(user, id)`
  (`core/shared` / `core/auth`); nunca comparar `businessId ===` a mano.
  Scope: `{kind:'business'|'user', businessIds}` → `businessId: { in }`.
- `/api/conciliar?farmacia=<id>`: obligatoria si lleva varias; la pertenencia
  se comprueba contra la BD (`farmaciasActualesDe`), no contra el JWT.
- UI con varias: Select "Farmacia" obligatorio en Nueva conciliación (cada una
  con su límite mensual); filtro y columna "Farmacia" en el historial; Inicio
  con "Tus webs"; Ajustes → Usuarios con casillas "Farmacias que lleva".
- Nueva farmacia: el responsable puede ser cualquier usuario activo no
  administrador; la farmacia se le SUMA a las que ya lleva.

### Foco y listas
- `Modal`: el foco empieza en el primer campo del formulario y al cerrar vuelve
  al disparador; si ya no existe, a la fila recién añadida
  (`data-foco-tras-modal`) o al título de la sección (`data-titulo-seccion`).
- `EditorContext` conserva los ids locales de servicios/preguntas/puntos
  fuertes tras guardar (el servidor los reescribe): si no, las filas se
  volvían a montar y el teclado perdía el foco en cada autoguardado.

### Componentes UI reutilizables (en `src/shared/components/{atoms,molecules}/`)
- **`Button`** — variantes `primary`, `secondary`, `ghost`, **`accent`** (azul,
  la acción principal), `danger`, `link`. En móvil todos miden 44 px de alto.
- **`IconInput`** — input con icono; el anillo de foco va en el propio input.
- **`Switch`** — 44 px de zona táctil en móvil (carril visible 38×22).
- **`TimePicker`**, **`SectionHeader`**, **`LabelHelpIcon`** (44 px en móvil),
  **`Label`**, **`Modal`** (cerrar 44 px en móvil), **`IconPicker`**,
  **`ConfirmDialog`**.
- `.field` en móvil: `min-height: 44px` y 16 px de letra (iOS no hace zoom).
- **`Select`** (`shared/components/atoms/Select`, Radix) es el ÚNICO desplegable:
  **prohibido `<select>` nativo** (opciones sin estilo y flecha distinta en
  cada navegador). Admite `id` (para `<label htmlFor>`), `aria-describedby`,
  `aria-invalid`, `required`, opción con `value: ''` (se mapea internamente),
  `description` (segunda línea) y `disabled` por opción, `value` controlado o
  `defaultValue`, y `name` → `<input type="hidden">` (FormData/useActionState).
- **Ajustes → Usuarios**: tabla en escritorio (Usuario · Farmacia · Rol ·
  Estado · Acciones) y tarjetas en móvil; filtros farmacia/rol/estado
  combinables (estado por defecto "Todos": los desactivados van al final).

### Patrones de listas de gestión (21-11-2026, iguales en todo el backoffice)
- **Historial en tabla** (xl+, dentro de una región `overflow-x-auto` como red
  de seguridad): mismo `thead` que Usuarios/Farmacias, SIN agrupar por día
  (decisión del usuario 21-11-2026: casi cada día tenía una sola fila) →
  columna **Fecha** "Hoy · 11:14" / "Ayer · 09:52" / "Jue 19 nov · 11:14"
  (`fechaFila` en `ui/lib/historial.ts`, hora de Madrid). Cada fila tiene UN
  enlace (el proveedor, con la fecha larga en `sr-only`) estirado a toda la
  fila (`after:absolute after:inset-0`, `tr relative`); el anillo de foco se
  pinta en el `::after`; Fecha/Quién/Farmacia son `relative` para poder
  seleccionar el texto. Por debajo de xl: tarjetas (sin agrupar).
- **Resultado de una conciliación = tarjetas separadas** (detalle del historial
  y "Nueva conciliación"): cabecera (proveedor, envío, estado, chips,
  acciones) · "Qué ha llegado" (`TarjetaLineas`, con la tabla y su filtro) ·
  reportes (`ReportsList enTarjeta`, solo si hay) · Datos técnicos (admin).
- **Acciones de fila = UN solo menú "⋯"** (Radix DropdownMenu) con TODAS las
  acciones: Editar primero; lo destructivo (Desactivar/Eliminar) al final tras
  un separador. El nombre de la fila es la acción principal (botón o enlace
  que abre Editar / el editor). Nunca un botón "Editar" suelto junto a un
  menú con el resto. Componente compartido
  `shared/components/molecules/RowActionsMenu` (`RowActionsMenu`,
  `RowActionsItem` con `icon`/`href`/`externo`/`peligro`, `RowActionsSeparator`,
  `RowActionsNote`): trigger ⋯ horizontal de 44 px en móvil y 32 px en
  escritorio. Lo usan Usuarios (`triggerProps={{'data-acciones': id}}` para
  devolver el foco) y Farmacias (`FarmaciaRowActions`). Iconos distintos para
  acciones distintas (Pasar a borrador = `EyeSlash`, nunca el lápiz). El menú
  móvil de `FilaLista` (editor) sigue con su propio DropdownMenu (mismo ⋯).
- **Barra de filtros estándar**: buscador + `Select`s que se aplican al
  momento y se combinan + recuento `role=status` + "Quitar filtros" en la
  fila del recuento. En móvil (< md): buscador + botón "Filtros (N)"
  (`shared/components/molecules/FiltrosMovil`) que abre un diálogo con los
  Selects y sus etiquetas visibles ("Ver N resultados" cierra). Los controles
  se pintan dos veces con ids distintos (`controles(sufijo, etiquetaVisible)`):
  en línea en escritorio (`hidden md:contents`) y dentro del diálogo.
  Usuarios: farmacia/rol/estado (estado local). Farmacias: buscador + Select
  "Estado" fijo (Activas / Cambios sin publicar / Publicadas / Borradores /
  Archivadas) + recuento visible. Historial: Periodo (Cualquier fecha / Hoy /
  7 días / 30 días / Elegir fechas…), Resultado y, solo admin, Farmacia y
  Reportes ("Todos los reportes" / "Con error reportado"); en la URL con las
  claves de siempre (`q`, `periodo`, `from`, `to`, `status`, `reportes`,
  `business`). Valores desconocidos en la URL se ignoran (ni Select vacío ni
  contados). "Quitar filtros" dentro de `FiltrosMovil` deja el foco en "Ver N…".
- **Fechas**: `shared/components/molecules/DateRangePicker` (react-day-picker
  en español, semana desde el lunes, etiquetas accesibles en castellano). En
  escritorio el calendario CUELGA del propio Select "Periodo" (`ancla` +
  `abierto` + `idFocoAlCerrar`, sin control extra en la barra): al elegir
  "Elegir fechas…" se abre con el foco en el día elegido u hoy; con un rango
  puesto, la opción muestra el rango corto (`resumenCorto`: "10–16 nov") y
  aparece "Cambiar fechas…" para reabrirlo. El rango elegido se anuncia
  (`aria-live`) en las dos variantes. Dentro de un diálogo, `enLinea`. Prohibido
  `<input type="date">`. El servidor solo acepta fechas 20xx válidas
  (`esYmd`/`inicioDia` en `historial.ts`; antes "0002-01-01" daba HTTP 500).
- **Cabecera y ancho**: `shared/components/molecules/PageHeader` (título,
  descripción, acción accent) + `ANCHO_PAGINA` (`max-w-6xl`) en Inicio,
  Farmacias, Historial y Usuarios.
- **Pie de modal de crear/editar**: `ModalAcciones` (en `Modal`): Cancelar
  secondary + principal accent sin icono, SIEMPRE activa (valida al enviar y
  enfoca el primer error), en fila también en móvil. Lo usan Nueva farmacia,
  Nuevo/Editar usuario y Cambiar mi contraseña. Los modales del editor
  (servicio, pregunta…) mantienen su validación con botón desactivado
  (campos multidioma) pero con Cancelar secondary.
- **Historial e Inicio**: una conciliación se titula igual en los dos — el
  proveedor es el título y el nombre del envío va en la línea secundaria. Sin
  coste por fila (está en "Datos técnicos" del detalle y en /admin/uso).
- **Albaranes sin pestañas propias**: "Nueva conciliación" e "Historial" están
  en el menú lateral/cajón (se borró `ConciliadorTabs`).
- **Botón de crear de la cabecera**: SIEMPRE `Button variant="accent"` (como
  enlace con `asChild` + `Link` cuando navega). Nada de clases propias.
- **Tablas de gestión**: `thead` como Usuarios (`bg-surface-2`, 12,5 px
  semibold muted, `th scope="col"`, caption sr-only).
- **Filas de elección** (24-11-2026, sustituyen a las "tarjetas de
  elección" con borde, que hacían ruidosos los modales): en formularios,
  `shared/components/atoms/OpcionEleccion` — fila plana sin borde ni relleno,
  solo el indicador (`IndicadorEleccion`) se pone azul; 44 px en móvil, anillo
  de foco en la fila, segunda línea en gris opcional. Bloques del formulario
  separados por `border-t border-[var(--color-hairline)] pt-5`. Usuario: rol
  con 3 radios de una línea y SOLO la descripción del elegido debajo; con rol
  Administrador no hay casillas de módulos. Nueva farmacia: nombre + ciudad en
  una fila, idiomas sin el castellano (va siempre), "Opciones avanzadas" al
  final y sin caja.
- **Desplegables `<details>`** que el usuario debe ver como pulsables: texto
  accent, flecha que gira y fondo al pasar (ver `SubirListaDialog`).
- **Etiquetas de formulario (`.label`)**: frase normal, 13,5 px, peso 500,
  `--color-ink-2` (sin MAYÚSCULAS desde 21-11-2026).
- **Crear en modal**: formularios cortos (≤ ~6 campos) se crean en un `Modal`
  abierto desde el botón accent de la cabecera de su lista, nunca en una
  página ni en un wizard. "Nueva farmacia" (`NuevaFarmaciaDialog` →
  `NuevaFarmaciaBoton`): nombre, ciudad, idiomas, identificador generado con
  "Cambiar" plegado en "Opciones avanzadas" (se abre si el servidor da error
  en él) y responsable opcional (si no hay usuarios libres, una línea de ayuda
  en vez del Select); el nombre vacío se marca al enviar (`aria-invalid` +
  mensaje enlazado); `createFarmaciaAction` devuelve
  `{status:'ok', id, nombre}` (ya no redirige): se cierra, la fila queda
  resaltada (`/farmacias?creada=<id>`) y un toast ofrece "Abrir editor".
  `/farmacias?nueva=1` abre el modal; `/farmacias/nueva` redirige ahí.

### Horario semanal
- `HorarioSemanal`: cada día con interruptor Abierto/Cerrado visible sin
  desplegar; "Primer/Segundo horario"; "Copiar de…". `HorarioTab`: "Empezar con
  un horario típico" solo si está vacío; si no, "Copiar el lunes a
  martes–viernes" (con confirmación). Festivos/cierres: fase aparte.

## Modelo de contenido (fuente de verdad)

Desde el 24-11-2026 Sanity está retirado: el modelo de Farmacia es
`src/core/farmacias/domain/models/Farmacia.ts` (+ i18n en
`src/core/shared/domain/i18n.ts`) y la API pública
(`core/farmacias/application/publicContent.ts`) mantiene el formato que
leían las landings (i18n `[{language,value}]`, horarios `Mo..Su` + `tramos`).

Diferencias con el antiguo schema de Sanity (por si se consulta el histórico):
- **Redes sociales** — backoffice tiene `x` y `youtube` extra (Sanity solo
  ig/fb/tiktok). Mantener por si el cliente las quiere en el futuro.
- **Horarios** — backoffice permite 2 tramos por día (Sanity 1). La API
  pública manda `tramos` y `agruparHorarios()` (packages/contenido) los
  pinta "09:00 - 14:00 / 17:00 - 20:30".

## Decisiones UI/UX acordadas (usar en cualquier iteración)

1. **Azul (`--color-accent`) = la acción principal** (publicar, crear,
   añadir). Nunca botones negros para publicar/entrar/crear. Una sola acción
   principal por zona.
2. **Section title sin numeración** (`01 · General` fue quitado 22-09-2026).
3. **Navegación del editor** (fase 4): grupos Tu farmacia · Portada ·
   Contenido · Avanzado; columna izquierda en escritorio, selector + hoja en
   móvil, sin numeración y con punto rojo solo si falta traducir. **Shell de la app** (fase 1, 20-11-2026): sidebar
   sin títulos de sección — Inicio · Farmacias (admin) / Mi web (personal, va
   directo al editor de SU farmacia) · Albaranes (Nueva conciliación,
   Historial). Config en `features/shell/ui/lib/navConfig.ts` (`buildNav`),
   lista compartida sidebar/drawer en `NavList`.
4. **En móvil: una barra fija arriba (cabecera del editor) y la barra de
   acciones abajo** (`z-40 + will-change`). Las pestañas de idioma no se fijan.
5. **Traducciones**: texto "Faltan N traducciones" con popover de detalle (ya
   no un punto sin texto que mezclaba guardado y traducido).
6. **LangTabs con dot rojo mini** cuando hay missing, sin texto "N faltan".
7. **Required = asterisco `*` rojo** (`--color-red-ink`) junto a la etiqueta
   visible (`aria-hidden` + ", obligatorio" para lectores), no chip.
8. **`<p class="help">` → `LabelHelpIcon` con tooltip** — la ayuda pesa cero
   cuando no la necesitas.
9. **Screenshots evitados** por consumo de tokens. Verificar con
   `browser_snapshot` (accessibility tree, text) o `browser_evaluate`.
10. **Publicar con traducciones pendientes = confirmar, no bloquear**
    (`PublishMissingDialog`). "missing" es heurístico y la landing cae al
    castellano vía `localizar()` (packages/contenido). Lista por sección
    con chips por idioma; cada fila navega a sección + idioma. Footer apilado
    en móvil con el naranja abajo.
11. **Módulos WIP ocultos del sidebar** con `hidden: true` en
    `features/shell/ui/lib/navConfig.ts` hasta estar listos para producción —
    la ruta sigue accesible por URL para desarrollo, pero el cliente no la ve.
12. **Pantalla de Inicio** (`/inicio`, destino tras login): personal de
    farmacia → tarjeta "Tu web" con estado en lenguaje llano ("Publicada y al
    día" / "Tienes cambios sin publicar" = `updatedAt > lastPublishedAt`) +
    accesos directos a secciones del editor + últimas conciliaciones. Admin →
    "Requiere atención" (borradores, cambios sin publicar, informes de error
    abiertos) + farmacias + últimas conciliaciones.
13. **Roles en lenguaje llano** (`ROL_LABEL`): Administrador · Responsable de
    farmacia · Solo consulta.
14. **Accesibilidad medida**: tras cambios de UI, agente `ux-a11y-auditor`
    hasta 0 incidencias (WCAG AA, cursor, zonas táctiles ≥24px/44px en móvil).
15. **Historial de conciliaciones** (fase 3, 20-11-2026): tabla con columna
    Fecha en hora de Madrid (`ui/lib/historial.ts`: Hoy / Ayer / "Jue 19
    nov"; ya no se agrupa por día), cada fila un único enlace. Filtros = chips que fusionan su propio
    parámetro de URL (`q`, `periodo=hoy|7d|30d|fechas`+`from`/`to`, `status`,
    `reportes=abiertos` y `business` solo admin) + buscador con debounce 300 ms
    (proveedor O etiqueta); sin botón "Aplicar". **21-11-2026**: los chips
    pasan a la barra estándar de Selects (ver "Patrones de listas de gestión"). El detalle
    (`HistoryResultCard`) calca la tarjeta de resultado de "Nueva
    conciliación". **Coste, tokens, email y duración solo SUPER_ADMIN**, y se
    filtran en el servidor (la vista construye filas/props sin esos campos);
    el admin los ve en "Datos técnicos" (`<details>`, con la lectura cruda de
    la IA). "Comparación" → "conciliación" en toda la UI.
16. **Reportes de error**: botón "Reportar un error" junto a las acciones de
    cada tarjeta (nueva conciliación e historial) → Radix Dialog
    (`ReportarError`); la lista (`ReportsList`) no se pinta si no hay
    reportes. Resolver (solo SUPER_ADMIN) también en diálogo.
17. **Componentes compartidos del conciliador**: `FilePreviewModal` (visor
    PDF/Excel para `File` o URL `/api/files/…`), `ui/lib/botones.ts`
    (`BTN_ACCENT`, `BTN_SECUNDARIO`), `ReconciliationTable` sin `max-h`.
    Visor (25-11-2026): el PDF pinta todas las páginas seguidas (scroll
    vertical; el número de página sigue al scroll) y PDF y Excel tienen
    buscador (`FilePreview/BuscadorVisor`: sin acentos ni mayúsculas, Enter /
    Mayús+Enter, «n de m»). En el PDF resalta con `customTextRenderer` de
    react-pdf y espera 250 ms tras teclear. Subida: `useSoltarArchivos`
    (Dropzone) hace zona de soltar también de «Añadir más archivos» y de los
    huecos «Falta…»; la página evita que soltar fuera abra el archivo.
18. **Usuarios** (fase 5, 20-11-2026): `/ajustes/usuarios`, solo SUPER_ADMIN
    (item "Usuarios" del sidebar; `/ajustes` redirige ahí o a `/inicio`).
    Tabla (antes lista agrupada por farmacia: mareaba) con buscador y filtros;
    acciones en el menú "⋯" (Editar dentro) y el nombre abre Editar; rol con `ROL_LABEL` (el
    rol USER sigue siendo "Solo consulta", decisión del usuario). Crear y
    editar en `CuentaDialog` (sin roles desde 24-11-2026: ver "Sin roles que
    elegir"; el correo solo se escribe al crear). Nunca se borra: se desactiva (FK de
    conciliaciones y reportes). Contraseña temporal generada en el servidor
    (`generarContrasenaTemporal`, 3 bloques de 4) y mostrada UNA vez
    (`ContrasenaTemporalDialog` con "Copiar"). "Cambiar mi contraseña" en el
    menú del avatar para todos los roles (mín. 10 caracteres, pide la actual).
    Reglas en el servidor (`core/users/application/userAccounts.ts`,
    `UserAccountsService`): solo admin; nadie se desactiva, se restablece ni
    se quita el rol de admin a sí mismo; siempre ≥1 admin activo; email único
    en minúsculas; responsable y solo consulta necesitan farmacia. La
    revalidación de la sesión (5 min) relee también el nombre.
    **Seguridad de sesiones** (sin migración):
    - El JWT lleva `pv` = huella (sha256 truncado) del `passwordHash`; la
      revalidación (`authjs.ts`, `releerUsuario`) cierra la sesión si no
      coincide → restablecer o cambiar la contraseña echa las sesiones
      abiertas en ≤5 min. Tokens anteriores sin `pv` la adoptan una vez. La
      sesión (`session` callback) nunca expone `pv`.
    - "Cambiar mi contraseña" llama a `unstable_update`: la propia sesión
      adopta la huella nueva y sigue; las demás de esa cuenta caen.
    - Las escrituras de admin releen al actor de la BD (activo y
      SUPER_ADMIN): un JWT con rol viejo no sirve.
    - "≥1 admin activo": comprobación + escritura en transacción
      Serializable con reintento ante P2034 (`UltimoAdminError`).
    - Contraseñas ≤72 bytes UTF-8 (límite de bcrypt), también al entrar.
      Login con hash ficticio si el usuario no existe (mismo tiempo).
    - Log `{evento:'usuarios', actorId, accion, targetId}` sin datos
      personales. `AUTH_RECHECK_MS` solo para pruebas.
    **Pendiente**: rate limiting de login y "Cambiar mi contraseña" (necesita
    almacenamiento: tabla o Redis); caducidad / cambio obligatorio de la
    contraseña temporal (necesita columna nueva → migración en la BD
    compartida con el conciliador).

## Fases del roadmap

- **Fase 1**: Hero + Features ✅
- **Fase 2**: Sobre nosotros estructurado + Legal ✅
- **Fase 3**: Textos cabecera Servicios/FAQs + mapaUrl + imagenOg ✅
- **Fase 4 (parcial)**: Validación i18n visible (Health chip + LocaleChip por
  estado + LangTabs con dot rojo mini superpuesto) ✅
- **Extras 22-09-2026**: TimePicker custom, HorarioSemanal rediseñado (card
  por tramo + duración calculada), IconInput con focus arreglado, Label con
  asterisco naranja para required, `.scrollbar-thin` utility ✅
- **Pulido pre-demo 05-10-2026**: nav-config con flag `hidden?: boolean` para
  ocultar módulos WIP del sidebar sin romper rutas (Scout/Albaranes/Inventario/
  Admin-Uso ocultos, siguen accesibles por URL); stats cards de resumen por
  estado (Total/Publicadas/Borradores/Archivadas con tonos accent/green/
  yellow/neutral) en `/farmacias` + fecha de última actualización global en
  el header ✅
- **Infra de contexto**: hook `PostToolUse` en `.claude/settings.json` que
  actualiza sección `## Cambios recientes` al hacer commit + skill global
  `/handoff` para cerrar sesiones con contexto persistido ✅
- **Reestructura 11-11-2026**: `core/` (dominio) + `features/` (pantallas) +
  `shared/` (design system), una carpeta por componente; lógica de imágenes
  a use cases; `FarmaciasList` e `ImageGalleryField` troceados ✅
- **Aviso al publicar 11-11-2026**: `PublishMissingDialog` + hook
  `useI18nHealth` (fuente única con el HealthChip) + `goToSection(key, locale?)`
  en el EditorContext (la sección activa ya no es estado local de
  FarmaciaEditor). Los chips del popover del HealthChip también navegan ✅
- **Wizard Nueva farmacia 11-11-2026** (sustituido el 21-11-2026 por el modal
  `NuevaFarmaciaDialog`, ver "Patrones de listas de gestión"): paso 2 "Idiomas" (tarjetas-checkbox,
  castellano fijo como principal = fallback de la landing); `createFarmacia`
  acepta `idiomasActivos`. Arreglado bug: los campos del paso 1 se desmontaban
  y el submit del paso 3 llegaba vacío (no se podía crear ninguna farmacia) →
  pasos siempre montados con `hidden`. Errores del server vuelven al paso del
  campo + foco + toast. "Continuar" secondary, "Crear farmacia" accent ✅
- **Sanity retirado 24-11-2026**: las landings solo leen del backoffice
  (`src/lib/contenido.ts` + `src/lib/backoffice.ts`, sin `CONTENT_SOURCE` ni
  `PUBLIC_SANITY_*`); `packages/sanity-client` → `packages/contenido`; el chat
  usa su catálogo del código; borrados `studio/`, `workers/sanity-fanout` y los
  scripts `migrate:sanity|resenas|media|richtext`. Build de Torrents y Chamarro
  comparado antes/después: HTML idéntico (salvo una frase del llms.txt).
- **Landings leen del backoffice 12-11-2026** (histórico; en local; Sanity sigue siendo
  la fuente por defecto de los deploys):
  - API pública sin sesión (`src/proxy.ts` no cubre `/api`), solo farmacias
    `published` (`getPublishedFarmaciaBySlug`, sin filtro de tenant):
    `GET /api/public/farmacias/:slug`, `…/:slug/resenas`,
    `/api/public/resenas/:id/avatar`.
  - Contrato en `core/farmacias/application/publicContent.ts`: calca la
    proyección GROQ de las landings (i18n `[{language,value}]`, HTML en
    texto enriquecido, horarios `Mo..Su` + `tramos`). Tarjetas sin título no
    se publican.
  - `/api/content-images/:id` acepta los params del CDN de Sanity
    (`?w=&h=&fit=&q=&auto=format`) → `shared/lib/imageTransform.ts` (sharp).
  - Landings: `CONTENT_SOURCE=sanity|backoffice` + `BACKOFFICE_URL` en
    `src/lib/sanity.ts` → `src/lib/backoffice.ts`. Build verificado: Chamarro
    idéntico; Torrents solo difiere en contenido editado en el backoffice.
  - Reseñas Google migradas a `content_resenas` (171, fotos re-alojadas en
    R2). Migración Prisma `20261112090000_resenas_google_fields` (aditiva).
  - Scripts: `pnpm migrate:resenas`, `migrate:media` (hero/sobre/logo/OG de
    Sanity CDN → R2), `migrate:richtext` (descripción larga + legales que
    la Fase D no copió: eran Portable Text → HTML). Todos dry-run por
    defecto, `--write` para escribir, re-ejecutables.
  - Arreglado: la imagen OG (`role='og'`) se subía pero el mapper no la leía.
- **Deploy en Vercel 12-11-2026**: `larokifarm.vercel.app`, región `fra1`
  (Neon en eu-central-1). Root Directory `apps/backoffice`. URL pública
  configurable con `BACKOFFICE_PUBLIC_URL` ✅
- **Deploy automático al publicar 12-11-2026**: `PublishFarmaciaUseCase`
  (application/publishFarmacia.ts) = marcar `published` + port
  `LandingDeployer` → `LandingDeployerHttp` lanza los hooks de
  `DEPLOY_HOOKS_<SLUG>` (N URLs por coma, en paralelo, timeout 10 s). Toast
  según resultado (`ui/lib/publishToast.ts`). Pasar a borrador NO lanza
  deploy (la API daría 404 → web vacía). No usa `workers/sanity-fanout`: el
  backoffice llama a los hooks directo. Landings: un fallo del backoffice
  en build rompe el build (3 reintentos) → el hosting conserva la versión
  anterior ✅
- **QA + fixes 13-11-2026** (informe completo con usuarios de cada rol):
  - Autoguardado (`EditorContext`): envía SOLO lo cambiado (diff contra
    `baseline`), nunca `status`/imágenes/reseñas; `rev` para no perder lo
    tecleado durante un guardado; control optimista (`expectedUpdatedAt` →
    `code:'conflict'` + toast "Recargar"); try/catch + reintento si falla la
    red; `syncFromServer` tras publicar.
  - `saveFarmaciaPatchAction` valida con zod (`application/farmaciaPatch.ts`):
    whitelist de campos, slug `^[a-z0-9-]{1,60}$`, enlaces sin
    `javascript:` (`shared/lib/safeHref.ts`), HTML saneado
    (`shared/lib/safeHtml.ts`, sanitize-html), tarjetas sin título fuera.
  - Roles: USER (`viewer`) = solo lectura (servidor `READ_ONLY_ERROR` +
    editor con `fieldset disabled`); crear/duplicar solo SUPER_ADMIN.
    Sesión JWT re-validada contra la BD cada 5 min (desactivar = fuera).
  - Imágenes: tipo real por bytes (`detectImageType`), máx 4 MB, compresión
    en navegador (`prepareImageUpload`: 2560 px + WebP), HEIC rechazado con
    mensaje; CSP `sandbox` en `/api/content-images` (SVG con script no
    ejecuta); transform sin 500; alt persistido (`updateContentImageAlt`).
  - API pública: HTML saneado, email/web/mapa (solo Google)/enlaces filtrados.
    Landings: JSON-LD con `<` escapado, enlaces de servicio seguros y el build
    FALLA si la farmacia da 404 (no publica la web vacía).
  - UX: búsqueda sin acentos, aviso de tramo erróneo, confirmar plantilla y
    archivar, restaurar archivadas, sección en el hash (`#hero`), miga sin
    ids, `callbackUrl` tras login, cabeceras de seguridad (`next.config`).
- **Conciliador integrado 17-11-2026**: copiado de `apps/conciliador-albaranes`
  solo lo de operar — subir PDFs/Excels y conciliar (`/albaranes`) + historial
  y detalle (`/albaranes/historial`, `/albaranes/historial/[id]`). Core
  copiado: `core/{engine,comparisons,reports,businesses}`, `Scope` y errores en
  `core/shared`, `buildStorageKey` en `core/storage` (mismo bucket R2). APIs:
  `/api/conciliar` (maxDuration 300), `/api/files/[...key]`,
  `/api/comparisons/[id]/reports`, `/api/reports/[id]/resolve`. UI en
  `features/conciliador` (estilos slate originales; `--brand-*` → tokens del
  BO en globals.css). Un solo item «Conciliador» en el sidebar; dentro,
  pestañas «Nueva conciliación · Historial» (`albaranes/layout.tsx` +
  `ConciliadorTabs`). Envs: `GEMINI_API_KEY` y `ENCRYPTION_KEY` (claves Gemini
  por negocio). Usuarios: hechos en la fase 5 (decisión 18); límites y claves: «Uso de IA» ✅
- **Rediseño 20-11-2026**: fase 1 login + Inicio + navegación; fase 2 nueva
  conciliación por envíos; fase 3 historial (ver decisión 15-17); fase 4
  gestión de contenidos: secciones por tareas en lenguaje llano, estado de
  publicación, idiomas sin escrituras accidentales, listas con menú ⋯, 44 px
  en móvil, alta de farmacia en un paso con responsable opcional, lista con
  "Activas" y "Cambios sin publicar" ✅
- **Chat de medicamentos 22-11-2026**: columna `businesses.chatConfig` (JSONB,
  null = valores por defecto; migración `20261122200000_chat_config`, ya
  ejecutada en Neon). Dominio `ChatConfig` + `CHAT_POR_DEFECTO` +
  `contrasteConBlanco` (`Farmacia.ts`), lector tolerante `asChatConfig`
  (mappers), API pública `chat`. Las landings lo leen en build
  (`src/lib/chat.ts`, con su color de siempre por defecto) y pintan el widget
  con `data-*`; `data-inventory="off"` apaga el «Disponible». Se aplica al
  publicar ✅
- **Comparador de precios (rehacer Scout)**: Fase 0 hecha 24-11-2026 —
  prueba de concepto en `docs/scout-fase0/` (5 farmacias que verifican por CN;
  trampas para la Fase 2 en su README). Fase 1 hecha: módulos por usuario
  (ver "Módulos por usuario"). Fase 2 hecha (24-11-2026): "Comparar precio".
  Fase 3 hecha (24-11-2026): listas desde Excel (ver abajo). Fase 4 hecha
  (24-11-2026): `apps/scout` y su worker de Cloudflare borrados del repo
  (el despliegue en Vercel/Cloudflare lo retira el usuario). Quedan en el
  esquema `scout_batch_jobs`/`scout_batch_queries` (0 filas, sin uso):
  borrarlas es una migración destructiva, pendiente de decidir.
  - **Listas** (`/scout/listas`, `/scout/listas/[id]`): tablas `price_lists`,
    `price_list_items`, `price_list_runs`, `price_list_run_items` (migración
    `20261124180000_price_lists`, ya ejecutada) + `price_checks.fromList`
    (las consultas de listas no salen en el historial). Validación pura en
    `core/precios/domain/lista.ts` (CN 5/6/7 cifras con control, EAN nacional,
    repetidos; máx. 5.000). "Comparación" en la UI = ejecución (`run`).
  - Proceso de fondo: `scripts/procesar-lista.ts` (`pnpm precios:lista`, lee
    `RUN_ID`) → `procesarEjecucion`: cola continua con 20 productos a la vez y
    UNA sola recarga (antes cada trabajador metía el mismo lote = productos
    repetidos), cancelación en ≤5 s, `recontar` al empezar y al terminar,
    reutiliza consultas completas de las últimas 24 h, sin búsqueda por nombre
    (`sinBusquedaPorNombre`: 1 de 267 verificados, duplicaba peticiones). Se
    reanuda solo con lo PENDIENTE. Log solo con contadores (repo público).
  - `ClienteWeb`: 1 petición NUEVA/s por web y hasta 4 abiertas (antes en
    serie: una web lenta, Farmavázquez, frenaba todo). Piloto de 200: ~32
    productos/min, 0 bloqueos → 2.500 ≈ 1 h 15 min.
  - Flujo (rehecho 24-11-2026 tras probarlo el usuario): el modal hace
    "Subir y comparar" (guarda + lanza) y lleva a la lista, que muestra al
    momento "Comparando…" con barra (animada sin productos hechos) y se
    refresca cada 3 s. Todas las acciones van DENTRO de la tarjeta
    Comparación; la cabecera solo lleva el ⋯.
  - Arranque (`ponerEnMarcha` en `listasActions.ts`): ≤ 50 productos (o en
    local sin token) se comparan en el propio servidor con `after()`
    (`procesarComparacion`, maxDuration 300 en las páginas de listas); las
    grandes, con `lanzarEjecucion` (workflow_dispatch con
    `GITHUB_DISPATCH_TOKEN`). Sin token, la lista grande queda "con error"
    con el motivo en la tarjeta (nunca en cola para siempre). Workflow
    `.github/workflows/precios-lista.yml` (secret `DATABASE_URL`, variable
    `COMPARADOR_FARMACIA_USO`, `concurrency` = una lista detrás de otra).
  - "Interrumpida" = FAILED o RUNNING sin latido > 5 min (`ejecucionParada`)
    → "Reanudar". Excel: `GET /api/precios/comparaciones/[runId]/excel`
    (se genera al momento, no caduca).
  - Tablas `price_checks` + `price_offers` (migración
    `20261124120000_price_checks`, ya ejecutada en Neon). Uso en
    `usage_entries` módulo SCOUT, coste 0, apuntado a la farmacia
    `COMPARADOR_FARMACIA_USO` (por defecto larokifarm; en local, laguna).
  - `core/precios`: dominio (`codigos.ts`: CN/EAN estrictos — "165892-6" es un
    pack —, `interpretarBusqueda`), `identificarProducto` (CN/EAN nacional →
    CIMA o parafarmacia de Farmavázquez; nombre → candidatos CIMA +
    Farmavázquez; EAN de fabricante → se pide CN o nombre, nunca se adivina),
    10 adaptadores en `infrastructure/farmacias/` (lista en su `index.ts`;
    5 de la Fase 0 + Farma2go, Farmacia Market, Farmacia Senante, OKFarma y
    Tedin, añadidas el 24-11-2026; descartadas y por qué en el mismo archivo)
    con `ClienteWeb` (1 petición/s
    por web, cookies, retos anti-bot → "bloquea", lista blanca de dominios),
    `comprobarFicha` = LA regla (mismo CN/EAN en la ficha), precio de 1 unidad
    (`precioUnidad`: nunca `lowPrice` de un AggregateOffer), Nomenclátor
    (`nomenclator.ts`, CSV del Ministerio en memoria 12 h) para el precio
    oficial de los medicamentos con receta (no se buscan en webs).
  - UI `features/scout`: `/scout` (ComparadorView: buscador → candidatos →
    TarjetaProducto + TablaPrecios; una server action por farmacia en
    paralelo, filas progresivas, orden y "Más barato" solo al terminar, un
    único `role=status`), `/scout/historial` (filtros q/periodo/resultado),
    `/scout/historial/[id]` (solo lectura + "Volver a consultar" →
    `/scout?cn=…&auto=1`, que se limpia con `history.replaceState`).
  - Cada farmacia se consulta con `POST /api/precios/[checkId]/[farmacia]`
    (ruta de API, no server action: las server actions de Next van en cola y
    aquí hacen falta en paralelo). 4–13 s por búsqueda con 10 farmacias.
  - **Identificar parafarmacia por CN** (25-11-2026,
    `infrastructure/farmacias/catalogoParafarmacia.ts`): desde Vercel el
    buscador de Farmavázquez NO responde (comprobado: «physiorelax» 0
    resultados en producción, 10 en local; el CN 165337 fallaba). Farmavázquez
    (tope 15 s) y, si falla o no lo tiene, plan B en paralelo (Farmacia
    Barata, FarmaciasDirect, Farma2go, OKFarma; vale el nombre de la primera
    ficha con ese CN, tope 20 s). Si Farmavázquez falló y el plan B no lo
    encuentra → `CatalogoNoDisponibleError` → "no hemos podido comprobar ese
    código ahora mismo". Motivo en los logs de Vercel. Por nombre: Farmavázquez y, si falla
    o no encuentra nada, el buscador de OKFarma (`catalogoOkfarma`, Doofinder).
    **Worker puente** (25-11-2026, `workers/precios-puente`): `ClienteWeb`
    recibe `porPuente` (dominios que bloquean a Vercel: Farmavázquez y
    Senante) y, si existen `PRECIOS_PUENTE_URL` + `PRECIOS_PUENTE_CLAVE`, pide
    cada salto por el Worker (POST /pedir, Bearer); cookies y redirecciones
    las sigue el backoffice. Sin las variables, directo. Desde un Worker
    PromoFarma también carga (sin CN en la ficha), Druni/Sephora siguen 406/403.
    Webs pedidas el 25-11-2026 (PromoFarma, Atida, Druni, Sephora, DosFarma,
    laparafarmaciaencasa): en pausa, motivos en `docs/scout-fase0/README.md`.
  - **Reportar un problema** (25-11-2026, `components/ReportarIncidencia`): en
    "Comparar precio" (al terminar), en el detalle del historial y en el ⋯ de
    cada lista. Modal con texto + hasta 3 capturas (pegar Ctrl/⌘+V, arrastrar
    o elegir; se comprimen con `shared/lib/prepareImageUpload`). Las capturas
    van a `POST /api/incidencias/capturas` (tipo real por bytes, PNG/JPG/WebP,
    re-codificadas a WebP con sharp → sin EXIF) y se guardan en R2
    (`incidencias/precios/AAAA/MM/<id>.webp`); `GET …/capturas/[...key]` solo
    SUPER_ADMIN (sin sesión → login y vuelve). El aviso va por Web3Forms (sin
    adjuntos en el plan gratuito: enlaces). Sin tabla en la BD (solo correo).
    La zona de capturas es compartida (`shared/components/molecules/Capturas`:
    `useCapturas`, `CapturasField`, `subirCapturas(…, 'precios'|'albaranes')`)
    y también la usa «Reportar un error» del conciliador (el reporte se guarda
    como siempre; las capturas, en `incidencias/albaranes/…`, solo van en el
    correo). La subida exige el módulo del origen.
  - **Tablas con columna CN** (25-11-2026): historial de precios, resultados de
    una lista y líneas de una conciliación llevan el CN en su propia columna
    (la primera), no debajo del nombre. En móvil (tarjetas) sigue debajo.
  - `cnDeCodigo` exige que el 7º dígito sea el de control (= el del EAN
    847000+CN): "165892.1" es un duplo en Farmacia Market, no el CN.
  - "Precio muy distinto al resto" (`esAtipico`, ≥4 precios, >1,5× o <0,6× la
    mediana): algunas webs ponen el CN de la unidad a un duplo (Tedin, Eucerin
    238444). Solo avisa; la regla del código no lo puede detectar.
  - Menú "Precios" (Comparar precio · Historial), `requiresModulo: 'comparador'`.
  - `shared/lib/fechasMadrid.ts`: utilidades de fecha de los historiales
    (antes en `features/conciliador/ui/lib/historial.ts`, que las reexporta).
  - Pendiente de diseño (revisión 24-11-2026, fuera del comparador): el anillo
    de foco de `IconInput` choca con el borde al enfocar por código; usar
    `tabular-nums` (no `font-mono-tabular`) para importes y horas.
- **Uso de IA 24-11-2026** (`/admin/uso`, menú «Uso de IA», solo admin):
  gasto de Gemini del mes por farmacia (conciliaciones + traducciones), límite
  mensual y clave propia (BYOK) en el menú ⋯ de cada fila. Límite vacío = sin
  límite (máx. 1.000 $, coma decimal). La clave se comprueba con Google
  (listar modelos, sin coste) antes de guardarla, se guarda cifrada
  (`ENCRYPTION_KEY`) y solo se enseñan sus 4 últimas letras. Reglas en
  `core/businesses/application/configurarIa.ts`; datos en
  `features/admin/data/usoData.ts`. Avisos en la página si faltan
  `GEMINI_API_KEY` o `ENCRYPTION_KEY` en el servidor. Sin migración.
  Trae lo que tenía la pantalla de uso del conciliador antiguo: selector de
  mes (`?mes=AAAA-MM`, últimos 12), gráfico de 12 meses (`GraficoMeses`: cada
  barra es un enlace al mes, valor al pasar/enfocar y "Ver como tabla"), tabla
  por farmacia (con PDF) y **Por persona** (`UsoPorPersona`: conciliaciones,
  PDF, traducciones y gasto, de más a menos). `getUsoIaData(mes)` lee 12 meses
  de `comparisons` + `usage_entries` (TRADUCCION) una vez y agrupa en memoria.
  En meses pasados no se pinta la barra del límite (el límite es el actual).
- **Avisos por correo con Web3Forms 25-11-2026** (`shared/lib/web3forms.ts`,
  `NEXT_PUBLIC_WEB3FORMS_KEY`; el buzón destino se elige al crear la clave en
  web3forms.com). El plan gratuito solo admite envíos DESDE EL NAVEGADOR: se
  llama en componentes cliente, nunca desde el servidor. La clave es pública
  por diseño (solo envía a ese buzón).
  - «Ayuda y soporte» (barra lateral, menú móvil y menú del avatar) abre un
    modal (`features/shell/ui/components/AyudaProvider`, `useAyuda()`): motivo
    + mensaje; envía nombre, correo (responder a), farmacia y pantalla. Sin
    clave, abre el `mailto` de `NEXT_PUBLIC_SUPPORT_EMAIL` como antes.
  - «Reportar un error» del conciliador: el reporte se guarda igual que antes
    y la API devuelve `aviso` (farmacia, proveedor, envío, quién) para que el
    navegador mande el correo con el enlace a la conciliación. Si el correo
    falla, no se avisa a quien reporta (el reporte ya está guardado).
- **Pendientes**:
  - **Coste de "Sugerir traducción"**: HECHO en código (21-11-2026); el
    `ALTER TYPE "UsageModule" ADD VALUE IF NOT EXISTS 'TRADUCCION';` ya se
    ejecutó en Neon (22-11-2026)
    (migración aditiva en
    `prisma/migrations/20261121090000_usage_traduccion`;
    NO `migrate dev`/reset contra Neon). Qué hace:
    - `traduccionActions.ts` registra cada traducción en `usage_entries`
      (module TRADUCCION, action 'translate', costUsd, tokens, userId) vía
      `getAiUsageRepository()` (`core/comparisons`).
    - Límites contando filas: 40 por usuario cada 10 min y 300 por farmacia al
      día. El `Map` en memoria queda solo de respaldo.
    - `GetBudgetStatusUseCase` suma ese coste (3er parámetro opcional, ya
      pasado en `/api/conciliar`, `/albaranes` y la traducción) y
      `/admin/uso` (`usoData.ts`) también, así el % coincide con el bloqueo.
    - Las lecturas comparan `"module"::text`, así que no fallan antes del
      ALTER; el INSERT sí falla → se captura (`ModuloIaNoMigradoError`), se
      devuelve la traducción igual y se avisa en el log "falta ejecutar la
      migración TRADUCCION". Desplegar antes del ALTER no rompe nada.
  - Editor en escritorio: dos barras fijas arriba (barra general + cabecera
    del editor). Que la cabecera del editor absorba la miga y la general no
    sea fija en esa página (revisión de diseño 21-11-2026)
  - Borrador vs publicado: hoy el autoguardado escribe el contenido que lee
    la API; un deploy incluye ediciones a medias aunque no se pulse
    "Publicar cambios" (necesita snapshot publicado)
  - Reordenar imágenes (la action existe, falta UI) · enlaces de Tiptap sin
    `window.prompt` · rate-limit del login
  - Festivos, vacaciones y cierres temporales del horario (modelo + API +
    landings)
  - Descripción SEO de Torrents (es) cortada a 160 caracteres: corregir el
    texto a mano en «Google y redes sociales»
  - Imágenes servidas en runtime desde el backoffice: valorar optimizarlas en
    build (astro:assets) para no depender del backoffice en producción
  - Sincronización de reseñas Google → Neon: plan en
    `docs/plan-resenas-google.md` (raíz del repo)

## Cómo trabajar en este proyecto

1. **Al empezar sesión** en el backoffice: leer este archivo. NO re-leer los
   tabs enteros para orientarse.
2. **Cambios de UI**: revisar la sección "Decisiones UI/UX acordadas" antes.
3. **Añadir componente nuevo**: preferir extender los reutilizables de
   `shared/components/` antes de crear otro.
4. **Verificación visual**: `browser_snapshot` (barato) > `browser_evaluate`
   (barato) > screenshots (caro, evitar).
5. **Al terminar cambios significativos**: actualizar este archivo (sección
   correspondiente + añadir a "Fases del roadmap" si aplica).

## Convenciones código

- pnpm siempre. Nunca npm.
- Nunca `Co-Authored-By: Claude` en commits (regla `git-commit-push`).
- Nunca commit/push sin permiso explícito del user.
- Español peninsular (no rioplatense).
- Comentarios: por defecto NO. Solo cuando el WHY es no obvio.
- Types en `src/core/farmacias/domain/models/Farmacia.ts`: son la fuente de
  verdad del contenido (Sanity retirado el 24-11-2026).

<!-- auto:recent-commits:start -->
## Cambios recientes

Actualizado automáticamente al hacer commit (2026-11-25T12:01:28Z).

- `5e59cc0` 2026-11-25 — Fix(conciliador): ignore national codes the AI copies from another line
- `1768864` 2026-11-25 — Feat(backoffice): screenshots in reconciliation reports and CN column in tables
- `eb84344` 2026-11-25 — Feat(precios): report a problem with screenshots from price checks and lists
- `525df84` 2026-11-25 — Feat(precios): Cloudflare Worker bridge for pharmacies that block Vercel
- `8a36531` 2026-11-25 — Fix(backoffice): name search works when Farmavázquez blocks the server
<!-- auto:recent-commits:end -->
