// Utilidades del historial de conciliaciones. Las fechas viven en shared/lib
// porque también las usa el comparador de precios.
export * from '@/shared/lib/fechasMadrid';

/** Claves de la URL que cuentan como filtro (page no). `supplier` = URL antigua. */
export const CLAVES_FILTRO = ['q', 'supplier', 'periodo', 'from', 'to', 'status', 'reportes', 'business'] as const;
