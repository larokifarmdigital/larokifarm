'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react';
import {
  cambiosSinPublicar,
  tieneCambiosSinPublicar,
  validateFarmacia,
  type CambioSinPublicar,
  type Farmacia,
  type FieldIssue,
} from '@/core/farmacias/domain';
import { LOCALE_NOMBRE, LOCALE_PRINCIPAL, type Locale } from '@/core/shared';
import { saveFarmaciaPatchAction } from '@/features/farmacias/actions/saveFarmaciaAction';
import {
  activarIdiomaAction,
  desactivarIdiomaAction,
  eliminarTraduccionesAction,
} from '@/features/farmacias/actions/idiomasActions';
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
  // Idiomas: solo con activarIdioma (acción explícita). Publicación: solo lectura.
  'idiomasActivos',
  'ultimaPublicacion',
  // Copia de lo publicado: solo la escribe Publicar.
  'publicado',
]);

/**
 * El servidor reescribe servicios/puntos fuertes/preguntas con ids nuevos al
 * guardar. Si adoptáramos esos ids, React volvería a montar todas las filas y
 * el foco del teclado se perdería tras cada guardado. Los ids solo se usan en
 * el navegador, así que conservamos los locales cuando la lista es la misma.
 */
function conservarIds(server: Farmacia, local: Farmacia): Farmacia {
  const mismo = <T extends { id: string }>(s: T[] | undefined, l: T[] | undefined): T[] | undefined =>
    s && l && s.length === l.length ? s.map((x, i) => ({ ...x, id: l[i].id })) : s;
  return {
    ...server,
    servicios: mismo(server.servicios, local.servicios) ?? server.servicios,
    faqs: mismo(server.faqs, local.faqs) ?? server.faqs,
    featuresLista: mismo(server.featuresLista, local.featuresLista),
  };
}

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
      const server = conservarIds(action.farmacia, state.farmacia);
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
    case 'SYNC': {
      // Tras publicar o activar un idioma: el servidor cambió estos campos.
      const f = action.farmacia;
      const sync = {
        status: f.status,
        updatedAt: f.updatedAt,
        ultimaPublicacion: f.ultimaPublicacion,
        idiomasActivos: f.idiomasActivos,
        publicado: f.publicado,
      };
      return {
        ...state,
        farmacia: { ...state.farmacia, ...sync },
        baseline: { ...state.baseline, ...sync },
        originalUpdatedAt: f.updatedAt,
        lastSavedAt: f.updatedAt,
      };
    }
  }
}

type EditorContextValue = State & {
  /** Usuario sin permiso de escritura (rol USER): se ve todo, no se guarda nada. */
  readOnly: boolean;
  /** SUPER_ADMIN: ve los campos técnicos (identificador, mapa embebido, Google). */
  esAdmin: boolean;
  /** Hay cambios (guardados o no) que todavía no están en la web. */
  pendientePublicar: boolean;
  /**
   * Qué difiere de lo publicado, campo a campo. `null` si la farmacia aún no
   * tiene copia publicada (se sabrá a partir de la próxima publicación).
   */
  cambios: CambioSinPublicar[] | null;
  /** Vuelve un campo a lo publicado (se guarda solo, como cualquier edición). */
  deshacerCambio: (c: CambioSinPublicar) => void;
  /** Añade/reactiva un idioma en la web ("Idiomas de la web"; pulsar una pestaña no escribe). */
  activarIdioma: (l: Locale) => Promise<boolean>;
  /** Deja de mostrarlo en la web (conserva los textos). Nunca el castellano. */
  desactivarIdioma: (l: Locale) => Promise<boolean>;
  /** Borra para siempre los textos de un idioma desactivado. */
  eliminarTraducciones: (l: Locale) => Promise<boolean>;
  patch: (p: Partial<Farmacia>) => void;
  setLocale: (l: Locale) => void;
  /** Cambia de sección (y opcionalmente de idioma) en un solo paso. */
  /** `enfocar`: tras cambiar de sección, el foco va a su título (cuando el botón pulsado desaparece). */
  goToSection: (key: string, locale?: Locale, enfocar?: boolean) => void;
  saveNow: () => Promise<void>;
  /** Aplica status/updatedAt devueltos por publicar (evita un falso conflicto). */
  syncFromServer: (f: Farmacia) => void;
  /** Problemas que impiden publicar (core/farmacias/domain/validation). */
  issues: FieldIssue[];
  /** El error de un campo solo se enseña tras salir de él (o tras intentar publicar). */
  isErrorVisible: (field: string) => boolean;
  touch: (field: string) => void;
  /** Muestra todos los errores (se llama al intentar publicar). */
  revealErrors: () => void;
};

const EditorContext = createContext<EditorContextValue | null>(null);

const AUTOSAVE_DELAY_MS = 2500;
const RETRY_DELAY_MS = 5000;

