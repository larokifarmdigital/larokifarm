import { Suspense } from 'react';
import { ANCHO_PAGINA, PageHeader } from '@/shared/components/molecules/PageHeader';
import { cn } from '@/shared/lib/cn';
import { getPriceListRepository } from '@/core/precios';
import { ListasTabla, SubirListaBoton } from '../../components/ListasTabla';

export async function ListasView({ esAdmin }: { esAdmin: boolean }) {
  const listas = await getPriceListRepository().listar();
  return (
    <div className={cn(ANCHO_PAGINA, 'pt-6 pb-10')}>
      <PageHeader
        titulo="Listas de productos"
        descripcion="Sube un Excel con códigos nacionales y compara los precios de todos sus productos de una vez."
        accion={
          // Sin listas, el único botón es el del estado vacío.
          listas.length > 0 ? (
            <Suspense>
              <SubirListaBoton />
            </Suspense>
          ) : undefined
        }
      />
      <ListasTabla listas={listas} esAdmin={esAdmin} />
    </div>
  );
}
