import type { Vec2, RenderContext } from "./types.js";
import type { Camera } from "./camera.js";
import type { World } from "./world.js";

let nextEntityId = 0;

/**
 * Base class for every object that lives in the simulation: Player, Bomb,
 * Explosion, Crate, Particle, Collectible, Decoration, etc.
 *
 * We use a lightweight base-class-plus-optional-components pattern rather
 * than a strict ECS (component store + query engine). At this scale — a
 * contribution grid is at most 53x7 tiles, and per-frame entity counts are
 * in the dozens, not thousands — a full ECS buys nothing but ceremony.
 * Shared cross-cutting behavior (e.g. "can be destroyed by an explosion",
 * "occupies a tile") is expressed as optional interfaces in
 * `components.ts` and checked with type guards where needed, so `World`
 * doesn't need to know about every concrete entity type.
 */
export abstract class Entity {
  readonly id: number;
  position: Vec2;
  zIndex: number;
  alive: boolean;

  constructor(position: Vec2, zIndex = 0) {
    this.id = nextEntityId++;
    this.position = position;
    this.zIndex = zIndex;
    this.alive = true;
  }

  /**
   * Advance this entity's simulation state by one fixed timestep.
   * `world` gives access to the tile map, other entities, and the RNG —
   * entities should read/write world state through it rather than holding
   * their own references to sibling entities across frames.
   */
  abstract update(dt: number, world: World): void;

  /**
   * Draw this entity's current state. Must be pure with respect to
   * simulation state — render() should never mutate position, hp, or any
   * other field. All state changes belong in update().
   */
  abstract render(ctx: RenderContext, camera: Camera): void;

  /** Marks this entity for removal at the end of the current World.update(). */
  destroy(): void {
    this.alive = false;
  }
}
