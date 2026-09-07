import { CompareView } from '@/ui/features/compare';

/**
 * Timeout de las server actions llamadas desde esta ruta.
 * Vercel Hobby: default 10s, configurable hasta 60s. Vercel Pro: hasta 300s.
 * Nuestra búsqueda (Shopping + Web + scraping paralelo) puede tardar 15-45s.
 */
export const maxDuration = 60;

export default function Home() {
  return <CompareView />;
}
