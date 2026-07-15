import { auth } from '@/core/auth';
import {
  GetBudgetStatusUseCase,
  getComparisonRepository,
} from '@/core/comparisons';
import { getBusinessRepository } from '@/core/businesses';
import { ReconcilerView } from '@/features/reconciler';

export default async function Home() {
  const session = await auth();
  let budgetStatus = null;
  if (session?.user?.businessId) {
    budgetStatus = await new GetBudgetStatusUseCase(
      getBusinessRepository(),
      getComparisonRepository(),
    ).execute(session.user.businessId);
  }
  const currentUser = session?.user
    ? { id: session.user.id, role: session.user.role }
    : null;
  return <ReconcilerView budgetStatus={budgetStatus} currentUser={currentUser} />;
}
