import { Entity } from "../../engine/entity.js";
import type { World } from "../../engine/world.js";
import type { Camera } from "../../engine/camera.js";
import type { RenderContext } from "../../engine/types.js";
import type { Vec2 } from "../../engine/types.js";
import { Explosion } from "./explosion.js";

const DEFAULT_FUSE_TICKS = 10; // ~0.17s at 60 ticks/sec — tuned for full-year grids with 100s of targets

export class Bomb extends Entity {
  private fuseTicks: number;
  private readonly radius: number;
  /** The Explosion this bomb spawns, once it detonates — Player polls this to know when it's safe to advance. */
  spawnedExplosion?: Explosion;

  constructor(position: Vec2, radius: number, fuseTicks: number = DEFAULT_FUSE_TICKS) {
    super(position, /* zIndex */ 4);
    this.radius = radius;
    this.fuseTicks = fuseTicks;
  }

  update(_dt: number, world: World): void {
    this.fuseTicks -= 1;
    if (this.fuseTicks <= 0) {
      const explosion = new Explosion(this.position, this.radius);
      world.add(explosion);
      this.spawnedExplosion = explosion;
      this.destroy();
    }
  }

  render(ctx: RenderContext, camera: Camera): void {
    // Placeholder — real version pulses/animates via spritesheet as the fuse counts down.
    const screen = camera.worldToScreen(this.position);
    ctx.fillStyle = "#2b2b2b";
    ctx.fillRect(screen.x, screen.y, camera.zoom, camera.zoom);
  }
}
