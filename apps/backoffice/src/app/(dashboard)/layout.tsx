import { redirect } from 'next/navigation';
import { AppSidebar } from '@/features/shell/AppSidebar';
import { AppTopbar } from '@/features/shell/AppTopbar';
import { SidebarProvider } from '@/features/shell/SidebarProvider';
import { getCurrentUser } from '@/lib/session';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  return (
    <SidebarProvider>
      <div className="flex min-h-[100dvh] bg-[var(--color-bg)]">
        <AppSidebar userName={user.nombre} userRole={user.rol} />
        <div className="flex-1 flex flex-col min-w-0">
          <AppTopbar user={user} />
          <main id="main" className="flex-1">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
