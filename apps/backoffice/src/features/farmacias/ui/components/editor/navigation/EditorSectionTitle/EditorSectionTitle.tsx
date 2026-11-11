import type { ReactNode } from 'react';

export function EditorSectionTitle({
  title,
  hint,
}: {
  /** Conservado para no romper llamadas; ya no se renderiza. */
  step?: string;
  title: string;
  hint?: ReactNode;
}) {
  return (
    <div className="mb-8 pb-5 border-b border-[var(--color-hairline)]">
      <h2 className="text-[26px] sm:text-[30px] leading-[1.05] tracking-[-0.03em] font-medium text-[var(--color-ink)] m-0">
        {title}
      </h2>
      {hint && (
        <p className="mt-2 text-[13.5px] leading-[1.5] text-[var(--color-muted)] max-w-[52ch] m-0">
          {hint}
        </p>
      )}
    </div>
  );
}
