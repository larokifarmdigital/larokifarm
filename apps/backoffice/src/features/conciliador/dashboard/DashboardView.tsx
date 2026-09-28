import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { NavIcon } from '@/features/shell/NavIcon';
import type { DashboardData } from '../data/dashboardData';
import { KpiCards } from './KpiCards';
import { RecentComparisons } from './RecentComparisons';

type Props = {
  data: DashboardData;
  standaloneUrl: string;
};

export function DashboardView({ data, standaloneUrl }: Props) {
  return (
    <div className="max-w-[1120px] mx-auto px-3 sm:px-6 lg:px-8 pt-8 sm:pt-12 pb-16 sm:pb-24 space-y-8">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <p className="eyebrow mb-2">Conciliación</p>
          <h1 className="h-display m-0">Albaranes</h1>
          {data.businessName && (
            <p className="mt-2 text-[14px] text-[var(--color-muted)] m-0">
              {data.businessName}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="secondary">
            <a href={standaloneUrl} target="_blank" rel="noopener noreferrer">
              <NavIcon name="ArrowSquareOut" size={13} />
              Abrir standalone
            </a>
          </Button>
          <Button asChild variant="accent" size="lg">
            <Link href="/albaranes/nueva">
              <NavIcon name="Plus" size={14} weight="bold" />
              Nueva conciliación
            </Link>
          </Button>
        </div>
      </header>

      {/* Banner de estado */}
      <div className="rounded-[8px] border border-[var(--color-accent-tint)] bg-[var(--color-accent-soft)] px-5 py-4">
        <div className="flex items-start gap-3">
          <div className="shrink-0 mt-0.5">
            <NavIcon
              name="Info"
              size={18}
              weight="fill"
              className="text-[var(--color-accent)]"
            />
          </div>
          <div className="flex-1">
            <p className="text-[13.5px] font-medium text-[var(--color-ink)] m-0">
              Nueva conciliación disponible en el backoffice (subida y emparejamiento).
            </p>
            <p className="text-[13px] text-[var(--color-ink-2)] m-0 mt-1 leading-[1.55]">
              La ejecución contra Gemini llega en Fase 1.C.3. Mientras tanto, para
              ejecutar una conciliación real usa el standalone en una pestaña aparte.
              Los datos que ves aquí son las conciliaciones reales guardadas en Neon.
            </p>
          </div>
        </div>
      </div>

      {/* KPIs */}
      {data.hasBusiness ? (
        <KpiCards kpis={data.kpis} />
      ) : (
        <div className="card p-8 text-center">
          <p className="text-[14px] text-[var(--color-muted)] m-0">
            Tu usuario no está asociado a ninguna farmacia. Pide al administrador que
            te asigne una para ver el panel.
          </p>
        </div>
      )}

      {/* Últimas comparaciones */}
      {data.hasBusiness && (
        <section>
          <div className="flex items-end justify-between mb-3">
            <h2 className="text-[16px] leading-tight tracking-[-0.02em] font-medium text-[var(--color-ink)] m-0">
              Últimas conciliaciones
            </h2>
            <span className="chip chip-neutral">Historial completo · próximamente</span>
          </div>
          <RecentComparisons items={data.recent} />
        </section>
      )}
    </div>
  );
}
