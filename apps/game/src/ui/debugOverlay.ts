import type { AppConfig } from '../boot/config';
import type { LoopFrameMetrics } from '../core/loop/types';
import type { ControlState, ControlTrimState } from '../core/input/controlState';
import { isTrimActive } from '../core/input/trimUtils';
import type { AvionicsReadout } from './hudReadouts';
import { isVrsEnvelope } from './hudReadouts';
import { AVIONICS_ALERT_THRESHOLDS } from '../content/avionics';

export type DebugOverlayOptions = {
  host: HTMLElement;
  config: AppConfig;
};

export type DebugOverlayController = {
  element: HTMLElement;
  destroy: () => void;
  setLoopMetrics: (metrics: LoopFrameMetrics) => void;
  setTrimState: (trimState: ControlTrimState | null) => void;
  setControlState: (controlState: ControlState | null) => void;
  setAvionicsReadout: (readout: AvionicsReadout | null) => void;
  setVisible: (visible: boolean) => void;
};

export const createDebugOverlay = ({ host, config }: DebugOverlayOptions): DebugOverlayController => {
  const wrapper = document.createElement('section');
  wrapper.className = 'debug-overlay';

  const heading = document.createElement('h2');
  heading.textContent = 'Debug Overlay';
  heading.style.margin = '0';
  heading.style.fontSize = '18px';

  const description = document.createElement('p');
  description.textContent = 'Environment flags for the current build.';
  description.style.margin = '6px 0 0';

  const configGrid = document.createElement('div');
  configGrid.className = 'debug-grid';

  const configItems: Array<[string, string]> = [
    ['Mode', config.mode],
    ['Dev', String(config.isDev)],
    ['Prod', String(config.isProd)],
    ['Debug Overlay', String(config.enableDebugOverlay)],
    ['Build Label', config.buildLabel]
  ];

  configItems.forEach(([label, value]) => {
    const row = createLabelRow(label, value);
    configGrid.appendChild(row.row);
  });

  const timingHeading = document.createElement('h3');
  timingHeading.textContent = 'Loop Timing';
  timingHeading.style.margin = '12px 0 4px';
  timingHeading.style.fontSize = '14px';
  timingHeading.style.textTransform = 'uppercase';
  timingHeading.style.letterSpacing = '0.5px';

  const timingGrid = document.createElement('div');
  timingGrid.className = 'debug-grid';

  const frameDeltaRow = createLabelRow('Frame Δ (raw)', '—');
  const usedDeltaRow = createLabelRow('Δ used (clamped)', '—');
  const fixedDeltaRow = createLabelRow('Fixed Δ', '—');
  const stepsRow = createLabelRow('Steps / frame', '—');
  const clampedRow = createLabelRow('Clamped time', '—');
  const accumulatorRow = createLabelRow('Accumulator', '—');

  [frameDeltaRow, usedDeltaRow, fixedDeltaRow, stepsRow, clampedRow, accumulatorRow].forEach(
    (row) => timingGrid.appendChild(row.row)
  );

  const trimHeading = document.createElement('h3');
  trimHeading.textContent = 'Control Trim';
  trimHeading.style.margin = '12px 0 4px';
  trimHeading.style.fontSize = '14px';
  trimHeading.style.textTransform = 'uppercase';
  trimHeading.style.letterSpacing = '0.5px';

  const trimGrid = document.createElement('div');
  trimGrid.className = 'debug-grid';

  const trimXRow = createLabelRow('Trim Roll', '—');
  const trimYRow = createLabelRow('Trim Pitch', '—');
  const trimYawRow = createLabelRow('Trim Yaw', '—');
  const trimActiveRow = createLabelRow('Trim Active', '—');

  [trimXRow, trimYRow, trimYawRow, trimActiveRow].forEach((row) => trimGrid.appendChild(row.row));

  const inputHeading = document.createElement('h3');
  inputHeading.textContent = 'Input Processing';
  inputHeading.style.margin = '12px 0 4px';
  inputHeading.style.fontSize = '14px';
  inputHeading.style.textTransform = 'uppercase';
  inputHeading.style.letterSpacing = '0.5px';

  const inputGrid = document.createElement('div');
  inputGrid.className = 'debug-grid';

  const collectiveRow = createLabelRow('Collective (raw/filtered)', '—');
  const cyclicXRow = createLabelRow('Cyclic Roll (raw/filtered)', '—');
  const cyclicYRow = createLabelRow('Cyclic Pitch (raw/filtered)', '—');
  const yawRow = createLabelRow('Yaw (raw/filtered)', '—');

  [collectiveRow, cyclicXRow, cyclicYRow, yawRow].forEach((row) => inputGrid.appendChild(row.row));

  const powerHeading = document.createElement('h3');
  powerHeading.textContent = 'Power & Rotor';
  powerHeading.style.margin = '12px 0 4px';
  powerHeading.style.fontSize = '14px';
  powerHeading.style.textTransform = 'uppercase';
  powerHeading.style.letterSpacing = '0.5px';

  const powerGrid = document.createElement('div');
  powerGrid.className = 'debug-grid';

  const rotorRpmRow = createLabelRow('Rotor RPM', '—');
  const powerReqRow = createLabelRow('Power Required', '—');
  const powerAvailRow = createLabelRow('Power Available', '—');
  const powerMarginRow = createLabelRow('Power Margin', '—');

  [rotorRpmRow, powerReqRow, powerAvailRow, powerMarginRow].forEach((row) =>
    powerGrid.appendChild(row.row)
  );

  const flagsHeading = document.createElement('h3');
  flagsHeading.textContent = 'Avionics Flags';
  flagsHeading.style.margin = '12px 0 4px';
  flagsHeading.style.fontSize = '14px';
  flagsHeading.style.textTransform = 'uppercase';
  flagsHeading.style.letterSpacing = '0.5px';

  const flagsGrid = document.createElement('div');
  flagsGrid.className = 'debug-grid';

  const vrsRow = createLabelRow('VRS Heuristic', '—');
  const etlRow = createLabelRow('ETL', 'N/A');
  const groundEffectRow = createLabelRow('Ground Effect', 'N/A');

  [vrsRow, etlRow, groundEffectRow].forEach((row) => flagsGrid.appendChild(row.row));

  wrapper.append(
    heading,
    description,
    configGrid,
    timingHeading,
    timingGrid,
    trimHeading,
    trimGrid,
    inputHeading,
    inputGrid,
    powerHeading,
    powerGrid,
    flagsHeading,
    flagsGrid
  );
  host.appendChild(wrapper);

  return {
    element: wrapper,
    destroy: () => {
      host.removeChild(wrapper);
    },
    setLoopMetrics: (metrics: LoopFrameMetrics) => {
      frameDeltaRow.setValue(formatMs(metrics.frameDeltaMs));
      usedDeltaRow.setValue(formatMs(metrics.usedDeltaMs));
      fixedDeltaRow.setValue(formatMs(metrics.fixedStepMs));
      stepsRow.setValue(String(metrics.stepsExecuted));
      clampedRow.setValue(formatMs(metrics.clampedMs));
      accumulatorRow.setValue(formatMs(metrics.accumulatorMs));
    },
    setTrimState: (trimState: ControlTrimState | null) => {
      if (!trimState) {
        trimXRow.setValue('—');
        trimYRow.setValue('—');
        trimYawRow.setValue('—');
        trimActiveRow.setValue('—');
        return;
      }
      trimXRow.setValue(formatTrimValue(trimState.cyclicX));
      trimYRow.setValue(formatTrimValue(trimState.cyclicY));
      trimYawRow.setValue(formatTrimValue(trimState.yaw));
      trimActiveRow.setValue(isTrimActive(trimState) ? 'Yes' : 'No');
    },
    setControlState: (controlState: ControlState | null) => {
      if (!controlState) {
        collectiveRow.setValue('—');
        cyclicXRow.setValue('—');
        cyclicYRow.setValue('—');
        yawRow.setValue('—');
        return;
      }

      collectiveRow.setValue(formatAxisPair(controlState.collective));
      cyclicXRow.setValue(formatAxisPair(controlState.cyclicX));
      cyclicYRow.setValue(formatAxisPair(controlState.cyclicY));
      yawRow.setValue(formatAxisPair(controlState.yaw));
    },
    setAvionicsReadout: (readout: AvionicsReadout | null) => {
      if (!readout) {
        rotorRpmRow.setValue('—');
        powerReqRow.setValue('—');
        powerAvailRow.setValue('—');
        powerMarginRow.setValue('—');
        vrsRow.setValue('—');
        return;
      }

      rotorRpmRow.setValue(formatRotorRpm(readout.rotorRpm, readout.nominalRotorRpm));
      powerReqRow.setValue(formatPower(readout.powerRequired));
      powerAvailRow.setValue(formatPower(readout.powerAvailable));
      powerMarginRow.setValue(formatPowerMargin(readout.powerMargin));
      vrsRow.setValue(isVrsEnvelope(readout, AVIONICS_ALERT_THRESHOLDS) ? 'Yes' : 'No');
    },
    setVisible: (visible: boolean) => {
      wrapper.style.display = visible ? '' : 'none';
    }
  };
};

