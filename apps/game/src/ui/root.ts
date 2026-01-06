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
      LHX-inspired browser demo. Babylon scene + Rapier world now feed a cockpit-first camera with
      render bindings driven by sim/physics transforms. Click the scene to engage mouse-look (pointer
      lock); hit Esc to release.
    </p>
    <div class="app-cta">
      <span class="app-tag">Stage: Cockpit Camera Rig</span>
      <span class="app-tag">Mode: ${config.mode}</span>
    </div>
    <div class="app-status">
      <strong>Cockpit view ready</strong>
      <span>Babylon canvas mounts with debug lighting + ground. Mesh bindings follow sim/physics transforms, and cockpit mouse-look uses pointer lock by default.</span>
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
