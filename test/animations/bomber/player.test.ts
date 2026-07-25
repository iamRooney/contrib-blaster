import { describe, it, expect } from "vitest";
import { World } from "../../../src/engine/world.js";
import { TileMap, TileType } from "../../../src/engine/tilemap.js";
import { Player } from "../../../src/animations/bomber/player.js";
import { Crate } from "../../../src/animations/bomber/crate.js";
import { TargetQueue } from "../../../src/animations/bomber/target-queue.js";
import type { ContributionGrid } from "../../../src/github/graph.js";

function makeGrid(counts: number[][]): ContributionGrid {
  return {
    weeks: counts.map((week, x) => week.map((count, y) => ({ date: `w${x}d${y}`, count }))),
  };
}

function setupWorld(counts: number[][]) {
  const tileMap = TileMap.fromContributionGrid(makeGrid(counts));
  const world = new World(42);
  world.tileMap = tileMap;

  // Spawn a Crate entity for every non-floor, non-metal tile — mirrors what
  // BomberScene.init() will do once the scene wiring step lands.
  for (const row of tileMap.tiles) {
    for (const tile of row) {
      if (tile.type !== TileType.Floor && tile.type !== TileType.MetalBlock) {
        world.add(new Crate(tile));
      }
    }
  }

  const targetQueue = new TargetQueue(tileMap);
  const player = new Player(0, 0, tileMap, targetQueue);
  world.add(player);

  return { world, tileMap, targetQueue, player };
}

function runUntil(world: World, player: Player, predicate: () => boolean, maxTicks = 5000): number {
  let ticks = 0;
  while (!predicate() && ticks < maxTicks) {
    world.update(1);
    ticks++;
  }
  return ticks;
}

describe("Player bomber state machine", () => {
  it("clears every contribution tile and reaches finished state", () => {
    const { world, tileMap, player } = setupWorld([
      [3, 0, 7],
      [0, 0, 12],
    ]);

    const ticks = runUntil(world, player, () => player.finished);
    expect(ticks).toBeLessThan(5000); // sanity: didn't hit the safety cap / stall

    const contributionTiles = tileMap.tiles.flat().filter((t) => t.contributionCount > 0);
    expect(contributionTiles.length).toBeGreaterThan(0);
    for (const tile of contributionTiles) {
      expect(tile.cleared).toBe(true);
    }
  });

  it("skips unreachable targets instead of stalling forever", () => {
    // Hand-build a grid where one contribution tile is fully walled off,
    // to confirm the player finishes rather than looping forever on it.
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
    const trapped = tiles[1]?.[1];
    if (trapped) {
      trapped.type = TileType.WeakCrate;
      trapped.contributionCount = 2;
    }
    for (const [x, y] of [
      [0, 1],
      [2, 1],
      [1, 0],
      [1, 2],
    ] as const) {
      const t = tiles[y]?.[x];
      if (t) t.type = TileType.MetalBlock;
    }
    const tileMap = new TileMap(3, 3, tiles);
    const world = new World(1);
    world.tileMap = tileMap;
    const targetQueue = new TargetQueue(tileMap);
    const player = new Player(0, 0, tileMap, targetQueue);
    world.add(player);

    const ticks = runUntil(world, player, () => player.finished);
    expect(ticks).toBeLessThan(5000);
    expect(player.finished).toBe(true);
    // The trapped tile should remain uncleared since it was never reachable.
    expect(trapped?.cleared).toBe(false);
  });
});
