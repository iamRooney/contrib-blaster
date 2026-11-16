import { Entity } from "../../engine/entity.js";
import type { World } from "../../engine/world.js";
import type { Camera } from "../../engine/camera.js";
import type { RenderContext, Vec2 } from "../../engine/types.js";
import { isDestructible, isTileOccupant } from "../../engine/components.js";
import type { TileMap } from "../../engine/tilemap.js";
import { drawSprite, EXPLOSION_FRAME_0_SPRITE, EXPLOSION_FRAME_1_SPRITE, EXPLOSION_FRAME_2_SPRITE, EXPLOSION_FRAME_3_SPRITE, EXPLOSION_FRAME_4_SPRITE } from "./sprites.js";

const VISUAL_DURATION_TICKS = 6;
const EXPLOSION_FRAMES = [
  EXPLOSION_FRAME_0_SPRITE,
  EXPLOSION_FRAME_1_SPRITE,
  EXPLOSION_FRAME_2_SPRITE,
  EXPLOSION_FRAME_3_SPRITE,
  EXPLOSION_FRAME_4_SPRITE,
];

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
    const frameIndex = Math.min(VISUAL_DURATION_TICKS - this.ticksRemaining, EXPLOSION_FRAMES.length - 1);
    const sprite = EXPLOSION_FRAMES[frameIndex];
    if (sprite) {
      drawSprite(ctx, camera, this.position, sprite);
    }
  }
}