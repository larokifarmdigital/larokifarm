export default function ConciliadorLayout({ children }: { children: React.ReactNode }) {
  // Sin pestañas propias: "Nueva conciliación" e "Historial" ya están en el menú
  // lateral (y en el cajón en móvil), y el Historial tiene su botón accent.
  return <>{children}</>;
}
