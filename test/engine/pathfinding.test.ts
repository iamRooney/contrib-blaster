import { describe, it, expect } from "vitest";
import { TileMap, TileType } from "../../src/engine/tilemap.js";
import { findPath } from "../../src/engine/pathfinding.js";
import type { ContributionGrid } from "../../src/github/graph.js";

function makeGrid(counts: number[][]): ContributionGrid {
  return {
    weeks: counts.map((week, x) => week.map((count, y) => ({ date: `w${x}d${y}`, count }))),
  };
}

describe("findPath", () => {
  it("returns an empty path when start equals destination", () => {
    const map = TileMap.fromContributionGrid(makeGrid([[0, 0]]));
    expect(findPath(map, { x: 0, y: 0 }, { x: 0, y: 0 })).toEqual([]);
  });

  it("finds a direct path across open floor", () => {
    const weeks = Array.from({ length: 4 }, () => [0]); // 4 wide, 1 tall, all floor
    const map = TileMap.fromContributionGrid(makeGrid(weeks));
    const path = findPath(map, { x: 0, y: 0 }, { x: 3, y: 0 });
    expect(path).toEqual([
      { x: 1, y: 0 },
      { x: 2, y: 0 },
      { x: 3, y: 0 },
    ]);
  });

  it("routes around a MetalBlock obstacle", () => {
    // 3x3 grid, all zero contribution -> pillar pattern places MetalBlock at (1,1).
    const weeks = Array.from({ length: 3 }, () => [0, 0, 0]);
    const map = TileMap.fromContributionGrid(makeGrid(weeks));
    expect(map.getTile(1, 1)?.type).toBe(TileType.MetalBlock);

    const path = findPath(map, { x: 0, y: 1 }, { x: 2, y: 1 });
    // Must not pass through the blocked (1,1) tile.
    expect(path.some((p) => p.x === 1 && p.y === 1)).toBe(false);
    expect(path[path.length - 1]).toEqual({ x: 2, y: 1 });
  });

  it("returns an empty path when the destination is fully walled off", () => {
    // Build a target tile surrounded on all 4 sides by MetalBlock.
    // 3x3, contributions everywhere except a ring pattern is hard to force
    // via the pillar rule directly, so we hand-construct the tiles instead.
    const tiles = [];
    for (let y = 0; y < 3; y++) {
      const row = [];
      for (let x = 0; x < 3; x++) {
        row.push({
          type: TileType.Floor,
          gridX: x,
          gridY: y,
          contributionCount: 0,
          date: "",
          cleared: false,
        });
      }
      tiles.push(row);
    }
    // Wall in the center tile (1,1) on all four sides.
    const center = tiles[1]?.[1];
    if (center) center.type = TileType.WeakCrate; // target itself is fine to be a crate
    const up = tiles[0]?.[1];
    const down = tiles[2]?.[1];
    const left = tiles[1]?.[0];
    const right = tiles[1]?.[2];
    for (const t of [up, down, left, right]) {
      if (t) t.type = TileType.MetalBlock;
    }
    const map = new TileMap(3, 3, tiles);

    const path = findPath(map, { x: 0, y: 0 }, { x: 1, y: 1 });
    expect(path).toEqual([]);
  });

  it("allows the final hop onto a non-walkable destination (e.g. a crate) while still blocking mid-path crates", () => {
    const weeks = [[5], [0], [0]]; // week0/day0 has contribution -> crate; rest floor
    const map = TileMap.fromContributionGrid(makeGrid(weeks));
    // (0,0) is a crate (not walkable). Path from (2,0) to (0,0) should still
    // succeed, ending exactly on the crate tile.
    const path = findPath(map, { x: 2, y: 0 }, { x: 0, y: 0 });
    expect(path[path.length - 1]).toEqual({ x: 0, y: 0 });
  });
});
