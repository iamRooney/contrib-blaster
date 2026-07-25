import type { TileMap, Tile } from "../../engine/tilemap.js";

/**
 * Lives in the bomber pack, not the engine — "sort contribution tiles by
 * count and bomb the biggest days first" is this animation's concept, not
 * a generic engine feature. Other packs (Snake, Space Shooter) won't have
 * anything like this.
 */
export class TargetQueue {
  private queue: Tile[] = [];

  constructor(tileMap: TileMap) {
    this.rebuild(tileMap);
  }

  /** Rebuilds the queue from the tile map's current state — called on scene reset. */
  rebuild(tileMap: TileMap): void {
    this.queue = tileMap.tiles
      .flat()
      .filter((t) => t.contributionCount > 0 && !t.cleared)
      .sort((a, b) => b.contributionCount - a.contributionCount);
  }

  /** Pops and returns the highest-remaining-contribution tile, or undefined if empty. */
  next(): Tile | undefined {
    return this.queue.shift();
  }

  /**
   * Re-appends a tile that couldn't be reached this attempt. Used when a
   * target is currently walled off — reachability can change later once a
   * neighboring crate gets cleared, so we retry rather than give up on it
   * permanently.
   */
  pushBack(tile: Tile): void {
    this.queue.push(tile);
  }

  isEmpty(): boolean {
    return this.queue.length === 0;
  }

  remaining(): number {
    return this.queue.length;
  }
}
