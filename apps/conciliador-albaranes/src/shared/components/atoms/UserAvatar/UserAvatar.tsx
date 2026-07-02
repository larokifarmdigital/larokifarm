interface UserAvatarProps {
  /** Texto identificador para el hash de color (email es estable, nombre puede cambiar). */
  seed: string;
  /** Nombre mostrado para calcular iniciales. */
  name: string;
  size?: 'sm' | 'md' | 'lg';
}

const PALETTE: readonly string[] = [
  '#DB4437', // red
  '#E91E63', // pink
  '#9C27B0', // purple
  '#673AB7', // deep purple
  '#3F51B5', // indigo
  '#4285F4', // blue
  '#039BE5', // light blue
  '#00ACC1', // cyan
  '#00897B', // teal
  '#0F9D58', // green
  '#7CB342', // light green
  '#F09300', // amber
  '#F4511E', // deep orange
  '#795548', // brown
  '#607D8B', // blue grey
  '#546E7A', // slate
];

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function colorFor(seed: string): string {
  if (!seed) return PALETTE[0];
  return PALETTE[hashCode(seed) % PALETTE.length];
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return (parts[0][0] ?? '?').toUpperCase();
  return ((parts[0][0] ?? '') + (parts[1][0] ?? '')).toUpperCase();
}

export function UserAvatar({ seed, name, size = 'sm' }: UserAvatarProps) {
  const bg = colorFor(seed || name);
  const initials = getInitials(name);
  const dim =
    size === 'sm'
      ? 'h-7 w-7 text-xs'
      : size === 'lg'
        ? 'h-12 w-12 text-base'
        : 'h-10 w-10 text-sm';

  return (
    <span
      aria-hidden
      className={`flex ${dim} shrink-0 items-center justify-center rounded-full font-semibold text-white`}
      style={{ background: bg }}
    >
      {initials}
    </span>
  );
}
