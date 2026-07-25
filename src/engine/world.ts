import { Entity } from "./entity.js";
import { SeededRandom } from "./random.js";

/**
 * `tileMap` is deliberately typed as `unknown` at this layer. The engine
 * core (this file) is built before TileMap exists (that's Step 3), and
 * World shouldn't hard-depend on any one animation pack's idea of what a
 * tile map even is. Concrete Scenes cast/narrow this to their own TileMap
 * type — see animations/bomber/scene.ts once it lands.
 */
export class World {
  entities: Entity[] = [];
  tileMap: unknown = null;
  rng: SeededRandom;

  constructor(seed: number) {
    this.rng = new SeededRandom(seed);
  }

  add(entity: Entity): void {
    this.entities.push(entity);
  }

  /** Runs update() on every live entity, then sweeps dead ones out. */
  update(dt: number): void {
    for (const entity of this.entities) {
      if (entity.alive) entity.update(dt, this);
    }
    this.entities = this.entities.filter((e) => e.alive);
  }

  /** Removes every entity and resets nothing else — Scene.reset() decides what gets rebuilt. */
  clearEntities(): void {
    this.entities = [];
  }

  find<T extends Entity>(predicate: (e: Entity) => e is T): T[] {
    return this.entities.filter(predicate);
  }
}
