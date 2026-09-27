import { useState, useEffect } from 'preact/hooks';
import { ChatPanel } from './components/ChatPanel';
import type { MountOptions } from './main';

function buildPrimaryStyle(color: string, theme: 'light' | 'dark'): Record<string, string> {
  if (theme === 'dark') {
    return {
      '--c-primary': color,
      '--c-primary-hover': `color-mix(in srgb, ${color} 80%, white)`,
      '--c-primary-soft': `color-mix(in srgb, ${color} 30%, black)`,
      '--c-primary-strong': `color-mix(in srgb, ${color} 50%, white)`,
    };
  }
  return {
    '--c-primary': color,
    '--c-primary-hover': `color-mix(in srgb, ${color} 85%, black)`,
    '--c-primary-soft': `color-mix(in srgb, ${color} 15%, white)`,
    '--c-primary-strong': `color-mix(in srgb, ${color} 70%, black)`,
  };
}

export function Widget(props: MountOptions) {
  const [open, setOpen] = useState(false);
  const inline = props.position === 'inline';

  useEffect(() => {
    if (inline) setOpen(true);
  }, [inline]);

  const position = props.position ?? 'bottom-right';
  const theme = props.theme ?? 'light';
  const customPrimary = theme === 'dark' ? props.primaryDark : props.primaryLight;
  const style = customPrimary ? buildPrimaryStyle(customPrimary, theme) : undefined;

  return (
    <div class={`cima-shell pos-${position} theme-${theme}`} style={style}>
      {(open || inline) && (
        <ChatPanel
          onClose={inline ? undefined : () => setOpen(false)}
          logoUrl={props.logoUrl}
          brandName={props.brandName}
        />
      )}
      {!inline && !open && (
        <button
          class="cima-fab"
          aria-label="Abrir chat de medicamentos"
          aria-expanded={false}
          onClick={() => setOpen(true)}
        >
          <svg
            viewBox="0 0 24 24"
            width="22"
            height="22"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="M21 12a8 8 0 0 1-11.5 7.2L4 21l1.8-5.5A8 8 0 1 1 21 12z" />
          </svg>
        </button>
      )}
    </div>
  );
}
