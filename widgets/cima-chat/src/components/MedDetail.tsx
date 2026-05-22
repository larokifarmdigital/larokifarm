import { useState } from 'preact/hooks';
import type { CimaMedicamento, CimaDoc } from '../api/types';
import { MedPhotos } from './MedPhotos';
import { mostSpecificAtc } from '../api/cima';

interface Props {
  med: CimaMedicamento;
  indicacion?: string;
  onBack: () => void;
  onShowAlternatives: (atc: string, label: string) => void;
}

const INDICACION_PREVIEW = 260;

function docLabel(tipo: number) {
  return tipo === 1 ? 'Ficha técnica' : tipo === 2 ? 'Prospecto' : 'Documento';
}

function fullFtUrl(med: CimaMedicamento): string | undefined {
  return med.docs?.find((d) => d.tipo === 1)?.urlHtml;
}

export function MedDetail({ med, indicacion, onBack, onShowAlternatives }: Props) {
  const atc = mostSpecificAtc(med.atcs);
  const [expanded, setExpanded] = useState(false);

  const indicacionTrim = (indicacion || '').trim();
  const tooLong = indicacionTrim.length > INDICACION_PREVIEW;
  const visible = expanded || !tooLong
    ? indicacionTrim
    : `${indicacionTrim.slice(0, INDICACION_PREVIEW).trimEnd()}…`;
  const ftUrl = fullFtUrl(med);

  return (
    <div class="cima-detail">
      <button class="cima-back" onClick={onBack}>← Volver</button>
      <h3 class="cima-detail-name">{med.nombre}</h3>
      <MedPhotos fotos={med.fotos} />
      {indicacionTrim && (
        <section class="cima-indicacion" aria-label="Indicaciones terapéuticas">
          <header class="cima-indicacion-head">
            <strong>¿Para qué se utiliza?</strong>
            <span class="cima-indicacion-source">FT 4.1 · AEMPS</span>
          </header>
          <p class="cima-indicacion-body">{visible}</p>
          {tooLong && (
            <button
              class="cima-indicacion-toggle"
              onClick={() => setExpanded((v) => !v)}
              aria-expanded={expanded}
            >
              {expanded ? 'Ver menos' : 'Ver más'}
            </button>
          )}
          {ftUrl && (
            <a
              class="cima-indicacion-link"
              href={ftUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              Abrir ficha técnica completa ↗
            </a>
          )}
        </section>
      )}
      <dl class="cima-detail-meta">
        {med.pactivos && (
          <>
            <dt>Principios activos</dt>
            <dd>{med.pactivos}</dd>
          </>
        )}
        {med.labtitular && (
          <>
            <dt>Laboratorio</dt>
            <dd>{med.labtitular}</dd>
          </>
        )}
        {med.dosis && (
          <>
            <dt>Dosis</dt>
            <dd>{med.dosis}</dd>
          </>
        )}
        {med.cpresc && (
          <>
            <dt>Condiciones</dt>
            <dd>{med.cpresc}</dd>
          </>
        )}
      </dl>
      <div class="cima-detail-actions">
        {atc && (
          <button class="cima-secondary" onClick={() => onShowAlternatives(atc.codigo, atc.nombre)}>
            Alternativas con {atc.nombre}
          </button>
        )}
        {med.docs && med.docs.length > 0 && (
          <div class="cima-docs">
            {med.docs.map((d: CimaDoc) => (
              <a key={d.tipo} href={d.urlHtml} target="_blank" rel="noopener noreferrer">
                {docLabel(d.tipo)} ↗
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
