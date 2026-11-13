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
import type { Farmacia } from '@/core/farmacias/domain';
import type { Locale } from '@/core/shared';
import { saveFarmaciaPatchAction } from '@/features/farmacias/actions/saveFarmaciaAction';
import { toast } from 'sonner';

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error' | 'conflict';

type State = {
  farmacia: Farmacia;
  /** Última versión confirmada por el servidor: el autoguardado envía solo lo que difiere de ella. */
  baseline: Farmacia;
  originalUpdatedAt: string;
  dirty: boolean;
  /** Sube con cada edición: distingue lo enviado de lo tecleado mientras se guardaba. */
  rev: number;
  saveStatus: SaveStatus;
  /** `network`: se reintenta solo. `invalid`: espera a la siguiente edición. */
  errorKind?: 'network' | 'invalid';
  failedRev?: number;
  lastSavedAt: string | null;
  currentLocale: Locale;
  /** Clave de sectionsConfig (general, hero, …). */
  activeSectionKey: string;
};

type Action =
  | { type: 'PATCH'; patch: Partial<Farmacia> }
  | { type: 'SET_LOCALE'; locale: Locale }
  | { type: 'GO_TO_SECTION'; key: string; locale?: Locale }
  | { type: 'SAVING' }
  | { type: 'SAVED'; farmacia: Farmacia; sentRev: number }
  | { type: 'CLEAN'; rev: number }
  | { type: 'ERROR'; kind: 'network' | 'invalid' }
  | { type: 'CONFLICT' }
  | { type: 'SYNC'; farmacia: Farmacia };

/** Campos que NO viajan en el autoguardado: el servidor los ignora o tienen su propia action. */
const NOT_PATCHABLE = new Set<keyof Farmacia>([
  'id',
  'createdAt',
  'updatedAt',
  'lastEditedBy',
  'status',
  'logo',
  'heroImages',
  'imagenesSobre',
  'resenas',
]);

function diffPatch(current: Farmacia, baseline: Farmacia): Partial<Farmacia> {
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(current) as (keyof Farmacia)[]) {
    if (NOT_PATCHABLE.has(key)) continue;
    if (JSON.stringify(current[key]) !== JSON.stringify(baseline[key])) out[key] = current[key];
  }
  return out as Partial<Farmacia>;
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'PATCH': {
      const farmacia = { ...state.farmacia, ...action.patch };
      // Imágenes, reseñas… se guardan con su propia action: no dejan nada
      // pendiente para el autoguardado (ni disparan el aviso al salir).
      const touchesPatchable = Object.keys(action.patch).some((k) => !NOT_PATCHABLE.has(k as keyof Farmacia));
      if (!touchesPatchable) return { ...state, farmacia, baseline: { ...state.baseline, ...action.patch } };
      return { ...state, farmacia, dirty: true, rev: state.rev + 1 };
    }
    case 'SET_LOCALE':
      return { ...state, currentLocale: action.locale };
    case 'GO_TO_SECTION':
      return {
        ...state,
        activeSectionKey: action.key,
        currentLocale: action.locale ?? state.currentLocale,
      };
    case 'SAVING':
      return { ...state, saveStatus: 'saving' };
    case 'SAVED': {
      const server = action.farmacia;
      const base = {
        ...state,
        baseline: server,
        originalUpdatedAt: server.updatedAt,
        lastSavedAt: server.updatedAt,
        errorKind: undefined,
        failedRev: undefined,
      };
      // Sin ediciones durante el guardado → adoptamos lo que devolvió el servidor.
      if (state.rev === action.sentRev) {
        return { ...base, farmacia: server, dirty: false, saveStatus: 'saved' };
      }
      // Se siguió tecleando mientras se guardaba: conservamos lo local (más
      // nuevo) y queda sucio para que el siguiente autoguardado lo envíe.
      return {
        ...base,
        farmacia: { ...state.farmacia, updatedAt: server.updatedAt },
        dirty: true,
        saveStatus: 'saved',
      };
    }
    case 'CLEAN':
      return state.rev === action.rev ? { ...state, dirty: false } : state;
    case 'ERROR':
      return { ...state, saveStatus: 'error', errorKind: action.kind, failedRev: state.rev };
    case 'CONFLICT':
      return { ...state, saveStatus: 'conflict' };
    case 'SYNC':
      // Tras publicar/archivar desde el editor: el servidor cambió status y updatedAt.
      return {
        ...state,
        farmacia: { ...state.farmacia, status: action.farmacia.status, updatedAt: action.farmacia.updatedAt },
        baseline: { ...state.baseline, status: action.farmacia.status, updatedAt: action.farmacia.updatedAt },
        originalUpdatedAt: action.farmacia.updatedAt,
        lastSavedAt: action.farmacia.updatedAt,
      };
  }
}

