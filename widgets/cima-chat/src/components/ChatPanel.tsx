import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import { SearchBar, isCNQuery } from './SearchBar';
import { ResultList } from './ResultList';
import { MedDetail } from './MedDetail';
import { QuestionChips } from './QuestionChips';
import { AnswerBubble } from './AnswerBubble';
import { AlertBanner } from './AlertBanner';
import { AlternativesList } from './AlternativesList';
import { SymptomWizard } from './SymptomWizard';
import { ChatIA } from './ChatIA';
import { AlternativesChat } from './AlternativesChat';
import { InteractionsInline } from './InteractionsInline';
import { fetchCatalog, type CimaCatalog } from '../api/sanity';
import { fetchInventory, type Inventory } from '../api/inventory';
import { SYMPTOMS } from '../lib/symptoms';
import { PROFILES } from '../lib/profiles';
import { debounce } from '../lib/debounce';
import {
  getMedicamento,
  getNotas,
  getProblemasSuministro,
  getSeccionContenido,
  listSecciones,
  searchByAtc,
  searchByCN,
  searchMedicamentos,
  shortName,
} from '../api/cima';
import type {
  CimaMedicamento,
  CimaMedicamentoListItem,
  CimaNota,
  CimaProblemaSuministro,
  CimaSeccion,
  DocTipo,
} from '../api/types';
import type { ChipDef, DocMode } from '../lib/sections';

interface Props {
  onClose?: () => void;
}

interface AnswerEntry {
  id: number;
  question: string;
  tipo: DocTipo;
  seccion: string;
  loading: boolean;
  answer: string;
}

type EntryMode = 'menu' | 'search' | 'wizard' | 'chat';

const BUNDLED_CATALOG: CimaCatalog = {
  symptoms: SYMPTOMS,
  profiles: PROFILES,
  source: 'bundled',
};

