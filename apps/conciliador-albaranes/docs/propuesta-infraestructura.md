# Propuesta alternativa de infraestructura — Conciliador de Albaranes

**Para:** Larokifarm y farmacias asociadas
**De:** Erick — ZPJ Studio

---

## Contexto

Hasta ahora hemos hablado de dos formas de tener el Conciliador funcionando en producción:

1. **Opción A — VPS propio:** un servidor en la nube contratado a vuestro nombre, con todo centralizado en un solo sitio. Es la opción más "clásica", tiene coste fijo mensual y todo (aplicación, base de datos, archivos) vive en la misma máquina.
2. **Opción B — Nube por uso (esta propuesta):** apoyarnos en dos servicios especializados (**Neon** para la base de datos y **Cloudflare R2** para los archivos) que **cobran solo por lo que se consume** y **crecen automáticamente** cuando aumenta la carga.

Ambas opciones son válidas. Este documento explica la **Opción B** para que la tengáis sobre la mesa antes de decidir.

---

## En qué consiste la Opción B

Tres piezas trabajan juntas, cada una en el proveedor que mejor la hace:

| Pieza | Qué hace | Proveedor |
|---|---|---|
| **La aplicación** | La web del Conciliador donde entra el personal | Vercel |
| **La base de datos** | Guarda usuarios, negocios y el histórico de conciliaciones | Neon |
| **El almacén de archivos** | Guarda los PDF de albaranes y los Excel de pedidos | Cloudflare R2 |

Cada uno de los tres proveedores se ocupa por sí solo de las copias de seguridad, las actualizaciones de seguridad y la redundancia (si un servidor falla, hay otros).

**Vosotros no gestionáis nada de esto**. Simplemente usáis la aplicación como cualquier otra web.

---

## Ventajas de esta opción

### 1. Coste bajo desde el principio, crece con el uso real

En el VPS pagáis un fijo mensual desde el día 1 aunque la app se use poco. Aquí el modelo es distinto: **pagáis por consumo, como la luz o el agua**.

- Los primeros meses, cuando el volumen es bajo, el coste ronda **0 € porque cabéis dentro de los planes gratuitos** de Neon y Cloudflare.
- A medida que se acumulan comparaciones y archivos, el coste sube **gradualmente** — pero de forma proporcional al uso real.
- **No hay que "adivinar" cuánto contratar de antemano**: si consumís poco, pagáis poco; si crecéis, la infraestructura crece con vosotros sin que hagáis nada.

### 2. Escala automáticamente

Si mañana pasáis de 1 farmacia a 5, o de 5 a 20, **no hay que migrar nada**. Los servicios detectan más carga y la absorben. No aparece el momento incómodo de "el servidor se ha quedado pequeño, hay que contratar uno más grande y mover todo".

### 3. Cero mantenimiento por vuestra parte

Las tres piezas se actualizan, se hacen backup y se recuperan solas. Vuestro tiempo (y el nuestro) se puede dedicar a mejorar la aplicación en lugar de a mantener servidores.

### 4. Alta disponibilidad garantizada

Neon y Cloudflare son proveedores de gran tamaño que se comprometen contractualmente a un **99,9 % de disponibilidad**. Si algo se rompe, se recupera solo en minutos.

### 5. Los datos son totalmente vuestros y portables

En cualquier momento podéis:
- Descargar la base de datos entera en un fichero.
- Descargar todos los archivos del almacén.
- Migrar a otra infraestructura (incluido un VPS futuro) si algún día lo preferís.

**No hay lock-in**: si más adelante decidís centralizar todo en un VPS, podemos hacer la migración cuando queráis.

---

## Consideración importante: son varios servicios en vez de uno

La diferencia principal con un VPS es filosófica:

- En un **VPS**, todo vive en el mismo sitio: una única factura, un único panel de control, un único proveedor. Ventaja: **simplicidad de gestión**.
- En esta opción, hay **tres servicios distintos** (Vercel, Neon, Cloudflare): tres facturas, tres paneles, tres proveedores. Ventaja: **cada pieza está en un servicio especializado que la hace mejor y más barato**.

Si os pesa mucho tener "todo en un mismo sitio", el VPS sigue siendo una opción legítima. Si os pesa más el coste y el mantenimiento, esta opción es más eficiente.

---

## Cuánto va a costar realmente

Los tres proveedores cobran solo por consumo. Estimación honesta:

### Escenario base — 1 farmacia (Larokifarm sola)

| Momento | Neon (BD) | R2 (archivos) | Total mensual |
|---|---|---|---|
| Mes 1 | 0 € | 0 € | **0 €** |
| Mes 6 | 1 € | 0,50 € | **~1,50 €** |
| Año 1 (fin) | 1-2 € | 1 € | **~3 €** |
| Año 2 | 2-3 € | 1-2 € | **~4 €** |
| Año 5 | 3-4 € | 3-4 € | **~8 €** |

### Escenario con las 5 farmacias del grupo

| Momento | Neon (BD) | R2 (archivos) | Total mensual |
|---|---|---|---|
| Mes 6 | 3 € | 3 € | **~6 €** |
| Año 1 | 5-8 € | 5-8 € | **~13 €** |
| Año 3 | 10-15 € | 12-18 € | **~30 €** |
| Año 5 | 15-25 € | 25-35 € | **~50 €** |

En resumen: aunque tengáis las 5 farmacias a pleno rendimiento durante 5 años, **es difícil pasar de 50-60 € al mes**. Y realistamente vais a estar la mayor parte del tiempo por debajo de 20 €/mes.

---

## Protección frente a sorpresas en la factura

Un miedo lógico al pagar por consumo es "¿y si un mes se dispara la factura?". Está resuelto:

### 1. Tope máximo de gasto mensual