export function FarmaciaEditorProvider({
  initial,
  readOnly = false,
  esAdmin = false,
  children,
}: {
  initial: Farmacia;
  readOnly?: boolean;
  esAdmin?: boolean;
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
    activeSectionKey: 'horario',
  });

  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const readOnlyRef = useRef(readOnly);
  const [touched, setTouched] = useState<ReadonlySet<string>>(() => new Set());
  const [showAllErrors, setShowAllErrors] = useState(false);
  const issues = useMemo(() => validateFarmacia(state.farmacia), [state.farmacia]);
  const touch = useCallback((field: string) => {
    setTouched((prev) => (prev.has(field) ? prev : new Set(prev).add(field)));
  }, []);
  const revealErrors = useCallback(() => setShowAllErrors(true), []);
  const isErrorVisible = useCallback((field: string) => showAllErrors || touched.has(field), [showAllErrors, touched]);

  // Evita repetir el toast de "sin conexión" en cada reintento.
  const networkToastShown = useRef(false);

  const patch = useCallback((p: Partial<Farmacia>) => {
    dispatch({ type: 'PATCH', patch: p });
  }, []);

  const setLocale = useCallback((l: Locale) => {
    dispatch({ type: 'SET_LOCALE', locale: l });
  }, []);

  const goToSection = useCallback((key: string, locale?: Locale, enfocar = false) => {
    const anterior = enfocar ? document.querySelector('[data-titulo-seccion]') : null;
    dispatch({ type: 'GO_TO_SECTION', key, locale });
    if (!enfocar) return;
    // La sección nueva entra con animación: esperar a que su título exista.
    let intentos = 0;
    const buscar = () => {
      const t = document.querySelector<HTMLElement>('[data-titulo-seccion]');
      if (t && t !== anterior) t.focus();
      else if (intentos++ < 90) requestAnimationFrame(buscar);
    };
    requestAnimationFrame(buscar);
  }, []);

  const syncFromServer = useCallback((f: Farmacia) => {
    dispatch({ type: 'SYNC', farmacia: f });
  }, []);

  const activarIdioma = useCallback(async (l: Locale) => {
    if (readOnlyRef.current) return false;
    try {
      const res = await activarIdiomaAction(stateRef.current.farmacia.id, l);
      if (!res.ok) {
        toast.error(res.error);
        return false;
      }
      dispatch({ type: 'SYNC', farmacia: res.data });
      toast.success(`Has añadido el ${LOCALE_NOMBRE[l]}`, {
        description: 'Ya puedes traducir los textos. Lo que falte se verá en castellano. Saldrá en la web cuando publiques.',
      });
      return true;
    } catch {
      toast.error('No se pudo activar el idioma. Revisa la conexión.');
      return false;
    }
  }, []);

  const desactivarIdioma = useCallback(async (l: Locale) => {
    if (readOnlyRef.current) return false;
    try {
      const res = await desactivarIdiomaAction(stateRef.current.farmacia.id, l);
      if (!res.ok) {
        toast.error(res.error);
        return false;
      }
      dispatch({ type: 'SYNC', farmacia: res.data });
      if (stateRef.current.currentLocale === l) dispatch({ type: 'SET_LOCALE', locale: LOCALE_PRINCIPAL });
      toast.success(`Has desactivado el ${LOCALE_NOMBRE[l]}`, {
        description: 'Los textos se conservan. La web dejará de mostrarlo cuando publiques.',
      });
      return true;
    } catch {
      toast.error('No se pudo desactivar el idioma. Revisa la conexión.');
      return false;
    }
  }, []);

  const saveNowRef = useRef<() => Promise<void>>(async () => {});

  const eliminarTraducciones = useCallback(async (l: Locale) => {
    if (readOnlyRef.current) return false;
    try {
      // Primero se guarda lo pendiente: el servidor parte de lo guardado
      await saveNowRef.current();
      const sentRev = stateRef.current.rev;
      const res = await eliminarTraduccionesAction(stateRef.current.farmacia.id, l);
      if (!res.ok) {
        toast.error(res.error);
        return false;
      }
      dispatch({ type: 'SAVED', farmacia: res.data, sentRev });
      if (stateRef.current.currentLocale === l) dispatch({ type: 'SET_LOCALE', locale: LOCALE_PRINCIPAL });
      toast.success(`Textos en ${LOCALE_NOMBRE[l]} eliminados`);
      return true;
    } catch {
      toast.error('No se pudieron eliminar los textos. Revisa la conexión.');
      return false;
    }
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
  useEffect(() => {
    saveNowRef.current = saveNow;
  }, [saveNow]);

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

  const cambios = useMemo(() => cambiosSinPublicar(state.farmacia), [state.farmacia]);
  // Con copia publicada se sabe exactamente; sin ella, por fechas (como antes).
  const pendientePublicar =
    cambios && state.farmacia.status === 'published'
      ? cambios.length > 0
      : state.dirty || tieneCambiosSinPublicar(state.farmacia);
  const deshacerCambio = useCallback(
    (c: CambioSinPublicar) => {
      if (c.deshacer) patch(c.deshacer);
    },
    [patch],
  );

  const value = useMemo<EditorContextValue>(
    () => ({
      ...state,
      readOnly,
      esAdmin,
      pendientePublicar,
      cambios,
      deshacerCambio,
      activarIdioma,
      desactivarIdioma,
      eliminarTraducciones,
      patch,
      setLocale,
      goToSection,
      saveNow,
      syncFromServer,
      issues,
      isErrorVisible,
      touch,
      revealErrors,
    }),
    [state, readOnly, esAdmin, pendientePublicar, cambios, deshacerCambio, activarIdioma, desactivarIdioma, eliminarTraducciones, patch, setLocale, goToSection, saveNow, syncFromServer, issues, isErrorVisible, touch, revealErrors],
  );

  return <EditorContext.Provider value={value}>{children}</EditorContext.Provider>;
}

export function useFarmaciaEditor() {
  const ctx = useContext(EditorContext);
  if (!ctx) throw new Error('useFarmaciaEditor debe usarse dentro de FarmaciaEditorProvider');
  return ctx;
}
