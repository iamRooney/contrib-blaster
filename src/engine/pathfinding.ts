import type { TileMap } from "./tilemap.js";
import type { Vec2 } from "./types.js";

/**
 * Shortest-path BFS over grid coordinates. Unweighted and 4-directional,
 * which is all a Bomberman-style grid needs. A contribution grid tops out
 * at 53x7 = 371 tiles, so BFS's O(V+E) is effectively instant — A* would
 * add heuristic-tuning complexity for no measurable benefit at this scale.
 *
 * Returns the path as a list of grid-coordinate steps from (excluding)
 * `from` to (including) `to`. Returns an empty array if `to` is
 * unreachable (e.g. walled off by MetalBlock) OR if `from === to`.
 */
export function findPath(map: TileMap, from: Vec2, to: Vec2): Vec2[] {
  if (from.x === to.x && from.y === to.y) return [];

  const key = (p: Vec2): string => `${p.x},${p.y}`;
  const queue: Vec2[] = [from];
  const cameFrom = new Map<string, Vec2>();
  const visited = new Set<string>([key(from)]);

  while (queue.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const current = queue.shift()!;

    if (current.x === to.x && current.y === to.y) {
      return reconstruct(cameFrom, from, current, key);
    }

    for (const neighborTile of map.neighbors(current.x, current.y)) {
      const next: Vec2 = { x: neighborTile.gridX, y: neighborTile.gridY };
      const k = key(next);
      if (visited.has(k)) continue;
      // The destination tile itself is often a crate (not walkable) — we
      // still want to allow BFS to step onto it as the final hop so callers
      // can path *to* a target, not just adjacent to it. isWalkable is
      // still enforced for every intermediate tile.
      const isDestination = next.x === to.x && next.y === to.y;
      if (!isDestination && !map.isWalkable(next.x, next.y)) continue;
      visited.add(k);
      cameFrom.set(k, current);
      queue.push(next);
    }
  }

  return []; // unreachable
}

function reconstruct(
  cameFrom: Map<string, Vec2>,
  from: Vec2,
  to: Vec2,
  key: (p: Vec2) => string,
): Vec2[] {
  const path: Vec2[] = [to];
  let current = to;
  while (!(current.x === from.x && current.y === from.y)) {
    const prev = cameFrom.get(key(current));
    if (!prev) break; // shouldn't happen, but avoid infinite loop defensively
    path.unshift(prev);
    current = prev;
  }
  path.shift(); // drop `from` itself — caller already stands there
  return path;
}
