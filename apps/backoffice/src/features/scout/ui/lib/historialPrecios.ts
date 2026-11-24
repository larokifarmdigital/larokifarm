import { PERIODOS } from '@/shared/lib/fechasMadrid';

// Opciones de los filtros del historial de precios. Fuera del componente de
// cliente: la vista (servidor) también las usa para validar la URL.
export const OPCIONES_PERIODO = [{ value: '', label: 'Cualquier fecha' }, ...PERIODOS.map((p) => ({ value: p.id, label: p.label }))];

export const OPCIONES_RESULTADO = [
  { value: '', label: 'Todos los resultados' },
  { value: 'con_precio', label: 'Con precio verificado' },
  { value: 'sin_precio', label: 'Sin precio verificado' },
  { value: 'receta', label: 'Con receta' },
];

/** Valor de la URL solo si es una opción conocida (si no, se ignora). */
export const valido = (v: string | null | undefined, opciones: { value: string }[]) =>
  v && opciones.some((o) => o.value === v) ? v : undefined;

export const OPCIONES_RESULTADO_LISTA = [
  { value: '', label: 'Todos los resultados' },
  { value: 'con_precio', label: 'Con precio verificado' },
  { value: 'sin_precio', label: 'Sin precio' },
  { value: 'receta', label: 'Con receta' },
  { value: 'pendiente', label: 'Pendientes' },
];
