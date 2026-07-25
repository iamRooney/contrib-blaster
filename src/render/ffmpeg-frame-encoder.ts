import type sharpType from "sharp"; // type-only: erased at compile time, does NOT affect the runtime bundle
import { createRequire } from "node:module";
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { FrameEncoder } from "../engine/timeline.js";

/**
 * `sharp` is loaded via a runtime createRequire() call, NOT a static
 * `import sharp from "sharp"`. This matters: esbuild bundles this file's
 * code inline into the single dist/index.js output regardless of whether
 * the *caller* used a dynamic import() — and once inlined, any static
 * `import` of an external package gets hoisted to the top of the bundle
 * and executed unconditionally on startup. That would mean every run of
 * this Action — including the default `gif` format, which has no native
 * dependency at all — fails with "Cannot find module 'sharp'" unless
 * node_modules/sharp is committed. A runtime require() call is opaque to
 * that static hoisting, so sharp is only ever actually loaded the first
 * time pushFrame() runs, i.e. only for webp/mp4 output.
 */
const require = createRequire(import.meta.url);
let cachedSharp: typeof sharpType | undefined;
function getSharp(): typeof sharpType {
  cachedSharp ??= require("sharp");
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  return cachedSharp!;
}

/**
 * Shared by MP4 and WebP output: both go through a real `ffmpeg` binary
 * invocation rather than an npm wrapper. Reasoning:
 *  - `fluent-ffmpeg` is deprecated/unmaintained.
 *  - `sharp-gif2` (tried first for WebP) silently drops frames on large
 *    frame counts when re-parsing its own intermediate GIF buffer via
 *    libvips — confirmed empirically (3696 frames in, 3061 pages out) and
 *    not something worth depending on for a project whose whole point is
 *    rendering a full year of data reliably.
 *  - ffmpeg's own libwebp/libx264 encoders are mature, well-tested at any
 *    frame count, and already required for MP4 output anyway.
 *
 * ffmpeg must be present on PATH. GitHub's `ubuntu-latest` hosted runners
 * ship it preinstalled — documented as a hard requirement in the README,
 * not silently assumed.
 */
export abstract class FfmpegFrameEncoder implements FrameEncoder {
  protected readonly width: number;
  protected readonly height: number;
  protected readonly fps: number;
  protected readonly outputPath: string;
  private readonly tempDir: string;
  private frameIndex = 0;

  constructor(outputPath: string, width: number, height: number, fps: number) {
    this.outputPath = outputPath;
    this.width = width;
    this.height = height;
    this.fps = fps;
    this.tempDir = mkdtempSync(join(tmpdir(), "contrib-blaster-frames-"));
  }

  async pushFrame(rgba: Buffer): Promise<void> {
    const framePath = join(this.tempDir, `frame-${String(this.frameIndex).padStart(6, "0")}.png`);
    const png = await getSharp()(rgba, { raw: { width: this.width, height: this.height, channels: 4 } })
      .png()
      .toBuffer();
    writeFileSync(framePath, png);
    this.frameIndex++;
  }

  async finalize(): Promise<void> {
    if (this.frameIndex === 0) {
      throw new Error(`${this.constructor.name}.finalize() called with zero frames captured`);
    }
    try {
      await this.runFfmpeg(this.buildArgs(join(this.tempDir, "frame-%06d.png")));
    } finally {
      rmSync(this.tempDir, { recursive: true, force: true });
    }
  }

  /** Subclasses provide the format-specific ffmpeg arguments. */
  protected abstract buildArgs(inputPattern: string): string[];

  private runFfmpeg(args: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
      const proc = spawn("ffmpeg", args, { stdio: ["ignore", "ignore", "pipe"] });
      let stderr = "";
      proc.stderr.on("data", (chunk: Buffer) => {
        stderr += chunk.toString();
      });
      proc.on("error", (err) => {
        reject(new Error(`Failed to launch ffmpeg (is it installed and on PATH?): ${err.message}`));
      });
      proc.on("close", (code) => {
        if (code === 0) resolve();
        else reject(new Error(`ffmpeg exited with code ${code}:\n${stderr.slice(-2000)}`));
      });
    });
  }
}
