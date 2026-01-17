import type { AppConfig } from '../boot/config';
import { createDebugOverlay } from './debugOverlay';
import { FORCE_TRIM_KEY, RESET_TRIM_KEY, type PlayerInputBindings } from '../core/input/playerInput';
import type { ControlTrimState } from '../core/input/controlState';
import { isTrimActive } from '../core/input/trimUtils';
import { LandingState } from '../sim/altimeter';
import type { CHelicopterAssists } from '../ecs/components/helicopter';
import type { GameState } from '../boot/createApp';
import {
  type AvionicsReadout,
  type NavigationReadout,
  type ThreatReadout,
  buildAvionicsAlerts,
  selectPriorityAlert,
  toThreatAlertCandidate
} from './hudReadouts';

export type RootUiOptions = {
  target: HTMLElement;
  config: AppConfig;
  bindings: PlayerInputBindings;
  gameState: GameState;
};

export type AvionicsReadoutProvider = () => AvionicsReadout | null;
export type AssistsProvider = () => CHelicopterAssists | null;
export type CameraModeProvider = () => string | null;
export type TrimStateProvider = () => ControlTrimState | null;
export type CombatReadout = {
  weaponName: string | null;
  ammo: number | null;
  lockState: string | null;
};
export type OutOfBoundsReadout = {
  active: boolean;
  secondsRemaining: number | null;
};
export type CombatReadoutProvider = () => CombatReadout | null;
export type ThreatReadoutProvider = () => ThreatReadout | null;
export type OutOfBoundsProvider = () => OutOfBoundsReadout | null;
export type NavigationReadoutProvider = () => NavigationReadout | null;

