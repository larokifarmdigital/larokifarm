# cima-chat

Widget embebible de consulta de medicamentos usando la **API pública de CIMA (AEMPS)**.

- Búsqueda por nombre con autocompletado.
- Ficha rápida del medicamento (principios activos, laboratorio, dosis, receta).
- Chips de preguntas frecuentes que traen el texto literal de las secciones oficiales:
  - ¿Para qué sirve? (FT 4.1)
  - Dosis y administración (FT 4.2 / Prospecto 3)
  - Cuándo NO tomarlo (FT 4.3)
  - Advertencias (FT 4.4)
  - Embarazo y lactancia (FT 4.6)
  - Conducción (FT 4.7)
  - Efectos adversos (FT 4.8 / Prospecto 4)
- Banner permanente con cita a la fuente AEMPS.
- Empaquetado en un único JS (~25–35 KB gzip estimado) con Shadow DOM para aislamiento total de CSS.
- Sin backend, sin claves, sin coste por consulta.

## Desarrollo

```bash
npm install
npm run dev
```

Abre `http://localhost:5173`. La página `index.html` simula una landing con estilos agresivos para verificar que el widget no se ve afectado.

## Build

```bash
npm run build
```

Produce dos formatos en `dist/`:

- `cima-chat.iife.js` — para `<script src>` clásico.
- `cima-chat.es.js` — para imports modernos.

## Embeber en una landing

```html
<script src="https://larokifarm-cima-chat.zpjstudio.com/cima-chat.iife.js" defer></script>

<!-- Burbuja flotante (auto-mount) -->
<div data-cima-chat data-theme="light" data-position="bottom-right"></div>

<!-- O modo en línea dentro de una sección de la página -->
<div data-cima-chat data-position="inline"></div>
```

### Atributos `data-*`

| Atributo | Valores | Default |
|---|---|---|
| `data-theme` | `light` \| `dark` | `light` |
| `data-position` | `bottom-right` \| `bottom-left` \| `inline` | `bottom-right` |
| `data-primary-light` | cualquier color CSS (`#0a66c2`, `rebeccapurple`, `rgb(...)`) | verde por defecto |
| `data-primary-dark` | cualquier color CSS | verde claro por defecto |

Si pasas `data-primary-light` o `data-primary-dark`, las variantes (`hover`, `soft`, `strong`) se derivan automáticamente con `color-mix()`; si omites uno, el tema correspondiente conserva su default.

```html
<!-- Marca azul corporativa en light, conserva el dark default -->
<div data-cima-chat data-primary-light="#0a66c2"></div>
```

### API manual

Si prefieres montar el widget desde código:

```html
<div id="mi-chat"></div>
<script src="cima-chat.iife.js"></script>
<script>
  const handle = window.CimaChat.mount(document.getElementById('mi-chat'), {
    theme: 'dark',
    position: 'inline',
    primaryLight: '#0a66c2',
    primaryDark: '#79b3ff',
  });

  // Cambiar opciones en runtime (ej. al togglear tema en tu app):
  handle.update({ theme: 'light' });

  // Y para desmontar limpiamente:
  // handle.unmount();
</script>
```

## Fuente de datos

CIMA REST API — Agencia Española de Medicamentos y Productos Sanitarios.
Base URL: `https://cima.aemps.es/cima/rest`. Sin auth, CORS abierto.

## Aviso legal

La información mostrada procede de las fichas técnicas y prospectos oficiales depositados por los laboratorios titulares en AEMPS. **No sustituye el consejo de un profesional sanitario.**
