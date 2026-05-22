import widgetCss from '../styles/widget.css?inline';

export function attachShadow(host: HTMLElement): ShadowRoot {
  const root = host.attachShadow({ mode: 'open' });
  const style = document.createElement('style');
  style.textContent = widgetCss;
  root.appendChild(style);
  const mount = document.createElement('div');
  mount.className = 'cima-root';
  root.appendChild(mount);
  return root;
}

export function getMountNode(root: ShadowRoot): HTMLElement {
  return root.querySelector('.cima-root') as HTMLElement;
}
