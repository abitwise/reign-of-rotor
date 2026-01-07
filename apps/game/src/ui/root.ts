import type { AppConfig } from '../boot/config';
import { createDebugOverlay } from './debugOverlay';
import type { PlayerInputBindings } from '../core/input/playerInput';
import { LandingState, type AltimeterState } from '../sim/altimeter';
import type { CHelicopterAssists } from '../ecs/components/helicopter';
import type { GameState } from '../boot/createApp';

export type RootUiOptions = {
  target: HTMLElement;
  config: AppConfig;
  bindings: PlayerInputBindings;
  gameState: GameState;
};

export type FlightReadoutProvider = () => AltimeterState | null;
export type AssistsProvider = () => CHelicopterAssists | null;
export type CameraModeProvider = () => string | null;

export const createRootUi = ({ target, config, bindings, gameState }: RootUiOptions) => {
  const container = document.createElement('div');
  container.className = 'ui-hud-container';

  const instructionsPanel = createInstructionsPanel(config, bindings, gameState);
  const flightHud = createFlightHud();
  const assistsHud = createAssistsHud();

  container.appendChild(instructionsPanel.element);
  container.appendChild(flightHud.element);
  container.appendChild(assistsHud.element);
  target.replaceChildren(container);

  const debugOverlay = config.enableDebugOverlay
    ? createDebugOverlay({ host: container, config })
    : null;

  // Show instructions on startup
  instructionsPanel.show();

  let flightReadoutProvider: FlightReadoutProvider | null = null;
  let assistsProvider: AssistsProvider | null = null;
  let cameraModeProvider: CameraModeProvider | null = null;
  let hudFrameHandle: number | null = null;

  const hudLoop = (): void => {
    if (!flightReadoutProvider) {
      hudFrameHandle = null;
      return;
    }

    flightHud.update(flightReadoutProvider());
    assistsHud.update(assistsProvider?.() ?? null);
    if (cameraModeProvider) {
      instructionsPanel.setCameraMode(cameraModeProvider() ?? 'Cockpit');
    }
    hudFrameHandle = scheduleFrame(hudLoop);
  };

  return {
    destroy: () => {
      debugOverlay?.destroy();
      instructionsPanel.destroy();
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
    },
    setAssistsProvider: (provider: AssistsProvider) => {
      assistsProvider = provider;
    },
    setCameraModeProvider: (provider: CameraModeProvider) => {
      cameraModeProvider = provider;
      if (hudFrameHandle === null && flightReadoutProvider) {
        hudFrameHandle = scheduleFrame(hudLoop);
      }
    }
  };
};

