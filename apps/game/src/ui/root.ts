import type { AppConfig } from '../boot/config';
import { createDebugOverlay, type PerfMetrics } from './debugOverlay';
import { FORCE_TRIM_KEY, RESET_TRIM_KEY, type PlayerInputBindings } from '../core/input/playerInput';
import type { ControlState, ControlTrimState } from '../core/input/controlState';
import { isTrimActive } from '../core/input/trimUtils';
import { LandingState } from '../sim/altimeter';
import type { CHelicopterAssists } from '../ecs/components/helicopter';
import type { GameState } from '../boot/createApp';
import {
  type AvionicsReadout,
  type NavigationReadout,
  type ThreatReadout,
  type CombatReadout,
  type MissionReadout,
  type DebriefReadout,
  buildAvionicsAlerts,
  selectPriorityAlert,
  toThreatAlertCandidate
} from './hudReadouts';
import { createAttitudeIndicator } from './attitudeIndicator';

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
export type ControlStateProvider = () => ControlState | null;
export type OutOfBoundsReadout = {
  active: boolean;
  secondsRemaining: number | null;
};
export type CombatReadoutProvider = () => CombatReadout | null;
export type ThreatReadoutProvider = () => ThreatReadout | null;
export type OutOfBoundsProvider = () => OutOfBoundsReadout | null;
export type NavigationReadoutProvider = () => NavigationReadout | null;
export type MissionReadoutProvider = () => MissionReadout | null;
export type DebriefReadoutProvider = () => DebriefReadout | null;
export type PerfMetricsProvider = () => PerfMetrics | null;

