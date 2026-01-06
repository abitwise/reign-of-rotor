import type { AppConfig } from '../boot/config';
import { createDebugOverlay } from './debugOverlay';
import type { PlayerInputBindings } from '../core/input/playerInput';
import { LandingState, type AltimeterState } from '../sim/altimeter';

export type RootUiOptions = {
  target: HTMLElement;
  config: AppConfig;
  bindings: PlayerInputBindings;
};

export type FlightReadoutProvider = () => AltimeterState | null;

export const createRootUi = ({ target, config, bindings }: RootUiOptions) => {
  const container = document.createElement('div');
  container.className = 'app-shell';

  const hero = document.createElement('div');
  hero.className = 'app-hero';
  hero.innerHTML = `
    <h1>Reign of Rotor</h1>
    <p>
      LHX-inspired browser demo. Keyboard + mouse input now map into the fixed-step sim loop while the
      cockpit camera keeps mouse-look separate from flight controls. Click the scene to engage
      pointer lock; if it is denied, hold the mouse to drag-look.
    </p>
    <div class="app-cta">
      <span class="app-tag">Stage: Altimeter + Landing Detection</span>
      <span class="app-tag">Mode: ${config.mode}</span>
    </div>
    <div class="app-status">
      <strong>Altimeter and landing sensing live</strong>
      <span>AGL now comes from a physics raycast each tick, with landing and hard-landing detection feeding the HUD readout while keeping mouse-look separate from flight controls.</span>
    </div>
  `;

  const controlsPanel = createControlsPanel(bindings);
  const flightHud = createFlightHud();

  container.appendChild(hero);
  container.appendChild(controlsPanel);
  container.appendChild(flightHud.element);
  target.replaceChildren(container);

  const debugOverlay = config.enableDebugOverlay
    ? createDebugOverlay({ host: container, config })
    : null;

  let flightReadoutProvider: FlightReadoutProvider | null = null;
  let hudFrameHandle: number | null = null;

  const hudLoop = (): void => {
    if (!flightReadoutProvider) {
      hudFrameHandle = null;
      return;
    }

    flightHud.update(flightReadoutProvider());
    hudFrameHandle = scheduleFrame(hudLoop);
  };

  return {
    destroy: () => {
      debugOverlay?.destroy();
      if (hudFrameHandle !== null) {
        cancelScheduledFrame(hudFrameHandle);
      }
      target.replaceChildren();
    },
    setLoopMetrics: debugOverlay?.setLoopMetrics,
    setFlightReadoutProvider: (provider: FlightReadoutProvider) => {
      flightReadoutProvider = provider;
      if (hudFrameHandle === null) {
        hudFrameHandle = scheduleFrame(hudLoop);
      }
    }
  };
};

const createControlsPanel = (bindings: PlayerInputBindings): HTMLElement => {
  const wrapper = document.createElement('section');
  wrapper.className = 'controls-panel';

  const heading = document.createElement('h3');
  heading.textContent = 'Controls (Dev)';

  const grid = document.createElement('div');
  grid.className = 'controls-grid';

  grid.append(
    createAxisRow('Collective', bindings.collective, 'Up', 'Down'),
    createAxisRow('Cyclic Pitch', bindings.cyclicY, 'Forward', 'Back'),
    createAxisRow('Cyclic Roll', bindings.cyclicX, 'Right', 'Left'),
    createAxisRow('Yaw', bindings.yaw, 'Right', 'Left'),
    createNoteRow('Mouse Look', 'Click to lock pointer; hold mouse and drag if pointer lock is unavailable.')
  );

  wrapper.append(heading, grid);
  return wrapper;
};

const createAxisRow = (
  label: string,
  binding: { positive: string[]; negative: string[] },
  positiveLabel: string,
  negativeLabel: string
): HTMLElement => {
  const row = document.createElement('div');
  row.className = 'control-row';

  const title = document.createElement('div');
  title.className = 'control-label';
  title.textContent = label;

  const details = document.createElement('div');
  details.className = 'control-detail';

  const positive = document.createElement('div');
  positive.className = 'control-bind';
  positive.innerHTML = `<span>${positiveLabel}</span><strong>${formatKeyList(binding.positive)}</strong>`;

  const negative = document.createElement('div');
  negative.className = 'control-bind';
  negative.innerHTML = `<span>${negativeLabel}</span><strong>${formatKeyList(binding.negative)}</strong>`;

  details.append(positive, negative);
  row.append(title, details);
  return row;
};

const createNoteRow = (label: string, note: string): HTMLElement => {
  const row = document.createElement('div');
  row.className = 'control-row';

  const title = document.createElement('div');
  title.className = 'control-label';
  title.textContent = label;

  const details = document.createElement('div');
  details.className = 'control-note';
  details.textContent = note;

  row.append(title, details);
  return row;
};