const createInstructionsPanel = (config: AppConfig, bindings: PlayerInputBindings, gameState: GameState) => {
  const overlay = document.createElement('div');
  overlay.className = 'instructions-overlay hidden';

  const panel = document.createElement('div');
  panel.className = 'instructions-panel';

  const hero = document.createElement('div');
  hero.className = 'instructions-hero';
  hero.innerHTML = `
    <h1>Reign of Rotor</h1>
    <p>
      LHX-inspired browser demo. You start on the ground - <strong>hold R (or Page Up)</strong> to apply collective and take off.
      Click the scene to engage pointer lock for mouse look.
    </p>
    <div class="app-cta">
      <span class="app-tag">Stage: Altimeter + Landing Detection</span>
      <span class="app-tag">Mode: ${config.mode}</span>
    </div>
  `;

  const controlsSection = document.createElement('div');
  controlsSection.className = 'instructions-controls';
  
  const controlsHeading = document.createElement('h3');
  controlsHeading.textContent = 'Flight Controls';

  const controlsGrid = document.createElement('div');
  controlsGrid.className = 'controls-grid';

  const cameraModeValue = document.createElement('strong');
  cameraModeValue.textContent = 'Cockpit';

  controlsGrid.append(
    createAxisRow('Collective', bindings.collective, 'Up', 'Down'),
    createAxisRow('Cyclic Pitch', bindings.cyclicY, 'Forward', 'Back'),
    createAxisRow('Cyclic Roll', bindings.cyclicX, 'Right', 'Left'),
    createAxisRow('Yaw', bindings.yaw, 'Right', 'Left'),
    createCameraModeRow(cameraModeValue),
    createNoteRow('Mouse Look', 'Click canvas to lock pointer; drag if lock unavailable.'),
    createNoteRow('Stability Assist', 'Press Z to toggle auto-leveling'),
    createNoteRow('Hover Assist', 'Press X to toggle drift damping'),
    createNoteRow('Pause', 'Press Space to pause/unpause flight')
  );

  controlsSection.append(controlsHeading, controlsGrid);

  const closeButton = document.createElement('button');
  closeButton.className = 'instructions-close';
  closeButton.textContent = 'Start Flying';
  closeButton.onclick = () => {
    overlay.classList.add('hidden');
    // Resume flight when closing instructions
    gameState.isPaused = false;
  };

  panel.append(hero, controlsSection, closeButton);
  overlay.appendChild(panel);

  return {
    element: overlay,
    show: () => {
      overlay.classList.remove('hidden');
      // Pause flight when showing instructions
      gameState.isPaused = true;
    },
    hide: () => {
      overlay.classList.add('hidden');
      // Resume flight when hiding instructions
      gameState.isPaused = false;
    },
    setCameraMode: (modeLabel: string) => {
      cameraModeValue.textContent = modeLabel;
    },
    destroy: () => {
      closeButton.onclick = null;
    }
  };
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

const createCameraModeRow = (modeValue: HTMLElement): HTMLElement => {
  const row = document.createElement('div');
  row.className = 'control-row';

  const title = document.createElement('div');
  title.className = 'control-label';
  title.textContent = 'Camera Mode';

  const details = document.createElement('div');
  details.className = 'control-note';

  const prefix = document.createTextNode('Press V to toggle. Current: ');
  details.append(prefix, modeValue);

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

  const speedMetric = createHudMetric('Airspeed');
  const altitudeMetric = createHudMetric('Altitude AGL');
  const verticalMetric = createHudMetric('Vertical speed');
  const impactMetric = createHudMetric('Impact severity');

  grid.append(speedMetric.element, altitudeMetric.element, verticalMetric.element, impactMetric.element);
  wrapper.append(heading, landingState.row, grid);

  const update = (readout: AltimeterState | null): void => {
    speedMetric.setValue(formatHorizontalSpeed(readout?.horizontalSpeed));
    altitudeMetric.setValue(formatAltitude(readout?.altitude));
    verticalMetric.setValue(formatVerticalSpeed(readout?.verticalSpeed));
    impactMetric.setValue(formatImpact(readout?.impactSeverity));
    landingState.setState(readout?.landingState ?? LandingState.Airborne, readout?.isGrounded ?? false);
  };

  update(null);

  return { element: wrapper, update };
};

type AssistsHudController = {
  element: HTMLElement;
  update: (assists: CHelicopterAssists | null) => void;
};

const createAssistsHud = (): AssistsHudController => {
  const wrapper = document.createElement('section');
  wrapper.className = 'assists-hud';

  const heading = document.createElement('div');
  heading.className = 'hud-heading';
  heading.textContent = 'Flight Assists';

  const grid = document.createElement('div');
  grid.className = 'assists-grid';

  const stabilityRow = createAssistRow('Stability', 'Z');
  const hoverRow = createAssistRow('Hover', 'X');

  grid.append(stabilityRow.element, hoverRow.element);
  wrapper.append(heading, grid);

  const update = (assists: CHelicopterAssists | null): void => {
    stabilityRow.setState(assists?.stability ?? false);
    hoverRow.setState(assists?.hover ?? false);
  };

  update(null);

  return { element: wrapper, update };
};

const createAssistRow = (label: string, toggleKey: string) => {
  const container = document.createElement('div');
  container.className = 'assist-row';

  const indicator = document.createElement('span');
  indicator.className = 'assist-indicator assist-off';
  indicator.textContent = '○';

  const title = document.createElement('span');
  title.className = 'assist-label';
  title.textContent = label;

  const hint = document.createElement('span');
  hint.className = 'assist-hint';
  hint.textContent = `(${toggleKey})`;

  container.append(indicator, title, hint);

  return {
    element: container,
    setState: (enabled: boolean) => {
      indicator.textContent = enabled ? '●' : '○';
      indicator.className = `assist-indicator ${enabled ? 'assist-on' : 'assist-off'}`;
    }
  };
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

const formatHorizontalSpeed = (speed: number | undefined): string => {
  if (speed === undefined || !Number.isFinite(speed)) {
    return '—';
  }

  const kmh = speed * 3.6;
  return `${kmh.toFixed(0)} km/h`;
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
