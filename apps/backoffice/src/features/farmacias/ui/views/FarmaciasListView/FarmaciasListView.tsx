import Link from 'next/link';
import { getFarmaciaRepository } from '@/core/farmacias';
import { Button } from '@/shared/components/atoms/Button';
import { NavIcon } from '@/shared/components/atoms/NavIcon';
import { formatRelativeDate } from '@/shared/lib/format';
import { FarmaciaStats } from '@/features/farmacias/ui/components/FarmaciaStats';
import { FarmaciasList } from '@/features/farmacias/ui/components/FarmaciasList';

export async function FarmaciasListView() {
  const farmacias = await getFarmaciaRepository().listFarmacias();

  const counts = {
    total: farmacias.length,
    published: farmacias.filter((f) => f.status === 'published').length,
    draft: farmacias.filter((f) => f.status === 'draft').length,
    archived: farmacias.filter((f) => f.status === 'archived').length,
  };

  // Última actualización global entre todas las farmacias — da contexto en el header
  // sin tener que entrar al listado.
  const lastUpdate = farmacias
    .map((f) => f.updatedAt)
    .filter(Boolean)
    .sort()
    .pop();

  return (
    <div className="max-w-[1200px] mx-auto px-3 sm:px-6 lg:px-8 pt-6 sm:pt-10 pb-16 sm:pb-24">
      <header className="flex flex-col gap-4 mb-6 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="eyebrow mb-2">Contenido</p>
          <h1 className="h-display m-0">Farmacias</h1>
          <p className="mt-2 text-[14px] text-[var(--color-muted)] max-w-lg text-pretty">
            Cada farmacia es la fuente de una landing pública. Edita textos,
            servicios y horarios; publica cuando estés listo.
          </p>
          {lastUpdate && (
            <p className="mt-2 flex items-center gap-1.5 text-[12px] text-[var(--color-muted-2)] font-mono-tabular">
              <span
                aria-hidden
                className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--color-green-ink)]"
              />
              Última actualización {formatRelativeDate(lastUpdate)}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="accent" size="md" asChild className="flex-1 sm:flex-none">
            <Link href="/farmacias/nueva">
              <NavIcon name="Plus" size={14} />
              Nueva farmacia
            </Link>
          </Button>
        </div>
      </header>

      <FarmaciaStats counts={counts} />

      <FarmaciasList farmacias={farmacias} />
    </div>
  );
}
