import { redirect } from 'next/navigation';
import { getCurrentUser, usuarioTieneModulo } from '@/core/auth';
import { MODULOS } from '@/core/shared';
import { getFarmaciaRepository } from '@/core/farmacias';
import { AppSidebar, AppTopbar, AyudaProvider, SidebarProvider } from '@/features/shell';
import type { ShellInfo } from '@/features/shell/ui/lib/shellInfo';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  // Personal de farmacia: su farmacia, o sus farmacias si lleva varias (el
  // listado ya viene filtrado por tenant).
  let miFarmacia: ShellInfo['miFarmacia'];
  let misFarmacias: ShellInfo['misFarmacias'];
  if (user.rol !== 'admin' && user.farmaciaIds.length > 0) {
    const farmacias = await getFarmaciaRepository().listFarmacias();
    if (farmacias.length === 1) {
      const [f] = farmacias;
      miFarmacia = { id: f.id, nombre: f.nombre, web: f.web };
    } else if (farmacias.length > 1) {
      misFarmacias = farmacias.map((f) => f.nombre).sort((a, b) => a.localeCompare(b, 'es'));
    }
  }
  const shell: ShellInfo = {
    nombre: user.nombre,
    email: user.email,
    rol: user.rol,
    miFarmacia,
    misFarmacias,
    modulos: MODULOS.filter((m) => usuarioTieneModulo(user, m)),
  };

  return (
    <SidebarProvider>
      <AyudaProvider shell={shell}>
      <div className="flex min-h-[100dvh] bg-[var(--color-bg)]">
        <AppSidebar shell={shell} />
        <div className="flex-1 flex flex-col min-w-0">
          <AppTopbar shell={shell} />
          <main id="main" className="flex-1">
            {children}
          </main>
        </div>
      </div>
      </AyudaProvider>
    </SidebarProvider>
  );
}
