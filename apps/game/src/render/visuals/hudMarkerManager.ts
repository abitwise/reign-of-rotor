import { Matrix, Vector3 } from '@babylonjs/core';
import type { Camera, Engine } from '@babylonjs/core';
import type { EnemyUnit } from '@/sim/enemies';

const MARKER_STYLE = `
.enemy-marker {
  display: none;
  position: absolute;
  will-change: transform;
  pointer-events: none;
}
.enemy-marker-diamond {
  width: 8px;
  height: 8px;
  border: 2px solid #ff4444;
  background: transparent;
  transform: rotate(45deg);
}
`;

export class HudMarkerManager {
  private readonly container: HTMLElement;
  private readonly markers: HTMLElement[];
  private readonly styleElement: HTMLStyleElement;

  constructor(container: HTMLElement, maxMarkers = 32) {
    this.container = container;

    this.styleElement = document.createElement('style');
    this.styleElement.textContent = MARKER_STYLE;
    document.head.appendChild(this.styleElement);

    this.markers = [];
    for (let i = 0; i < maxMarkers; i += 1) {
      const wrapper = document.createElement('div');
      wrapper.className = 'enemy-marker';

      const diamond = document.createElement('div');
      diamond.className = 'enemy-marker-diamond';
      wrapper.appendChild(diamond);

      this.container.appendChild(wrapper);
      this.markers.push(wrapper);
    }
  }

  update(enemies: EnemyUnit[], camera: Camera, engine: Engine): void {
    const viewMatrix = camera.getViewMatrix();
    const projectionMatrix = camera.getProjectionMatrix();
    const viewportWidth = engine.getRenderWidth();
    const viewportHeight = engine.getRenderHeight();
    const viewport = camera.viewport.toGlobal(viewportWidth, viewportHeight);
    const worldMatrix = Matrix.Identity();

    const count = Math.min(enemies.length, this.markers.length);

    for (let i = 0; i < count; i += 1) {
      const unit = enemies[i];
      const marker = this.markers[i];
      const worldPos = new Vector3(
        unit.body.translation().x,
        unit.body.translation().y + 2,
        unit.body.translation().z
      );

      const screenPos = Vector3.Project(
        worldPos,
        worldMatrix,
        viewMatrix.multiply(projectionMatrix),
        viewport
      );

      if (
        screenPos.z > 0 &&
        screenPos.z < 1 &&
        screenPos.x >= 0 &&
        screenPos.x <= viewportWidth &&
        screenPos.y >= 0 &&
        screenPos.y <= viewportHeight
      ) {
        marker.style.display = '';
        marker.style.transform = `translate(${screenPos.x - 6}px, ${screenPos.y - 6}px)`;
      } else {
        marker.style.display = 'none';
      }
    }

    for (let i = count; i < this.markers.length; i += 1) {
      this.markers[i].style.display = 'none';
    }
  }

  dispose(): void {
    for (const marker of this.markers) {
      marker.remove();
    }
    this.markers.length = 0;
    this.styleElement.remove();
  }
}