type FlightHudController = {
  element: HTMLElement;
  update: (readout: AltimeterState | null) => void;
};

const createFlightHud = (): FlightHudController => {
  const wrapper = document.createElement('section');
  wrapper.className = 'flight-hud';

  const heading = document.createElement('div');
  heading.className = 'hud-heading';
  heading.textContent = 'Flight readout';

  const landingState = createLandingStateBadge();
  const grid = document.createElement('div');
  grid.className = 'flight-grid';

  const altitudeMetric = createHudMetric('Altitude AGL');
  const verticalMetric = createHudMetric('Vertical speed');
  const impactMetric = createHudMetric('Impact severity');

  grid.append(altitudeMetric.element, verticalMetric.element, impactMetric.element);
  wrapper.append(heading, landingState.row, grid);

  const update = (readout: AltimeterState | null): void => {
    altitudeMetric.setValue(formatAltitude(readout?.altitude));
    verticalMetric.setValue(formatVerticalSpeed(readout?.verticalSpeed));
    impactMetric.setValue(formatImpact(readout?.impactSeverity));
    landingState.setState(readout?.landingState ?? LandingState.Airborne, readout?.isGrounded ?? false);
  };

  update(null);

  return { element: wrapper, update };
};

const createHudMetric = (label: string) => {
  const container = document.createElement('div');
  container.className = 'hud-metric';

  const title = document.createElement('span');
  title.textContent = label;

  const value = document.createElement('strong');
  value.textContent = '—';

  container.append(title, value);

  return {
    element: container,
    setValue: (text: string) => {
      value.textContent = text;
    }
  };
};

const createLandingStateBadge = () => {
  const row = document.createElement('div');
  row.className = 'landing-row';

  const label = document.createElement('div');
  label.className = 'control-label';
  label.textContent = 'Landing state';

  const badge = document.createElement('span');
  badge.className = 'landing-badge landing-airborne';
  badge.textContent = 'Airborne';

  row.append(label, badge);

  return {
    row,
    setState: (state: LandingState, grounded: boolean) => {
      badge.textContent = formatLandingState(state, grounded);
      badge.className = `landing-badge ${landingClassName(state)}`;
    }
  };
};

const formatLandingState = (state: LandingState, grounded: boolean): string => {
  switch (state) {
    case LandingState.Landed:
      return grounded ? 'Landed' : 'Lifted';
    case LandingState.HardLanding:
      return 'Hard landing';
    case LandingState.Crashed:
      return 'Crashed';
    default:
      return grounded ? 'Ground contact' : 'Airborne';
  }
};

const landingClassName = (state: LandingState): string => {
  switch (state) {
    case LandingState.Landed:
      return 'landing-safe';
    case LandingState.HardLanding:
      return 'landing-warning';
    case LandingState.Crashed:
      return 'landing-danger';
    default:
      return 'landing-airborne';
  }
};

const formatAltitude = (altitude: number | undefined): string => {
  if (altitude === undefined || !Number.isFinite(altitude)) {
    return '—';
  }

  return `${altitude.toFixed(1)} m AGL`;
};

const formatVerticalSpeed = (verticalSpeed: number | undefined): string => {
  if (verticalSpeed === undefined || !Number.isFinite(verticalSpeed)) {
    return '—';
  }

  const clamped = Math.abs(verticalSpeed) < 0.01 ? 0 : verticalSpeed;
  const sign = clamped > 0 ? '+' : '';
  return `${sign}${clamped.toFixed(2)} m/s`;
};

const formatImpact = (impactSeverity: number | undefined): string => {
  if (!impactSeverity || !Number.isFinite(impactSeverity)) {
    return '—';
  }

  return `${impactSeverity.toFixed(1)} m/s`;
};

const scheduleFrame = (callback: FrameRequestCallback): number => {
  if (typeof requestAnimationFrame === 'function') {
    return requestAnimationFrame(callback);
  }

  return window.setTimeout(() => {
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    callback(now);
  }, 1000 / 60);
};

const cancelScheduledFrame = (handle: number): void => {
  if (typeof cancelAnimationFrame === 'function') {
    cancelAnimationFrame(handle);
    return;
  }

  clearTimeout(handle);
};

const KEY_LABELS: Record<string, string> = {
  KeyW: 'W',
  KeyA: 'A',
  KeyS: 'S',
  KeyD: 'D',
  KeyQ: 'Q',
  KeyE: 'E',
  KeyR: 'R',
  KeyF: 'F',
  ArrowUp: 'Arrow ↑',
  ArrowDown: 'Arrow ↓',
  ArrowLeft: 'Arrow ←',
  ArrowRight: 'Arrow →',
  PageUp: 'Page Up',
  PageDown: 'Page Down'
};

const formatKey = (code: string): string => KEY_LABELS[code] ?? code;
const formatKeyList = (codes: string[]): string => codes.map(formatKey).join(' / ');
