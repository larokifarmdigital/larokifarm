/**
 * API pública de `core/motor`: el engine de conciliación + el use case que lo
 * orquesta con persistencia (subida a storage + Comparison en BD).
 *
 * Dependencias cross-core: `core/comparaciones` (escribir Comparison),
 * `core/storage` (subir archivos). Acíclico — solo escribe, no lee.
 */
export * from './domain';
export * from './application';
