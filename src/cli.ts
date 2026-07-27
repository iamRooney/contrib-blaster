import "./animations/bomber/index.js"; // side-effect: registers "bomber"
import { createScene } from "./engine/scene-manager.js";
import { World } from "./engine/world.js";
import { Timeline, type FrameEncoder } from "./engine/timeline.js";
import { Camera } from "./engine/camera.js";
import { PixelCanvas } from "./render/pixel-canvas.js";
import { GifFrameEncoder } from "./render/gif-encoder.js";
import { WebpFrameEncoder } from "./render/webp-encoder.js";
import { Mp4FrameEncoder } from "./render/mp4-encoder.js";
import type { ContributionGrid } from "./github/graph.js";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

const TILE_SIZE_PX = 16; // compromise: enough resolution for sprite legibility without the file-size blowup of full 1:1 (20px) - see explosion.ts for the other half of this fix
const LEFT_MARGIN_PX = 24; // room for day-of-week labels (Mon/Wed/Fri)
const TOP_MARGIN_PX = 14; // room for month labels (Jan, Feb, ...)

export type OutputFormat = "gif" | "webp" | "mp4";

export interface RunOptions {
  animation: string;
  outputPath: string;
  fps: number;
  format: OutputFormat;
}

// Encoder classes are imported statically here — that's fine now. The
// sharp-avoidance fix lives inside ffmpeg-frame-encoder.ts itself (a lazy
// createRequire() call, not a static `import`), so simply *referencing*
// WebpFrameEncoder/Mp4FrameEncoder's class definitions at import time no
// longer triggers loading sharp. Only actually instantiating/using one of
// them does.
function createEncoder(
  format: OutputFormat,
  outputPath: string,
  width: number,
  height: number,
  fps: number,
): FrameEncoder {
  switch (format) {
    case "gif":
      return new GifFrameEncoder(outputPath, width, height, fps);
    case "webp":
      return new WebpFrameEncoder(outputPath, width, height, fps);
    case "mp4":
      return new Mp4FrameEncoder(outputPath, width, height, fps);
  }
}

export async function run(grid: ContributionGrid, options: RunOptions): Promise<void> {
  mkdirSync(dirname(options.outputPath), { recursive: true });

  const scene = createScene(options.animation, grid);
  const world = new World(hashGridForSeed(grid));
  scene.init(world);

  const width = grid.weeks.length * TILE_SIZE_PX + LEFT_MARGIN_PX;
  const height = (grid.weeks[0]?.length ?? 7) * TILE_SIZE_PX + TOP_MARGIN_PX;
  const camera = new Camera(0, 0, TILE_SIZE_PX, LEFT_MARGIN_PX, TOP_MARGIN_PX);
  const canvas = new PixelCanvas(width, height);
  const encoder = createEncoder(options.format, options.outputPath, width, height, options.fps);

  const timeline = new Timeline();
  const result = await timeline.run(
    scene,
    world,
    () => {
      canvas.clearRect(0, 0, width, height);
      scene.render(canvas, camera, world);
      return Buffer.from(canvas.toRGBA());
    },
    encoder,
    { fps: options.fps, maxLoops: 1 },
  );

  console.log(
    `Wrote ${options.outputPath} (${options.format}) — ${result.frameCount} frames, ${result.loopCount} loop(s)` +
      (result.hitMaxFrames ? " (hit safety frame cap)" : ""),
  );
}

/** Deterministic seed derived from the grid contents, so re-renders for the same data are reproducible. */
function hashGridForSeed(grid: ContributionGrid): number {
  let hash = 0;
  for (const week of grid.weeks) {
    for (const day of week) {
      hash = (Math.imul(31, hash) + day.count) | 0;
    }
  }
  return hash >>> 0;
}
