'use client';

import { createContext, useCallback, useContext, useMemo, useState, useSyncExternalStore } from 'react';
import { useFarmaciaEditor } from '@/features/farmacias/ui/context/EditorContext';
import { tieneVistaPrevia } from '@/features/farmacias/ui/lib/vistaPrevia';

// ≥ lg (1024 px) la vista previa va en una columna junto al formulario y se
// recuerda abierta en este navegador; por debajo ocupa la pantalla y no se
// recuerda (abrirla sola taparía el editor). Stores externos con
// useSyncExternalStore: sin setState en efectos (react-hooks/set-state-in-effect).

const MQ = '(min-width: 1024px)';

function subscribeMq(cb: () => void) {
  const mq = window.matchMedia(MQ);
  mq.addEventListener('change', cb);
  return () => mq.removeEventListener('change', cb);
}

/** true en escritorio (≥ lg). En el servidor, false. */
export function useEsEscritorio(): boolean {
  return useSyncExternalStore(
    subscribeMq,
    () => window.matchMedia(MQ).matches,
    () => false,
  );
}

const CLAVE = 'larokifarm.editor.vista-previa';
const oyentes = new Set<() => void>();

function subscribeGuardado(cb: () => void) {
  oyentes.add(cb);
  return () => {
    oyentes.delete(cb);
  };
}

function leerGuardado(): boolean {
  try {
    return localStorage.getItem(CLAVE) === '1';
  } catch {
    return false;
  }
}

function escribirGuardado(v: boolean) {
  try {
    localStorage.setItem(CLAVE, v ? '1' : '0');
  } catch {
    /* sin almacenamiento: solo no se recuerda */
  }
  oyentes.forEach((cb) => cb());
}

type VistaPreviaValue = {
  /** La landing de esta farmacia tiene /vista-previa. */
  disponible: boolean;
  /** Abierta en el tamaño de pantalla actual. */
  abierta: boolean;
  escritorio: boolean;
  abrir: () => void;
  cerrar: () => void;
  alternar: () => void;
};

const Ctx = createContext<VistaPreviaValue | null>(null);

export function VistaPreviaProvider({ children }: { children: React.ReactNode }) {
  const { farmacia } = useFarmaciaEditor();
  const disponible = tieneVistaPrevia(farmacia.slug);
  const escritorio = useEsEscritorio();
  const guardada = useSyncExternalStore(subscribeGuardado, leerGuardado, () => false);
  const [movil, setMovil] = useState(false);

  const abierta = disponible && (escritorio ? guardada : movil);

  const abrir = useCallback(() => {
    if (window.matchMedia(MQ).matches) escribirGuardado(true);
    else setMovil(true);
  }, []);
  const cerrar = useCallback(() => {
    if (window.matchMedia(MQ).matches) escribirGuardado(false);
    setMovil(false);
    // El foco vuelve al botón que la abre (el panel desaparece y lo perdería).
    window.setTimeout(() => {
      const botones = document.querySelectorAll<HTMLElement>('[data-abrir-vista-previa]');
      Array.from(botones).find((b) => b.getClientRects().length > 0)?.focus();
    }, 60);
  }, []);

  const value = useMemo(
    () => ({ disponible, abierta, escritorio, abrir, cerrar, alternar: abierta ? cerrar : abrir }),
    [disponible, abierta, escritorio, abrir, cerrar],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useVistaPrevia() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useVistaPrevia debe usarse dentro de VistaPreviaProvider');
  return ctx;
}
