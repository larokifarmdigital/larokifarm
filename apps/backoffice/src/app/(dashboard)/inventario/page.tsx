import { redirect } from 'next/navigation';
import { requireUser } from '@/core/auth';
import { PlaceholderScreen } from '@/shared/components/templates/PlaceholderScreen';

export const metadata = { title: 'Inventario · Backoffice' };

export default async function InventarioPage() {
  // Módulo sin terminar (oculto del menú): solo el administrador, también por URL.
  const user = await requireUser();
  if (user.rol !== 'admin') redirect('/inicio');
  return (
    <PlaceholderScreen
      icon="Package"
      eyebrow="Stock del cliente"
      title="Inventario"
      description="Se sincroniza desde un Excel del cliente en SharePoint. Consumido por el widget de chat y por Scout."
      bullets={[
        'Estado del último sync y errores si los hubo.',
        'Forzar un sync manual sin esperar al cron.',
        'Histórico de snapshots para trazabilidad.',
      ]}
      fase="Fase 8"
    />
  );
}