export const createRootUi = ({ target, config, bindings, gameState }: RootUiOptions) => {
  const container = document.createElement('div');
  container.className = 'ui-hud-container';

  const instructionsPanel = createInstructionsPanel(config, bindings, gameState);
  const avionicsHud = createAvionicsHud();
  const assistsHud = createAssistsHud();
  const combatHud = createCombatHud();
  const missionHud = createMissionHud(bindings);
  const debriefOverlay = createDebriefOverlay();
  const alertBanner = createWarningBanner('alert-banner');
  const boundsBanner = createWarningBanner('bounds-banner');

  container.appendChild(instructionsPanel.element);
  container.appendChild(avionicsHud.element);
  container.appendChild(assistsHud.element);
  container.appendChild(combatHud.element);
  container.appendChild(missionHud.element);
  container.appendChild(debriefOverlay.element);
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
  let controlStateProvider: ControlStateProvider | null = null;
  let combatProvider: CombatReadoutProvider | null = null;
  let threatProvider: ThreatReadoutProvider | null = null;
  let outOfBoundsProvider: OutOfBoundsProvider | null = null;
  let navigationProvider: NavigationReadoutProvider | null = null;
  let missionProvider: MissionReadoutProvider | null = null;
  let debriefProvider: DebriefReadoutProvider | null = null;
  let perfMetricsProvider: PerfMetricsProvider | null = null;
  let hudFrameHandle: number | null = null;
  let previousDebriefActive = false;
  let previousFlightHudVisible = isFlightHudVisible;

  const hudLoop = (): void => {
    if (!avionicsReadoutProvider) {
      hudFrameHandle = null;
      return;
    }

    const trimState = trimStateProvider?.() ?? null;
    const controlState = controlStateProvider?.() ?? null;
    const avionicsReadout = avionicsReadoutProvider();
    const navigationReadout = navigationProvider?.() ?? null;
    const missionReadout = missionProvider?.() ?? null;
    const debriefReadout = debriefProvider?.() ?? null;
    const debriefActive = Boolean(debriefReadout?.active);
    avionicsHud.update(avionicsReadout, navigationReadout);
    assistsHud.update(assistsProvider?.() ?? null, trimState);
    combatHud.update(combatProvider?.() ?? null);
    missionHud.update(missionReadout);
    debriefOverlay.update(debriefReadout);
    const avionicsAlerts = avionicsReadout ? buildAvionicsAlerts(avionicsReadout) : [];
    const threatAlert = toThreatAlertCandidate(threatProvider?.() ?? null);
    const alert = selectPriorityAlert(
      threatAlert ? [...avionicsAlerts, threatAlert] : avionicsAlerts
    );
    alertBanner.setWarning(debriefActive ? null : alert?.label ?? null);
    boundsBanner.setWarning(
      debriefActive ? null : formatOutOfBoundsWarning(outOfBoundsProvider?.() ?? null)
    );
    // Only update display styles when visibility state changes
    if (debriefActive !== previousDebriefActive || isFlightHudVisible !== previousFlightHudVisible) {
      avionicsHud.element.style.display = !debriefActive && isFlightHudVisible ? '' : 'none';
      assistsHud.element.style.display = debriefActive ? 'none' : '';
      combatHud.element.style.display = debriefActive ? 'none' : '';
      missionHud.element.style.display = debriefActive ? 'none' : '';
      alertBanner.element.style.display = debriefActive ? 'none' : '';
      boundsBanner.element.style.display = debriefActive ? 'none' : '';
      previousDebriefActive = debriefActive;
      previousFlightHudVisible = isFlightHudVisible;
    }
    if (cameraModeProvider) {
      instructionsPanel.setCameraMode(cameraModeProvider() ?? 'Cockpit');
    }
    debugOverlay?.setTrimState?.(trimState);
    debugOverlay?.setControlState?.(controlState);
    debugOverlay?.setAvionicsReadout?.(avionicsReadout);
    debugOverlay?.setPerfMetrics?.(perfMetricsProvider?.() ?? null);
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
    setControlStateProvider: (provider: ControlStateProvider) => {
      controlStateProvider = provider;
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
    },
    setMissionReadoutProvider: (provider: MissionReadoutProvider) => {
      missionProvider = provider;
      if (hudFrameHandle === null && avionicsReadoutProvider) {
        hudFrameHandle = scheduleFrame(hudLoop);
      }
    },
    setDebriefReadoutProvider: (provider: DebriefReadoutProvider) => {
      debriefProvider = provider;
      if (hudFrameHandle === null && avionicsReadoutProvider) {
        hudFrameHandle = scheduleFrame(hudLoop);
      }
    },
    setPerfMetricsProvider: (provider: PerfMetricsProvider) => {
      perfMetricsProvider = provider;
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
    createNoteRow('Cannon Fire', `Hold ${formatKeyList(bindings.fireCannon)} to fire`),
    createNoteRow('Missile Fire', `Press ${formatKeyList(bindings.fireMissile)} to launch`),
    createNoteRow('Countermeasure', `Press ${formatKeyList(bindings.deployCountermeasure)} to deploy`),
    createNoteRow(
      'Complete Mission',
      `Press ${formatKeyList(bindings.confirmMissionComplete)} to complete objectives in-air`
    ),
    createNoteRow(
      'Continue Flying',
      `Press ${formatKeyList(bindings.continueMission)} to defer completion prompt`
    ),
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

  const attitudeIndicator = createAttitudeIndicator();
  attitudeIndicator.element.classList.add('avionics-attitude-indicator');

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
  wrapper.append(heading, landingState.row, grid, attitudeIndicator.element);

  const update = (readout: AvionicsReadout | null, navReadout: NavigationReadout | null): void => {
    speedMetric.setValue(formatHorizontalSpeed(readout?.horizontalSpeed));
    altitudeMetric.setValue(formatAltitude(readout?.altitude));
    verticalMetric.setValue(formatVerticalSpeed(readout?.verticalSpeed));
    headingMetric.setValue(formatHeading(readout?.heading));
    attitudeMetric.setValue(formatAttitude(readout?.pitch, readout?.roll));
    attitudeIndicator.setAttitude(readout?.pitch, readout?.roll);
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
  const missileMetric = createHudMetric('Missiles');
  const countermeasureMetric = createHudMetric('CM');
  const lockMetric = createHudMetric('Lock');

  grid.append(
    weaponMetric.element,
    ammoMetric.element,
    missileMetric.element,
    countermeasureMetric.element,
    lockMetric.element
  );
  wrapper.append(heading, grid);

  const update = (readout: CombatReadout | null): void => {
    weaponMetric.setValue(readout?.weaponName ?? '—');
    ammoMetric.setValue(formatAmmo(readout?.ammo));
    missileMetric.setValue(formatAmmo(readout?.missileAmmo));
    countermeasureMetric.setValue(formatAmmo(readout?.countermeasureAmmo));
    lockMetric.setValue(readout?.lockState ?? '—');
  };

  update(null);

  return { element: wrapper, update };
};

type MissionHudController = {
  element: HTMLElement;
  update: (readout: MissionReadout | null) => void;
};

const createMissionHud = (bindings: PlayerInputBindings): MissionHudController => {
  const wrapper = document.createElement('section');
  wrapper.className = 'mission-hud';

  const heading = document.createElement('div');
  heading.className = 'hud-heading';
  heading.textContent = 'Mission';

  const title = document.createElement('strong');
  title.className = 'mission-title';

  const summary = document.createElement('div');
  summary.className = 'mission-summary';

  const objectives = document.createElement('div');
  objectives.className = 'mission-objectives';

  const prompt = document.createElement('div');
  prompt.className = 'mission-prompt hidden';

  const promptText = document.createElement('div');
  promptText.className = 'mission-prompt-text';
  promptText.textContent = 'Objectives complete.';

  const confirmKey = formatKeyList(bindings.confirmMissionComplete);
  const continueKey = formatKeyList(bindings.continueMission);

  const promptActions = document.createElement('div');
  promptActions.className = 'mission-prompt-actions';
  promptActions.textContent = `Press ${confirmKey} to complete • Press ${continueKey} to continue`;

  prompt.append(promptText, promptActions);

  wrapper.append(heading, title, summary, objectives, prompt);

  const update = (readout: MissionReadout | null): void => {
    if (!readout) {
      wrapper.classList.add('hidden');
      return;
    }

    wrapper.classList.remove('hidden');
    title.textContent = readout.title;
    summary.textContent = readout.summary;
    objectives.replaceChildren(
      ...readout.objectives.map((objective) => {
        const row = document.createElement('div');
        row.className = `mission-objective mission-${objective.status}`;
        const label = document.createElement('span');
        label.textContent = objective.label;
        const progress = document.createElement('strong');
        progress.textContent = objective.progress ?? '';
        row.append(label, progress);
        return row;
      })
    );

    if (readout.completion.completed) {
      prompt.classList.remove('hidden');
      promptText.textContent = 'Mission complete!';
      promptActions.textContent = 'Debrief pending';
      return;
    }

    if (readout.completion.promptActive) {
      prompt.classList.remove('hidden');
      promptText.textContent = 'Objectives complete.';
      promptActions.textContent = `Press ${confirmKey} to complete • Press ${continueKey} to continue`;
      return;
    }

    prompt.classList.add('hidden');
  };

  update(null);

  return { element: wrapper, update };
};

type DebriefOverlayController = {
  element: HTMLElement;
  update: (readout: DebriefReadout | null) => void;
};

const createDebriefOverlay = (): DebriefOverlayController => {
  const overlay = document.createElement('div');
  overlay.className = 'debrief-overlay hidden';

  const panel = document.createElement('div');
  panel.className = 'debrief-panel';

  const title = document.createElement('div');
  title.className = 'debrief-title';

  const outcome = document.createElement('div');
  outcome.className = 'debrief-outcome';

  const statsGrid = document.createElement('div');
  statsGrid.className = 'debrief-stats';

  const timeRow = createDebriefStat('Time', '—');
  const killsRow = createDebriefStat('Kills', '—');
  const damageRow = createDebriefStat('Damage Dealt', '—');
  const shotsRow = createDebriefStat('Shots Fired', '—');
  const shotsDetail = document.createElement('div');
  shotsDetail.className = 'debrief-shots-detail';

  const actions = document.createElement('div');
  actions.className = 'debrief-actions';

  const replayButton = document.createElement('button');
  replayButton.className = 'debrief-replay';
  replayButton.textContent = 'Replay Mission';
  replayButton.onclick = () => {
    window.location.reload();
  };

  actions.append(replayButton);
  statsGrid.append(timeRow.element, killsRow.element, damageRow.element, shotsRow.element, shotsDetail);
  panel.append(title, outcome, statsGrid, actions);
  overlay.append(panel);

  const update = (readout: DebriefReadout | null): void => {
    if (!readout) {
      overlay.classList.add('hidden');
      overlay.hidden = true;
      overlay.setAttribute('aria-hidden', 'true');
      replayButton.disabled = true;
      replayButton.tabIndex = -1;
      return;
    }

    overlay.classList.remove('hidden');
    overlay.hidden = false;
    overlay.removeAttribute('aria-hidden');
    replayButton.disabled = false;
    replayButton.tabIndex = 0;
    title.textContent = readout.title;
    outcome.textContent = readout.outcomeLabel;
    timeRow.setValue(formatElapsedTime(readout.elapsedSeconds));
    killsRow.setValue(readout.kills.toString());
    damageRow.setValue(readout.damageDealt.toFixed(0));
    shotsRow.setValue(readout.shotsFired.toString());
    shotsDetail.textContent = `Cannon ${readout.cannonShots} • Missiles ${readout.missileShots}`;
  };

  update(null);

  return { element: overlay, update };
};

const createDebriefStat = (label: string, value: string) => {
  const row = document.createElement('div');
  row.className = 'debrief-stat';

  const title = document.createElement('span');
  title.textContent = label;

  const detail = document.createElement('strong');
  detail.textContent = value;

  row.append(title, detail);

  return {
    element: row,
    setValue: (text: string) => {
      detail.textContent = text;
    }
  };
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

const formatElapsedTime = (seconds: number): string => {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return '—';
  }

  const totalSeconds = Math.floor(seconds);
  const minutes = Math.floor(totalSeconds / 60);
  const remaining = totalSeconds % 60;
  return `${minutes}:${remaining.toString().padStart(2, '0')}`;
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
  KeyC: 'C',
  KeyB: 'B',
  KeyM: 'M',
  ArrowUp: 'Arrow ↑',
  ArrowDown: 'Arrow ↓',
  ArrowLeft: 'Arrow ←',
  ArrowRight: 'Arrow →',
  PageUp: 'Page Up',
  PageDown: 'Page Down',
  KeyT: 'T',
  KeyY: 'Y',
  Enter: 'Enter',
  KeyN: 'N'
};

const formatKey = (code: string): string => KEY_LABELS[code] ?? code;
const formatKeyList = (codes: string[]): string => codes.map(formatKey).join(' / ');
