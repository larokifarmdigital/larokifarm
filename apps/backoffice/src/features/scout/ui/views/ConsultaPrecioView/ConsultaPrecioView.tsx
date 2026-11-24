import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Button } from '@/shared/components/atoms/Button';
import { NavIcon } from '@/shared/components/atoms/NavIcon';
import { ANCHO_PAGINA } from '@/shared/components/molecules/PageHeader';
import { cn } from '@/shared/lib/cn';
import { cuando } from '../../lib/precios';
import { FARMACIAS, farmaciasPara, getPriceCheckRepository } from '@/core/precios';
import { AvisoReceta, TarjetaProducto } from '../../components/TarjetaProducto';
import { TablaPrecios } from '../../components/TablaPrecios';

/** Una consulta guardada, en solo lectura, con "Volver a consultar". */
export async function ConsultaPrecioView({ id, volverA }: { id: string; volverA?: { href: string; texto: string } }) {
  const c = await getPriceCheckRepository().obtener(id);
  if (!c) notFound();
  const nombres = Object.fromEntries(FARMACIAS.map((f) => [f.clave, f.nombre]));
  // Las farmacias de entonces: las que tienen resultado y, si alguna no llegó a responder, también.
  const claves = [...new Set([...farmaciasPara(c.producto.tipo).map((f) => f.clave), ...c.ofertas.map((o) => o.farmacia)])];
  const ofertas = Object.fromEntries(c.ofertas.map((o) => [o.farmacia, o]));
  const sinRespuesta = (clave: string) => ({
    farmacia: clave,
    estado: 'error' as const,
    precio: null,
    precioAntes: null,
    url: null,
    nombreFicha: null,
    nota: null,
    consultadoEn: c.creadaEn,
  });

  return (
    <div className={cn(ANCHO_PAGINA, 'pt-6 pb-10')}>
      <Link
        href={volverA?.href ?? '/scout/historial'}
        className="mb-4 inline-flex min-h-11 sm:min-h-8 items-center gap-1.5 text-[14px] font-medium text-[var(--color-ink-2)] hover:text-[var(--color-ink)]"
      >
        <NavIcon name="ArrowLeft" size={15} />
        {volverA?.texto ?? 'Historial'}
      </Link>
      <div className="flex flex-col gap-4 sm:gap-5">
        <TarjetaProducto
          producto={c.producto}
          ofertas={c.ofertas}
          totalFarmacias={claves.length}
          terminado
          creadaEn={c.creadaEn}
          nombresFarmacia={nombres}
          esTituloDePagina
          accion={
            c.producto.tipo === 'receta' ? undefined : (
            <Button asChild variant="accent" className="w-full sm:w-auto">
              <Link href={`/scout?cn=${c.producto.cn}&auto=1`}>
                <NavIcon name="ArrowsClockwise" size={16} />
                Volver a consultar
              </Link>
            </Button>
            )
          }
        />
        {c.producto.tipo === 'receta' ? (
          <AvisoReceta precioOficial={c.precioOficial} />
        ) : (
          <section className="card p-5 sm:p-6" aria-labelledby="precios-titulo">
            <h2 id="precios-titulo" className="m-0 text-[17px] font-semibold text-[var(--color-ink)]">
              Precio en otras farmacias
            </h2>
            <p className="m-0 mt-1 mb-4 text-[14px] text-[var(--color-ink-2)]">
              Precios consultados {cuando(c.creadaEn)}. Pueden haber cambiado.
            </p>
            <TablaPrecios
              filas={claves.map((k) => ({ clave: k, nombre: nombres[k] ?? k, oferta: ofertas[k] ?? sinRespuesta(k) }))}
              terminado
            />
          </section>
        )}
      </div>
    </div>
  );
}
