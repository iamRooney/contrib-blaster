import { Entity } from "../../engine/entity.js";
import type { World } from "../../engine/world.js";
import type { Camera } from "../../engine/camera.js";
import type { RenderContext } from "../../engine/types.js";
import { isDestructible, isTileOccupant } from "../../engine/components.js";
import type { TileMap } from "../../engine/tilemap.js";
import type { Vec2 } from "../../engine/types.js";

const VISUAL_DURATION_TICKS = 6;

export class Explosion extends Entity {
  readonly radius: number;
  private ticksRemaining = VISUAL_DURATION_TICKS;
  private hasAppliedDamage = false;
  /** Set to true once damage has been applied — Player state machine polls this. */
  resolved = false;

  constructor(center: Vec2, radius: number) {
    super(center, /* zIndex */ 5);
    this.radius = radius;
  }

  update(_dt: number, world: World): void {
    if (!this.hasAppliedDamage) {
      this.applyDamage(world);
      this.hasAppliedDamage = true;
      this.resolved = true;
    }
    if (--this.ticksRemaining <= 0) this.destroy();
  }

  private applyDamage(world: World): void {
    const tileMap = world.tileMap as TileMap;
    const affectedTiles = tileMap.tilesInRadius(this.position, this.radius);
    const affectedCoords = new Set(affectedTiles.map((t) => `${t.gridX},${t.gridY}`));

    for (const entity of world.entities) {
      if (!isTileOccupant(entity) || !isDestructible(entity)) continue;
      if (affectedCoords.has(`${entity.tileX},${entity.tileY}`)) {
        entity.onExplosionHit(1);
      }
    }
  }

  render(ctx: RenderContext, camera: Camera): void {
    const screen = camera.worldToScreen(this.position);
    const progress = this.ticksRemaining / VISUAL_DURATION_TICKS; // 1 -> 0 over its life
    const cx = screen.x + camera.zoom / 2;
    const cy = screen.y + camera.zoom / 2;

    // Shrinks toward the end of its life rather than fading (no alpha
    // blending on this raw pixel buffer), which reads fine at this scale
    // and duration.
    const maxPixelRadius = camera.zoom * (this.radius + 0.6);
    const outerR = maxPixelRadius * (0.4 + 0.6 * progress);
    const box = Math.ceil(outerR) + 2;

    // Sampled on a coarse 2px block grid, not true per-pixel. This isn't
    // just a style choice — a full per-pixel radial burst introduces far
    // more unique color detail per frame than the rest of this project's
    // flat-color art, which badly hurts GIF/WebP compression (confirmed
    // empirically: it took a realistic full-year render from ~4.8MB to
    // 35MB+). Blocky 2px steps keep the retro aesthetic consistent AND
    // cut the compression cost dramatically, since adjacent same-color
    // blocks compress far better than pixel-level noise.
    const step = 2;
    for (let dy = -box; dy <= box; dy += step) {
      for (let dx = -box; dx <= box; dx += step) {
        const d = Math.hypot(dx, dy);
        const theta = Math.atan2(dy, dx);
        const outerEdge = burstRadiusAt(theta, outerR * 0.75, 7, outerR * 0.2, 0);
        const midEdge = burstRadiusAt(theta, outerR * 0.5, 7, outerR * 0.15, 0.5);
        const innerEdge = burstRadiusAt(theta, outerR * 0.25, 5, outerR * 0.1, 1.2);

        let color: string | null = null;
        if (d <= innerEdge) color = "#fff8dc";
        else if (d <= midEdge) color = "#ff8f00";
        else if (d <= outerEdge) color = "#ffd54f";

        if (color) {
          ctx.fillStyle = color;
          ctx.fillRect(cx + dx, cy + dy, step, step);
        }
      }
    }
  }
}

/** Perturbs a base radius by angle to create the jagged/spiky burst silhouette, rather than a plain circle. */
function burstRadiusAt(
  theta: number,
  baseR: number,
  spikes: number,
  spikeAmount: number,
  phaseOffset: number,
): number {
  return (
    baseR +
    Math.sin(theta * spikes + phaseOffset) * spikeAmount +
    Math.sin(theta * spikes * 2.3) * spikeAmount * 0.4
  );
}
