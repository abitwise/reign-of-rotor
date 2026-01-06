import type { AppConfig } from '../boot/config';
import { createDebugOverlay } from './debugOverlay';

export type RootUiOptions = {
  target: HTMLElement;
  config: AppConfig;
};

export const createRootUi = ({ target, config }: RootUiOptions) => {
  const container = document.createElement('div');
  container.className = 'app-shell';

  const hero = document.createElement('div');
  hero.className = 'app-hero';
  hero.innerHTML = `
    <h1>Reign of Rotor</h1>
    <p>
      LHX-inspired browser demo. This baseline build wires Vite, lint/test scaffolding, and a
      placeholder scene so we can iterate on the cockpit-first experience.
    </p>
    <div class="app-cta">
      <span class="app-tag">Stage: Bootstrap</span>
      <span class="app-tag">Mode: ${config.mode}</span>
    </div>
    <div class="app-status">
      <strong>Build Ready</strong>
      <span>Dev server + production preview are configured. Debug overlay follows environment flags.</span>
    </div>
  `;

  container.appendChild(hero);
  target.replaceChildren(container);

  const destroyDebugOverlay = config.enableDebugOverlay
    ? createDebugOverlay({ host: container, config })
    : null;

  return {
    destroy: () => {
      destroyDebugOverlay?.destroy();
      target.replaceChildren();
    }
  };
};
