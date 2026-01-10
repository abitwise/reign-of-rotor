import { SystemPhase, type LoopSystem } from '../../core/loop/types';
import type { PlayerInputState } from '../../core/input/playerInput';

export type CameraModeSystemOptions = {
  input: PlayerInputState;
  onToggle: () => void;
};

export const createCameraModeToggleSystem = ({ input, onToggle }: CameraModeSystemOptions): LoopSystem => ({
  id: 'render.cameraModeToggle',
  phase: SystemPhase.Input,
  step: () => {
    if (input.toggleCamera) {
      onToggle();
    }
  }
});
