import type { RenderContext } from "../engine/types.js";

/**
 * Minimal 3-wide x 5-tall bitmap font. Only defines the letters actually
 * used by month abbreviations (Jan-Dec) and day labels (Mon/Wed/Fri) —
 * not a general-purpose font. '#' = filled pixel, '.' = empty.
 */
const GLYPHS: Record<string, string[]> = {
  A: [".#.", "#.#", "###", "#.#", "#.#"],
  B: ["##.", "#.#", "##.", "#.#", "##."],
  C: [".##", "#..", "#..", "#..", ".##"],
  D: ["##.", "#.#", "#.#", "#.#", "##."],
  E: ["###", "#..", "##.", "#..", "###"],
  F: ["###", "#..", "##.", "#..", "#.."],
  G: [".##", "#..", "#.#", "#.#", ".##"],
  I: ["###", ".#.", ".#.", ".#.", "###"],
  J: ["..#", "..#", "..#", "#.#", ".#."],
  L: ["#..", "#..", "#..", "#..", "###"],
  M: ["#.#", "###", "#.#", "#.#", "#.#"],
  N: ["##.", "#.#", "#.#", "#.#", ".##"],
  O: [".#.", "#.#", "#.#", "#.#", ".#."],
  P: ["##.", "#.#", "##.", "#..", "#.."],
  R: ["##.", "#.#", "##.", "#.#", "#.#"],
  S: [".##", "#..", ".#.", "..#", "##."],
  T: ["###", ".#.", ".#.", ".#.", ".#."],
  U: ["#.#", "#.#", "#.#", "#.#", ".#."],
  V: ["#.#", "#.#", "#.#", "#.#", ".#."],
  W: ["#.#", "#.#", "#.#", "###", "#.#"],
  Y: ["#.#", "#.#", ".#.", ".#.", ".#."],
};

const GLYPH_WIDTH = 3;
const GLYPH_HEIGHT = 5;

/**
 * Draws text using the bitmap font above. `pixelSize` controls how large
 * each font "pixel" renders as (e.g. 1 = native 3x5, 2 = doubled, etc).
 * Unrecognized characters render as a blank glyph-width gap.
 */
export function drawText(
  ctx: RenderContext,
  text: string,
  x: number,
  y: number,
  color: string,
  pixelSize = 1,
): number {
  let cursorX = x;
  ctx.fillStyle = color;
  for (const char of text.toUpperCase()) {
    const glyph = GLYPHS[char];
    if (glyph) {
      for (let row = 0; row < GLYPH_HEIGHT; row++) {
        const line = glyph[row] ?? "";
        for (let col = 0; col < GLYPH_WIDTH; col++) {
          if (line[col] === "#") {
            ctx.fillRect(
              cursorX + col * pixelSize,
              y + row * pixelSize,
              pixelSize,
              pixelSize,
            );
          }
        }
      }
    }
    cursorX += (GLYPH_WIDTH + 1) * pixelSize; // +1 column of letter-spacing
  }
  return cursorX - x; // total rendered width, in case a caller wants it
}
