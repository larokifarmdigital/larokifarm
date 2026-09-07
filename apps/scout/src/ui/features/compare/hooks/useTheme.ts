'use client';

import { useSyncExternalStore } from 'react';

const STORAGE_KEY = 'scout:theme';

export type Theme = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

function readStored(): Theme {
  if (typeof window === 'undefined') return 'system';
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (raw === 'light' || raw === 'dark' || raw === 'system') return raw;
  return 'system';
}

function resolveTheme(pref: Theme): ResolvedTheme {
  if (pref === 'system') {
    if (typeof window === 'undefined') return 'light';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return pref;
}

function applyTheme(resolved: ResolvedTheme): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (resolved === 'dark') root.classList.add('dark');
  else root.classList.remove('dark');
}

let cachedRaw: string | null = null;
let cachedTheme: Theme = 'system';

function subscribe(cb: () => void): () => void {
  window.addEventListener('storage', cb);
  window.addEventListener('scout:theme:change', cb);
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  media.addEventListener('change', cb);
  return () => {
    window.removeEventListener('storage', cb);
    window.removeEventListener('scout:theme:change', cb);
    media.removeEventListener('change', cb);
  };
}

function getSnapshot(): Theme {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedTheme = readStored();
  }
  // Efecto lateral controlado: cada snapshot re-aplica la clase por si cambió `system`.
  applyTheme(resolveTheme(cachedTheme));
  return cachedTheme;
}

function getServerSnapshot(): Theme {
  return 'system';
}

export function setTheme(theme: Theme): void {
  if (typeof window === 'undefined') return;
  try {
    if (theme === 'system') window.localStorage.removeItem(STORAGE_KEY);
    else window.localStorage.setItem(STORAGE_KEY, theme);
    cachedRaw = theme === 'system' ? null : theme;
    cachedTheme = theme;
    applyTheme(resolveTheme(theme));
    window.dispatchEvent(new Event('scout:theme:change'));
  } catch {
    /* ignore */
  }
}

export function useTheme(): { theme: Theme; resolved: ResolvedTheme } {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const resolved = resolveTheme(theme);
  return { theme, resolved };
}
