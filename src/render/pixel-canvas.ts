import type { RenderContext } from "../engine/types.js";

/**
 * A from-scratch, dependency-free RGBA framebuffer that satisfies the
 * engine's `RenderContext` interface. Deliberately NOT node-canvas: that
 * library needs native compilation (cairo/pango) which is a recurring pain
 * point on GitHub Actions runners (missing system libs, platform-specific
 * prebuilt binary mismatches). For flat-color pixel-art rectangles — which
 * is all every entity currently draws — a hand-rolled pixel buffer is both
 * simpler and more portable.
 *
 * This is explicitly a placeholder-tier renderer. Once real sprite art
 * lands, `drawImage` here will need actual image compositing (alpha blend,
 * source-rect cropping) — at that point, evaluate whether to extend this
 * class or switch to `skia-canvas` (also native, but generally easier to
 * install in CI than node-canvas). Tracked as an open item, not resolved
 * by this file.
 */
export class PixelCanvas implements RenderContext {
  readonly width: number;
  readonly height: number;
  private readonly pixels: Uint8ClampedArray; // RGBA, row-major

  fillStyle: string = "#000000";

  [key: string]: unknown;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.pixels = new Uint8ClampedArray(width * height * 4);
  }

  clearRect(x: number, y: number, w: number, h: number): void {
    this.fillRectWithColor(x, y, w, h, [0, 0, 0, 0]);
  }

  fillRect(x: number, y: number, w: number, h: number): void {
    this.fillRectWithColor(x, y, w, h, hexToRgba(this.fillStyle));
  }

  private fillRectWithColor(x: number, y: number, w: number, h: number, [r, g, b, a]: RGBA): void {
    const x0 = Math.max(0, Math.floor(x));
    const y0 = Math.max(0, Math.floor(y));
    const x1 = Math.min(this.width, Math.ceil(x + w));
    const y1 = Math.min(this.height, Math.ceil(y + h));

    for (let py = y0; py < y1; py++) {
      for (let px = x0; px < x1; px++) {
        const i = (py * this.width + px) * 4;
        this.pixels[i] = r;
        this.pixels[i + 1] = g;
        this.pixels[i + 2] = b;
        this.pixels[i + 3] = a;
      }
    }
  }

  drawImage(..._args: unknown[]): void {
    // No-op until real spritesheet compositing is implemented (see class doc comment).
  }

  save(): void {
    // No transform stack yet — Camera handles all positioning directly for now.
  }

  restore(): void {
    // See save().
  }

  translate(_x: number, _y: number): void {
    // Not yet needed — revisit once panning/scrolling animation packs exist.
  }

  /** Returns a copy of the raw RGBA buffer, e.g. for handing to a GIF/PNG encoder. */
  toRGBA(): Uint8ClampedArray {
    return this.pixels.slice();
  }
}

type RGBA = [number, number, number, number];

function hexToRgba(hex: string): RGBA {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return [r, g, b, 255];
}
