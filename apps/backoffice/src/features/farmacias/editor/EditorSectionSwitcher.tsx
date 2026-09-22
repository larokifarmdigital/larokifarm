'use client';

import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import type { ReactNode } from 'react';

/**
 * Envoltorio que anima la transición entre secciones del editor.
 * Al cambiar `keyId`, la vista actual sale con un fade + slide hacia arriba
 * y la nueva entra desde abajo con el mismo desplazamiento. AnimatePresence
 * en modo "wait" garantiza que no se solapen durante el swap, así el usuario
 * ve un único bloque de contenido en pantalla en todo momento.
 *
 * Respeta prefers-reduced-motion: sin desplazamiento y con transición mínima.
 */
export function EditorSectionSwitcher({
  keyId,
  children,
}: {
  keyId: string;
  children: ReactNode;
}) {
  const reduced = useReducedMotion();

  const initial = reduced ? { opacity: 0 } : { opacity: 0, y: 12, filter: 'blur(4px)' };
  const animate = reduced ? { opacity: 1 } : { opacity: 1, y: 0, filter: 'blur(0px)' };
  const exit = reduced ? { opacity: 0 } : { opacity: 0, y: -8, filter: 'blur(4px)' };

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={keyId}
        initial={initial}
        animate={animate}
        exit={exit}
        transition={{
          duration: reduced ? 0.12 : 0.28,
          ease: [0.32, 0.72, 0, 1],
        }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
