import type { AppConfig } from '../boot/config';
import type { LoopFrameMetrics } from '../core/loop/types';
import type { ControlTrimState } from '../core/input/controlState';
import { isTrimActive } from '../core/input/trimUtils';

export type DebugOverlayOptions = {
  host: HTMLElement;
  config: AppConfig;
};

export type DebugOverlayController = {
  element: HTMLElement;
  destroy: () => void;
  setLoopMetrics: (metrics: LoopFrameMetrics) => void;
  setTrimState: (trimState: ControlTrimState | null) => void;
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

  wrapper.append(heading, description, configGrid, timingHeading, timingGrid, trimHeading, trimGrid);
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
    setVisible: (visible: boolean) => {
      wrapper.style.display = visible ? '' : 'none';
    }
  };
};

const formatMs = (value: number): string => `${value.toFixed(2)} ms`;
const formatTrimValue = (value: number): string => value.toFixed(2);

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
