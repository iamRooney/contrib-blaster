import type { Entity } from "./entity.js";

/**
 * Optional "components" entities can implement via plain interfaces, checked
 * with type guards below. This is the composition mechanism instead of a
 * full ECS component store — see the comment on `Entity` for why.
 */

export interface Destructible {
  onExplosionHit(damage: number): void;
}

export function isDestructible(e: Entity): e is Entity & Destructible {
  return typeof (e as Partial<Destructible>).onExplosionHit === "function";
}

export interface TileOccupant {
  tileX: number;
  tileY: number;
}

export function isTileOccupant(e: Entity): e is Entity & TileOccupant {
  return (
    typeof (e as Partial<TileOccupant>).tileX === "number" &&
    typeof (e as Partial<TileOccupant>).tileY === "number"
  );
}
