import type { AppConfig } from '../boot/config';

export type DebugOverlayOptions = {
  host: HTMLElement;
  config: AppConfig;
};

export const createDebugOverlay = ({ host, config }: DebugOverlayOptions) => {
  const wrapper = document.createElement('section');
  wrapper.className = 'debug-overlay';

  const heading = document.createElement('h2');
  heading.textContent = 'Debug Overlay';
  heading.style.margin = '0';
  heading.style.fontSize = '18px';

  const description = document.createElement('p');
  description.textContent = 'Environment flags for the current build.';
  description.style.margin = '6px 0 0';

  const grid = document.createElement('div');
  grid.className = 'debug-grid';

  const items: Array<[string, string]> = [
    ['Mode', config.mode],
    ['Dev', String(config.isDev)],
    ['Prod', String(config.isProd)],
    ['Debug Overlay', String(config.enableDebugOverlay)],
    ['Build Label', config.buildLabel]
  ];

  items.forEach(([label, value]) => {
    const row = document.createElement('div');
    row.className = 'debug-label';

    const labelEl = document.createElement('span');
    labelEl.textContent = label;

    const valueEl = document.createElement('span');
    valueEl.textContent = value;

    row.append(labelEl, valueEl);
    grid.appendChild(row);
  });

  wrapper.append(heading, description, grid);
  host.appendChild(wrapper);

  return {
    destroy: () => {
      host.removeChild(wrapper);
    }
  };
};
