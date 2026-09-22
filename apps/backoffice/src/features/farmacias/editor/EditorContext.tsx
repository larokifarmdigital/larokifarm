'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from 'react';
import type { Farmacia, Locale } from '@/types/content';
import { saveFarmaciaPatchAction } from '@/lib/actions/farmacia-save-action';
import { toast } from 'sonner';

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

type State = {
  farmacia: Farmacia;
  originalUpdatedAt: string;
  dirty: boolean;
  saveStatus: SaveStatus;
  lastSavedAt: string | null;
  currentLocale: Locale;
};

type Action =
  | { type: 'PATCH'; patch: Partial<Farmacia> }
  | { type: 'SET_LOCALE'; locale: Locale }
  | { type: 'SAVING' }
  | { type: 'SAVED'; farmacia: Farmacia }
  | { type: 'ERROR' }
  | { type: 'RESET_DIRTY' };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'PATCH':
      return {
        ...state,
        farmacia: { ...state.farmacia, ...action.patch },
        dirty: true,
      };
    case 'SET_LOCALE':
      return { ...state, currentLocale: action.locale };
    case 'SAVING':
      return { ...state, saveStatus: 'saving' };
    case 'SAVED':
      return {
        ...state,
        farmacia: action.farmacia,
        originalUpdatedAt: action.farmacia.updatedAt,
        dirty: false,
        saveStatus: 'saved',
        lastSavedAt: action.farmacia.updatedAt,
      };
    case 'ERROR':
      return { ...state, saveStatus: 'error' };
    case 'RESET_DIRTY':
      return { ...state, dirty: false };
  }
}

type EditorContextValue = State & {
  patch: (p: Partial<Farmacia>) => void;
  setLocale: (l: Locale) => void;
  saveNow: () => Promise<void>;
};

const EditorContext = createContext<EditorContextValue | null>(null);

const AUTOSAVE_DELAY_MS = 2500;

export function FarmaciaEditorProvider({
  initial,
  children,
}: {
  initial: Farmacia;
  children: React.ReactNode;
}) {
  const [state, dispatch] = useReducer(reducer, {
    farmacia: initial,
    originalUpdatedAt: initial.updatedAt,
    dirty: false,
    saveStatus: 'idle',
    lastSavedAt: initial.updatedAt,
    currentLocale: (initial.idiomasActivos[0] ?? 'es') as Locale,
  });

  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const patch = useCallback((p: Partial<Farmacia>) => {
    dispatch({ type: 'PATCH', patch: p });
  }, []);

  const setLocale = useCallback((l: Locale) => {
    dispatch({ type: 'SET_LOCALE', locale: l });
  }, []);

  const saveNow = useCallback(async () => {
    const current = stateRef.current;
    if (!current.dirty || current.saveStatus === 'saving') return;
    dispatch({ type: 'SAVING' });
    const {
      id,
      createdAt: _c,
      updatedAt: _u,
      lastEditedBy: _l,
      ...patchBody
    } = current.farmacia;
    void _c;
    void _u;
    void _l;
    const res = await saveFarmaciaPatchAction(id, patchBody);
    if (res.ok) {
      dispatch({ type: 'SAVED', farmacia: res.data });
    } else {
      dispatch({ type: 'ERROR' });
      toast.error(res.error);
    }
  }, []);

  useEffect(() => {
    if (!state.dirty) return;
    const t = setTimeout(() => {
      void saveNow();
    }, AUTOSAVE_DELAY_MS);
    return () => clearTimeout(t);
  }, [state.dirty, state.farmacia, saveNow]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        void saveNow();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [saveNow]);

  useEffect(() => {
    function beforeUnload(e: BeforeUnloadEvent) {
      if (state.dirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    }
    window.addEventListener('beforeunload', beforeUnload);
    return () => window.removeEventListener('beforeunload', beforeUnload);
  }, [state.dirty]);

  const value = useMemo<EditorContextValue>(
    () => ({ ...state, patch, setLocale, saveNow }),
    [state, patch, setLocale, saveNow],
  );

  return <EditorContext.Provider value={value}>{children}</EditorContext.Provider>;
}

export function useFarmaciaEditor() {
  const ctx = useContext(EditorContext);
  if (!ctx) throw new Error('useFarmaciaEditor debe usarse dentro de FarmaciaEditorProvider');
  return ctx;
}
