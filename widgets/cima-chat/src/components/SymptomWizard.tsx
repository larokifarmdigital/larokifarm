import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import { getMedicamento, getSeccionContenido, searchPaged } from '../api/cima';
import type { SymptomDef } from '../lib/symptoms';
import { type ProfileDef, activosFor } from '../lib/profiles';
import type { CimaMedicamento, CimaMedicamentoListItem } from '../api/types';
import {
  applyLocalFilters,
  isPediatric,
  verdictByFT,
} from '../lib/pediatricSafety';
import { atcFor } from '../lib/atcMap';
import type { Inventory } from '../api/inventory';
import { injectMissingByAtc, isInStock, sortByStock } from '../lib/inventoryFilter';

interface Props {
  symptoms: SymptomDef[];
  profiles: ProfileDef[];
  loadingCatalog?: boolean;
  onPick: (m: CimaMedicamentoListItem) => void;
  onExit: () => void;
  inventory: Inventory | null;
}

type Step = 'symptom' | 'profile' | 'results';

interface Bubble {
  side: 'user' | 'bot';
  content: preact.ComponentChildren;
}

interface VerifyProgress {
  done: number;
  total: number;
}

const MAX_PER_ACTIVO = 120;
const PRE_VERIFY_CAP = 40;
const FINAL_LIMIT = 60;
const PAGE_SIZE = 8;

async function fetchByActivos(
  activos: string[],
  receta: 0 | 1,
  signal: AbortSignal,
): Promise<CimaMedicamentoListItem[]> {
  const lists = await Promise.all(
    activos.map((a) => {
      const atc = atcFor(a);
      const params: Record<string, string | number> = atc
        ? { atc, receta, comerc: 1 }
        : { nombre: a, receta, comerc: 1 };
      return searchPaged(params, signal, MAX_PER_ACTIVO).catch(
        () => [] as CimaMedicamentoListItem[],
      );
    }),
  );
  if (signal.aborted) return [];
  const seen = new Set<string>();
  const merged: CimaMedicamentoListItem[] = [];
  lists.forEach((list) => {
    list.forEach((r) => {
      if (seen.has(r.nregistro)) return;
      seen.add(r.nregistro);
      merged.push(r);
    });
  });
  return merged;
}

async function verifyOne(
  item: CimaMedicamentoListItem,
  profileId: string,
  signal: AbortSignal,
): Promise<CimaMedicamento | null> {
  try {
    const [detail, ft41, ft42, ft43] = await Promise.all([
      getMedicamento(item.nregistro, signal).catch(() => null),
      getSeccionContenido(item.nregistro, 1, '4.1', signal).catch(() => ''),
      getSeccionContenido(item.nregistro, 1, '4.2', signal).catch(() => ''),
      getSeccionContenido(item.nregistro, 1, '4.3', signal).catch(() => ''),
    ]);
    if (signal.aborted) return null;
    const verdict = verdictByFT(detail, ft41, ft42, ft43, profileId);
    return verdict.ok ? detail ?? (item as CimaMedicamento) : null;
  } catch {
    return null;
  }
}

async function verifyPediatric(
  items: CimaMedicamentoListItem[],
  profileId: string,
  signal: AbortSignal,
  onTick: () => void,
): Promise<CimaMedicamentoListItem[]> {
  const survivors: CimaMedicamentoListItem[] = [];
  await Promise.all(
    items.map(async (it) => {
      const verified = await verifyOne(it, profileId, signal);
      if (signal.aborted) return;
      if (verified) survivors.push(verified);
      onTick();
    }),
  );
  if (signal.aborted) return [];
  return survivors;
}

