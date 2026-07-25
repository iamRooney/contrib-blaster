import type { Scene } from "./scene.js";
import type { ContributionGrid } from "../github/graph.js";

type SceneFactory = (grid: ContributionGrid) => Scene;

const registry = new Map<string, SceneFactory>();

/** Called by each animation pack's index.ts to make itself available by name. */
export function registerAnimation(name: string, factory: SceneFactory): void {
  registry.set(name, factory);
}

export function createScene(name: string, grid: ContributionGrid): Scene {
  const factory = registry.get(name);
  if (!factory) {
    const available = [...registry.keys()].join(", ") || "(none registered)";
    throw new Error(`Unknown animation: "${name}". Available: ${available}`);
  }
  return factory(grid);
}

export function listAnimations(): string[] {
  return [...registry.keys()];
}
