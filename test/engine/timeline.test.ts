import { describe, it, expect, vi } from "vitest";
import { Timeline, type FrameEncoder } from "../../src/engine/timeline.js";
import { World } from "../../src/engine/world.js";
import type { Scene } from "../../src/engine/scene.js";

/** A fake scene that "completes" after a fixed number of update() calls. */
function makeFakeScene(ticksToComplete: number) {
  let tickCount = 0;
  let resetCount = 0;
  const scene: Scene = {
    init: () => {},
    update: () => {
      tickCount++;
    },
    render: () => {},
    isComplete: () => tickCount >= ticksToComplete,
    reset: () => {
      tickCount = 0;
      resetCount++;
    },
  };
  return { scene, getResetCount: () => resetCount };
}

function makeMemoryEncoder(): FrameEncoder & { frames: Buffer[]; finalized: boolean } {
  return {
    frames: [],
    finalized: false,
    pushFrame(buf: Buffer) {
      this.frames.push(buf);
    },
    finalize() {
      this.finalized = true;
    },
  };
}

describe("Timeline", () => {
  it("captures frames at the sampled rate (ticksPerSecond / fps)", async () => {
    const { scene } = makeFakeScene(1_000_000); // never completes within this test
    const world = new World(1);
    const encoder = makeMemoryEncoder();
    const timeline = new Timeline();
    const captureFrame = vi.fn(() => Buffer.from("frame"));

    // 60 ticks/sec, 24fps -> 1 frame captured every ~2-3 ticks; cap at 10 frames.
    await timeline.run(scene, world, captureFrame, encoder, {
      ticksPerSecond: 60,
      fps: 24,
      maxLoops: 999, // won't matter, scene never completes
      maxFrames: 10,
    });

    expect(encoder.frames.length).toBe(10);
    expect(encoder.finalized).toBe(true);
  });

  it("resets the scene when isComplete() fires, and stops after maxLoops resets", async () => {
    const { scene, getResetCount } = makeFakeScene(5); // completes every 5 ticks
    const world = new World(1);
    const encoder = makeMemoryEncoder();
    const timeline = new Timeline();

    const result = await timeline.run(scene, world, () => Buffer.from("f"), encoder, {
      ticksPerSecond: 60,
      fps: 60, // 1 frame per tick, for simplicity
      maxLoops: 3,
      maxFrames: 10_000,
    });

    expect(getResetCount()).toBe(3);
    expect(result.loopCount).toBe(3);
  });

  it("stops at maxFrames even if the scene never completes (safety cap)", async () => {
    const { scene } = makeFakeScene(Number.MAX_SAFE_INTEGER);
    const world = new World(1);
    const encoder = makeMemoryEncoder();
    const timeline = new Timeline();

    const result = await timeline.run(scene, world, () => Buffer.from("f"), encoder, {
      ticksPerSecond: 60,
      fps: 60,
      maxLoops: 1,
      maxFrames: 50,
    });

    expect(result.frameCount).toBe(50);
    expect(result.hitMaxFrames).toBe(true);
    expect(result.loopCount).toBe(0); // scene never actually completed
  });
});
