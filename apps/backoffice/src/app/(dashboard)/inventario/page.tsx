import { PlaceholderScreen } from '@/components/PlaceholderScreen';

export const metadata = { title: 'Inventario · Backoffice' };

export default function InventarioPage() {
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
