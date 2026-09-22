import { NavIcon, type IconName } from '@/features/shell/NavIcon';

type PlaceholderScreenProps = {
  icon: IconName;
  eyebrow: string;
  title: string;
  description: string;
  bullets?: string[];
  fase?: string;
};

export function PlaceholderScreen({
  icon,
  eyebrow,
  title,
  description,
  bullets,
  fase,
}: PlaceholderScreenProps) {
  return (
    <div className="max-w-[720px] mx-auto px-3 sm:px-6 lg:px-8 pt-10 sm:pt-16 pb-16 sm:pb-24">
      <div className="text-center">
        <div className="mx-auto w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-[var(--color-accent-soft)] flex items-center justify-center mb-5 sm:mb-6">
          <NavIcon
            name={icon}
            size={26}
            weight="fill"
            className="text-[var(--color-accent)]"
          />
        </div>
        <p className="eyebrow mb-3">{eyebrow}</p>
        <h1 className="h-display m-0">{title}</h1>
        <p className="mt-4 text-[14px] sm:text-[15px] text-[var(--color-muted)] leading-[1.65] max-w-md mx-auto text-pretty">
          {description}
        </p>
      </div>

      {bullets && bullets.length > 0 && (
        <ul className="mt-10 space-y-2 max-w-md mx-auto">
          {bullets.map((b, i) => (
            <li
              key={i}
              className="card p-4 flex items-start gap-3 text-[13.5px] text-[var(--color-ink-2)]"
            >
              <span
                aria-hidden
                className="shrink-0 mt-1 h-1.5 w-1.5 rounded-full bg-[var(--color-accent)]"
              />
              <span className="leading-[1.55]">{b}</span>
            </li>
          ))}
        </ul>
      )}

      {fase && (
        <div className="mt-10 text-center">
          <span className="chip chip-neutral">Se conectará en {fase}</span>
        </div>
      )}
    </div>
  );
}
