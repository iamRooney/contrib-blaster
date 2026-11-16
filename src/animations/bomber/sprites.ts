import type { RenderContext } from "../../engine/types.js";
import type { Camera } from "../../engine/camera.js";
import type { Vec2 } from "../../engine/types.js";

/**
 * A sprite is a row-major grid of single characters, each mapped to a color
 * (or `null`/omitted for transparent) via its palette. This is genuinely
 * original pixel art authored for this project — character design (a small
 * bandana-wearing skeleton carrying a round bomb) is a generic fantasy/
 * tower-defense trope, not copied from any specific existing game's asset.
 */
export interface Sprite {
  rows: string[];
  palette: Record<string, string>;
}

/**
 * Draws a Sprite into a tile-sized area. `pixelsPerCell` controls how many
 * on-screen pixels each sprite cell occupies — independent of the tile
 * grid's own zoom, so sprite resolution can be tuned without touching the
 * TileMap/Camera scale.
 */
export function drawSprite(ctx: RenderContext, camera: Camera, worldPos: Vec2, sprite: Sprite): void {
  const screen = camera.worldToScreen(worldPos);
  const tileSizePx = camera.zoom;
  const cols = sprite.rows[0]?.length ?? 0;
  const rows = sprite.rows.length;
  if (cols === 0 || rows === 0) return;

  const cellSize = tileSizePx / Math.max(cols, rows);
  // Center the sprite within the tile if its aspect ratio isn't square.
  const offsetX = (tileSizePx - cols * cellSize) / 2;
  const offsetY = (tileSizePx - rows * cellSize) / 2;

  for (let r = 0; r < rows; r++) {
    const row = sprite.rows[r] ?? "";
    for (let c = 0; c < cols; c++) {
      const ch = row[c];
      if (!ch || ch === "." || ch === " ") continue;
      const color = sprite.palette[ch];
      if (!color) continue;
      ctx.fillStyle = color;
      ctx.fillRect(
        screen.x + offsetX + c * cellSize,
        screen.y + offsetY + r * cellSize,
        Math.ceil(cellSize),
        Math.ceil(cellSize),
      );
    }
  }
}

// Re-export all generated sprites from the master index
export * from "./player-sprite.js";
export * from "./weak-crate-sprite.js";
export * from "./strong-crate-sprite.js";
export * from "./reinforced-crate-sprite.js";
export * from "./metal-block-sprite.js";
export * from "./bomb-sprite.js";
export * from "./powerup-sprite.js";
export * from "./explosion-frame-0-sprite.js";
export * from "./explosion-frame-1-sprite.js";
export * from "./explosion-frame-2-sprite.js";
export * from "./explosion-frame-3-sprite.js";
export * from "./explosion-frame-4-sprite.js";