export function SymptomWizard({ symptoms, profiles, loadingCatalog, onPick, onExit, inventory }: Props) {
  const [step, setStep] = useState<Step>('symptom');
  const [symptom, setSymptom] = useState<SymptomDef | null>(null);
  const [profile, setProfile] = useState<ProfileDef | null>(null);
  const [items, setItems] = useState<CimaMedicamentoListItem[]>([]);
  const [rxItems, setRxItems] = useState<CimaMedicamentoListItem[]>([]);
  const [otcPage, setOtcPage] = useState(1);
  const [rxPage, setRxPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState<VerifyProgress | null>(null);
  const [noSafe, setNoSafe] = useState(false);
  const [rxOpen, setRxOpen] = useState(false);
  const abort = useRef<AbortController | null>(null);
  const inventoryRef = useRef<Inventory | null>(inventory);
  inventoryRef.current = inventory;

  const reset = useCallback(() => {
    abort.current?.abort();
    setStep('symptom');
    setSymptom(null);
    setProfile(null);
    setItems([]);
    setRxItems([]);
    setOtcPage(1);
    setRxPage(1);
    setLoading(false);
    setVerifying(null);
    setNoSafe(false);
    setRxOpen(false);
  }, []);

  const runQuery = useCallback(async (s: SymptomDef, p: ProfileDef) => {
    abort.current?.abort();
    const ctrl = new AbortController();
    abort.current = ctrl;
    const safeActivos = activosFor(s.activos, p.safe);
    setLoading(true);
    setVerifying(null);
    setNoSafe(safeActivos.length === 0);
    setItems([]);
    setRxItems([]);
    setOtcPage(1);
    setRxPage(1);
    setRxOpen(false);
    try {
      const [otcRaw, rxRaw] = await Promise.all([
        safeActivos.length > 0
          ? fetchByActivos(safeActivos, 0, ctrl.signal)
          : Promise.resolve([] as CimaMedicamentoListItem[]),
        fetchByActivos(s.activos, 1, ctrl.signal),
      ]);
      if (ctrl.signal.aborted) return;

      const otcLocal = applyLocalFilters(otcRaw, p.id).slice(0, PRE_VERIFY_CAP);
      const rxLocal = applyLocalFilters(rxRaw, p.id).slice(0, PRE_VERIFY_CAP);

      const inv = inventoryRef.current;

      if (!isPediatric(p.id)) {
        const [otcWithStock, rxWithStock] = await Promise.all([
          injectMissingByAtc(otcLocal, safeActivos, inv, ctrl.signal),
          injectMissingByAtc(rxLocal, s.activos, inv, ctrl.signal),
        ]);
        if (ctrl.signal.aborted) return;
        setItems(sortByStock(otcWithStock, inv).slice(0, FINAL_LIMIT));
        setRxItems(sortByStock(rxWithStock, inv).slice(0, FINAL_LIMIT));
        return;
      }

      setLoading(false);
      const total = otcLocal.length + rxLocal.length;
      let done = 0;
      setVerifying({ done, total });
      const tick = () => {
        done += 1;
        if (!ctrl.signal.aborted) setVerifying({ done, total });
      };

      const [otcSafe, rxSafe] = await Promise.all([
        verifyPediatric(otcLocal, p.id, ctrl.signal, tick),
        verifyPediatric(rxLocal, p.id, ctrl.signal, tick),
      ]);
      if (ctrl.signal.aborted) return;
      // En perfiles pediátricos, NO inyectamos stock que no pasó verifyPediatric;
      // solo reordenamos lo que ya sobrevivió a las comprobaciones de FT 4.1/4.2/4.3.
      setItems(sortByStock(otcSafe, inv).slice(0, FINAL_LIMIT));
      setRxItems(sortByStock(rxSafe, inv).slice(0, FINAL_LIMIT));
    } finally {
      if (!ctrl.signal.aborted) {
        setLoading(false);
        setVerifying(null);
      }
    }
  }, []);

  const handleSymptom = (s: SymptomDef) => {
    setSymptom(s);
    setStep('profile');
  };

  const handleProfile = (p: ProfileDef) => {
    setProfile(p);
    setStep('results');
    if (symptom) runQuery(symptom, p);
  };

  const bubbles: Bubble[] = [];
  bubbles.push({
    side: 'bot',
    content: <span>¿Qué síntoma tienes?</span>,
  });
  if (symptom) {
    bubbles.push({
      side: 'user',
      content: <span>{symptom.emoji} {symptom.label}</span>,
    });
    bubbles.push({
      side: 'bot',
      content: <span>¿Para quién es?</span>,
    });
  }
  if (profile) {
    bubbles.push({
      side: 'user',
      content: <span>{profile.emoji} {profile.label}</span>,
    });
  }

  const bodyRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [step, items.length, loading, verifying?.done]);

  return (
    <div class="cima-wizard" ref={bodyRef}>
      <div class="cima-wizard-header">
        <button class="cima-back" onClick={onExit}>← Volver</button>
        {step !== 'symptom' && (
          <button class="cima-link" onClick={reset}>↻ Reiniciar</button>
        )}
      </div>

      <div class="cima-bubbles">
        {bubbles.map((b, i) => (
          <div key={i} class={`cima-bubble ${b.side === 'user' ? 'q' : 'a soft'}`}>
            {b.content}
          </div>
        ))}

        {step === 'symptom' && (
          loadingCatalog ? (
            <div class="cima-bubble a soft">Cargando catálogo…</div>
          ) : (
            <div class="cima-pick-grid">
              {symptoms.map((s) => (
                <button key={s.id} class="cima-pick" onClick={() => handleSymptom(s)}>
                  <span class="cima-pick-emoji">{s.emoji}</span>
                  <span>{s.label}</span>
                </button>
              ))}
            </div>
          )
        )}

        {step === 'profile' && (
          <div class="cima-pick-grid">
            {profiles.map((p) => (
              <button key={p.id} class="cima-pick" onClick={() => handleProfile(p)}>
                <span class="cima-pick-emoji">{p.emoji}</span>
                <span>{p.label}</span>
              </button>
            ))}
          </div>
        )}

        {step === 'results' && symptom && profile && (
          <ResultsBlock
            symptom={symptom}
            profile={profile}
            items={items}
            rxItems={rxItems}
            otcPage={otcPage}
            rxPage={rxPage}
            onOtcPage={setOtcPage}
            onRxPage={setRxPage}
            rxOpen={rxOpen}
            onToggleRx={() => setRxOpen((v) => !v)}
            loading={loading}
            verifying={verifying}
            noSafe={noSafe}
            onPick={onPick}
            inventory={inventory}
          />
        )}
      </div>
    </div>
  );
}

