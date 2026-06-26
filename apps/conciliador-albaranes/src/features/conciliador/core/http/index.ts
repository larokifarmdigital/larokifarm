/**
 * Contratos HTTP del conciliador: tipos de request/response compartidos por el
 * route handler (`app/api/conciliar/route.ts`) y el cliente fetch
 * (`ui/lib/conciliar.ts`).
 */
export type {
  DetalleConciliacion,
  ResultadoPar,
  RespuestaConciliacion,
} from './contrato';
