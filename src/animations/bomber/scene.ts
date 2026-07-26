import type { Scene } from "../../engine/scene.js";
import type { World } from "../../engine/world.js";
import type { Camera } from "../../engine/camera.js";
import type { RenderContext } from "../../engine/types.js";
import { TileMap, TileType } from "../../engine/tilemap.js";
import type { ContributionGrid } from "../../github/graph.js";
import { Player } from "./player.js";
import { Crate } from "./crate.js";
import { TargetQueue } from "./target-queue.js";
import { GITHUB_COLORS, fillContributionSquare } from "./palette.js";
import { drawText } from "../../render/font.js";

const MONTH_NAMES = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
const DAY_LABELS: Array<{ row: number; text: string }> = [
  { row: 1, text: "MON" },
  { row: 3, text: "WED" },
  { row: 5, text: "FRI" },
];

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
    this.drawPageBackground(ctx, camera);
    this.drawBackground(ctx, camera);
    this.drawMonthLabels(ctx, camera);
    this.drawDayLabels(ctx, camera);
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

  /** Fills the whole canvas (including the label margin area) with GitHub's page background. */
  private drawPageBackground(ctx: RenderContext, camera: Camera): void {
    const totalW = this.tileMap.width * camera.zoom + camera.screenOffsetX;
    const totalH = this.tileMap.height * camera.zoom + camera.screenOffsetY;
    ctx.fillStyle = GITHUB_COLORS.pageBackground;
    ctx.fillRect(0, 0, totalW, totalH);
  }

  private drawBackground(ctx: RenderContext, camera: Camera): void {
    // Every cell starts as GitHub's real "no contribution" color, drawn
    // with the same rounded/gapped square style as crates. Crate entities
    // paint their own (also GitHub-accurate) color on top while uncleared;
    // once bombed, the crate entity is destroyed and this level0 square
    // shows through — reads as "exploded/cleared."
    for (let y = 0; y < this.tileMap.height; y++) {
      for (let x = 0; x < this.tileMap.width; x++) {
        const screen = camera.worldToScreen({ x, y });
        fillContributionSquare(ctx, screen.x, screen.y, camera.zoom, GITHUB_COLORS.level0);
      }
    }
  }

  /** Draws a 3-letter month label above the first week-column that falls in each new month, mirroring github.com's own layout. */
  private drawMonthLabels(ctx: RenderContext, camera: Camera): void {
    let lastMonth = -1;
    for (let x = 0; x < this.tileMap.width; x++) {
      const dateStr = this.tileMap.tiles[0]?.[x]?.date;
      if (!dateStr) continue;
      const month = new Date(dateStr).getMonth();
      if (Number.isNaN(month)) continue;
      if (month !== lastMonth) {
        lastMonth = month;
        const screen = camera.worldToScreen({ x, y: 0 });
        const labelScale = Math.max(1, Math.floor(camera.zoom / 10));
        drawText(ctx, MONTH_NAMES[month] ?? "", screen.x, 2, GITHUB_COLORS.labelText, labelScale);
      }
    }
  }

  /** Draws Mon/Wed/Fri labels to the left of the grid, mirroring github.com's own layout. */
  private drawDayLabels(ctx: RenderContext, camera: Camera): void {
    const labelScale = Math.max(1, Math.floor(camera.zoom / 10));
    for (const { row, text } of DAY_LABELS) {
      if (row >= this.tileMap.height) continue;
      const screen = camera.worldToScreen({ x: 0, y: row });
      drawText(ctx, text, 2, screen.y + camera.zoom / 4, GITHUB_COLORS.labelText, labelScale);
    }
  }
}
