import { Entity } from "../../engine/entity.js";
import type { World } from "../../engine/world.js";
import type { Camera } from "../../engine/camera.js";
import type { RenderContext } from "../../engine/types.js";
import type { Destructible, TileOccupant } from "../../engine/components.js";
import { TileType, type Tile } from "../../engine/tilemap.js";
import {
  drawSprite,
  WEAK_CRATE_SPRITE,
  STRONG_CRATE_SPRITE,
  REINFORCED_CRATE_SPRITE,
} from "./sprites.js";

/** How many bomb hits each crate tier takes to destroy. */
const HP_BY_TILE_TYPE: Partial<Record<TileType, number>> = {
  [TileType.WeakCrate]: 1,
  [TileType.StrongCrate]: 2,
  [TileType.ReinforcedCrate]: 3,
};

/** Maps a crate's tile type to its sprite, so each tier renders as distinct pixel art. */
const SPRITE_BY_TILE_TYPE: Partial<Record<TileType, typeof WEAK_CRATE_SPRITE>> = {
  [TileType.WeakCrate]: WEAK_CRATE_SPRITE,
  [TileType.StrongCrate]: STRONG_CRATE_SPRITE,
  [TileType.ReinforcedCrate]: REINFORCED_CRATE_SPRITE,
};

export class Crate extends Entity implements Destructible, TileOccupant {
  tileX: number;
  tileY: number;
  hp: number;
  private readonly tile: Tile;

  constructor(tile: Tile) {
    super({ x: tile.gridX, y: tile.gridY });
    this.tile = tile;
    this.tileX = tile.gridX;
    this.tileY = tile.gridY;
    this.hp = HP_BY_TILE_TYPE[tile.type] ?? 1;
  }

  onExplosionHit(damage: number): void {
    this.hp -= damage;
    if (this.hp <= 0) {
      this.tile.cleared = true;
      this.destroy();
    }
  }

  update(_dt: number, _world: World): void {
    // Crates are static — all state change happens via onExplosionHit.
  }

  render(ctx: RenderContext, camera: Camera): void {
    const sprite = SPRITE_BY_TILE_TYPE[this.tile.type];
    if (!sprite) return;
    drawSprite(ctx, camera, this.position, sprite);
  }
}