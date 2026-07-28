import type { ExtractionStrategy } from '../../domain/ports/ExtractionStrategy';
import { jsonLdStrategy } from './jsonLdStrategy';
import { ogMetaStrategy } from './ogMetaStrategy';
import { microdataStrategy } from './microdataStrategy';
import { shopifyStrategy } from './shopifyStrategy';
import { prestashopStrategy } from './prestashopStrategy';

export const STRATEGIES: ExtractionStrategy[] = [
  jsonLdStrategy,
  ogMetaStrategy,
  microdataStrategy,
  shopifyStrategy,
  prestashopStrategy,
];
