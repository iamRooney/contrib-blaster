import { createRequire } from "node:module";
import { writeFileSync } from "node:fs";
import type { FrameEncoder } from "../engine/timeline.js";

// gifenc's CJS bundle uses an esbuild __export() getter pattern that
// Node's static ESM/CJS interop analysis (cjs-module-lexer) doesn't
// reliably detect, causing `import { GIFEncoder } from "gifenc"` to fail
// with "does not provide an export named...". createRequire sidesteps the
// static analysis entirely and loads it as plain CJS, which always works.
const require = createRequire(import.meta.url);
const { GIFEncoder, quantize, applyPalette } = require("gifenc") as typeof import("gifenc");

/**
 * Wraps gifenc (pure JS, no native deps) into the engine's FrameEncoder
 * contract. Palette is quantized once from the FIRST frame and reused for
 * every subsequent frame — per-frame quantization is the single biggest
 * GIF-encoding time sink (see architecture doc §8), and for flat pixel-art
 * color palettes a first-frame sample is normally representative enough.
 * Revisit if a future animation pack uses a much wider color range that
 * shifts significantly frame-to-frame.
 */
export class GifFrameEncoder implements FrameEncoder {
  private readonly encoder = GIFEncoder();
  private readonly width: number;
  private readonly height: number;
  private readonly fpsDelayMs: number;
  private readonly outputPath: string;
  private palette: number[][] | null = null;

  constructor(outputPath: string, width: number, height: number, fps: number) {
    this.outputPath = outputPath;
    this.width = width;
    this.height = height;
    this.fpsDelayMs = Math.round(1000 / fps);
  }

  pushFrame(rgba: Buffer): void {
    if (!this.palette) {
      this.palette = quantize(rgba, 256);
    }

    const indexed = applyPalette(rgba, this.palette);
    this.encoder.writeFrame(indexed, this.width, this.height, {
      palette: this.palette,
      delay: this.fpsDelayMs,
      // loop: 0 -> infinite loop, set once on the first frame is sufficient for gifenc.
    });
  }

  finalize(): void {
    this.encoder.finish();
    const bytes = this.encoder.bytes();
    writeFileSync(this.outputPath, Buffer.from(bytes));
  }
}
