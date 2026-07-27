import { GIFEncoder, quantize, applyPalette } from "gifenc/dist/gifenc.esm.js";
import { writeFileSync } from "node:fs";
import type { FrameEncoder } from "../engine/timeline.js";

/**
 * Imports gifenc's ESM build directly by path (dist/gifenc.esm.js), not the
 * package's default entry point. The package's main CJS bundle uses an
 * esbuild __export() getter pattern that Node's CJS/ESM interop handles
 * inconsistently — named imports fail ("does not provide an export
 * named..."), and both default and namespace imports resolve to unexpected
 * values (gifenc's own `default` export happens to equal its `GIFEncoder`
 * function, not the whole module). The ESM build has genuine static
 * `export { ... }` syntax, so it works correctly and predictably under
 * plain Node AND bundles correctly with esbuild — no interop guessing.
 */

/**
 * Wraps gifenc (pure JS, no native deps) into the engine's FrameEncoder
 * contract.
 *
 * Palette handling: the first `PALETTE_SAMPLE_FRAMES` frames are buffered
 * and their pixel data combined before quantizing a single palette, then
 * that palette is reused for every remaining frame (including the
 * buffered ones, flushed once the palette's ready). This matters more
 * than it might look: an earlier version quantized from ONLY the very
 * first frame, which is fine for uniformly flat/simple art but breaks
 * down once richer content (character sprite, explosion bursts) appears
 * later — that first frame's limited palette gets forced onto every
 * subsequent frame regardless of fit, and the resulting per-frame
 * dithering noise destroys GIF's frame-to-frame compression (confirmed
 * empirically: full single-palette-from-frame-1 pushed a realistic
 * full-year render from ~5MB to 35MB+). Sampling across enough frames to
 * likely include at least one full "story beat" (movement, a bomb, an
 * explosion) gives the palette much better real coverage, while still
 * keeping the "one global palette, quantized once" performance win — full
 * per-frame quantization was already ruled out as the single biggest
 * GIF-encoding time sink (see architecture doc §8).
 */
const PALETTE_SAMPLE_FRAMES = 60;

export class GifFrameEncoder implements FrameEncoder {
  private readonly encoder = GIFEncoder();
  private readonly width: number;
  private readonly height: number;
  private readonly fpsDelayMs: number;
  private readonly outputPath: string;
  private palette: number[][] | null = null;
  private readonly pendingFrames: Buffer[] = [];

  constructor(outputPath: string, width: number, height: number, fps: number) {
    this.outputPath = outputPath;
    this.width = width;
    this.height = height;
    this.fpsDelayMs = Math.round(1000 / fps);
  }

  pushFrame(rgba: Buffer): void {
    if (this.palette) {
      this.writeFrame(rgba);
      return;
    }

    this.pendingFrames.push(Buffer.from(rgba));
    if (this.pendingFrames.length >= PALETTE_SAMPLE_FRAMES) {
      this.computePaletteAndFlush();
    }
  }

  finalize(): void {
    // Fewer total frames than the sample window - compute from whatever we've got.
    if (!this.palette && this.pendingFrames.length > 0) {
      this.computePaletteAndFlush();
    }
    this.encoder.finish();
    const bytes = this.encoder.bytes();
    writeFileSync(this.outputPath, Buffer.from(bytes));
  }

  private computePaletteAndFlush(): void {
    const combined = Buffer.concat(this.pendingFrames);
    this.palette = quantize(combined, 256);
    for (const frame of this.pendingFrames) {
      this.writeFrame(frame);
    }
    this.pendingFrames.length = 0;
  }

  private writeFrame(rgba: Buffer): void {
    if (!this.palette) return; // unreachable in practice; keeps TS happy
    const indexed = applyPalette(rgba, this.palette);
    this.encoder.writeFrame(indexed, this.width, this.height, {
      palette: this.palette,
      delay: this.fpsDelayMs,
      // loop: 0 -> infinite loop, set once on the first frame is sufficient for gifenc.
    });
  }
}
