import { describe, expect, it } from 'vitest';
import { createAttitudeIndicator } from '../attitudeIndicator';

describe('AttitudeIndicator', () => {
  it('sets CSS variables when attitude is provided', () => {
    const widget = createAttitudeIndicator();

    widget.setAttitude(10, 20);

    expect(widget.element.dataset.attitudeValid).toBe('true');
    expect(widget.element.style.getPropertyValue('--att-pitch')).not.toBe('');
    expect(widget.element.style.getPropertyValue('--att-roll')).not.toBe('');
  });

  it('clamps pitch to avoid extreme translation', () => {
    const widget = createAttitudeIndicator();

    widget.setAttitude(999, 0);

    const pitch = widget.element.style.getPropertyValue('--att-pitch');
    expect(pitch).toBe('18.00px');
  });

  it('marks invalid when attitude is missing', () => {
    const widget = createAttitudeIndicator();

    widget.setAttitude(undefined, undefined);

    expect(widget.element.dataset.attitudeValid).toBe('false');
    expect(widget.element.style.getPropertyValue('--att-pitch')).toBe('0px');
    expect(widget.element.style.getPropertyValue('--att-roll')).toBe('0deg');
  });
});
