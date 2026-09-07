'use client';

import { useSyncExternalStore } from 'react';

const STORAGE_KEY = 'scout:pharmacyUrls';

function parseStored(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((u): u is string => typeof u === 'string' && u.trim().length > 0);
    }
  } catch {
    /* ignore */
  }
  return [];
}

// getSnapshot debe devolver la MISMA referencia entre renders si el string subyacente no cambió,
// o React 19 tira warning "getSnapshot should be cached".
let cachedRaw: string | null = null;
let cachedUrls: string[] = [];

function subscribe(callback: () => void): () => void {
  window.addEventListener('storage', callback);
  window.addEventListener('scout:pharmacyUrls:change', callback);
  return () => {
    window.removeEventListener('storage', callback);
    window.removeEventListener('scout:pharmacyUrls:change', callback);
  };
}

function getSnapshot(): string[] {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedUrls = parseStored(raw);
  }
  return cachedUrls;
}

const EMPTY: string[] = [];
function getServerSnapshot(): string[] {
  return EMPTY;
}

/** Guarda la lista y notifica a todos los suscriptores (incluida esta misma pestaña). */
export function savePharmacyUrls(urls: string[]): void {
  try {
    const raw = JSON.stringify(urls);
    window.localStorage.setItem(STORAGE_KEY, raw);
    cachedRaw = raw;
    cachedUrls = [...urls];
    window.dispatchEvent(new Event('scout:pharmacyUrls:change'));
  } catch {
    /* ignore quota errors */
  }
}

/** Suscribe el componente a la lista de URLs en localStorage. SSR-safe. */
export function usePharmacyUrls(): string[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