export function ChatPanel({ onClose }: Props) {
  const [entry, setEntry] = useState<EntryMode>('menu');
  const [heroInput, setHeroInput] = useState('');
  const [chatInitial, setChatInitial] = useState<string | undefined>(undefined);
  const [catalog, setCatalog] = useState<CimaCatalog>(BUNDLED_CATALOG);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const catalogFetched = useRef(false);
  const [inventory, setInventory] = useState<Inventory | null>(null);
  const [query, setQuery] = useState('');
  const [otcOnly, setOtcOnly] = useState(false);
  const [results, setResults] = useState<CimaMedicamentoListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [searching, setSearching] = useState(false);

  const [selected, setSelected] = useState<CimaMedicamento | null>(null);
  const [ftSections, setFtSections] = useState<CimaSeccion[]>([]);
  const [prSections, setPrSections] = useState<CimaSeccion[]>([]);
  const [notas, setNotas] = useState<CimaNota[]>([]);
  const [suministro, setSuministro] = useState<CimaProblemaSuministro[]>([]);
  const [indicacion, setIndicacion] = useState<string>('');
  const [docMode, setDocMode] = useState<DocMode>('patient');

  const [answers, setAnswers] = useState<AnswerEntry[]>([]);
  const [askLoading, setAskLoading] = useState(false);

  const [altOpen, setAltOpen] = useState(false);
  const [altLabel, setAltLabel] = useState('');
  const [altAtc, setAltAtc] = useState<string>('');
  const [altItems, setAltItems] = useState<CimaMedicamentoListItem[]>([]);
  const [altLoading, setAltLoading] = useState(false);

  const searchAbort = useRef<AbortController | null>(null);
  const detailAbort = useRef<AbortController | null>(null);
  const altAbort = useRef<AbortController | null>(null);
  const askCounter = useRef(0);
  const bodyRef = useRef<HTMLDivElement>(null);

  const isCN = isCNQuery(query);

  const runSearch = useCallback((q: string, otc: boolean) => {
    searchAbort.current?.abort();
    if (q.trim().length < 2) {
      setResults([]);
      setTotal(0);
      setSearching(false);
      return;
    }
    const ctrl = new AbortController();
    searchAbort.current = ctrl;
    setSearching(true);
    const promise = isCNQuery(q)
      ? searchByCN(q.trim(), ctrl.signal)
      : searchMedicamentos(q.trim(), otc ? { receta: 0, comerc: 1 } : {}, ctrl.signal);
    promise
      .then((r) => {
        setResults(r.resultados);
        setTotal(r.totalFilas);
        setSearching(false);
      })
      .catch((err) => {
        if (err.name === 'AbortError') return;
        setResults([]);
        setTotal(0);
        setSearching(false);
      });
  }, []);

  const debouncedSearch = useRef(debounce(runSearch, 300)).current;

  useEffect(() => {
    debouncedSearch(query, otcOnly);
  }, [query, otcOnly, debouncedSearch]);

  useEffect(() => {
    let cancelled = false;
    fetchInventory().then((inv) => {
      if (!cancelled) setInventory(inv);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const loadMedicamento = useCallback((item: CimaMedicamentoListItem) => {
    detailAbort.current?.abort();
    const ctrl = new AbortController();
    detailAbort.current = ctrl;
    setAltOpen(false);
    setAnswers([]);
    setFtSections([]);
    setPrSections([]);
    setNotas([]);
    setSuministro([]);
    setIndicacion('');
    setSelected({ ...item });

    Promise.all([
      getMedicamento(item.nregistro, ctrl.signal).catch(() => null),
      listSecciones(item.nregistro, 1, ctrl.signal).catch(() => [] as CimaSeccion[]),
      listSecciones(item.nregistro, 2, ctrl.signal).catch(() => [] as CimaSeccion[]),
      item.notas ? getNotas(item.nregistro, ctrl.signal).catch(() => [] as CimaNota[]) : Promise.resolve([] as CimaNota[]),
      item.psum
        ? getProblemasSuministro(shortName(item.nombre), ctrl.signal)
            .then((r) => r.resultados)
            .catch(() => [] as CimaProblemaSuministro[])
        : Promise.resolve([] as CimaProblemaSuministro[]),
      getSeccionContenido(item.nregistro, 1, '4.1', ctrl.signal).catch(() => ''),
    ]).then(([detail, ft, pr, n, ps, ind]) => {
      if (ctrl.signal.aborted) return;
      if (detail) setSelected(detail);
      setFtSections(ft);
      setPrSections(pr);
      setNotas(n);
      setSuministro(ps);
      setIndicacion(ind.trim());
    });
  }, []);

  const handleBack = useCallback(() => {
    detailAbort.current?.abort();
    setSelected(null);
    setAltOpen(false);
    setAnswers([]);
    setFtSections([]);
    setPrSections([]);
    setNotas([]);
    setSuministro([]);
    setIndicacion('');
  }, []);

  const handleAsk = useCallback(
    (chip: ChipDef, tipo: DocTipo, seccion: string) => {
      if (!selected) return;
      const id = ++askCounter.current;
      const nregistro = selected.nregistro;
      setAnswers((a) => [
        ...a,
        { id, question: chip.label, tipo, seccion, loading: true, answer: '' },
      ]);
      setAskLoading(true);
      getSeccionContenido(nregistro, tipo, seccion)
        .then((text) => {
          setAnswers((a) =>
            a.map((entry) =>
              entry.id === id ? { ...entry, loading: false, answer: text } : entry,
            ),
          );
        })
        .catch(() => {
          setAnswers((a) =>
            a.map((entry) =>
              entry.id === id
                ? { ...entry, loading: false, answer: 'No se pudo cargar la sección.' }
                : entry,
            ),
          );
        })
        .finally(() => setAskLoading(false));
    },
    [selected],
  );

  const handleShowAlternatives = useCallback((atc: string, label: string) => {
    altAbort.current?.abort();
    const ctrl = new AbortController();
    altAbort.current = ctrl;
    setAltLabel(label);
    setAltAtc(atc);
    setAltItems([]);
    setAltLoading(true);
    setAltOpen(true);
    searchByAtc(atc, ctrl.signal)
      .then((r) => {
        if (ctrl.signal.aborted) return;
        setAltItems(r.resultados);
        setAltLoading(false);
      })
      .catch(() => {
        if (ctrl.signal.aborted) return;
        setAltLoading(false);
      });
  }, []);

  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [answers.length, selected?.nregistro, altOpen]);

  return (
    <div class="cima-panel" role="dialog" aria-label="Chat de medicamentos CIMA">
      <header class="cima-header">
        <div class="cima-header__brand">
          <span class="cima-header__mark" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M9 12h6M12 9v6"/>
              <circle cx="12" cy="12" r="9"/>
            </svg>
          </span>
          <span class="cima-header__title">CIMA</span>
        </div>
        {onClose && (
          <button class="cima-close" onClick={onClose} aria-label="Cerrar">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M18 6 6 18M6 6l12 12"/>
            </svg>
          </button>
        )}
      </header>

      <div class="cima-body" ref={bodyRef}>
        {!selected && entry === 'menu' && (
          <div class="cima-hero">
            <form
              class="cima-hero__form"
              onSubmit={(e) => {
                e.preventDefault();
                const value = heroInput.trim();
                if (!value) return;
                setChatInitial(value);
                setHeroInput('');
                setEntry('chat');
              }}
            >
              <textarea
                class="cima-hero__input"
                value={heroInput}
                onInput={(e) => setHeroInput((e.target as HTMLTextAreaElement).value)}
                placeholder="Preguntá sobre un medicamento"
                rows={2}
                aria-label="Tu consulta"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    (e.currentTarget as HTMLTextAreaElement).form?.requestSubmit();
                  }
                }}
              />
              <button
                type="submit"
                class="cima-hero__submit"
                disabled={heroInput.trim().length < 3}
                aria-label="Enviar"
              >
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M12 19V5M5 12l7-7 7 7"/>
                </svg>
              </button>
            </form>

            <div class="cima-hero__quick" role="list">
              <button
                type="button"
                role="listitem"
                class="cima-hero__quick-item"
                onClick={() => setEntry('search')}
              >
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="11" cy="11" r="7"/>
                  <path d="m21 21-4.35-4.35"/>
                </svg>
                Buscar
              </button>
              <button
                type="button"
                role="listitem"
                class="cima-hero__quick-item"
                onClick={() => {
                  setEntry('wizard');
                  if (!catalogFetched.current) {
                    catalogFetched.current = true;
                    setCatalogLoading(true);
                    fetchCatalog(BUNDLED_CATALOG)
                      .then((c) => setCatalog(c))
                      .finally(() => setCatalogLoading(false));
                  }
                }}
              >
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="9"/>
                  <circle cx="12" cy="12" r="4"/>
                </svg>
                Guía por síntomas
              </button>
            </div>

            <div class="cima-hero__examples">
              {[
                'Mi bebé tiene fiebre desde ayer',
                '¿Se puede combinar Adiro con ibuprofeno?',
                '¿Es apto el paracetamol en lactancia?',
              ].map((ex) => (
                <button
                  key={ex}
                  type="button"
                  class="cima-hero__example"
                  onClick={() => {
                    setChatInitial(ex);
                    setEntry('chat');
                  }}
                >
                  <span>{ex}</span>
                  <span class="cima-hero__example-arrow" aria-hidden="true">›</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {!selected && entry === 'chat' && (
          <>
            <button
              class="cima-back"
              onClick={() => {
                setChatInitial(undefined);
                setEntry('menu');
              }}
            >
              ← Volver
            </button>
            <ChatIA initialMessage={chatInitial} />
          </>
        )}

        {!selected && entry === 'search' && (
          <>
            <button class="cima-back" onClick={() => setEntry('menu')}>← Volver</button>
            <SearchBar
              value={query}
              onInput={setQuery}
              onClear={() => setQuery('')}
              otcOnly={otcOnly}
              onOtcToggle={setOtcOnly}
              isCN={isCN}
              autoFocus
            />
            <ResultList
              items={results}
              total={total}
              loading={searching}
              query={query.trim()}
              onSelect={loadMedicamento}
              inventory={inventory}
            />
          </>
        )}

        {!selected && entry === 'wizard' && (
          <SymptomWizard
            symptoms={catalog.symptoms}
            profiles={catalog.profiles}
            loadingCatalog={catalogLoading && catalog.source === 'bundled'}
            onPick={loadMedicamento}
            onExit={() => setEntry('menu')}
            inventory={inventory}
          />
        )}

        {selected && (
          <>
            <MedDetail
              med={selected}
              indicacion={indicacion}
              onBack={handleBack}
              onShowAlternatives={handleShowAlternatives}
            />
            <AlertBanner notas={notas} suministro={suministro} />
            <AlternativesChat med={selected} />
            <InteractionsInline med={selected} />
            {altOpen && (
              <AlternativesList
                label={altLabel}
                items={altItems}
                loading={altLoading}
                currentNregistro={selected.nregistro}
                onPick={(m) => loadMedicamento(m)}
                onClose={() => setAltOpen(false)}
                inventory={inventory}
                atc={altAtc}
              />
            )}
            {ftSections.length === 0 && prSections.length === 0 ? (
              <div class="cima-status">Cargando secciones disponibles…</div>
            ) : (
              <QuestionChips
                mode={docMode}
                onModeChange={setDocMode}
                ftSections={ftSections}
                prSections={prSections}
                onAsk={handleAsk}
                disabled={askLoading}
              />
            )}
            {answers.map((a) => (
              <AnswerBubble
                key={a.id}
                question={a.question}
                answer={a.answer}
                tipo={a.tipo}
                seccion={a.seccion}
                loading={a.loading}
                med={selected}
              />
            ))}
          </>
        )}
      </div>

      <footer class="cima-footer">
        Información oficial de AEMPS. No sustituye el consejo de un profesional sanitario.
      </footer>
    </div>
  );
}
