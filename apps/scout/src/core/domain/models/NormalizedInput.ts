/**
 * Input normalizado tras validar y resolver códigos vs CIMA.
 * Representa un producto listo para buscar en las fuentes externas.
 */
export type NormalizedInput = {
  /** Representación cruda del input original para logs. */
  raw: string;
  ean?: string;
  nombre?: string;
  /** De dónde salió el trigger principal — CN gana si está, luego EAN, luego nombre libre. */
  origen: 'ean' | 'cn' | 'nombre';
  cn?: string;
  /** Nombre exacto tal como lo tipeó el usuario (útil para chips en la UI y compartir URL). */
  nombreHint?: string;
};
