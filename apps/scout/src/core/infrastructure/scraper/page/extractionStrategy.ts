import type { CheerioAPI } from 'cheerio';
import type { Extraction } from './extraction';

export type StrategyContext = {
  url: string;
  html: string;
  $: CheerioAPI;
};

export interface ExtractionStrategy {
  name: string;
  run(ctx: StrategyContext): Promise<Extraction | null> | Extraction | null;
}
