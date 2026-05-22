import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import { SearchBar, isCNQuery } from './SearchBar';
import { ResultList } from './ResultList';
import { MedDetail } from './MedDetail';
import { QuestionChips } from './QuestionChips';
import { AnswerBubble } from './AnswerBubble';
import { AlertBanner } from './AlertBanner';
import { AlternativesList } from './AlternativesList';
import { SymptomWizard } from './SymptomWizard';
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

type EntryMode = 'menu' | 'search' | 'wizard';

const BUNDLED_CATALOG: CimaCatalog = {
  symptoms: SYMPTOMS,
  profiles: PROFILES,
  source: 'bundled',
};

export function ChatPanel({ onClose }: Props) {
  const [entry, setEntry] = useState<EntryMode>('menu');
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
        <div>
          <strong>Consulta de medicamentos</strong>
          <div class="cima-header-sub">Fuente oficial: AEMPS · CIMA</div>
        </div>
        {onClose && (
          <button class="cima-close" onClick={onClose} aria-label="Cerrar">×</button>
        )}
      </header>

      <div class="cima-body" ref={bodyRef}>
        {!selected && entry === 'menu' && (
          <div class="cima-entry">
            <p class="cima-entry-hello">
              Hola 👋 — soy tu asistente de información de medicamentos.
              Toda la info procede de la fuente oficial AEMPS (CIMA).
            </p>
            <button class="cima-entry-card" onClick={() => setEntry('search')}>
              <span class="cima-entry-emoji">🔍</span>
              <span>
                <strong>Buscar un medicamento</strong>
                <div class="cima-entry-desc">Por nombre o Código Nacional</div>
              </span>
            </button>
            <button
              class="cima-entry-card"
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
              <span class="cima-entry-emoji">💬</span>
              <span>
                <strong>Encuentra por síntoma</strong>
                <div class="cima-entry-desc">Te sugiero medicamentos sin receta apropiados</div>
              </span>
            </button>
          </div>
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
