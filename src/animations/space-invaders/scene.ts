import type { Scene } from "../../engine/scene.js";
import type { World } from "../../engine/world.js";
import type { Camera } from "../../engine/camera.js";
import type { RenderContext } from "../../engine/types.js";
import { TileMap, TileType } from "../../engine/tilemap.js";
import type { ContributionGrid } from "../../github/graph.js";
import { SpacePlayer } from "./player.js";
import { Invader } from "./invader.js";
import { InvaderSpawner } from "./spawner.js";
import { GITHUB_COLORS, fillContributionSquare } from "../bomber/palette.js";
import { drawText } from "../../render/font.js";

const MONTH_NAMES = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
const DAY_LABELS: Array<{ row: number; text: string }> = [
  { row: 1, text: "MON" },
  { row: 3, text: "WED" },
  { row: 5, text: "FRI" },
];

export class SpaceInvadersScene implements Scene {
  private readonly tileMap: TileMap;
  private player!: SpacePlayer;
  private spawner!: InvaderSpawner;
  private score = 0;
  private wave = 1;
  private gameOver = false;
  private gameOverTimer = 0;

  constructor(contributionGrid: ContributionGrid) {
    this.tileMap = TileMap.fromContributionGrid(contributionGrid);
  }

  init(world: World): void {
    world.tileMap = this.tileMap;
    this.spawnStructuralInvaders(world);

    const spawn = this.findPlayerSpawn();
    this.player = new SpacePlayer(spawn.x, spawn.y, this.tileMap);
    world.add(this.player);

    this.spawner = new InvaderSpawner(this.tileMap, this.player, world);
    world.add(this.spawner);
  }

  update(dt: number, world: World): void {
    if (this.gameOver) {
      this.gameOverTimer += dt;
      return;
    }
    world.update(dt);

    // Check if all invaders cleared
    const invaders = [...world.entities].filter(e => e instanceof Invader);
    if (invaders.length === 0 && this.spawner.canSpawnNextWave()) {
      this.wave++;
      this.spawner.spawnWave(this.wave);
    }

    // Check game over
    if (this.player.isDestroyed()) {
      this.gameOver = true;
    }
  }

  render(ctx: RenderContext, camera: Camera, world: World): void {
    this.drawPageBackground(ctx, camera);
    this.drawBackground(ctx, camera);
    this.drawMonthLabels(ctx, camera);
    this.drawDayLabels(ctx, camera);

    // Render UI
    const labelScale = Math.max(1, Math.floor(camera.zoom / 10));
    drawText(ctx, `SCORE: ${this.score}`, 4, 4, GITHUB_COLORS.labelText, labelScale);
    drawText(ctx, `WAVE: ${this.wave}`, 4, 4 + camera.zoom * 1.2, GITHUB_COLORS.labelText, labelScale);

    const sorted = [...world.entities].sort((a, b) => a.zIndex - b.zIndex);
    for (const entity of sorted) entity.render(ctx, camera);

    if (this.gameOver) {
      this.drawGameOver(ctx, camera, labelScale);
    }
  }

  isComplete(_world: World): boolean {
    // Space invaders runs continuously - complete when player dies
    return this.gameOver && this.gameOverTimer > 120; // Show game over for 2 seconds
  }

  reset(world: World): void {
    this.tileMap.resetClearedTiles();
    world.clearEntities();
    this.spawnStructuralInvaders(world);

    const spawn = this.findPlayerSpawn();
    this.player = new SpacePlayer(spawn.x, spawn.y, this.tileMap);
    world.add(this.player);

    this.spawner = new InvaderSpawner(this.tileMap, this.player, world);
    world.add(this.spawner);

    this.score = 0;
    this.wave = 1;
    this.gameOver = false;
    this.gameOverTimer = 0;
  }

  private spawnStructuralInvaders(world: World): void {
    // Place indestructible "wall" tiles that serve as cover
    for (let y = 0; y < this.tileMap.height; y++) {
      for (let x = 0; x < this.tileMap.width; x++) {
        const tile = this.tileMap.tiles[y]?.[x];
        if (!tile) continue;
        if (tile.type !== TileType.Floor && tile.type !== TileType.MetalBlock) {
          world.add(new Invader(tile, 1, this.tileMap)); // Contribution days = invaders
        }
      }
    }
  }

  private findPlayerSpawn(): { x: number; y: number } {
    // Player spawns at bottom center
    for (let x = Math.floor(this.tileMap.width / 2); x < this.tileMap.width; x++) {
      for (let y = this.tileMap.height - 1; y >= 0; y--) {
        if (this.tileMap.isWalkable(x, y)) return { x, y };
      }
    }
    for (let x = 0; x < this.tileMap.width; x++) {
      for (let y = this.tileMap.height - 1; y >= 0; y--) {
        if (this.tileMap.isWalkable(x, y)) return { x, y };
      }
    }
    return { x: Math.floor(this.tileMap.width / 2), y: this.tileMap.height - 1 };
  }

  private drawPageBackground(ctx: RenderContext, camera: Camera): void {
    const totalW = this.tileMap.width * camera.zoom + camera.screenOffsetX;
    const totalH = this.tileMap.height * camera.zoom + camera.screenOffsetY;
    ctx.fillStyle = GITHUB_COLORS.pageBackground;
    ctx.fillRect(0, 0, totalW, totalH);
  }

  private drawBackground(ctx: RenderContext, camera: Camera): void {
    for (let y = 0; y < this.tileMap.height; y++) {
      for (let x = 0; x < this.tileMap.width; x++) {
        const screen = camera.worldToScreen({ x, y });
        fillContributionSquare(ctx, screen.x, screen.y, camera.zoom, GITHUB_COLORS.level0);
      }
    }
  }

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

  private drawDayLabels(ctx: RenderContext, camera: Camera): void {
    const labelScale = Math.max(1, Math.floor(camera.zoom / 10));
    for (const { row, text } of DAY_LABELS) {
      if (row >= this.tileMap.height) continue;
      const screen = camera.worldToScreen({ x: 0, y: row });
      drawText(ctx, text, 2, screen.y + camera.zoom / 4, GITHUB_COLORS.labelText, labelScale);
    }
  }

  private drawGameOver(ctx: RenderContext, camera: Camera, labelScale: number): void {
    const centerX = (this.tileMap.width * camera.zoom) / 2 + camera.screenOffsetX;
    const centerY = (this.tileMap.height * camera.zoom) / 2 + camera.screenOffsetY;
    drawText(ctx, "GAME OVER", centerX - 30, centerY - 10, "#ff4444", labelScale * 2);
    drawText(ctx, `FINAL SCORE: ${this.score}`, centerX - 50, centerY + 10, GITHUB_COLORS.labelText, labelScale);
    drawText(ctx, `WAVES SURVIVED: ${this.wave}`, centerX - 55, centerY + 25, GITHUB_COLORS.labelText, labelScale);
  }
}