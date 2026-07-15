export { HistoryListView } from './ui/views/HistoryListView';
export type { HistoryListParams } from './ui/views/HistoryListView';
export { ComparisonDetailView } from './ui/views/ComparisonDetailView';
// NOTE: ReportsSection NO se re-exporta desde este barrel a propósito — mezclarlo con
// los views server-side hace que un client component que lo importe arrastre Prisma y
// falle con "UnhandledSchemeError: node:crypto" en el build. Importar directamente:
//   import { ReportsSection } from '@/features/history/ui/components/ReportsSection';
