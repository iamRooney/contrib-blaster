import { Entity } from "../../engine/entity.js";
import type { World } from "../../engine/world.js";
import type { Camera } from "../../engine/camera.js";
import type { RenderContext } from "../../engine/types.js";
import { type Vec2, vec2Distance } from "../../engine/types.js";
import type { TileOccupant } from "../../engine/components.js";
import { TileMap, TileType, type Tile } from "../../engine/tilemap.js";
import { findPath } from "../../engine/pathfinding.js";
import { TargetQueue } from "./target-queue.js";
import { Bomb } from "./bomb.js";
import { drawSprite, PLAYER_SPRITE } from "./sprites.js";

const TICKS_PER_TILE_STEP = 2;

/** Bomb blast radius scales with how "hard" the target crate is — bigger commit days, bigger explosions. */
const RADIUS_BY_TILE_TYPE: Partial<Record<TileType, number>> = {
  [TileType.WeakCrate]: 1,
  [TileType.StrongCrate]: 1,
  [TileType.ReinforcedCrate]: 2,
};

type PlayerState =
  | "SEEK_TARGET"
  | "MOVE_TO_TARGET"
  | "PLACE_BOMB"
  | "RETREAT"
  | "WAIT_FOR_EXPLOSION";

export class Player extends Entity implements TileOccupant {
  tileX: number;
  tileY: number;
  state: PlayerState = "SEEK_TARGET";

  private readonly tileMap: TileMap;
  private readonly targetQueue: TargetQueue;
  private currentTarget?: Tile;
  private path: Vec2[] = [];
  private stepTicks = 0;
  private activeBomb?: Bomb;

  /** True once the target queue is exhausted (all reachable targets bombed) and the player is idle. */
  finished = false;

  constructor(startX: number, startY: number, tileMap: TileMap, targetQueue: TargetQueue) {
    super({ x: startX, y: startY }, /* zIndex */ 10);
    this.tileX = startX;
    this.tileY = startY;
    this.tileMap = tileMap;
    this.targetQueue = targetQueue;
  }

  update(_dt: number, world: World): void {
    switch (this.state) {
      case "SEEK_TARGET":
        this.seekTarget();
        break;
      case "MOVE_TO_TARGET":
        this.followPath();
        break;
      case "PLACE_BOMB":
        this.placeBomb(world);
        break;
      case "RETREAT":
        this.retreat();
        break;
      case "WAIT_FOR_EXPLOSION":
        if (this.activeBomb?.spawnedExplosion?.resolved) {
          this.activeBomb = undefined;
          // Strong/Reinforced crates take more than one hit — if this
          // target's tile survived, bomb it again rather than moving on.
          // (Player is already standing on the adjacent approach tile, so
          // no re-pathing is needed.)
          if (this.currentTarget && !this.currentTarget.cleared) {
            this.state = "PLACE_BOMB";
          } else {
            this.state = "SEEK_TARGET";
          }
        }
        break;
    }
  }

  /**
   * Pops targets off the queue until it finds one with a reachable approach
   * tile. Unreachable targets are pushed back to the end of the queue
   * rather than discarded, since clearing a neighboring crate can open a
   * new approach later. We cap the scan at one full pass over the current
   * queue length so a genuinely, permanently walled-off target (no amount
   * of future clearing will help) doesn't stall the simulation forever.
   */
  private seekTarget(): void {
    const maxAttempts = this.targetQueue.remaining() + 1;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const target = this.targetQueue.next();
      if (!target) break;

      const approach = this.findApproachTile(target);
      if (approach) {
        const path = findPath(this.tileMap, { x: this.tileX, y: this.tileY }, approach);
        // path may legitimately be empty if the player is already standing
        // on the approach tile (e.g. right after a retreat) — that's fine,
        // it just means we're already in position.
        this.currentTarget = target;
        this.path = path;
        this.finished = false;
        this.state = "MOVE_TO_TARGET";
        return;
      }
      // Boxed in for now — requeue it; a later explosion elsewhere this
      // loop might open a path to it.
      this.targetQueue.pushBack(target);
    }
    // Scanned the whole remaining queue without finding anything reachable.
    this.finished = true;
  }

  private findApproachTile(target: Tile): Vec2 | null {
    const walkableNeighbors = this.tileMap
      .neighbors(target.gridX, target.gridY)
      .filter((t) => this.tileMap.isWalkable(t.gridX, t.gridY));
    if (walkableNeighbors.length === 0) return null;

    // Prefer the neighbor closest to the player's current position, so we
    // don't path across the whole map to approach from the "wrong" side.
    let best = walkableNeighbors[0] as Tile;
    let bestDist = vec2Distance({ x: this.tileX, y: this.tileY }, { x: best.gridX, y: best.gridY });
    for (const candidate of walkableNeighbors.slice(1)) {
      const dist = vec2Distance(
        { x: this.tileX, y: this.tileY },
        { x: candidate.gridX, y: candidate.gridY },
      );
      if (dist < bestDist) {
        best = candidate;
        bestDist = dist;
      }
    }
    return { x: best.gridX, y: best.gridY };
  }

  private followPath(): void {
    if (this.path.length === 0) {
      this.state = "PLACE_BOMB";
      return;
    }
    this.stepTicks += 1;
    if (this.stepTicks < TICKS_PER_TILE_STEP) return;
    this.stepTicks = 0;

    const next = this.path.shift();
    if (!next) {
      this.state = "PLACE_BOMB";
      return;
    }
    this.tileX = next.x;
    this.tileY = next.y;
    this.position = { x: next.x, y: next.y };

    if (this.path.length === 0) this.state = "PLACE_BOMB";
  }

  private placeBomb(world: World): void {
    if (!this.currentTarget) {
      this.state = "SEEK_TARGET";
      return;
    }
    const radius = RADIUS_BY_TILE_TYPE[this.currentTarget.type] ?? 1;
    const bombPosition: Vec2 = { x: this.currentTarget.gridX, y: this.currentTarget.gridY };
    const bomb = new Bomb(bombPosition, radius);
    world.add(bomb);
    this.activeBomb = bomb;
    this.state = "RETREAT";
  }

  /** Steps to whichever adjacent walkable tile is farthest from the bomb, so the player clears the blast radius. */
  private retreat(): void {
    if (!this.currentTarget) {
      this.state = "WAIT_FOR_EXPLOSION";
      return;
    }
    const bombPos = { x: this.currentTarget.gridX, y: this.currentTarget.gridY };
    const here = { x: this.tileX, y: this.tileY };

    const currentDist = vec2Distance(here, bombPos);
    const candidates = this.tileMap
      .neighbors(this.tileX, this.tileY)
      .filter((t) => this.tileMap.isWalkable(t.gridX, t.gridY));

    let bestCandidate: Tile | undefined;
    let bestDist = currentDist;
    for (const c of candidates) {
      const d = vec2Distance({ x: c.gridX, y: c.gridY }, bombPos);
      if (d > bestDist) {
        bestDist = d;
        bestCandidate = c;
      }
    }

    if (bestCandidate) {
      this.tileX = bestCandidate.gridX;
      this.tileY = bestCandidate.gridY;
      this.position = { x: bestCandidate.gridX, y: bestCandidate.gridY };
    }
    // Whether or not we moved further away, the bomb's own fuse timer is
    // what actually gates safety — this just makes the player visually
    // scurry off rather than standing still next to the blast.
    this.state = "WAIT_FOR_EXPLOSION";
  }

  render(ctx: RenderContext, camera: Camera): void {
    drawSprite(ctx, camera, this.position, PLAYER_SPRITE);
  }
}
