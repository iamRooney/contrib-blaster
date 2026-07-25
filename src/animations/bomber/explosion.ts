import { Entity } from "../../engine/entity.js";
import type { World } from "../../engine/world.js";
import type { Camera } from "../../engine/camera.js";
import type { RenderContext } from "../../engine/types.js";
import { isDestructible, isTileOccupant } from "../../engine/components.js";
import type { TileMap } from "../../engine/tilemap.js";
import type { Vec2 } from "../../engine/types.js";

const VISUAL_DURATION_TICKS = 6;

export class Explosion extends Entity {
  private readonly radius: number;
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
    // Placeholder — a real version fades/scales a fire spritesheet frame.
    const screen = camera.worldToScreen(this.position);
    ctx.fillStyle = "#ff6b35";
    ctx.fillRect(
      screen.x - camera.zoom * this.radius,
      screen.y - camera.zoom * this.radius,
      camera.zoom * (this.radius * 2 + 1),
      camera.zoom * (this.radius * 2 + 1),
    );
  }
}
