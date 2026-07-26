import type { Vec2 } from "./types.js";

/**
 * Converts world-space coordinates to screen-space pixels.
 *
 * For the Bomber pack this stays static (fixed zoom, no panning) since the
 * whole 53x7 contribution grid fits in one frame. Future animation packs
 * (e.g. a scrolling Factory Sim) can move/zoom this per-frame in their
 * Scene's update().
 */
export class Camera {
  x: number;
  y: number;
  zoom: number;
  /** Extra pixel-space offset applied after the zoom transform - e.g. margin for axis labels. Not part of the tile-coordinate world. */
  screenOffsetX: number;
  screenOffsetY: number;

  constructor(x = 0, y = 0, zoom = 1, screenOffsetX = 0, screenOffsetY = 0) {
    this.x = x;
    this.y = y;
    this.zoom = zoom;
    this.screenOffsetX = screenOffsetX;
    this.screenOffsetY = screenOffsetY;
  }

  worldToScreen(pos: Vec2): Vec2 {
    return {
      x: (pos.x - this.x) * this.zoom + this.screenOffsetX,
      y: (pos.y - this.y) * this.zoom + this.screenOffsetY,
    };
  }

  reset(x = 0, y = 0, zoom = 1): void {
    this.x = x;
    this.y = y;
    this.zoom = zoom;
  }
}
