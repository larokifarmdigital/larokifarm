'use client';

import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import type { ReactNode } from 'react';

/** Anima el cambio de sección; `AnimatePresence` en "wait" evita que se solapen las dos vistas. Respeta prefers-reduced-motion. */
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
