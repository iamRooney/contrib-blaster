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
  /** Transient shake jitter, separate from screenOffsetX/Y so callers computing total canvas size don't need to account for it. Reset/recomputed by the Scene each frame. */
  shakeX: number;
  shakeY: number;

  constructor(x = 0, y = 0, zoom = 1, screenOffsetX = 0, screenOffsetY = 0) {
    this.x = x;
    this.y = y;
    this.zoom = zoom;
    this.screenOffsetX = screenOffsetX;
    this.screenOffsetY = screenOffsetY;
    this.shakeX = 0;
    this.shakeY = 0;
  }

  worldToScreen(pos: Vec2): Vec2 {
    return {
      x: (pos.x - this.x) * this.zoom + this.screenOffsetX + this.shakeX,
      y: (pos.y - this.y) * this.zoom + this.screenOffsetY + this.shakeY,
    };
  }

  reset(x = 0, y = 0, zoom = 1): void {
    this.x = x;
    this.y = y;
    this.zoom = zoom;
  }
}
