import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/core/auth';
import { getFarmaciaRepository } from '@/core/farmacias';
import { AppSidebar, AppTopbar, SidebarProvider } from '@/features/shell';
import type { ShellInfo } from '@/features/shell/ui/lib/shellInfo';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  // Personal de farmacia: su farmacia (el listado ya viene filtrado por tenant).
  let miFarmacia: ShellInfo['miFarmacia'];
  if (user.rol !== 'admin' && user.farmaciaId) {
    const [f] = await getFarmaciaRepository().listFarmacias();
    if (f) miFarmacia = { id: f.id, nombre: f.nombre, web: f.web };
  }
  const shell: ShellInfo = { nombre: user.nombre, email: user.email, rol: user.rol, miFarmacia };

  return (
    <SidebarProvider>
      <div className="flex min-h-[100dvh] bg-[var(--color-bg)]">
        <AppSidebar shell={shell} />
        <div className="flex-1 flex flex-col min-w-0">
          <AppTopbar shell={shell} />
          <main id="main" className="flex-1">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
