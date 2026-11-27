'use client';

import { useMemo } from 'react';
import { useFarmaciaEditor } from '@/features/farmacias/ui/context/EditorContext';
import { countBySection } from '@/features/farmacias/ui/lib/i18nStatus';
import { SECTION_BY_KEY } from '@/features/farmacias/ui/lib/sectionsConfig';

export type EstadoSeccion = { faltaTraducir: boolean; sinPublicar: boolean };

/** Por sección del editor: si le falta traducir algo y si tiene cambios sin publicar. */
export function useEstadoSecciones(): (key: string) => EstadoSeccion {
  const { farmacia, cambios } = useFarmaciaEditor();
  return useMemo(() => {
    const faltan = new Set(
      countBySection(farmacia)
        .filter((s) => Object.values(s.byLocale).some((c) => c.missing > 0))
        .map((s) => s.key as string),
    );
    const sinPublicar = new Set((cambios ?? []).map((c) => c.seccion));
    return (key: string) => ({
      faltaTraducir: Boolean(SECTION_BY_KEY[key]?.multilang) && faltan.has(key),
      sinPublicar: sinPublicar.has(key),
    });
  }, [farmacia, cambios]);
}

/**
 * Puntos del menú de secciones: rojo = falta traducir, ámbar = sin publicar.
 * `conTexto` (hoja móvil) los acompaña de texto; si no, el texto es para lectores de pantalla.
 */
export function MarcasSeccion({ estado, conTexto = false }: { estado: EstadoSeccion; conTexto?: boolean }) {
  if (!estado.faltaTraducir && !estado.sinPublicar) return null;
  return (
    <span className="ml-auto inline-flex shrink-0 items-center gap-2">
      {estado.sinPublicar && <Punto color="bg-[var(--color-yellow-ink)]" texto="Sin publicar" conTexto={conTexto} tono="text-[var(--color-yellow-ink)]" />}
      {estado.faltaTraducir && <Punto color="bg-[var(--color-red-ink)]" texto="Falta traducir" conTexto={conTexto} tono="text-[var(--color-red-ink)]" />}
    </span>
  );
}

function Punto({ color, texto, conTexto, tono }: { color: string; texto: string; conTexto: boolean; tono: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-[12.5px] ${tono}`} title={conTexto ? undefined : texto}>
      <span aria-hidden className={`h-[7px] w-[7px] rounded-full ${color}`} />
      {conTexto ? texto : <span className="sr-only">({texto.toLowerCase()})</span>}
    </span>
  );
}
