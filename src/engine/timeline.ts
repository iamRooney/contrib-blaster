import type { Scene } from "./scene.js";
import type { World } from "./world.js";

export interface FrameEncoder {
  pushFrame(frameBuffer: Buffer): void | Promise<void>;
  finalize(): void | Promise<void>;
}

export interface TimelineOptions {
  /** Output frame rate — how often a frame is actually captured, in ticks-per-frame terms below. */
  fps: number;
  /** Simulation ticks per second. Higher than fps = smoother sim, sampled down for output. */
  ticksPerSecond: number;
  /** How many full reset-cycles to render. 1 = single seamless loop (recommended for GIF/WebP, see architecture doc §3.7). */
  maxLoops: number;
  /** Hard safety cap so a stuck simulation can't run forever. */
  maxFrames: number;
}

export const DEFAULT_TIMELINE_OPTIONS: TimelineOptions = {
  fps: 24,
  ticksPerSecond: 60,
  maxLoops: 1,
  // A full year's contribution grid can have 200-300+ target tiles even at
  // the speed-tuned pace (see animations/bomber/player.ts, bomb.ts). Measured
  // ~3700 frames for a realistic 272-contribution-day grid — this cap gives
  // real headroom above that rather than silently truncating typical runs.
  maxFrames: 6000,
};

/**
 * Drives the scene at a fixed simulation timestep, decoupled from wall-clock
 * time — this all runs headless in CI, so there's no "real time" to sync to,
 * and a fixed step is what makes output reproducible frame-for-frame across
 * runs (paired with World's SeededRandom).
 */
export class Timeline {
  private frameCount = 0;
  private loopCount = 0;
  private tickCount = 0;

  async run(
    scene: Scene,
    world: World,
    captureFrame: () => Buffer,
    encoder: FrameEncoder,
    options: Partial<TimelineOptions> = {},
  ): Promise<{ frameCount: number; loopCount: number; hitMaxFrames: boolean }> {
    const opts: TimelineOptions = { ...DEFAULT_TIMELINE_OPTIONS, ...options };
    const dt = 1 / opts.ticksPerSecond;
    const ticksPerFrame = Math.max(1, Math.round(opts.ticksPerSecond / opts.fps));

    this.frameCount = 0;
    this.loopCount = 0;
    this.tickCount = 0;

    while (this.loopCount < opts.maxLoops && this.frameCount < opts.maxFrames) {
      scene.update(dt, world);
      this.tickCount++;

      if (this.tickCount % ticksPerFrame === 0) {
        const buffer = captureFrame();
        await encoder.pushFrame(buffer);
        this.frameCount++;
      }

      if (scene.isComplete(world)) {
        scene.reset(world);
        this.loopCount++;
      }
    }

    await encoder.finalize();

    return {
      frameCount: this.frameCount,
      loopCount: this.loopCount,
      hitMaxFrames: this.frameCount >= opts.maxFrames,
    };
  }
}