function Pager({
  page,
  pageCount,
  total,
  onChange,
}: {
  page: number;
  pageCount: number;
  total: number;
  onChange: (n: number) => void;
}) {
  if (pageCount <= 1) return null;
  return (
    <div class="cima-pager" role="navigation" aria-label="Paginación de resultados">
      <button
        class="cima-pager-btn"
        onClick={() => onChange(Math.max(1, page - 1))}
        disabled={page <= 1}
        aria-label="Página anterior"
      >
        ← Anterior
      </button>
      <span class="cima-pager-info">
        Página {page} de {pageCount} · {total} resultados
      </span>
      <button
        class="cima-pager-btn"
        onClick={() => onChange(Math.min(pageCount, page + 1))}
        disabled={page >= pageCount}
        aria-label="Página siguiente"
      >
        Siguiente →
      </button>
    </div>
  );
}

function paginate<T>(arr: T[], page: number, size: number): T[] {
  const start = (page - 1) * size;
  return arr.slice(start, start + size);
}

function ResultsBlock({
  symptom,
  profile,
  items,
  rxItems,
  otcPage,
  rxPage,
  onOtcPage,
  onRxPage,
  rxOpen,
  onToggleRx,
  loading,
  verifying,
  noSafe,
  onPick,
  inventory,
}: {
  symptom: SymptomDef;
  profile: ProfileDef;
  items: CimaMedicamentoListItem[];
  rxItems: CimaMedicamentoListItem[];
  otcPage: number;
  rxPage: number;
  onOtcPage: (n: number) => void;
  onRxPage: (n: number) => void;
  rxOpen: boolean;
  onToggleRx: () => void;
  loading: boolean;
  verifying: VerifyProgress | null;
  noSafe: boolean;
  onPick: (m: CimaMedicamentoListItem) => void;
  inventory: Inventory | null;
}) {
  const otcPageCount = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const rxPageCount = Math.max(1, Math.ceil(rxItems.length / PAGE_SIZE));
  const otcVisible = paginate(items, otcPage, PAGE_SIZE);
  const rxVisible = paginate(rxItems, rxPage, PAGE_SIZE);
  if (loading) {
    return <div class="cima-bubble a soft">Buscando en CIMA…</div>;
  }
  if (verifying && verifying.total > 0) {
    const pct = Math.round((verifying.done / verifying.total) * 100);
    return (
      <div class="cima-bubble a soft">
        <p>
          Verificando idoneidad pediátrica con la ficha técnica oficial… {verifying.done}/{verifying.total} ({pct}%)
        </p>
        <p class="cima-disclaimer">
          Solo mostramos medicamentos cuya ficha técnica AEMPS documenta posología
          para este perfil y no marca contraindicaciones de edad.
        </p>
      </div>
    );
  }
  return (
    <>
      {noSafe ? (
        <div class="cima-bubble a soft">
          <p>No tenemos opciones sin receta apropiadas para <strong>{symptom.label.toLowerCase()}</strong> en este perfil.</p>
        </div>
      ) : items.length === 0 ? (
        <div class="cima-bubble a soft">
          <p>
            No se encontraron medicamentos <strong>sin receta</strong> verificados como apropiados para <strong>{symptom.label.toLowerCase()}</strong> en {profile.label.toLowerCase()}.
          </p>
          <p class="cima-disclaimer">
            Consulta a tu farmacéutico, médico o pediatra antes de administrar cualquier medicamento.
          </p>
        </div>
      ) : (
        <>
          <div class="cima-bubble a soft">
            <p>
              Medicamentos <strong>sin receta</strong> indicados para <strong>{symptom.label.toLowerCase()}</strong> en {profile.label.toLowerCase()}:
            </p>
            {isPediatric(profile.id) && (
              <p class="cima-disclaimer">
                ✅ Verificado contra la ficha técnica oficial AEMPS (posología y contraindicaciones).
              </p>
            )}
          </div>
          <div class="cima-result-cards">
            {otcVisible.map((m) => {
              const inStock = isInStock(m.nregistro, inventory);
              return (
                <button
                  key={m.nregistro}
                  class={`cima-result compact${inStock ? ' in-stock' : ''}`}
                  onClick={() => onPick(m)}
                >
                  <div class="cima-result-name">
                    {m.nombre}
                    {inStock && <span class="cima-badge stock">⭐ En stock</span>}
                  </div>
                  <div class="cima-result-meta">
                    {m.labtitular && <span>{m.labtitular}</span>}
                    <span class="cima-badge otc">Sin receta</span>
                    {m.generico && <span class="cima-badge gen">EFG</span>}
                  </div>
                </button>
              );
            })}
          </div>
          <Pager page={otcPage} pageCount={otcPageCount} total={items.length} onChange={onOtcPage} />
        </>
      )}

      {profile.warning && (
        <div class="cima-bubble a warn">⚠️ {profile.warning}</div>
      )}

      {rxItems.length > 0 && (
        <div class="cima-rx-section">
          <button class="cima-rx-toggle" onClick={onToggleRx} aria-expanded={rxOpen}>
            <span class="cima-rx-toggle-icon">{rxOpen ? '▾' : '▸'}</span>
            <span>Otras opciones autorizadas en CIMA ({rxItems.length}) — <strong>requieren receta médica</strong></span>
          </button>
          {rxOpen && (
            <>
              <div class="cima-rx-warning">
                ❗ <strong>Solo a título informativo.</strong> Estos medicamentos requieren <strong>receta médica obligatoria</strong>. NO los tomes ni los compres sin prescripción.
                Su uso depende de tu historial clínico, tratamientos en curso, edad, embarazo y otras condiciones que solo tu médico puede valorar.
                Esta lista <em>no es una recomendación</em>; muestra los medicamentos autorizados por la AEMPS para este síntoma.
              </div>
              <div class="cima-result-cards">
                {rxVisible.map((m) => {
                  const inStock = isInStock(m.nregistro, inventory);
                  return (
                    <button
                      key={m.nregistro}
                      class={`cima-result compact rx${inStock ? ' in-stock' : ''}`}
                      onClick={() => onPick(m)}
                    >
                      <div class="cima-result-name">
                        {m.nombre}
                        {inStock && <span class="cima-badge stock">⭐ En stock</span>}
                      </div>
                      <div class="cima-result-meta">
                        {m.labtitular && <span>{m.labtitular}</span>}
                        <span class="cima-badge rx">Con receta</span>
                        {m.generico && <span class="cima-badge gen">EFG</span>}
                        {m.triangulo && <span class="cima-badge tri" title="Seguimiento adicional">▼</span>}
                      </div>
                    </button>
                  );
                })}
              </div>
              <Pager page={rxPage} pageCount={rxPageCount} total={rxItems.length} onChange={onRxPage} />
            </>
          )}
        </div>
      )}

      <div class="cima-bubble a soft">
        ℹ️ Información oficial AEMPS. <strong>Consulta SIEMPRE con tu farmacéutico o médico</strong> antes de tomar cualquier medicamento, especialmente si tomas otros, estás embarazada o tienes enfermedades crónicas.
      </div>
    </>
  );
}
