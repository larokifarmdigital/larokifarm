import Link from 'next/link';
import { contentRepository } from '@/lib/content-repository';
import { FarmaciasList } from '@/features/farmacias/FarmaciasList';
import { Button } from '@/components/ui/Button';
import { NavIcon } from '@/features/shell/NavIcon';

export const metadata = { title: 'Farmacias · larokifarm' };

export default async function FarmaciasPage() {
  const farmacias = await contentRepository.listFarmacias();

  return (
    <div className="max-w-[1200px] mx-auto px-3 sm:px-6 lg:px-8 pt-6 sm:pt-10 pb-16 sm:pb-24">
      <header className="flex flex-col gap-4 mb-6 sm:mb-10 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="eyebrow mb-2">Contenido</p>
          <h1 className="h-display m-0">Farmacias</h1>
          <p className="mt-2 text-[14px] text-[var(--color-muted)] max-w-lg text-pretty">
            Cada farmacia es la fuente de una landing pública. Edita textos,
            servicios y horarios; publica cuando estés listo.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* El botón "Borradores" apuntaba a /farmacias?filter=drafts pero
              FarmaciasList no lee query params (todo el filtro es state
              local). Redundante con los tabs "Publicada/Borrador/Archivada"
              del listado, así que lo quitamos. */}
          <Button variant="accent" size="md" asChild className="flex-1 sm:flex-none">
            <Link href="/farmacias/nueva">
              <NavIcon name="Plus" size={14} />
              Nueva farmacia
            </Link>
          </Button>
        </div>
      </header>

      <FarmaciasList farmacias={farmacias} />
    </div>
  );
}
