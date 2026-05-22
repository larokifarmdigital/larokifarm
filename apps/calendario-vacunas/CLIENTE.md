# Manual rápido — Editar los calendarios de vacunación

Este documento explica cómo añadir o editar calendarios de vacunación de las
Comunidades Autónomas desde el panel.

## Acceder al panel

1. Abre el panel en tu navegador (la URL te la pasamos por correo, será algo
   como `https://farmacia-vacunas.sanity.studio`).
2. Inicia sesión con tu cuenta de Google o el correo invitado.

## Cómo está organizado

En el panel verás 5 tipos de contenido en el menú izquierdo:

- **Comunidad**: cada calendario de cada CCAA. Aquí pasarás el 90% del tiempo.
- **Vacuna**: la lista de vacunas (Hexavalente, Triple Vírica, etc.).
- **Dosis**: cada dosis con su edad de aplicación (1ª dosis a los 2 meses, refuerzo a los 6 años, etc.).
- **Enfermedad**: enfermedades que previenen las vacunas (Sarampión, Tos ferina, etc.).
- **Calendario común estatal** (también dentro de "Comunidad"): el de referencia del Ministerio.

> 💡 Las **Vacunas**, **Dosis** y **Enfermedades** son piezas que se reutilizan
> entre comunidades. Si añades "Hexavalente" una vez, ya está disponible en
> todas las CCAA. **No las dupliques**.

## Tareas más frecuentes

### Añadir o cambiar una vacuna en una CA

1. Menú izquierdo → **Comunidad** → clic en la CA (ej. "Madrid").
2. Baja a **Grupos de edad** y abre el grupo donde quieres meter la vacuna
   (ej. "Lactantes").
3. Dentro del grupo, en **Vacunas en este grupo**, pulsa **`+ Add item`**.
4. **Vacuna**: escribe para buscar la vacuna en la lista. Si no existe, pulsa
   **`Create new`** → rellena nombre, siglas y enfermedades que previene.
5. **Dosis**: igual que la vacuna, busca o crea una dosis con la edad.
6. **Nota específica** (opcional): texto si esa vacuna en esa CA tiene alguna
   particularidad ("solo grupos de riesgo", "financiada hasta 12 años", etc.).
7. Pulsa **`Publish`** arriba a la derecha. ⚠️ Si solo guardas borrador, no
   sale en la web.

### Crear el calendario de una CA que está vacía

1. Menú izquierdo → **Comunidad** → abre la CA vacía (ej. "Galicia").
2. Rellena **Año de vigencia** (ej. "2026") y **Fuente oficial** (URL del
   documento de la consejería).
3. En **Grupos de edad**, pulsa **`+ Add item`**.
4. Selecciona el grupo (lactantes, infancia, ...) y describe el rango ("0-15 meses").
5. Añade las vacunas dentro del grupo (paso anterior).
6. Repite para los 6 grupos.
7. **Publish**.

> 💡 **Truco**: abre el "Calendario común estatal" en otra pestaña como
> referencia mientras rellenas una CA. Copia los grupos y vacunas que se
> repitan, ajusta solo lo que sea distinto en esa CA.

### Cambiar la edad de una dosis

Ojo: si cambias una **Dosis** existente (ej. "1ª dosis 2 meses" → "1ª dosis 3 meses"),
afecta a **todas las CCAA que la usen**.

Si solo aplica a una CA, mejor:
1. **Dosis** → **`+ Create`** → nueva dosis con la edad correcta.
2. En la CA donde aplica, sustituye la dosis vieja por la nueva en la entrada.

### Eliminar una entrada

Dentro del grupo de edad, en la lista de **Vacunas en este grupo**, mueve el
ratón sobre la entrada y pulsa el icono de papelera. Después **Publish**.

## Cuándo se ve en la web

- Los cambios solo aparecen en la web pública cuando pulsas **Publish**.
- Tras publicar, la web se reconstruye sola en ~30 segundos.
- Si no ves el cambio, prueba a recargar con `Cmd+Shift+R` (Mac) o
  `Ctrl+Shift+R` (Windows).

## Si algo no cuadra

- ✋ **Antes de borrar una vacuna**, comprueba que no la usa ninguna CA. El
  panel te avisará si tiene referencias.
- 🔁 Si publicas un error, puedes restaurar versiones anteriores: en el documento,
  arriba a la derecha hay un icono de reloj (**History**).
- 📞 Cualquier duda, contáctame.