En ambos servicios (Neon y Cloudflare) fijamos un **tope máximo** al mes. Nuestra recomendación:

- **Neon**: tope en 50 € /mes.
- **Cloudflare R2**: tope en 30 € /mes.

Si por lo que fuera (un error, un pico inesperado, un uso masivo) la factura se acerca al tope, **el servicio se pausa automáticamente y os avisa** en lugar de disparar la factura.

### 2. Alertas por email

Cuando el consumo llegue al 50 %, 75 % y 90 % del tope, os llega un email de aviso. Así siempre sabéis dónde estáis y podéis actuar antes de tocar el techo.

### En la práctica

Con el consumo real que esperamos (2-15 € /mes durante años), esas alertas **no van a saltar nunca**. Están solo como red de seguridad frente a lo imprevisto.

---

## Titularidad y control

Muy importante para vuestra tranquilidad:

- **Las tres cuentas (Vercel, Neon, Cloudflare) se abren con vuestro email de empresa** (por ejemplo `gestion@larokifarm.com`).
- **El método de pago es vuestra tarjeta**. Nada pasa por cuentas mías.
- **Los datos y el código son 100 % vuestros**. El código está en GitHub bajo el usuario de la empresa.

En cualquier momento podéis revocar accesos, exportar todo y cambiar de rumbo.

---

## Qué necesitamos que hagáis vosotros

Solo dos cosas, en total unos 15 minutos el día que decidamos arrancar:

1. **Crear tres cuentas** con el email de empresa que uséis:
   - Cuenta en Vercel (aplicación).
   - Cuenta en Neon (base de datos).
   - Cuenta en Cloudflare (almacén).
2. **Añadir la tarjeta de empresa** en las tres.

Yo os acompaño paso a paso y me encargo de:
- Configurar la aplicación.
- Migrar la base de datos actual al nuevo entorno.
- Migrar los archivos existentes.
- Configurar los topes de gasto y las alertas.
- Verificar que todo funciona antes de "ir en vivo".
- Dejaros un **manual sencillo** con los pasos habituales (dar de alta usuarios, cambiar contraseñas, revisar el uso, etc.).

---

## Qué pasa si mañana no estoy disponible

- **Todos los servicios son estándar de la industria**. Cualquier desarrollador podrá entender y mantener el sistema.
- **El código está documentado y en GitHub bajo vuestra cuenta**. No hay ninguna "caja negra".
- **La aplicación está pensada para funcionar sin mantenimiento** — puede correr durante años sin tocar nada.
- **Manual (RUNBOOK) incluido** con:
  - Qué hacer si algo falla.
  - Cómo cambiar contraseñas.
  - Cómo dar de alta un usuario nuevo.
  - Cómo ver el uso y las facturas de cada servicio.
  - A quién llamar en cada proveedor si hay un problema.

En el peor caso, la app sigue funcionando por sí sola, los datos siguen a salvo, y podéis contratar a cualquier desarrollador Next.js (tecnología muy común) para retomar.

---

## Preguntas frecuentes

**¿Y si Neon o Cloudflare cierran o suben mucho los precios?**
Son empresas grandes y consolidadas (Cloudflare cotiza en bolsa de Nueva York). La probabilidad de que cierren es muy baja. Si algún día lo hicieran, o subieran precios de forma inaceptable, existen alternativas equivalentes (AWS, Google Cloud, Digital Ocean, un VPS…) y todo está diseñado para poder cambiar sin rehacer la aplicación.

**¿Cuánto tardaría migrar de nuevo a un VPS si un día lo decidimos?**
Aproximadamente un fin de semana de trabajo técnico. La app y los datos son portables.

**¿Hay letra pequeña en la facturación?**
No. Se paga solo por lo consumido, sin compromisos anuales ni permanencias. Si algún mes no se usa la app, la factura es cerca de 0 €.

**¿Los datos están en Europa?**
Sí. La base de datos (Neon) se aloja en Frankfurt, Alemania (dentro del EEE). Los archivos (Cloudflare R2) se pueden alojar también en la jurisdicción europea. Cumple con la RGPD.

**¿Podemos tener el histórico si dejamos de usar la app?**
Sí. Podemos exportar tanto la base de datos como los archivos en cualquier momento. Son vuestros.

**¿Y si algún día crecemos mucho? (por ejemplo 20+ farmacias)**
El sistema sigue funcionando sin tocar nada, solo sube la factura proporcionalmente. En ese punto **sí podría empezar a tener sentido consolidar en un VPS grande**, y lo revisamos con datos reales sobre la mesa. Hasta llegar ahí, esta opción es la más eficiente.

---

## Recomendación

Ambas opciones (VPS u Opción B) llevan al mismo resultado en cuanto a que **el Conciliador funcione en producción**. La diferencia está en el modelo de gestión y coste:

- **VPS** = simplicidad de un solo proveedor, coste fijo mensual, algo de mantenimiento y contratación por adelantado.
- **Opción B** = coste por consumo (más eficiente al principio y al medio plazo), escalado automático, cero mantenimiento, tres proveedores distintos coordinados.

**Nuestra recomendación práctica**:
Si os encaja la idea de tener varios proveedores coordinados a cambio de pagar solo por lo que se usa y no tocar nunca la infraestructura, la **Opción B (Neon + Cloudflare R2 + Vercel)** os va a salir más barata durante los primeros años y no os va a dar dolores de cabeza. Cuando el volumen crezca lo suficiente, siempre podemos reevaluar y consolidar en un VPS si tiene sentido en ese momento.

Cuando digáis, arrancamos.

---

*Documento redactado el 2 de julio de 2026. Las estimaciones de coste se basan en las tarifas vigentes en esa fecha y pueden variar ligeramente. Cualquier cambio material se comunicará antes de aplicarse.*
