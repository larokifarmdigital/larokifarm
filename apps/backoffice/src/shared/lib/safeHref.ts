/**
 * true si el enlace es seguro para un `href`: relativo, ancla o
 * http(s)/mailto/tel. Rechaza `javascript:`, `data:`, `vbscript:`… incluso
 * con espacios o caracteres de control intercalados (los navegadores los
 * ignoran al parsear la URL).
 */
export function isSafeHref(url: string): boolean {
  const compact = url.replace(/[\u0000- \u007f]/g, '');
  if (!/^[a-z][a-z0-9+.-]*:/i.test(compact)) return true; // relativo, #ancla, /ruta
  return /^(https?|mailto|tel):/i.test(compact);
}
