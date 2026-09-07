/**
 * Información detallada de un medicamento regulado (identificado vía CIMA).
 * Se muestra en una card informativa cuando el user busca por CN.
 */
export interface MedicamentoInfo {
  /** Nombre comercial completo. */
  nombre: string;
  /** Número de registro AEMPS (7 dígitos, ej: "69360"). */
  nregistro?: string;
  /** Código Nacional del medicamento. */
  cn?: string;
  /** EAN de la primera presentación. */
  ean?: string;
  /** Principios activos (nombre + dosis). Ej: "Paracetamol 500mg + Codeína 30mg". */
  principiosActivos?: string;
  /** Laboratorio titular. */
  laboratorio?: string;
  /** Vía de administración (oral, tópica, etc.). */
  viaAdministracion?: string;
  /** true si requiere receta médica. */
  necesitaReceta?: boolean;
  /** true si es medicamento genérico (EFG). */
  esGenerico?: boolean;
  /** URL al prospecto oficial en CIMA (PDF). */
  prospectoUrl?: string;
  /** URL a la ficha técnica oficial en CIMA (PDF). */
  fichaTecnicaUrl?: string;
  /** URLs a fotos oficiales del envase/formato. */
  fotos?: string[];
}
