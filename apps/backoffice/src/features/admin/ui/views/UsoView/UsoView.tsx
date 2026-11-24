import { NavIcon } from '@/shared/components/atoms/NavIcon';
import { PageHeader, ANCHO_PAGINA } from '@/shared/components/molecules/PageHeader';
import { cn } from '@/shared/lib/cn';
import type { UsoIaData } from '../../../data/usoData';
import { UsoIaGestion } from '../../components/UsoIaGestion';
import { GraficoMeses } from '../../components/GraficoMeses';
import { UsoPorPersona } from '../../components/UsoPorPersona';
import { SelectorMes } from '../../components/SelectorMes';
import { dolares } from '../../lib/dinero';

function Cifra({ titulo, valor, nota }: { titulo: string; valor: string; nota: string }) {
  return (
    <div className="card p-4 sm:p-5">
      <p className="m-0 text-[13.5px] font-semibold text-[var(--color-muted)]">{titulo}</p>
      <p className="m-0 mt-1.5 text-[26px] font-bold leading-none tracking-[-0.02em] text-[var(--color-ink)] font-mono-tabular">{valor}</p>
      <p className="m-0 mt-2 text-[13px] leading-[1.4] text-[var(--color-muted)]">{nota}</p>
    </div>
  );
}

function Aviso({ children }: { children: React.ReactNode }) {
  return (
    <div role="status" className="mb-4 flex items-start gap-3 rounded-[10px] bg-[var(--color-yellow-soft)] px-4 py-3 text-[14px] leading-[1.5] text-[var(--color-yellow-ink)]">
      <NavIcon name="Warning" size={18} weight="fill" className="mt-0.5 shrink-0" />
      <div>{children}</div>
    </div>
  );
}

/** Uso de IA (solo administración): gasto de Gemini del mes, límite y clave de cada farmacia. */
export function UsoView({ data }: { data: UsoIaData }) {
  const { total } = data;
  return (
    <div className={cn(ANCHO_PAGINA, 'pt-6 pb-10')}>
      <PageHeader
        titulo="Uso de IA"
        descripcion="Lo que se gasta en Gemini al conciliar albaranes y traducir la web: por mes, por farmacia y por persona."
        accion={<SelectorMes mes={data.mes} meses={data.meses} />}
      />

      {!data.hayClaveGeneral && (
        <Aviso>
          <strong>Falta la clave general de Gemini en el servidor.</strong> Las farmacias sin clave propia no pueden conciliar
          ni traducir. Añade <code>GEMINI_API_KEY</code> en Vercel (proyecto del backoffice) y vuelve a desplegar.
        </Aviso>
      )}
      {!data.puedeGuardarClaves && (
        <Aviso>
          <strong>No se pueden guardar claves propias todavía.</strong> Falta <code>ENCRYPTION_KEY</code> en Vercel (la misma
          que usaba el conciliador antiguo).
        </Aviso>
      )}

      <section aria-label="Resumen del mes" className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Cifra
          titulo={data.esMesActual ? 'Gastado este mes' : `Gastado en ${data.mesEtiqueta}`}
          valor={dolares(total.gastoMes)}
          nota="Todas las farmacias juntas."
        />
        <Cifra
          titulo="Conciliaciones"
          valor={total.conciliacionesMes.toLocaleString('es-ES')}
          nota={`${total.pdfsMes.toLocaleString('es-ES')} ${total.pdfsMes === 1 ? 'albarán (PDF) leído' : 'albaranes (PDF) leídos'} con IA.`}
        />
        <Cifra
          titulo="Traducciones"
          valor={total.traduccionesMes.toLocaleString('es-ES')}
          nota="Textos de la web traducidos con IA."
        />
      </section>

      <GraficoMeses meses={data.meses} mes={data.mes} />

      <UsoIaGestion
        farmacias={data.farmacias}
        puedeGuardarClaves={data.puedeGuardarClaves}
        esMesActual={data.esMesActual}
        mesEtiqueta={data.mesEtiqueta}
      />

      <UsoPorPersona personas={data.personas} mesEtiqueta={data.mesEtiqueta} />

      <p className="m-0 mt-6 text-[13.5px] leading-[1.5] text-[var(--color-muted)]">
        Importes aproximados, calculados con los precios de Gemini 2.5 Flash. Al llegar al 80 % del límite se avisa en la farmacia; al 100 % se para la IA hasta el mes siguiente. Las farmacias con
        clave propia pagan su uso directamente a Google; el resto usa la clave general de Larokifarm.
      </p>
    </div>
  );
}
