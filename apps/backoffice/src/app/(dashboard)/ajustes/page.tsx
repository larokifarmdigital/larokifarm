import { redirect } from 'next/navigation';
import { requireUser } from '@/core/auth';
import { PlaceholderScreen } from '@/shared/components/templates/PlaceholderScreen';

export const metadata = { title: 'Ajustes · Backoffice' };

export default async function AjustesPage() {
  // Módulo sin terminar (oculto del menú): solo el administrador, también por URL.
  const user = await requireUser();
  if (user.rol !== 'admin') redirect('/inicio');
  return (
    <PlaceholderScreen
      icon="GearSix"
      eyebrow="Sistema"
      title="Ajustes"
      description="Gestión de usuarios, roles, dominios y integraciones externas. Se activa junto con el backend real de autenticación."
      bullets={[
        'Invitar personas del equipo con roles (admin, manager, viewer).',
        'Asignar farmacias a cada manager.',
        'Configurar dominios propios y certificados SSL.',
      ]}
      fase="Fase 3"
    />
  );
}
