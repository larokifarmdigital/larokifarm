import { NuevaFarmaciaWizard } from '@/features/farmacias/NuevaFarmaciaWizard';

export const metadata = { title: 'Nueva farmacia · Backoffice' };

export default function NuevaFarmaciaPage() {
  return (
    <div className="max-w-[720px] mx-auto px-3 sm:px-6 lg:px-8 pt-6 sm:pt-10 pb-16 sm:pb-24">
      <NuevaFarmaciaWizard />
    </div>
  );
}
