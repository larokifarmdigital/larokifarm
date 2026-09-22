import type { CSSProperties } from 'react';
import { buscarIcono, type IconoNombre } from '@/lib/iconos-catalogo';

export function IconoSVG({
  nombre,
  size = 20,
  className,
  style,
}: {
  nombre: IconoNombre | string | null | undefined;
  size?: number;
  className?: string;
  style?: CSSProperties;
}) {
  const icono = buscarIcono(nombre);
  if (!icono) return null;
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
      style={style}
      dangerouslySetInnerHTML={{ __html: icono.svg }}
    />
  );
}
