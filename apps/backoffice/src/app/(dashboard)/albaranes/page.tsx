import { requireUser, auth } from '@/core/auth';
import { GetBudgetStatusUseCase, getAiUsageRepository, getComparisonRepository } from '@/core/comparisons';
import { getBusinessRepository } from '@/core/businesses';
import { getFarmaciaRepository } from '@/core/farmacias';
import { ReconcilerView } from '@/features/conciliador';

export const metadata = { title: 'Conciliador · Backoffice' };
export const dynamic = 'force-dynamic';

export default async function ConciliadorPage() {
  const user = await requireUser();
  const session = await auth();
  const presupuesto = new GetBudgetStatusUseCase(getBusinessRepository(), getComparisonRepository(), getAiUsageRepository());
  const currentUser = session?.user ? { id: session.user.id, role: session.user.role } : null;

  // Personal con varias farmacias: elige para cuál concilia (cada una con su límite mensual).
  if (user.rol !== 'admin' && user.farmaciaIds.length > 1) {
    const mias = await getFarmaciaRepository().listFarmacias();
    const farmacias = await Promise.all(
      mias
        .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
        .map(async (f) => ({ id: f.id, nombre: f.nombre, budgetStatus: await presupuesto.execute(f.id) })),
    );
    return <ReconcilerView budgetStatus={null} currentUser={currentUser} farmacias={farmacias} />;
  }

  const businessId = user.rol === 'admin' ? (session?.user?.businessId ?? null) : (user.farmaciaIds[0] ?? null);
  const budgetStatus = businessId ? await presupuesto.execute(businessId) : null;
  return <ReconcilerView budgetStatus={budgetStatus} currentUser={currentUser} />;
}
