import type { Scene } from "../../engine/scene.js";
import type { World } from "../../engine/world.js";
import type { Camera } from "../../engine/camera.js";
import type { RenderContext } from "../../engine/types.js";
import { TileMap, TileType } from "../../engine/tilemap.js";
import type { ContributionGrid } from "../../github/graph.js";
import { Player } from "./player.js";
import { Crate } from "./crate.js";
import { TargetQueue } from "./target-queue.js";

/**
 * The Bomber animation pack's entry point. This is the ONLY file that
 * knows how TileMap, Player, Crate, and TargetQueue fit together — the
 * engine core (Timeline, World, Scene interface) never imports from here.
 */
export class BomberScene implements Scene {
  private readonly tileMap: TileMap;
  private targetQueue!: TargetQueue;
  private player!: Player;

  constructor(contributionGrid: ContributionGrid) {
    this.tileMap = TileMap.fromContributionGrid(contributionGrid);
  }

  init(world: World): void {
    world.tileMap = this.tileMap;
    this.spawnCrates(world);
    this.targetQueue = new TargetQueue(this.tileMap);

    const spawn = this.findPlayerSpawn();
    this.player = new Player(spawn.x, spawn.y, this.tileMap, this.targetQueue);
    world.add(this.player);
  }

  update(dt: number, world: World): void {
    world.update(dt);
  }

  render(ctx: RenderContext, camera: Camera, world: World): void {
    this.drawBackground(ctx, camera);
    const sorted = [...world.entities].sort((a, b) => a.zIndex - b.zIndex);
    for (const entity of sorted) entity.render(ctx, camera);
  }

  isComplete(_world: World): boolean {
    return this.player?.finished ?? false;
  }

  reset(world: World): void {
    this.tileMap.resetClearedTiles();
    world.clearEntities();
    this.spawnCrates(world);
    this.targetQueue.rebuild(this.tileMap);

    const spawn = this.findPlayerSpawn();
    this.player = new Player(spawn.x, spawn.y, this.tileMap, this.targetQueue);
    world.add(this.player);
  }

  private spawnCrates(world: World): void {
    for (const row of this.tileMap.tiles) {
      for (const tile of row) {
        if (tile.type !== TileType.Floor && tile.type !== TileType.MetalBlock) {
          world.add(new Crate(tile));
        }
      }
    }
  }

  /**
   * Player always starts at the first walkable (Floor) tile found scanning
   * top-left to bottom-right. Contribution graphs almost always have at
   * least one zero-contribution day, and even in the rare all-green-square
   * case, (0,0) itself is fine to spawn on since Entity start position
   * isn't required to be walkable (see pathfinding.ts) — the player just
   * immediately paths off of it toward its first target.
   */
  private findPlayerSpawn(): { x: number; y: number } {
    for (let y = 0; y < this.tileMap.height; y++) {
      for (let x = 0; x < this.tileMap.width; x++) {
        if (this.tileMap.isWalkable(x, y)) return { x, y };
      }
    }
    return { x: 0, y: 0 };
  }

  private drawBackground(ctx: RenderContext, camera: Camera): void {
    // Placeholder flat floor tiles until the real tileset lands.
    for (let y = 0; y < this.tileMap.height; y++) {
      for (let x = 0; x < this.tileMap.width; x++) {
        const screen = camera.worldToScreen({ x, y });
        ctx.fillStyle = "#e8e8e8";
        ctx.fillRect(screen.x, screen.y, camera.zoom, camera.zoom);
      }
    }
  }
}
