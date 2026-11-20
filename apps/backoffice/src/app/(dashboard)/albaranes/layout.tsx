import { ConciliadorTabs } from '@/features/conciliador';

export default function ConciliadorLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* En escritorio los sub-apartados ya están en el menú lateral */}
      <div className="lg:hidden">
        <ConciliadorTabs />
      </div>
      {children}
    </>
  );
}