export const createRootUi = ({ target, config, bindings, gameState }: RootUiOptions) => {
  const container = document.createElement('div');
  container.className = 'ui-hud-container';

  const instructionsPanel = createInstructionsPanel(config, bindings, gameState);
  const avionicsHud = createAvionicsHud();
  const assistsHud = createAssistsHud();
  const combatHud = createCombatHud();
  const alertBanner = createWarningBanner('alert-banner');
  const boundsBanner = createWarningBanner('bounds-banner');

  container.appendChild(instructionsPanel.element);
  container.appendChild(avionicsHud.element);
  container.appendChild(assistsHud.element);
  container.appendChild(combatHud.element);
  container.appendChild(alertBanner.element);
  container.appendChild(boundsBanner.element);
  target.replaceChildren(container);

  const debugOverlay = config.enableDebugOverlay
    ? createDebugOverlay({ host: container, config })
    : null;

  let isDebugOverlayVisible = true;
  let isFlightHudVisible = true;
  const setFlightHudVisible = (visible: boolean): void => {
    isFlightHudVisible = visible;
    avionicsHud.element.style.display = visible ? '' : 'none';
  };

  const setDebugOverlayVisible = (visible: boolean): void => {
    isDebugOverlayVisible = visible;
    debugOverlay?.setVisible(visible);
  };

  const handleKeyDown = (event: KeyboardEvent): void => {
    if (!event.code) {
      return;
    }

    if (event.code === 'KeyH') {
      if (instructionsPanel.element.classList.contains('hidden')) {
        instructionsPanel.show();
      } else {
        instructionsPanel.hide();
      }
    }

    if (event.code === 'KeyI') {
      setFlightHudVisible(!isFlightHudVisible);
    }

    if (event.code === 'KeyO') {
      setDebugOverlayVisible(!isDebugOverlayVisible);
    }
  };

  window.addEventListener('keydown', handleKeyDown);

  // Show instructions on startup
  instructionsPanel.show();

  let avionicsReadoutProvider: AvionicsReadoutProvider | null = null;
  let assistsProvider: AssistsProvider | null = null;
  let cameraModeProvider: CameraModeProvider | null = null;
  let trimStateProvider: TrimStateProvider | null = null;
  let combatProvider: CombatReadoutProvider | null = null;
  let threatProvider: ThreatReadoutProvider | null = null;
  let outOfBoundsProvider: OutOfBoundsProvider | null = null;
  let navigationProvider: NavigationReadoutProvider | null = null;
  let hudFrameHandle: number | null = null;

  const hudLoop = (): void => {
    if (!avionicsReadoutProvider) {
      hudFrameHandle = null;
      return;
    }

    const trimState = trimStateProvider?.() ?? null;
    const avionicsReadout = avionicsReadoutProvider();
    avionicsHud.update(avionicsReadout, navigationProvider?.() ?? null);
    assistsHud.update(assistsProvider?.() ?? null, trimState);
    combatHud.update(combatProvider?.() ?? null);
    const avionicsAlerts = avionicsReadout ? buildAvionicsAlerts(avionicsReadout) : [];
    const threatAlert = toThreatAlertCandidate(threatProvider?.() ?? null);
    const alert = selectPriorityAlert(
      threatAlert ? [...avionicsAlerts, threatAlert] : avionicsAlerts
    );
    alertBanner.setWarning(alert?.label ?? null);
    boundsBanner.setWarning(formatOutOfBoundsWarning(outOfBoundsProvider?.() ?? null));
    if (cameraModeProvider) {
      instructionsPanel.setCameraMode(cameraModeProvider() ?? 'Cockpit');
    }
    debugOverlay?.setTrimState?.(trimState);
    hudFrameHandle = scheduleFrame(hudLoop);
  };

  return {
    destroy: () => {
      window.removeEventListener('keydown', handleKeyDown);
      debugOverlay?.destroy();
      instructionsPanel.destroy();
      if (hudFrameHandle !== null) {
        cancelScheduledFrame(hudFrameHandle);
      }
      target.replaceChildren();
    },
    setLoopMetrics: debugOverlay?.setLoopMetrics,
    setAvionicsReadoutProvider: (provider: AvionicsReadoutProvider) => {
      avionicsReadoutProvider = provider;
      if (hudFrameHandle === null) {
        hudFrameHandle = scheduleFrame(hudLoop);
      }
    },
    setAssistsProvider: (provider: AssistsProvider) => {
      assistsProvider = provider;
    },
    setCameraModeProvider: (provider: CameraModeProvider) => {
      cameraModeProvider = provider;
      if (hudFrameHandle === null && avionicsReadoutProvider) {
        hudFrameHandle = scheduleFrame(hudLoop);
      }
    },
    setTrimStateProvider: (provider: TrimStateProvider) => {
      trimStateProvider = provider;
      if (hudFrameHandle === null && avionicsReadoutProvider) {
        hudFrameHandle = scheduleFrame(hudLoop);
      }
    },
    setCombatReadoutProvider: (provider: CombatReadoutProvider) => {
      combatProvider = provider;
      if (hudFrameHandle === null && avionicsReadoutProvider) {
        hudFrameHandle = scheduleFrame(hudLoop);
      }
    },
    setThreatReadoutProvider: (provider: ThreatReadoutProvider) => {
      threatProvider = provider;
      if (hudFrameHandle === null && avionicsReadoutProvider) {
        hudFrameHandle = scheduleFrame(hudLoop);
      }
    },
    setOutOfBoundsProvider: (provider: OutOfBoundsProvider) => {
      outOfBoundsProvider = provider;
      if (hudFrameHandle === null && avionicsReadoutProvider) {
        hudFrameHandle = scheduleFrame(hudLoop);
      }
    },
    setNavigationReadoutProvider: (provider: NavigationReadoutProvider) => {
      navigationProvider = provider;
      if (hudFrameHandle === null && avionicsReadoutProvider) {
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
    createNoteRow('Force Trim', `Press ${formatKey(FORCE_TRIM_KEY)} to set new neutral trim`),
    createNoteRow('Reset Trim', `Press ${formatKey(RESET_TRIM_KEY)} to clear trim offsets`),
    createNoteRow('Pause', 'Press Space to pause/unpause flight'),
    createNoteRow('Help', 'Press H to show/hide this panel'),
    createNoteRow('Avionics HUD', 'Press I to show/hide avionics HUD'),
    createNoteRow('Debug Overlay', 'Press O to show/hide debug overlay (dev builds)')
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

type AvionicsHudController = {
  element: HTMLElement;
  update: (readout: AvionicsReadout | null, navReadout: NavigationReadout | null) => void;
};

const createAvionicsHud = (): AvionicsHudController => {
  const wrapper = document.createElement('section');
  wrapper.className = 'avionics-hud';

  const heading = document.createElement('div');
  heading.className = 'hud-heading';
  heading.textContent = 'Avionics';

  const landingState = createLandingStateBadge();
  const grid = document.createElement('div');
  grid.className = 'avionics-grid';

  const speedMetric = createHudMetric('IAS');
  const altitudeMetric = createHudMetric('AGL');
  const verticalMetric = createHudMetric('VSI');
  const headingMetric = createHudMetric('Heading');
  const attitudeMetric = createHudMetric('Attitude');
  const rpmMetric = createHudMetric('Rotor RPM');
  const powerMetric = createHudMetric('Power');
  const marginMetric = createHudMetric('Power Margin');
  const navMetric = createHudMetric('Nav');

  grid.append(
    speedMetric.element,
    altitudeMetric.element,
    verticalMetric.element,
    headingMetric.element,
    attitudeMetric.element,
    rpmMetric.element,
    powerMetric.element,
    marginMetric.element,
    navMetric.element
  );
  wrapper.append(heading, landingState.row, grid);

  const update = (readout: AvionicsReadout | null, navReadout: NavigationReadout | null): void => {
    speedMetric.setValue(formatHorizontalSpeed(readout?.horizontalSpeed));
    altitudeMetric.setValue(formatAltitude(readout?.altitude));
    verticalMetric.setValue(formatVerticalSpeed(readout?.verticalSpeed));
    headingMetric.setValue(formatHeading(readout?.heading));
    attitudeMetric.setValue(formatAttitude(readout?.pitch, readout?.roll));
    rpmMetric.setValue(formatRotorRpm(readout?.rotorRpm, readout?.nominalRotorRpm));
    powerMetric.setValue(formatPowerLoad(readout?.powerRequired, readout?.powerAvailable));
    marginMetric.setValue(formatPowerMargin(readout?.powerMargin));
    navMetric.setValue(formatNavigation(navReadout));
    landingState.setState(readout?.landingState ?? LandingState.Airborne, readout?.isGrounded ?? false);
  };

  update(null, null);

  return { element: wrapper, update };
};

type AssistsHudController = {
  element: HTMLElement;
  update: (assists: CHelicopterAssists | null, trimState: ControlTrimState | null) => void;
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
  const trimRow = createAssistRow('Trim', `${formatKey(FORCE_TRIM_KEY)} / ${formatKey(RESET_TRIM_KEY)}`);

  grid.append(stabilityRow.element, hoverRow.element, trimRow.element);
  wrapper.append(heading, grid);

  const update = (assists: CHelicopterAssists | null, trimState: ControlTrimState | null): void => {
    stabilityRow.setState(assists?.stability ?? false);
    hoverRow.setState(assists?.hover ?? false);
    trimRow.setState(isTrimActive(trimState));
  };

  update(null, null);

  return { element: wrapper, update };
};

type CombatHudController = {
  element: HTMLElement;
  update: (readout: CombatReadout | null) => void;
};

const createCombatHud = (): CombatHudController => {
  const wrapper = document.createElement('section');
  wrapper.className = 'combat-hud';

  const heading = document.createElement('div');
  heading.className = 'hud-heading';
  heading.textContent = 'Combat';

  const grid = document.createElement('div');
  grid.className = 'combat-grid';

  const weaponMetric = createHudMetric('Weapon');
  const ammoMetric = createHudMetric('Ammo');
  const lockMetric = createHudMetric('Lock');

  grid.append(weaponMetric.element, ammoMetric.element, lockMetric.element);
  wrapper.append(heading, grid);

  const update = (readout: CombatReadout | null): void => {
    weaponMetric.setValue(readout?.weaponName ?? '—');
    ammoMetric.setValue(formatAmmo(readout?.ammo));
    lockMetric.setValue(readout?.lockState ?? '—');
  };

  update(null);

  return { element: wrapper, update };
};

type WarningBannerController = {
  element: HTMLElement;
  setWarning: (warning: string | null) => void;
};

const createWarningBanner = (className: string): WarningBannerController => {
  const banner = document.createElement('div');
  banner.className = `hud-banner ${className} hidden`;

  const text = document.createElement('span');
  text.textContent = '—';
  banner.appendChild(text);

  return {
    element: banner,
    setWarning: (warning: string | null) => {
      if (!warning) {
        banner.classList.add('hidden');
        text.textContent = '—';
        return;
      }

      banner.classList.remove('hidden');
      text.textContent = warning;
    }
  };
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

const formatHeading = (heading: number | undefined): string => {
  if (heading === undefined || !Number.isFinite(heading)) {
    return '—';
  }

  return `${heading.toFixed(0)}°`;
};

const formatAttitude = (pitch: number | undefined, roll: number | undefined): string => {
  if (pitch === undefined || roll === undefined || !Number.isFinite(pitch) || !Number.isFinite(roll)) {
    return '—';
  }

  return `P ${pitch.toFixed(0)}° / R ${roll.toFixed(0)}°`;
};

const formatRotorRpm = (rotorRpm: number | undefined, nominalRotorRpm: number | undefined): string => {
  if (
    rotorRpm === undefined ||
    nominalRotorRpm === undefined ||
    !Number.isFinite(rotorRpm) ||
    !Number.isFinite(nominalRotorRpm) ||
    nominalRotorRpm <= 0
  ) {
    return '—';
  }

  const ratio = (rotorRpm / nominalRotorRpm) * 100;
  return `${ratio.toFixed(0)}%`;
};

const formatPowerLoad = (powerRequired: number | undefined, powerAvailable: number | undefined): string => {
  if (
    powerRequired === undefined ||
    powerAvailable === undefined ||
    !Number.isFinite(powerRequired) ||
    !Number.isFinite(powerAvailable) ||
    powerAvailable <= 0
  ) {
    return '—';
  }

  const load = (powerRequired / powerAvailable) * 100;
  return `${load.toFixed(0)}%`;
};

const formatPowerMargin = (powerMargin: number | undefined): string => {
  if (powerMargin === undefined || !Number.isFinite(powerMargin)) {
    return '—';
  }

  const sign = powerMargin > 0 ? '+' : '';
  return `${sign}${powerMargin.toFixed(2)}`;
};

const formatNavigation = (readout: NavigationReadout | null): string => {
  if (!readout) {
    return '—';
  }

  const distanceKm = readout.distance / 1000;
  return `${readout.label} • ${readout.bearing.toFixed(0)}° / ${distanceKm.toFixed(1)} km`;
};

const formatAmmo = (ammo: number | null | undefined): string => {
  if (ammo === null || ammo === undefined || !Number.isFinite(ammo)) {
    return '—';
  }

  return ammo.toString();
};

const formatOutOfBoundsWarning = (readout: OutOfBoundsReadout | null): string | null => {
  if (!readout?.active) {
    return null;
  }

  if (readout.secondsRemaining !== null && Number.isFinite(readout.secondsRemaining)) {
    return `OUT OF BOUNDS • RETURN IN ${Math.max(0, readout.secondsRemaining).toFixed(0)}s`;
  }

  return 'OUT OF BOUNDS';
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
  PageDown: 'Page Down',
  KeyT: 'T',
  KeyY: 'Y'
};

const formatKey = (code: string): string => KEY_LABELS[code] ?? code;
const formatKeyList = (codes: string[]): string => codes.map(formatKey).join(' / ');
