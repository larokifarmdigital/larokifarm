import { render } from 'preact';
import { attachShadow, getMountNode } from './lib/shadow';
import { Widget } from './widget';

export interface MountOptions {
  theme?: 'light' | 'dark';
  position?: 'bottom-right' | 'bottom-left' | 'inline';
  primaryLight?: string;
  primaryDark?: string;
}

export interface CimaHandle {
  update(opts: MountOptions): void;
  unmount(): void;
}

function readOptions(el: HTMLElement): MountOptions {
  return {
    theme: (el.dataset.theme as MountOptions['theme']) ?? 'light',
    position: (el.dataset.position as MountOptions['position']) ?? 'bottom-right',
    primaryLight: el.dataset.primaryLight || undefined,
    primaryDark: el.dataset.primaryDark || undefined,
  };
}

type MountedEl = HTMLElement & { __cimaHandle?: CimaHandle };

export function mount(target: HTMLElement, opts: MountOptions = {}): CimaHandle {
  const el = target as MountedEl;
  if (el.__cimaHandle) {
    el.__cimaHandle.update(opts);
    return el.__cimaHandle;
  }
  const root = attachShadow(target);
  const mountNode = getMountNode(root);
  let current: MountOptions = opts;
  const renderWidget = () => render(<Widget {...current} />, mountNode);
  renderWidget();
  const handle: CimaHandle = {
    update(next) {
      current = { ...current, ...next };
      renderWidget();
    },
    unmount() {
      render(null, mountNode);
      delete el.__cimaHandle;
    },
  };
  el.__cimaHandle = handle;
  return handle;
}

function autoMount() {
  const nodes = document.querySelectorAll<HTMLElement>('[data-cima-chat]');
  nodes.forEach((el) => mount(el, readOptions(el)));
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', autoMount, { once: true });
} else {
  autoMount();
}

declare global {
  interface Window {
    CimaChat?: { mount: typeof mount };
  }
}
window.CimaChat = { mount };
