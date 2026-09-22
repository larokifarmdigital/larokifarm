import { PlaceholderScreen } from '@/components/PlaceholderScreen';

export const metadata = { title: 'Scout · Backoffice' };

export default function ScoutPage() {
  return (
    <PlaceholderScreen
      icon="MagnifyingGlass"
      eyebrow="Comparador de precios"
      title="Scout"
      description="Comparación masiva de precios contra farmacias online. Hoy vive como app aparte y se integrará aquí como módulo."
      bullets={[
        'Buscar un producto y comparar precios en 15+ farmacias.',
        'Comparación masiva de todo el catálogo cargado desde Excel.',
        'Historial persistente asociado a tu usuario.',
      ]}
      fase="Fase 6"
    />
  );
}
