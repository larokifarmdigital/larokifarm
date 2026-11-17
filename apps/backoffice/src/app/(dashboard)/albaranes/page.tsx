import { requireUser, auth } from '@/core/auth';
import { GetBudgetStatusUseCase, getComparisonRepository } from '@/core/comparisons';
import { getBusinessRepository } from '@/core/businesses';
import { ReconcilerView } from '@/features/conciliador';

export const metadata = { title: 'Conciliador · Backoffice' };
export const dynamic = 'force-dynamic';

export default async function ConciliadorPage() {
  await requireUser();
  const session = await auth();
  const businessId = session?.user?.businessId ?? null;
  const budgetStatus = businessId
    ? await new GetBudgetStatusUseCase(getBusinessRepository(), getComparisonRepository()).execute(businessId)
    : null;
  const currentUser = session?.user ? { id: session.user.id, role: session.user.role } : null;
  return <ReconcilerView budgetStatus={budgetStatus} currentUser={currentUser} />;
}