const formatMs = (value: number): string => `${value.toFixed(2)} ms`;
const formatTrimValue = (value: number): string => value.toFixed(2);
const formatAxisValue = (value: number): string => value.toFixed(2);
const formatAxisPair = (axis: { raw: number; filtered: number }): string =>
  `${formatAxisValue(axis.raw)} / ${formatAxisValue(axis.filtered)}`;

const formatRotorRpm = (rotorRpm: number, nominalRotorRpm: number): string => {
  if (!Number.isFinite(rotorRpm) || !Number.isFinite(nominalRotorRpm) || nominalRotorRpm <= 0) {
    return '—';
  }
  const ratio = (rotorRpm / nominalRotorRpm) * 100;
  return `${ratio.toFixed(0)}% (${rotorRpm.toFixed(0)})`;
};

const formatPower = (value: number): string => {
  if (!Number.isFinite(value)) {
    return '—';
  }
  return value.toFixed(2);
};

const formatPowerMargin = (value: number): string => {
  if (!Number.isFinite(value)) {
    return '—';
  }
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}`;
};

const createLabelRow = (label: string, value: string) => {
  const row = document.createElement('div');
  row.className = 'debug-label';

  const labelEl = document.createElement('span');
  labelEl.textContent = label;

  const valueEl = document.createElement('span');
  valueEl.textContent = value;

  row.append(labelEl, valueEl);

  return {
    row,
    setValue: (nextValue: string) => {
      valueEl.textContent = nextValue;
    }
  };
};
