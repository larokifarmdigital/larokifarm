import type { CimaMedicamento, DocTipo } from '../api/types';

interface Props {
  question: string;
  answer: string;
  tipo: DocTipo;
  seccion: string;
  loading: boolean;
  med: CimaMedicamento;
}

function fullDocUrl(med: CimaMedicamento, tipo: DocTipo): string | undefined {
  return med.docs?.find((d) => d.tipo === tipo)?.urlHtml;
}

export function AnswerBubble({ question, answer, tipo, seccion, loading, med }: Props) {
  const full = fullDocUrl(med, tipo);
  const tipoLabel = tipo === 1 ? 'Ficha técnica' : 'Prospecto';
  return (
    <div class="cima-bubble-group">
      <div class="cima-bubble q">{question}</div>
      <div class="cima-bubble a">
        {loading ? (
          <span class="cima-loading">Buscando en la fuente oficial…</span>
        ) : answer.trim().length === 0 ? (
          <span class="cima-empty-answer">La sección está vacía o no disponible.</span>
        ) : (
          <p class="cima-answer-text">{answer}</p>
        )}
        <div class="cima-bubble-source">
          Fuente: AEMPS · {tipoLabel} · sección {seccion}
          {full && (
            <>
              {' · '}
              <a href={full} target="_blank" rel="noopener noreferrer">Ver completo ↗</a>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
