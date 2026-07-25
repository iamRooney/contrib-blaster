import { describe, it, expect } from "vitest";
import { TileMap, TileType } from "../../src/engine/tilemap.js";
import type { ContributionGrid } from "../../src/github/graph.js";

function makeGrid(counts: number[][]): ContributionGrid {
  // counts[x][y] -> contribution count for week x, day y
  return {
    weeks: counts.map((week, x) =>
      week.map((count, y) => ({
        date: `2026-W${x}-D${y}`,
        count,
      })),
    ),
  };
}

describe("TileMap.fromContributionGrid", () => {
  it("maps contribution counts to the correct tile types", () => {
    const grid = makeGrid([[0, 2, 5, 12, 0, 0, 0]]);
    const map = TileMap.fromContributionGrid(grid);

    expect(map.getTile(0, 0)?.type).toBe(TileType.Floor);
    expect(map.getTile(0, 1)?.type).toBe(TileType.WeakCrate);
    expect(map.getTile(0, 2)?.type).toBe(TileType.StrongCrate);
    expect(map.getTile(0, 3)?.type).toBe(TileType.ReinforcedCrate);
  });

  it("never places a MetalBlock on a tile that had contributions", () => {
    // Every tile has a contribution, including ones that fall on pillar
    // coordinates (odd x, odd y) — none of these should become MetalBlock.
    const weeks = Array.from({ length: 6 }, () => Array.from({ length: 7 }, () => 3));
    const grid = makeGrid(weeks);
    const map = TileMap.fromContributionGrid(grid);

    for (const row of map.tiles) {
      for (const tile of row) {
        expect(tile.type).not.toBe(TileType.MetalBlock);
      }
    }
  });

  it("places MetalBlock only on pillar coordinates that had zero contributions", () => {
    const weeks = Array.from({ length: 6 }, () => Array.from({ length: 7 }, () => 0));
    const grid = makeGrid(weeks);
    const map = TileMap.fromContributionGrid(grid);

    expect(map.getTile(1, 1)?.type).toBe(TileType.MetalBlock);
    expect(map.getTile(3, 1)?.type).toBe(TileType.MetalBlock);
    expect(map.getTile(0, 0)?.type).toBe(TileType.Floor);
  });

  it("isWalkable treats MetalBlock as always blocked, Floor as always open", () => {
    const weeks = Array.from({ length: 6 }, () => Array.from({ length: 7 }, () => 0));
    const grid = makeGrid(weeks);
    const map = TileMap.fromContributionGrid(grid);

    expect(map.isWalkable(1, 1)).toBe(false); // metal pillar
    expect(map.isWalkable(0, 0)).toBe(true); // floor
  });

  it("isWalkable treats a cleared crate tile as walkable", () => {
    const grid = makeGrid([[5]]);
    const map = TileMap.fromContributionGrid(grid);

    expect(map.isWalkable(0, 0)).toBe(false); // uncleared strong crate
    const tile = map.getTile(0, 0);
    if (tile) tile.cleared = true;
    expect(map.isWalkable(0, 0)).toBe(true);
  });

  it("resetClearedTiles clears the cleared flag on every tile", () => {
    const grid = makeGrid([[5, 2]]);
    const map = TileMap.fromContributionGrid(grid);
    const t0 = map.getTile(0, 0);
    const t1 = map.getTile(0, 1);
    if (t0) t0.cleared = true;
    if (t1) t1.cleared = true;

    map.resetClearedTiles();

    expect(map.getTile(0, 0)?.cleared).toBe(false);
    expect(map.getTile(0, 1)?.cleared).toBe(false);
  });

  it("neighbors returns only in-bounds tiles", () => {
    const grid = makeGrid([[0, 0]]);
    const map = TileMap.fromContributionGrid(grid);
    const corner = map.neighbors(0, 0);
    expect(corner.length).toBe(1); // only (0,1) is in bounds; width=1, height=2
  });
});
