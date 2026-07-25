import { Entity } from "../../engine/entity.js";
import type { World } from "../../engine/world.js";
import type { Camera } from "../../engine/camera.js";
import type { RenderContext } from "../../engine/types.js";
import type { Destructible, TileOccupant } from "../../engine/components.js";
import { TileType, type Tile } from "../../engine/tilemap.js";

/** How many bomb hits each crate tier takes to destroy. */
const HP_BY_TILE_TYPE: Partial<Record<TileType, number>> = {
  [TileType.WeakCrate]: 1,
  [TileType.StrongCrate]: 2,
  [TileType.ReinforcedCrate]: 3,
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
    // Placeholder box render until the SpriteManager/real art lands (Step 5+).
    // Color intensity roughly follows crate tier so this is at least legible
    // for debugging/dev builds in the meantime.
    const screen = camera.worldToScreen(this.position);
    const colorByType: Partial<Record<TileType, string>> = {
      [TileType.WeakCrate]: "#c9a86a",
      [TileType.StrongCrate]: "#a8763f",
      [TileType.ReinforcedCrate]: "#6b4a26",
    };
    ctx.fillStyle = colorByType[this.tile.type] ?? "#888888";
    ctx.fillRect(screen.x, screen.y, camera.zoom, camera.zoom);
  }
}
