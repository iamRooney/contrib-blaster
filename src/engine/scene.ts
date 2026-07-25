import type { RenderContext } from "./types.js";
import type { Camera } from "./camera.js";
import type { World } from "./world.js";

/**
 * The interface every animation pack implements. This is the ONLY contract
 * between the engine core and an animation pack — engine/ never imports
 * from animations/*, only the other way around. Adding a new pack (Snake,
 * Space Shooter, ...) means writing a new class that satisfies this
 * interface and registering it; nothing in engine/ changes.
 */
export interface Scene {
  /** One-time setup: build the tile map from contribution data, spawn the player, etc. */
  init(world: World): void;

  /** Advance the scene's simulation by one fixed timestep. */
  update(dt: number, world: World): void;

  /** Draw the current frame. Must not mutate simulation state. */
  render(ctx: RenderContext, camera: Camera, world: World): void;

  /** True once this loop's "story" is finished (e.g. target queue empty). */
  isComplete(world: World): boolean;

  /** Re-seed/rebuild whatever isComplete() checks, so the Timeline can loop. */
  reset(world: World): void;
}
