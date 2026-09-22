import { PlaceholderScreen } from '@/components/PlaceholderScreen';

export const metadata = { title: 'Ajustes · Backoffice' };

export default function AjustesPage() {
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
