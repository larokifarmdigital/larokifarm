import { procesarEjecucion } from '../application/procesarEjecucion';
import { cima } from './cima';
import { farmaciasPara, sinBusquedaPorNombre } from './farmacias';
import { nomenclator } from './nomenclator';
import { getPriceCheckRepository, getPriceListRepository } from './index';
import { registrarUsoComparador } from './usoComparador';

/**
 * Procesa una comparación de lista con las dependencias reales. Lo usan el
 * script de GitHub Actions (listas grandes) y el propio backoffice (listas
 * pequeñas, con `after()`). Sin búsqueda por nombre: en listas casi no aporta
 * y duplica las peticiones.
 */
export function procesarComparacion(runId: string, log: (m: string) => void = () => {}): Promise<void> {
  return sinBusquedaPorNombre(() =>
    procesarEjecucion(runId, {
      listas: getPriceListRepository(),
      consultas: getPriceCheckRepository(),
      medicamentos: cima,
      precioOficial: nomenclator,
      farmaciasPara,
      registrarUso: registrarUsoComparador,
      log,
    }),
  );
}
