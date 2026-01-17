import type { ControlTrimState } from './controlState';

/**
 * Checks if any trim axis has a non-negligible value.
 * 
 * @param trimState - The current trim state to check
 * @returns true if any trim axis exceeds the threshold, false otherwise
 */
export const isTrimActive = (trimState: ControlTrimState | null): boolean => {
  if (!trimState) {
    return false;
  }
  const threshold = 0.01;
  return (
    Math.abs(trimState.cyclicX) > threshold ||
    Math.abs(trimState.cyclicY) > threshold ||
    Math.abs(trimState.yaw) > threshold
  );
};