type EditorContextValue = State & {
  /** Usuario sin permiso de escritura (rol USER): se ve todo, no se guarda nada. */
  readOnly: boolean;
  patch: (p: Partial<Farmacia>) => void;
  setLocale: (l: Locale) => void;
  /** Cambia de sección (y opcionalmente de idioma) en un solo paso. */
  goToSection: (key: string, locale?: Locale) => void;
  saveNow: () => Promise<void>;
  /** Aplica status/updatedAt devueltos por publicar (evita un falso conflicto). */
  syncFromServer: (f: Farmacia) => void;
};

const EditorContext = createContext<EditorContextValue | null>(null);

const AUTOSAVE_DELAY_MS = 2500;
const RETRY_DELAY_MS = 5000;

export function FarmaciaEditorProvider({
  initial,
  readOnly = false,
  children,
}: {
  initial: Farmacia;
  readOnly?: boolean;
  children: React.ReactNode;
}) {
  const [state, dispatch] = useReducer(reducer, {
    farmacia: initial,
    baseline: initial,
    originalUpdatedAt: initial.updatedAt,
    dirty: false,
    rev: 0,
    saveStatus: 'idle',
    lastSavedAt: initial.updatedAt,
    currentLocale: (initial.idiomasActivos[0] ?? 'es') as Locale,
    activeSectionKey: 'general',
  });

  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const readOnlyRef = useRef(readOnly);

  // Evita repetir el toast de "sin conexión" en cada reintento.
  const networkToastShown = useRef(false);

  const patch = useCallback((p: Partial<Farmacia>) => {
    dispatch({ type: 'PATCH', patch: p });
  }, []);

  const setLocale = useCallback((l: Locale) => {
    dispatch({ type: 'SET_LOCALE', locale: l });
  }, []);

  const goToSection = useCallback((key: string, locale?: Locale) => {
    dispatch({ type: 'GO_TO_SECTION', key, locale });
  }, []);

  const syncFromServer = useCallback((f: Farmacia) => {
    dispatch({ type: 'SYNC', farmacia: f });
  }, []);

  const saveNow = useCallback(async () => {
    const current = stateRef.current;
    if (readOnlyRef.current) return;
    if (!current.dirty || current.saveStatus === 'saving' || current.saveStatus === 'conflict') return;

    const body = diffPatch(current.farmacia, current.baseline);
    if (Object.keys(body).length === 0) {
      dispatch({ type: 'CLEAN', rev: current.rev });
      return;
    }

    dispatch({ type: 'SAVING' });
    try {
      const res = await saveFarmaciaPatchAction(current.farmacia.id, body, current.originalUpdatedAt);
      networkToastShown.current = false;
      if (res.ok) {
        dispatch({ type: 'SAVED', farmacia: res.data, sentRev: current.rev });
      } else if (res.code === 'conflict') {
        dispatch({ type: 'CONFLICT' });
        toast.error('No se guardó: esta farmacia se modificó en otra pestaña o por otra persona.', {
          description: 'Recarga para ver la última versión antes de seguir editando.',
          duration: Infinity,
          action: { label: 'Recargar', onClick: () => window.location.reload() },
        });
      } else {
        dispatch({ type: 'ERROR', kind: 'invalid' });
        toast.error(res.error);
      }
    } catch {
      dispatch({ type: 'ERROR', kind: 'network' });
      if (!networkToastShown.current) {
        networkToastShown.current = true;
        toast.error('Sin conexión: los cambios no se han guardado.', {
          description: 'Lo reintentaremos automáticamente.',
        });
      }
    }
  }, []);

  // Autoguardado (debounce) + reintento si falló la red.
  useEffect(() => {
    if (!state.dirty || state.saveStatus === 'saving' || state.saveStatus === 'conflict') return;
    if (state.saveStatus === 'error' && state.errorKind === 'invalid' && state.failedRev === state.rev) return;
    const delay = state.saveStatus === 'error' && state.errorKind === 'network' ? RETRY_DELAY_MS : AUTOSAVE_DELAY_MS;
    const t = setTimeout(() => {
      void saveNow();
    }, delay);
    return () => clearTimeout(t);
  }, [state.dirty, state.rev, state.saveStatus, state.errorKind, state.failedRev, saveNow]);

  useEffect(() => {
    const onOnline = () => void saveNow();
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [saveNow]);

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
      if (state.dirty && !readOnly) {
        e.preventDefault();
        e.returnValue = '';
      }
    }
    window.addEventListener('beforeunload', beforeUnload);
    return () => window.removeEventListener('beforeunload', beforeUnload);
  }, [state.dirty, readOnly]);

  const value = useMemo<EditorContextValue>(
    () => ({ ...state, readOnly, patch, setLocale, goToSection, saveNow, syncFromServer }),
    [state, readOnly, patch, setLocale, goToSection, saveNow, syncFromServer],
  );

  return <EditorContext.Provider value={value}>{children}</EditorContext.Provider>;
}

export function useFarmaciaEditor() {
  const ctx = useContext(EditorContext);
  if (!ctx) throw new Error('useFarmaciaEditor debe usarse dentro de FarmaciaEditorProvider');
  return ctx;
}
