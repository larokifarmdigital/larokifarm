'use client';

import { useSyncExternalStore } from 'react';

const STORAGE_KEY = 'scout:searchHistory';
const MAX_ENTRIES = 10;

export interface SearchHistoryEntry {
  /** Clave para dedup: normalización de los inputs (lowercase, trim). */
  key: string;
  cn?: string;
  ean?: string;
  nombre?: string;
  /** Contexto post-búsqueda para mostrar en el histórico. */
  resultsCount: number;
  bestPrice?: number;
  moneda?: string;
  /** Epoch ms. */
  timestamp: number;
}

function normalizeKey(entry: Pick<SearchHistoryEntry, 'cn' | 'ean' | 'nombre'>): string {
  return [
    (entry.cn ?? '').trim(),
    (entry.ean ?? '').trim(),
    (entry.nombre ?? '').trim().toLowerCase(),
  ].join('|');
}

function parseStored(raw: string | null): SearchHistoryEntry[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter(
        (e): e is SearchHistoryEntry =>
          e && typeof e === 'object' && typeof e.key === 'string' && typeof e.timestamp === 'number',
      );
    }
  } catch {
    /* ignore */
  }
  return [];
}

let cachedRaw: string | null = null;
let cachedEntries: SearchHistoryEntry[] = [];

function subscribe(callback: () => void): () => void {
  window.addEventListener('storage', callback);
  window.addEventListener('scout:searchHistory:change', callback);
  return () => {
    window.removeEventListener('storage', callback);
    window.removeEventListener('scout:searchHistory:change', callback);
  };
}

function getSnapshot(): SearchHistoryEntry[] {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedEntries = parseStored(raw);
  }
  return cachedEntries;
}

const EMPTY: SearchHistoryEntry[] = [];
function getServerSnapshot(): SearchHistoryEntry[] {
  return EMPTY;
}

function persist(entries: SearchHistoryEntry[]): void {
  try {
    const raw = JSON.stringify(entries);
    window.localStorage.setItem(STORAGE_KEY, raw);
    cachedRaw = raw;
    cachedEntries = [...entries];
    window.dispatchEvent(new Event('scout:searchHistory:change'));
  } catch {
    /* quota ignore */
  }
}

/** Suscribe a las búsquedas recientes. SSR-safe. */
export function useSearchHistory(): SearchHistoryEntry[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** Añade una entrada al historial. Dedup por clave (últimos inputs), cap MAX_ENTRIES. */
export function pushSearchHistory(
  entry: Omit<SearchHistoryEntry, 'key' | 'timestamp'>,
): void {
  if (typeof window === 'undefined') return;
  const current = parseStored(window.localStorage.getItem(STORAGE_KEY));
  const key = normalizeKey(entry);
  // Sin datos útiles (todos vacíos) → ignoramos
  if (!key.replace(/\|/g, '')) return;
  const withoutDupe = current.filter((e) => e.key !== key);
  const next: SearchHistoryEntry = { ...entry, key, timestamp: Date.now() };
  persist([next, ...withoutDupe].slice(0, MAX_ENTRIES));
}

export function clearSearchHistory(): void {
  if (typeof window === 'undefined') return;
  persist([]);
}

/** Formato "hace X min / X horas / X días" para mostrar en la UI. */
export function relativeTime(ts: number): string {
  const diffMs = Date.now() - ts;
  const min = Math.floor(diffMs / 60_000);
  if (min < 1) return 'ahora mismo';
  if (min < 60) return `hace ${min} min`;
  const hours = Math.floor(min / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `hace ${days} día${days === 1 ? '' : 's'}`;
  return new Date(ts).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}
