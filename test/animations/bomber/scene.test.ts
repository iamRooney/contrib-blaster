import { describe, it, expect } from "vitest";
import { World } from "../../../src/engine/world.js";
import { createScene, listAnimations } from "../../../src/engine/scene-manager.js";
import "../../../src/animations/bomber/index.js"; // side-effect: registers "bomber"
import type { ContributionGrid } from "../../../src/github/graph.js";

function makeGrid(counts: number[][]): ContributionGrid {
  return {
    weeks: counts.map((week, x) => week.map((count, y) => ({ date: `w${x}d${y}`, count }))),
  };
}

function runUntilComplete(scene: ReturnType<typeof createScene>, world: World, maxTicks = 5000): number {
  let ticks = 0;
  while (!scene.isComplete(world) && ticks < maxTicks) {
    scene.update(1, world);
    ticks++;
  }
  return ticks;
}

describe("BomberScene (via Scene interface)", () => {
  it("registers itself as 'bomber'", () => {
    expect(listAnimations()).toContain("bomber");
  });

  it("runs a full loop to completion, then resets and completes again", () => {
    const grid = makeGrid([
      [3, 0, 7],
      [0, 0, 5],
    ]);
    const scene = createScene("bomber", grid);
    const world = new World(7);
    scene.init(world);

    const firstRunTicks = runUntilComplete(scene, world);
    expect(firstRunTicks).toBeLessThan(5000);
    expect(scene.isComplete(world)).toBe(true);

    // Every contribution tile should be cleared after the first run.
    const tileMap = world.tileMap as { tiles: { contributionCount: number; cleared: boolean }[][] };
    const contributionTiles = tileMap.tiles.flat().filter((t) => t.contributionCount > 0);
    expect(contributionTiles.length).toBeGreaterThan(0);
    for (const t of contributionTiles) expect(t.cleared).toBe(true);

    // Reset should rebuild crates and requeue targets so the loop can run again.
    scene.reset(world);
    expect(scene.isComplete(world)).toBe(false);
    for (const t of contributionTiles) expect(t.cleared).toBe(false);

    const secondRunTicks = runUntilComplete(scene, world);
    expect(secondRunTicks).toBeLessThan(5000);
    expect(scene.isComplete(world)).toBe(true);
    for (const t of contributionTiles) expect(t.cleared).toBe(true);
  });

  it("throws a clear error for an unregistered animation name", () => {
    expect(() => createScene("not-a-real-pack", makeGrid([[0]]))).toThrow(/Unknown animation/);
  });
});
