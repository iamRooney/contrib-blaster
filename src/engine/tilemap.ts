import type { Vec2 } from "./types.js";
import type { ContributionGrid } from "../github/graph.js";

/**
 * Mirrors GitHub's own 5-level contribution intensity scale, mapped onto
 * game-world obstacles. Every tile with contributionCount > 0 is *some*
 * flavor of crate (i.e. a legitimate bomb target) — nothing tied to
 * contribution data is ever permanently indestructible. That's a
 * deliberate choice: a project's biggest coding day should be the most
 * dramatic explosion, not a wall the player routes around forever.
 *
 * `MetalBlock` still exists as a tile type, but it's only ever placed by
 * `applyStructuralPattern()` on tiles that had zero contributions to begin
 * with — see that function below.
 */
export enum TileType {
  Floor = "floor",
  WeakCrate = "weak_crate",
  StrongCrate = "strong_crate",
  ReinforcedCrate = "reinforced_crate",
  MetalBlock = "metal_block",
}

export interface Tile {
  type: TileType;
  gridX: number;
  gridY: number;
  contributionCount: number;
  date: string;
  /** Has this day's crate been bombed already in the current loop? */
  cleared: boolean;
}

/** Contribution count thresholds -> tile type. Mirrors GitHub's own calendar legend. */
function tileTypeForCount(count: number): TileType {
  if (count <= 0) return TileType.Floor;
  if (count <= 3) return TileType.WeakCrate;
  if (count <= 9) return TileType.StrongCrate;
  return TileType.ReinforcedCrate;
}

export class TileMap {
  readonly width: number;
  readonly height: number;
  readonly tiles: Tile[][];

  constructor(width: number, height: number, tiles: Tile[][]) {
    this.width = width;
    this.height = height;
    this.tiles = tiles;
  }

  static fromContributionGrid(grid: ContributionGrid): TileMap {
    const width = grid.weeks.length;
    const height = width > 0 ? (grid.weeks[0]?.length ?? 7) : 7;

    const tiles: Tile[][] = [];
    for (let y = 0; y < height; y++) {
      const row: Tile[] = [];
      for (let x = 0; x < width; x++) {
        const day = grid.weeks[x]?.[y];
        const count = day?.count ?? 0;
        row.push({
          type: tileTypeForCount(count),
          gridX: x,
          gridY: y,
          contributionCount: count,
          date: day?.date ?? "",
          cleared: false,
        });
      }
      tiles.push(row);
    }

    const map = new TileMap(width, height, tiles);
    applyStructuralPattern(map);
    return map;
  }

  inBounds(x: number, y: number): boolean {
    return x >= 0 && x < this.width && y >= 0 && y < this.height;
  }

  getTile(x: number, y: number): Tile | undefined {
    return this.inBounds(x, y) ? this.tiles[y]?.[x] : undefined;
  }

  /** 4-directional neighbors, bounds-checked. */
  neighbors(x: number, y: number): Tile[] {
    const deltas: Array<[number, number]> = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ];
    const result: Tile[] = [];
    for (const [dx, dy] of deltas) {
      const t = this.getTile(x + dx, y + dy);
      if (t) result.push(t);
    }
    return result;
  }

  /**
   * A tile is walkable if it never had a crate (Floor), or if its crate has
   * already been destroyed this loop (cleared). MetalBlock is always a wall.
   */
  isWalkable(x: number, y: number): boolean {
    const t = this.getTile(x, y);
    if (!t) return false;
    if (t.type === TileType.MetalBlock) return false;
    return t.type === TileType.Floor || t.cleared;
  }

  /** All tiles within Chebyshev-ish 4-directional blast radius, for explosion propagation. */
  tilesInRadius(center: Vec2, radius: number): Tile[] {
    const result: Tile[] = [];
    const cx = Math.round(center.x);
    const cy = Math.round(center.y);
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        if (Math.abs(dx) + Math.abs(dy) > radius) continue; // diamond blast, not square
        const t = this.getTile(cx + dx, cy + dy);
        if (t) result.push(t);
      }
    }
    return result;
  }

  /** Resets every crate tile back to un-cleared, for a new loop. Does not touch MetalBlock/Floor. */
  resetClearedTiles(): void {
    for (const row of this.tiles) {
      for (const tile of row) {
        tile.cleared = false;
      }
    }
  }
}

/**
 * Places a small number of permanent MetalBlock obstacles at a fixed,
 * deterministic pattern (classic Bomberman-style pillar grid: every odd
 * column/row intersection) — but ONLY on tiles that started as Floor
 * (zero contributions). This guarantees every contribution day remains a
 * reachable, destructible target, per the design decision in the
 * architecture doc (§3.3 / §10).
 */
function applyStructuralPattern(map: TileMap): void {
  for (let y = 0; y < map.height; y++) {
    for (let x = 0; x < map.width; x++) {
      const tile = map.tiles[y]?.[x];
      if (!tile) continue;
      const isPillarPosition = x % 2 === 1 && y % 2 === 1;
      if (isPillarPosition && tile.type === TileType.Floor) {
        tile.type = TileType.MetalBlock;
      }
    }
  }
}
