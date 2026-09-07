import type { ExtractionStrategy } from '../domain/ExtractionStrategy';
import { jsonLdStrategy } from './jsonLd';
import { ogMetaStrategy } from './ogMeta';
import { microdataStrategy } from './microdata';
import { shopifyStrategy } from './shopify';
import { prestashopStrategy } from './prestashop';

export const STRATEGIES: ExtractionStrategy[] = [
  jsonLdStrategy,
  ogMetaStrategy,
  microdataStrategy,
  shopifyStrategy,
  prestashopStrategy,
];
