'use client';

/**
 * Campo de imagen reutilizable, dos modos.
 *
 *   - mode="multi"  → galería tipo grid (hero, sobre, gallery). Cada tile
 *     abre un modal para editar el texto alternativo por idioma. Ver patrón
 *     canónico FAQs.
 *   - mode="single" → una sola imagen (logo, OG). Al subir reemplaza; botón
 *     "Reemplazar" (abre file picker) y "Eliminar" (con ConfirmDialog). SIN
 *     modal de alt — logo y og no necesitan alt multilang editable aquí.
 *
 * Reglas de diseño:
 *   - Acciones visibles siempre en touch (no hover-only). En desktop
 *     aparecen con hover para no competir con la propia imagen.
 *   - Delete siempre pasa por ConfirmDialog ("confirm before destruction").
 *   - Reemplazo NO confirma: es el flujo esperado del usuario tras pulsar
 *     "Reemplazar".
 */

import { MultiImageField } from './MultiImageField';
import { SingleImageField } from './SingleImageField';
import type { MultiProps, SingleProps } from './imageFieldShared';

export function ImageGalleryField(props: MultiProps | SingleProps) {
  if (props.mode === 'single') return <SingleImageField {...props} />;
  return <MultiImageField {...props} />;
}
