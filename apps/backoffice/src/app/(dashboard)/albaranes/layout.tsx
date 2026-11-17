import { ConciliadorTabs } from '@/features/conciliador';

export default function ConciliadorLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ConciliadorTabs />
      {children}
    </>
  );
}
