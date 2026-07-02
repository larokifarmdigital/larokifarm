interface BrandMarkProps {
  size?: number;
  className?: string;
  /** Si true, la cruz va blanca sobre círculo de marca (para hero). Si false, cruz de marca sobre fondo soft. */
  inverted?: boolean;
}

export function BrandMark({
  size = 48,
  className = '',
  inverted = true,
}: BrandMarkProps) {
  const bg = inverted ? 'var(--brand-primary)' : 'var(--brand-primary-soft)';
  const fg = inverted ? '#ffffff' : 'var(--brand-primary)';
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Logo"
    >
      <rect x="0" y="0" width="64" height="64" rx="16" fill={bg} />
      <path
        d="M26 14h12v12h12v12H38v12H26V38H14V26h12V14z"
        fill={fg}
      />
    </svg>
  );
}
