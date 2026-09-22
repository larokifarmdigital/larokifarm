'use client';

import { useEffect, useState } from 'react';

export function useMediaQuery(query: string, ssrDefault = false): boolean {
  const [matches, setMatches] = useState(ssrDefault);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia(query);
    const update = () => setMatches(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, [query]);

  return matches;
}
