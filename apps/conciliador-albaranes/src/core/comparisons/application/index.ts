/**
 * Use cases for the Comparison domain (read + aggregates). Admin CRUD that
 * affects comparisons also lives here; frontend handlers/actions invoke them
 * via the module barrel.
 */
export {
  GetComparisonDetailUseCase,
  type ComparisonDetailWithUrls,
} from './getComparisonDetailUseCase';
export {
  GetUsageStatsUseCase,
  MONTHS_HISTORY_DEFAULT,
  TOP_USERS_LIMIT_DEFAULT,
  type UsageStats,
} from './usage';
