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
      {(open || inline) && <ChatPanel onClose={inline ? undefined : () => setOpen(false)} />}
      {!inline && !open && (
        <button
          class="cima-fab"
          aria-label="Abrir chat de medicamentos"
          aria-expanded={false}
          onClick={() => setOpen(true)}
        >
          <span aria-hidden="true">💬</span>
        </button>
      )}
    </div>
  );
}
