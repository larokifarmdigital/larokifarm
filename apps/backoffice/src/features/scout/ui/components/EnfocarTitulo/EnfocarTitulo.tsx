'use client';

import { useEffect } from 'react';

/** Tras crear algo y navegar a su página, el foco va al h1 (si lo pidió quien navegó). */
export function EnfocarTitulo() {
  useEffect(() => {
    try {
      if (sessionStorage.getItem('enfocar-titulo') !== '1') return;
      sessionStorage.removeItem('enfocar-titulo');
    } catch {
      return;
    }
    const h1 = document.querySelector<HTMLHeadingElement>('main h1, h1');
    if (!h1) return;
    h1.tabIndex = -1;
    h1.focus();
  }, []);
  return null;
}
