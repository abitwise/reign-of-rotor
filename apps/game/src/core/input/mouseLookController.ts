export type MouseLookControllerOptions = {
  element: HTMLElement;
  onLook: (yawDelta: number, pitchDelta: number) => void;
  sensitivity?: number;
  requestPointerLock?: boolean;
  allowDragLook?: boolean;
};

const DEFAULT_SENSITIVITY = 0.0025;

export class MouseLookController {
  private readonly element: HTMLElement;
  private readonly onLook: (yawDelta: number, pitchDelta: number) => void;
  private readonly sensitivity: number;
  private readonly requestPointerLock: boolean;
  private readonly allowDragLook: boolean;
  private pointerActive = false;
  private isPointerLocked = false;

  constructor({
    element,
    onLook,
    sensitivity = DEFAULT_SENSITIVITY,
    requestPointerLock = true,
    allowDragLook = true
  }: MouseLookControllerOptions) {
    this.element = element;
    this.onLook = onLook;
    this.sensitivity = sensitivity;
    this.requestPointerLock = requestPointerLock;
    this.allowDragLook = allowDragLook;

    this.bindListeners();
  }

  dispose(): void {
    const ownerDocument = this.element.ownerDocument;
    ownerDocument?.removeEventListener('pointerlockchange', this.handlePointerLockChange);
    this.element.removeEventListener('pointerdown', this.handlePointerDown);
    this.element.removeEventListener('pointermove', this.handlePointerMove);
    this.element.removeEventListener('pointerup', this.handlePointerUp);
    this.element.removeEventListener('pointercancel', this.handlePointerUp);
    this.element.removeEventListener('pointerleave', this.handlePointerUp);
  }

  private bindListeners(): void {
    const ownerDocument = this.element.ownerDocument;
    ownerDocument?.addEventListener('pointerlockchange', this.handlePointerLockChange);
    this.element.addEventListener('pointerdown', this.handlePointerDown);
    this.element.addEventListener('pointermove', this.handlePointerMove);
    this.element.addEventListener('pointerup', this.handlePointerUp);
    this.element.addEventListener('pointercancel', this.handlePointerUp);
    this.element.addEventListener('pointerleave', this.handlePointerUp);
  }

  private handlePointerDown = (event: PointerEvent): void => {
    this.pointerActive = true;

    if (this.requestPointerLock && typeof this.element.requestPointerLock === 'function') {
      this.element.requestPointerLock();
    }

    if (typeof this.element.setPointerCapture === 'function' && typeof event.pointerId === 'number') {
      try {
        this.element.setPointerCapture(event.pointerId);
      } catch {
        // Ignore capture errors (e.g., element not in DOM).
      }
    }
  };

  private handlePointerMove = (event: PointerEvent): void => {
    if (!this.isPointerLocked && !(this.allowDragLook && this.pointerActive)) {
      return;
    }

    this.onLook(event.movementX * this.sensitivity, event.movementY * this.sensitivity);
  };

  private handlePointerUp = (event: PointerEvent): void => {
    this.pointerActive = false;

    if (typeof this.element.releasePointerCapture === 'function' && typeof event.pointerId === 'number') {
      try {
        this.element.releasePointerCapture(event.pointerId);
      } catch {
        // Ignore release errors (e.g., pointer was not captured).
      }
    }
  };

  private handlePointerLockChange = (): void => {
    const ownerDocument = this.element.ownerDocument;
    this.isPointerLocked = ownerDocument?.pointerLockElement === this.element;

    if (!this.isPointerLocked && !this.allowDragLook) {
      this.pointerActive = false;
    }
  };
}
