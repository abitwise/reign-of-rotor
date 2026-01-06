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
      LHX-inspired browser demo. Babylon scene + Rapier world are bootstrapped with a placeholder
      camera so we can start wiring entity bindings and assets.
    </p>
    <div class="app-cta">
      <span class="app-tag">Stage: Scene Bootstrap</span>
      <span class="app-tag">Mode: ${config.mode}</span>
    </div>
    <div class="app-status">
      <strong>Render layer ready</strong>
      <span>Babylon canvas mounted with debug-friendly lighting and ground; asset manifest loads from <code>/assets/manifest.json</code>.</span>
    </div>
  `;

  container.appendChild(hero);
  target.replaceChildren(container);

  const debugOverlay = config.enableDebugOverlay
    ? createDebugOverlay({ host: container, config })
    : null;

  return {
    destroy: () => {
      debugOverlay?.destroy();
      target.replaceChildren();
    },
    setLoopMetrics: debugOverlay?.setLoopMetrics
  };
};
