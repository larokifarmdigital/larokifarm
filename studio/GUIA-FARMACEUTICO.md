# Guía rápida: editar el chat de medicamentos

Esta guía te explica cómo añadir, editar o quitar **síntomas** y **perfiles** del chat sin tocar nada de código.

Tiempo de aprendizaje: 5 minutos. Los cambios aparecen en la web en menos de 1 minuto.

## Entrar al panel

1. Ve a la URL del estudio que te pasamos (algo como `larokifarm.sanity.studio/cima-chat`).
2. Entra con tu cuenta de Google asociada.
3. En la barra de arriba selecciona el workspace **"Cima Chat"** si no está ya seleccionado.

En la barra lateral verás tres secciones:

- **🤒 Síntomas** — los chips que el usuario pulsa en el chat (fiebre, dolor de cabeza, etc.).
- **👤 Perfiles** — los grupos de población (bebé, embarazada, mayor, etc.) con sus reglas de seguridad.
- **💊 Principios activos** — el catálogo de "ingredientes" (paracetamol, ibuprofeno, etc.) al que se referencia desde síntomas y perfiles.

## Añadir un síntoma nuevo

**Ejemplo: "Dolor de garganta"**

1. Click en **🤒 Síntomas** → botón **"+"** arriba a la derecha.
2. Rellena:
   - **ID interno**: `garganta` (en minúsculas, sin tildes ni espacios).
   - **Etiqueta visible**: `Dolor de garganta`.
   - **Emoji**: `😣` (uno solo).
   - **Orden**: `45` (entre 40 y 50 si quieres que salga después de "congestión").
   - **Activo**: ✅ marcado.
   - **Principios activos apropiados**: añade uno o más del catálogo. Si el que necesitas no está, créalo primero (siguiente sección).
   - **Nota** (opcional): un aviso para el usuario si lo necesitas (ej. *"Si dura más de 5 días, acude al médico"*).
3. **Publish** arriba a la derecha. Listo.

El chat lo recoge automáticamente. Si tienes el widget abierto en otra pestaña, refresca al cabo de 1 minuto.

## Crear un principio activo nuevo

Antes de poder usarlo en un síntoma, tiene que existir en el catálogo central.

1. **💊 Principios activos** → **"+"**.
2. Rellena:
   - **Nombre interno**: `benzocaina` (minúsculas, sin tildes).
     - ⚠️ Importante: este nombre se usa **literalmente** para buscar en CIMA. Asegúrate de que escrito así devuelva resultados en cima.aemps.es.
   - **Nombre visible**: `Benzocaína`.
   - **Código ATC** (opcional): si lo conoces. Mejora la precisión cuando el chat busca "alternativas".
   - **Nota** (opcional, interna).
3. **Publish**.

Una vez creado, ya puedes referenciarlo desde cualquier síntoma o perfil.

## Editar la seguridad de un perfil

**Ejemplo: añadir un principio activo a la lista de embarazadas**

1. **👤 Perfiles** → click en `🤰 Embarazada`.
2. En **"Principios activos OTC apropiados"** añade el principio activo que quieras.
3. **Publish**.

A partir de ahí, ese principio activo aparecerá como sugerencia para embarazadas cuando el síntoma también lo incluya.

## Desactivar un síntoma o perfil temporalmente

Si por seguridad o regulación quieres ocultar algo sin borrarlo:

1. Abre el documento.
2. Desmarca **"Activo"**.
3. **Publish**.

Desaparece del chat al instante. Puedes volver a activarlo en cualquier momento.

## Reglas de oro

- **Nunca borres un principio activo** si está referenciado por síntomas/perfiles. Sanity te avisa si intentas borrar algo en uso.
- **Si dudas, desactiva en vez de borrar** (es reversible).
- **El "ID interno"** de síntomas y perfiles no debe cambiarse después de publicado: el chat lo guarda en caché.
- Los cambios se ven en producción en **<1 minuto** (caché del widget). Si necesitas verlos antes, dile al usuario que refresque.

## Si algo va mal

- Si el chat deja de cargar el catálogo, automáticamente vuelve al catálogo "de fábrica" (12 síntomas y 7 perfiles que dejamos preprogramados). El widget no se rompe.
- Puedes contactar conmigo si necesitas ayuda con algún schema más complejo o quieres añadir campos nuevos.
