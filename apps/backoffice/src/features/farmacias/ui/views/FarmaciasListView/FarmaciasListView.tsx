import { canEditContent, getCurrentUser } from '@/core/auth';
import { getFarmaciaRepository } from '@/core/farmacias';
import { PageHeader, ANCHO_PAGINA } from '@/shared/components/molecules/PageHeader';
import { cn } from '@/shared/lib/cn';
import { FarmaciasList } from '@/features/farmacias/ui/components/FarmaciasList';
import { NuevaFarmaciaBoton } from '@/features/farmacias/ui/components/NuevaFarmaciaDialog';

export async function FarmaciasListView() {
  const repo = getFarmaciaRepository();
  const [farmacias, user] = await Promise.all([repo.listFarmacias(), getCurrentUser()]);
  // Crear/duplicar farmacias es de SUPER_ADMIN (el servidor también lo exige).
  const isAdmin = user?.rol === 'admin';
  const responsables = isAdmin ? await repo.listResponsablesDisponibles() : [];


  return (
    <div className={cn(ANCHO_PAGINA, 'pt-6 pb-10')}>
      <PageHeader
        titulo={isAdmin ? 'Farmacias' : 'Mis webs'}
        descripcion="Cada farmacia tiene su web. Entra para editar sus textos, fotos, servicios y horario, y publícala cuando esté lista."
        accion={isAdmin ? <NuevaFarmaciaBoton responsables={responsables} /> : undefined}
      />

      <FarmaciasList
        farmacias={farmacias}
        canDuplicate={isAdmin}
        canWrite={!!user && canEditContent(user)}
        conFiltros={isAdmin}
      />
    </div>
  );
}
