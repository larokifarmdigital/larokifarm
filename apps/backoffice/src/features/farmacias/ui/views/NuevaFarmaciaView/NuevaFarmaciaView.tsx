import { getFarmaciaRepository } from '@/core/farmacias';
import { NuevaFarmaciaWizard } from '@/features/farmacias/ui/components/NuevaFarmaciaWizard';

export async function NuevaFarmaciaView() {
  const responsables = await getFarmaciaRepository().listResponsablesDisponibles();
  return (
    <div className="max-w-[720px] mx-auto px-3 sm:px-6 lg:px-8 pt-6 sm:pt-10 pb-16 sm:pb-24">
      <NuevaFarmaciaWizard responsables={responsables} />
    </div>
  );
}
