'use client';

import { createContext, useCallback, useContext, useSyncExternalStore } from 'react';
import { usePathname } from 'next/navigation';

type SidebarState = {
  collapsed: boolean;
  autoCollapsed: boolean;
  toggle: () => void;
  setCollapsed: (v: boolean) => void;
};

const SidebarContext = createContext<SidebarState | null>(null);

const STORAGE_KEY = 'larokifarm.sidebar.collapsed';

// External store para localStorage. Usa useSyncExternalStore para
// evitar setState en useEffect (regla react-hooks/set-state-in-effect).
const listeners = new Set<() => void>();

function subscribe(cb: () => void) {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) cb();
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener('storage', onStorage);
  };
}

function getSnapshot(): boolean | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw === null ? null : raw === 'true';
  } catch {
    return null;
  }
}

function getServerSnapshot(): boolean | null {
  return null;
}

function writeManualCollapsed(v: boolean | null) {
  try {
    if (v === null) localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, String(v));
  } catch {}
  listeners.forEach((cb) => cb());
}

function shouldAutoCollapse(pathname: string): boolean {
  if (pathname === '/farmacias' || pathname === '/farmacias/nueva') return false;
  if (pathname.startsWith('/farmacias/')) return true;
  return false;
}

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const manualCollapsed = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const autoCollapsed = shouldAutoCollapse(pathname);
  const collapsed = manualCollapsed ?? autoCollapsed;

  const toggle = useCallback(() => {
    writeManualCollapsed(!collapsed);
  }, [collapsed]);

  const setCollapsed = useCallback((v: boolean) => writeManualCollapsed(v), []);

  return (
    <SidebarContext.Provider value={{ collapsed, autoCollapsed, toggle, setCollapsed }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const ctx = useContext(SidebarContext);
  if (!ctx) throw new Error('useSidebar debe usarse dentro de SidebarProvider');
  return ctx;
}
