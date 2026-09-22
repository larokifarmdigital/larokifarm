import { PlaceholderScreen } from '@/components/PlaceholderScreen';

export const metadata = { title: 'Albaranes · Backoffice' };

export default function AlbaranesPage() {
  return (
    <PlaceholderScreen
      icon="Receipt"
      eyebrow="Conciliación"
      title="Albaranes"
      description="Subida de PDFs de proveedores y conciliación con las órdenes de compra. Vive hoy en una app aparte y pasará a ser un módulo interno."
      bullets={[
        'Subir varios PDFs y detectar CN, cantidades y descuentos.',
        'Reconstrucción de descuentos multi-página (Nestlé, Perox, Zambon).',
        'Panel de debug para auditar la extracción.',
      ]}
      fase="Fase 7"
    />
  );
}
