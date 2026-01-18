export type AttitudeIndicatorController = {
  element: HTMLElement;
  setAttitude: (pitchDeg: number | undefined, rollDeg: number | undefined) => void;
};

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

export const createAttitudeIndicator = (): AttitudeIndicatorController => {
  const wrapper = document.createElement('div');
  wrapper.className = 'attitude-indicator';

  const frame = document.createElement('div');
  frame.className = 'attitude-indicator__frame';

  const horizon = document.createElement('div');
  horizon.className = 'attitude-indicator__horizon';

  const sky = document.createElement('div');
  sky.className = 'attitude-indicator__sky';

  const ground = document.createElement('div');
  ground.className = 'attitude-indicator__ground';

  const horizonLine = document.createElement('div');
  horizonLine.className = 'attitude-indicator__horizon-line';

  const aircraft = document.createElement('div');
  aircraft.className = 'attitude-indicator__aircraft';

  const bankCaret = document.createElement('div');
  bankCaret.className = 'attitude-indicator__bank-caret';

  horizon.append(sky, ground, horizonLine);
  frame.append(horizon, aircraft, bankCaret);
  wrapper.append(frame);

  const MAX_PITCH_DEG = 30;
  const MAX_PITCH_OFFSET_PX = 18;

  const setAttitude = (pitchDeg: number | undefined, rollDeg: number | undefined): void => {
    if (pitchDeg === undefined || rollDeg === undefined || !Number.isFinite(pitchDeg) || !Number.isFinite(rollDeg)) {
      wrapper.style.setProperty('--att-pitch', '0px');
      wrapper.style.setProperty('--att-roll', '0deg');
      wrapper.dataset.attitudeValid = 'false';
      return;
    }

    const clampedPitch = clamp(pitchDeg, -MAX_PITCH_DEG, MAX_PITCH_DEG);
    const pitchOffsetPx = (clampedPitch / MAX_PITCH_DEG) * MAX_PITCH_OFFSET_PX;

    // Rotate the horizon opposite the aircraft bank for readability.
    // Sign conventions depend on the underlying rotation math; this is intended as a debug tool.
    const clampedRoll = clamp(rollDeg, -90, 90);
    const horizonRollDeg = -clampedRoll;

    wrapper.style.setProperty('--att-pitch', `${pitchOffsetPx.toFixed(2)}px`);
    wrapper.style.setProperty('--att-roll', `${horizonRollDeg.toFixed(2)}deg`);
    wrapper.dataset.attitudeValid = 'true';
  };

  setAttitude(undefined, undefined);

  return { element: wrapper, setAttitude };
};
