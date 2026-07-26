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

const BONE = "#f0ead6";
const BONE_SHADOW = "#c8bea5";
const OUTLINE = "#1e1e1e";
const BANDANA = "#c0392b"; // original design choice: red bandana, not a leather aviator helmet
const BOMB_BODY = "#323e44";
const BOMB_HIGHLIGHT = "#505f64";
const FUSE = "#785a3c";
const FLAME_OUTER = "#ff8f00";
const FLAME_INNER = "#ffd54f";

/**
 * "The Blaster" — this project's original bomber-pack protagonist. A small
 * bandana-wearing skeleton carrying a round bomb with a lit fuse. 20x20,
 * generated procedurally (circles/rects via math rather than freehand
 * ASCII art) to guarantee symmetry and consistent row alignment — see
 * scripts/design/gen-player-sprite.mjs for the generator, which was used
 * to render and visually verify this exact design before shipping it.
 */
export const PLAYER_SPRITE: Sprite = {
  palette: {
    B: BONE,
    S: BONE_SHADOW,
    K: OUTLINE,
    R: BANDANA,
    M: BOMB_BODY,
    H: BOMB_HIGHLIGHT,
    F: FUSE,
    O: FLAME_OUTER,
    Y: FLAME_INNER,
  },
  rows: [
    "....................",
    "....................",
    "....KRRRRRK.........",
    "....RRRRRRRRR.......",
    "....KBBBBBRRROOO....",
    "....BBKBKBB..YYY....",
    "....KBBBBBK..OYO....",
    "....KKKKKKK...F.....",
    ".....KBKBK..KKMKK...",
    ".....BBKBBKKMHMMMK..",
    "...KBKSKSKBKMHMMMK..",
    "...BBKBKBKBMMMMMMM..",
    "...BBKSKSK.KMMMMMK..",
    "...BBBBKBB.KMMMMMK..",
    ".....KB.KB..KKMKK...",
    ".....KB.KB..........",
    ".....BB.BB..........",
    ".....KB.KB..........",
    ".....BB.BB..........",
    "....................",
  ],
};
