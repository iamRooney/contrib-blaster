// src/index.ts
import { appendFileSync } from "node:fs";

// src/github/graph.ts
var QUERY = `
  query($login: String!) {
    user(login: $login) {
      contributionsCollection {
        contributionCalendar {
          weeks {
            contributionDays {
              date
              contributionCount
            }
          }
        }
      }
    }
  }
`;
var GitHubFetchError = class extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
    this.name = "GitHubFetchError";
  }
  status;
};
async function fetchContributionGrid(login, token) {
  if (!login) throw new GitHubFetchError("fetchContributionGrid: `login` is required");
  if (!token) throw new GitHubFetchError("fetchContributionGrid: `token` is required");
  let res;
  try {
    res = await fetch("https://api.github.com/graphql", {
      method: "POST",
      headers: {
        Authorization: `bearer ${token}`,
        "Content-Type": "application/json",
        "User-Agent": "contrib-blaster-action"
      },
      body: JSON.stringify({ query: QUERY, variables: { login } })
    });
  } catch (err) {
    throw new GitHubFetchError(
      `Network error contacting GitHub GraphQL API: ${err instanceof Error ? err.message : String(err)}`
    );
  }
  if (!res.ok) {
    const bodyText = await safeReadText(res);
    throw new GitHubFetchError(
      `GitHub GraphQL API returned ${res.status} ${res.statusText}: ${bodyText}`,
      res.status
    );
  }
  const json = await res.json();
  if (json.errors && json.errors.length > 0) {
    throw new GitHubFetchError(`GitHub GraphQL API error: ${json.errors.map((e) => e.message).join("; ")}`);
  }
  const weeks = json.data?.user?.contributionsCollection?.contributionCalendar?.weeks;
  if (!weeks) {
    throw new GitHubFetchError(
      `GitHub GraphQL API response missing expected contribution calendar data for login "${login}". Double-check the login is correct and the token has read access.`
    );
  }
  return normalizeGraphQLWeeks(weeks);
}
function normalizeGraphQLWeeks(weeks) {
  return {
    weeks: weeks.map(
      (week) => week.contributionDays.map((day) => ({
        date: day.date,
        count: day.contributionCount
      }))
    )
  };
}
async function safeReadText(res) {
  try {
    return await res.text();
  } catch {
    return "(no response body)";
  }
}

// src/engine/scene-manager.ts
var registry = /* @__PURE__ */ new Map();
function registerAnimation(name, factory) {
  registry.set(name, factory);
}
function createScene(name, grid) {
  const factory = registry.get(name);
  if (!factory) {
    const available = [...registry.keys()].join(", ") || "(none registered)";
    throw new Error(`Unknown animation: "${name}". Available: ${available}`);
  }
  return factory(grid);
}

// src/engine/tilemap.ts
function tileTypeForCount(count) {
  if (count <= 0) return "floor" /* Floor */;
  if (count <= 3) return "weak_crate" /* WeakCrate */;
  if (count <= 9) return "strong_crate" /* StrongCrate */;
  return "reinforced_crate" /* ReinforcedCrate */;
}
var TileMap = class _TileMap {
  width;
  height;
  tiles;
  constructor(width, height, tiles) {
    this.width = width;
    this.height = height;
    this.tiles = tiles;
  }
  static fromContributionGrid(grid) {
    const width = grid.weeks.length;
    const height = width > 0 ? grid.weeks[0]?.length ?? 7 : 7;
    const tiles = [];
    for (let y = 0; y < height; y++) {
      const row = [];
      for (let x = 0; x < width; x++) {
        const day = grid.weeks[x]?.[y];
        const count = day?.count ?? 0;
        row.push({
          type: tileTypeForCount(count),
          gridX: x,
          gridY: y,
          contributionCount: count,
          date: day?.date ?? "",
          cleared: false
        });
      }
      tiles.push(row);
    }
    const map = new _TileMap(width, height, tiles);
    applyStructuralPattern(map);
    return map;
  }
  inBounds(x, y) {
    return x >= 0 && x < this.width && y >= 0 && y < this.height;
  }
  getTile(x, y) {
    return this.inBounds(x, y) ? this.tiles[y]?.[x] : void 0;
  }
  /** 4-directional neighbors, bounds-checked. */
  neighbors(x, y) {
    const deltas = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1]
    ];
    const result = [];
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
  isWalkable(x, y) {
    const t = this.getTile(x, y);
    if (!t) return false;
    if (t.type === "metal_block" /* MetalBlock */) return false;
    return t.type === "floor" /* Floor */ || t.cleared;
  }
  /** All tiles within Chebyshev-ish 4-directional blast radius, for explosion propagation. */
  tilesInRadius(center, radius) {
    const result = [];
    const cx = Math.round(center.x);
    const cy = Math.round(center.y);
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        if (Math.abs(dx) + Math.abs(dy) > radius) continue;
        const t = this.getTile(cx + dx, cy + dy);
        if (t) result.push(t);
      }
    }
    return result;
  }
  /** Resets every crate tile back to un-cleared, for a new loop. Does not touch MetalBlock/Floor. */
  resetClearedTiles() {
    for (const row of this.tiles) {
      for (const tile of row) {
        tile.cleared = false;
      }
    }
  }
};
function applyStructuralPattern(map) {
  for (let y = 0; y < map.height; y++) {
    for (let x = 0; x < map.width; x++) {
      const tile = map.tiles[y]?.[x];
      if (!tile) continue;
      const isPillarPosition = x % 2 === 1 && y % 2 === 1;
      if (isPillarPosition && tile.type === "floor" /* Floor */) {
        tile.type = "metal_block" /* MetalBlock */;
      }
    }
  }
}

// src/engine/entity.ts
var nextEntityId = 0;
var Entity = class {
  id;
  position;
  zIndex;
  alive;
  constructor(position, zIndex = 0) {
    this.id = nextEntityId++;
    this.position = position;
    this.zIndex = zIndex;
    this.alive = true;
  }
  /** Marks this entity for removal at the end of the current World.update(). */
  destroy() {
    this.alive = false;
  }
};

// src/engine/types.ts
function vec2Distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

// src/engine/pathfinding.ts
function findPath(map, from, to) {
  if (from.x === to.x && from.y === to.y) return [];
  const key = (p) => `${p.x},${p.y}`;
  const queue = [from];
  const cameFrom = /* @__PURE__ */ new Map();
  const visited = /* @__PURE__ */ new Set([key(from)]);
  while (queue.length > 0) {
    const current = queue.shift();
    if (current.x === to.x && current.y === to.y) {
      return reconstruct(cameFrom, from, current, key);
    }
    for (const neighborTile of map.neighbors(current.x, current.y)) {
      const next = { x: neighborTile.gridX, y: neighborTile.gridY };
      const k = key(next);
      if (visited.has(k)) continue;
      const isDestination = next.x === to.x && next.y === to.y;
      if (!isDestination && !map.isWalkable(next.x, next.y)) continue;
      visited.add(k);
      cameFrom.set(k, current);
      queue.push(next);
    }
  }
  return [];
}
function reconstruct(cameFrom, from, to, key) {
  const path = [to];
  let current = to;
  while (!(current.x === from.x && current.y === from.y)) {
    const prev = cameFrom.get(key(current));
    if (!prev) break;
    path.unshift(prev);
    current = prev;
  }
  path.shift();
  return path;
}

// src/engine/components.ts
function isDestructible(e) {
  return typeof e.onExplosionHit === "function";
}
function isTileOccupant(e) {
  return typeof e.tileX === "number" && typeof e.tileY === "number";
}

// src/animations/bomber/explosion.ts
var VISUAL_DURATION_TICKS = 6;
var Explosion = class extends Entity {
  radius;
  ticksRemaining = VISUAL_DURATION_TICKS;
  hasAppliedDamage = false;
  /** Set to true once damage has been applied — Player state machine polls this. */
  resolved = false;
  constructor(center, radius) {
    super(
      center,
      /* zIndex */
      5
    );
    this.radius = radius;
  }
  update(_dt, world) {
    if (!this.hasAppliedDamage) {
      this.applyDamage(world);
      this.hasAppliedDamage = true;
      this.resolved = true;
    }
    if (--this.ticksRemaining <= 0) this.destroy();
  }
  applyDamage(world) {
    const tileMap = world.tileMap;
    const affectedTiles = tileMap.tilesInRadius(this.position, this.radius);
    const affectedCoords = new Set(affectedTiles.map((t) => `${t.gridX},${t.gridY}`));
    for (const entity of world.entities) {
      if (!isTileOccupant(entity) || !isDestructible(entity)) continue;
      if (affectedCoords.has(`${entity.tileX},${entity.tileY}`)) {
        entity.onExplosionHit(1);
      }
    }
  }
  render(ctx, camera) {
    const screen = camera.worldToScreen(this.position);
    ctx.fillStyle = "#ff6b35";
    ctx.fillRect(
      screen.x - camera.zoom * this.radius,
      screen.y - camera.zoom * this.radius,
      camera.zoom * (this.radius * 2 + 1),
      camera.zoom * (this.radius * 2 + 1)
    );
  }
};

// src/animations/bomber/bomb.ts
var DEFAULT_FUSE_TICKS = 10;
var Bomb = class extends Entity {
  fuseTicks;
  radius;
  /** The Explosion this bomb spawns, once it detonates — Player polls this to know when it's safe to advance. */
  spawnedExplosion;
  constructor(position, radius, fuseTicks = DEFAULT_FUSE_TICKS) {
    super(
      position,
      /* zIndex */
      4
    );
    this.radius = radius;
    this.fuseTicks = fuseTicks;
  }
  update(_dt, world) {
    this.fuseTicks -= 1;
    if (this.fuseTicks <= 0) {
      const explosion = new Explosion(this.position, this.radius);
      world.add(explosion);
      this.spawnedExplosion = explosion;
      this.destroy();
    }
  }
  render(ctx, camera) {
    const screen = camera.worldToScreen(this.position);
    ctx.fillStyle = "#2b2b2b";
    ctx.fillRect(screen.x, screen.y, camera.zoom, camera.zoom);
  }
};

// src/animations/bomber/player.ts
var TICKS_PER_TILE_STEP = 2;
var RADIUS_BY_TILE_TYPE = {
  ["weak_crate" /* WeakCrate */]: 1,
  ["strong_crate" /* StrongCrate */]: 1,
  ["reinforced_crate" /* ReinforcedCrate */]: 2
};
var Player = class extends Entity {
  tileX;
  tileY;
  state = "SEEK_TARGET";
  tileMap;
  targetQueue;
  currentTarget;
  path = [];
  stepTicks = 0;
  activeBomb;
  /** True once the target queue is exhausted (all reachable targets bombed) and the player is idle. */
  finished = false;
  constructor(startX, startY, tileMap, targetQueue) {
    super(
      { x: startX, y: startY },
      /* zIndex */
      10
    );
    this.tileX = startX;
    this.tileY = startY;
    this.tileMap = tileMap;
    this.targetQueue = targetQueue;
  }
  update(_dt, world) {
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
          this.activeBomb = void 0;
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
  seekTarget() {
    const maxAttempts = this.targetQueue.remaining() + 1;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const target = this.targetQueue.next();
      if (!target) break;
      const approach = this.findApproachTile(target);
      if (approach) {
        const path = findPath(this.tileMap, { x: this.tileX, y: this.tileY }, approach);
        this.currentTarget = target;
        this.path = path;
        this.finished = false;
        this.state = "MOVE_TO_TARGET";
        return;
      }
      this.targetQueue.pushBack(target);
    }
    this.finished = true;
  }
  findApproachTile(target) {
    const walkableNeighbors = this.tileMap.neighbors(target.gridX, target.gridY).filter((t) => this.tileMap.isWalkable(t.gridX, t.gridY));
    if (walkableNeighbors.length === 0) return null;
    let best = walkableNeighbors[0];
    let bestDist = vec2Distance({ x: this.tileX, y: this.tileY }, { x: best.gridX, y: best.gridY });
    for (const candidate of walkableNeighbors.slice(1)) {
      const dist = vec2Distance(
        { x: this.tileX, y: this.tileY },
        { x: candidate.gridX, y: candidate.gridY }
      );
      if (dist < bestDist) {
        best = candidate;
        bestDist = dist;
      }
    }
    return { x: best.gridX, y: best.gridY };
  }
  followPath() {
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
  placeBomb(world) {
    if (!this.currentTarget) {
      this.state = "SEEK_TARGET";
      return;
    }
    const radius = RADIUS_BY_TILE_TYPE[this.currentTarget.type] ?? 1;
    const bombPosition = { x: this.currentTarget.gridX, y: this.currentTarget.gridY };
    const bomb = new Bomb(bombPosition, radius);
    world.add(bomb);
    this.activeBomb = bomb;
    this.state = "RETREAT";
  }
  /** Steps to whichever adjacent walkable tile is farthest from the bomb, so the player clears the blast radius. */
  retreat() {
    if (!this.currentTarget) {
      this.state = "WAIT_FOR_EXPLOSION";
      return;
    }
    const bombPos = { x: this.currentTarget.gridX, y: this.currentTarget.gridY };
    const here = { x: this.tileX, y: this.tileY };
    const currentDist = vec2Distance(here, bombPos);
    const candidates = this.tileMap.neighbors(this.tileX, this.tileY).filter((t) => this.tileMap.isWalkable(t.gridX, t.gridY));
    let bestCandidate;
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
    this.state = "WAIT_FOR_EXPLOSION";
  }
  render(ctx, camera) {
    const screen = camera.worldToScreen(this.position);
    ctx.fillStyle = "#3a86ff";
    ctx.fillRect(screen.x, screen.y, camera.zoom, camera.zoom);
  }
};

// src/animations/bomber/crate.ts
var HP_BY_TILE_TYPE = {
  ["weak_crate" /* WeakCrate */]: 1,
  ["strong_crate" /* StrongCrate */]: 2,
  ["reinforced_crate" /* ReinforcedCrate */]: 3
};
var Crate = class extends Entity {
  tileX;
  tileY;
  hp;
  tile;
  constructor(tile) {
    super({ x: tile.gridX, y: tile.gridY });
    this.tile = tile;
    this.tileX = tile.gridX;
    this.tileY = tile.gridY;
    this.hp = HP_BY_TILE_TYPE[tile.type] ?? 1;
  }
  onExplosionHit(damage) {
    this.hp -= damage;
    if (this.hp <= 0) {
      this.tile.cleared = true;
      this.destroy();
    }
  }
  update(_dt, _world) {
  }
  render(ctx, camera) {
    const screen = camera.worldToScreen(this.position);
    const colorByType = {
      ["weak_crate" /* WeakCrate */]: "#c9a86a",
      ["strong_crate" /* StrongCrate */]: "#a8763f",
      ["reinforced_crate" /* ReinforcedCrate */]: "#6b4a26"
    };
    ctx.fillStyle = colorByType[this.tile.type] ?? "#888888";
    ctx.fillRect(screen.x, screen.y, camera.zoom, camera.zoom);
  }
};

// src/animations/bomber/target-queue.ts
var TargetQueue = class {
  queue = [];
  constructor(tileMap) {
    this.rebuild(tileMap);
  }
  /** Rebuilds the queue from the tile map's current state — called on scene reset. */
  rebuild(tileMap) {
    this.queue = tileMap.tiles.flat().filter((t) => t.contributionCount > 0 && !t.cleared).sort((a, b) => b.contributionCount - a.contributionCount);
  }
  /** Pops and returns the highest-remaining-contribution tile, or undefined if empty. */
  next() {
    return this.queue.shift();
  }
  /**
   * Re-appends a tile that couldn't be reached this attempt. Used when a
   * target is currently walled off — reachability can change later once a
   * neighboring crate gets cleared, so we retry rather than give up on it
   * permanently.
   */
  pushBack(tile) {
    this.queue.push(tile);
  }
  isEmpty() {
    return this.queue.length === 0;
  }
  remaining() {
    return this.queue.length;
  }
};

// src/animations/bomber/scene.ts
var BomberScene = class {
  tileMap;
  targetQueue;
  player;
  constructor(contributionGrid) {
    this.tileMap = TileMap.fromContributionGrid(contributionGrid);
  }
  init(world) {
    world.tileMap = this.tileMap;
    this.spawnCrates(world);
    this.targetQueue = new TargetQueue(this.tileMap);
    const spawn2 = this.findPlayerSpawn();
    this.player = new Player(spawn2.x, spawn2.y, this.tileMap, this.targetQueue);
    world.add(this.player);
  }
  update(dt2, world) {
    world.update(dt2);
  }
  render(ctx, camera, world) {
    this.drawBackground(ctx, camera);
    const sorted = [...world.entities].sort((a, b) => a.zIndex - b.zIndex);
    for (const entity of sorted) entity.render(ctx, camera);
  }
  isComplete(_world) {
    return this.player?.finished ?? false;
  }
  reset(world) {
    this.tileMap.resetClearedTiles();
    world.clearEntities();
    this.spawnCrates(world);
    this.targetQueue.rebuild(this.tileMap);
    const spawn2 = this.findPlayerSpawn();
    this.player = new Player(spawn2.x, spawn2.y, this.tileMap, this.targetQueue);
    world.add(this.player);
  }
  spawnCrates(world) {
    for (const row of this.tileMap.tiles) {
      for (const tile of row) {
        if (tile.type !== "floor" /* Floor */ && tile.type !== "metal_block" /* MetalBlock */) {
          world.add(new Crate(tile));
        }
      }
    }
  }
  /**
   * Player always starts at the first walkable (Floor) tile found scanning
   * top-left to bottom-right. Contribution graphs almost always have at
   * least one zero-contribution day, and even in the rare all-green-square
   * case, (0,0) itself is fine to spawn on since Entity start position
   * isn't required to be walkable (see pathfinding.ts) — the player just
   * immediately paths off of it toward its first target.
   */
  findPlayerSpawn() {
    for (let y = 0; y < this.tileMap.height; y++) {
      for (let x = 0; x < this.tileMap.width; x++) {
        if (this.tileMap.isWalkable(x, y)) return { x, y };
      }
    }
    return { x: 0, y: 0 };
  }
  drawBackground(ctx, camera) {
    for (let y = 0; y < this.tileMap.height; y++) {
      for (let x = 0; x < this.tileMap.width; x++) {
        const screen = camera.worldToScreen({ x, y });
        ctx.fillStyle = "#e8e8e8";
        ctx.fillRect(screen.x, screen.y, camera.zoom, camera.zoom);
      }
    }
  }
};

// src/animations/bomber/index.ts
registerAnimation("bomber", (grid) => new BomberScene(grid));

// src/engine/random.ts
var SeededRandom = class {
  state;
  constructor(seed) {
    this.state = seed >>> 0;
  }
  /** Returns a float in [0, 1). */
  next() {
    this.state |= 0;
    this.state = this.state + 1831565813 | 0;
    let t = Math.imul(this.state ^ this.state >>> 15, 1 | this.state);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
  /** Returns an integer in [min, max]. */
  nextInt(min, max) {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }
  /** Picks a random element from a non-empty array. */
  pick(items) {
    if (items.length === 0) {
      throw new Error("SeededRandom.pick called with an empty array");
    }
    const idx = this.nextInt(0, items.length - 1);
    return items[idx];
  }
};

// src/engine/world.ts
var World = class {
  entities = [];
  tileMap = null;
  rng;
  constructor(seed) {
    this.rng = new SeededRandom(seed);
  }
  add(entity) {
    this.entities.push(entity);
  }
  /** Runs update() on every live entity, then sweeps dead ones out. */
  update(dt2) {
    for (const entity of this.entities) {
      if (entity.alive) entity.update(dt2, this);
    }
    this.entities = this.entities.filter((e) => e.alive);
  }
  /** Removes every entity and resets nothing else — Scene.reset() decides what gets rebuilt. */
  clearEntities() {
    this.entities = [];
  }
  find(predicate) {
    return this.entities.filter(predicate);
  }
};

// src/engine/timeline.ts
var DEFAULT_TIMELINE_OPTIONS = {
  fps: 24,
  ticksPerSecond: 60,
  maxLoops: 1,
  // A full year's contribution grid can have 200-300+ target tiles even at
  // the speed-tuned pace (see animations/bomber/player.ts, bomb.ts). Measured
  // ~3700 frames for a realistic 272-contribution-day grid — this cap gives
  // real headroom above that rather than silently truncating typical runs.
  maxFrames: 6e3
};
var Timeline = class {
  frameCount = 0;
  loopCount = 0;
  tickCount = 0;
  async run(scene, world, captureFrame, encoder, options = {}) {
    const opts = { ...DEFAULT_TIMELINE_OPTIONS, ...options };
    const dt2 = 1 / opts.ticksPerSecond;
    const ticksPerFrame = Math.max(1, Math.round(opts.ticksPerSecond / opts.fps));
    this.frameCount = 0;
    this.loopCount = 0;
    this.tickCount = 0;
    while (this.loopCount < opts.maxLoops && this.frameCount < opts.maxFrames) {
      scene.update(dt2, world);
      this.tickCount++;
      if (this.tickCount % ticksPerFrame === 0) {
        const buffer = captureFrame();
        await encoder.pushFrame(buffer);
        this.frameCount++;
      }
      if (scene.isComplete(world)) {
        scene.reset(world);
        this.loopCount++;
      }
    }
    await encoder.finalize();
    return {
      frameCount: this.frameCount,
      loopCount: this.loopCount,
      hitMaxFrames: this.frameCount >= opts.maxFrames
    };
  }
};

// src/engine/camera.ts
var Camera = class {
  x;
  y;
  zoom;
  constructor(x = 0, y = 0, zoom = 1) {
    this.x = x;
    this.y = y;
    this.zoom = zoom;
  }
  worldToScreen(pos) {
    return {
      x: (pos.x - this.x) * this.zoom,
      y: (pos.y - this.y) * this.zoom
    };
  }
  reset(x = 0, y = 0, zoom = 1) {
    this.x = x;
    this.y = y;
    this.zoom = zoom;
  }
};

// src/render/pixel-canvas.ts
var PixelCanvas = class {
  width;
  height;
  pixels;
  // RGBA, row-major
  fillStyle = "#000000";
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.pixels = new Uint8ClampedArray(width * height * 4);
  }
  clearRect(x, y, w, h) {
    this.fillRectWithColor(x, y, w, h, [0, 0, 0, 0]);
  }
  fillRect(x, y, w, h) {
    this.fillRectWithColor(x, y, w, h, hexToRgba(this.fillStyle));
  }
  fillRectWithColor(x, y, w, h, [r, g, b, a]) {
    const x0 = Math.max(0, Math.floor(x));
    const y0 = Math.max(0, Math.floor(y));
    const x1 = Math.min(this.width, Math.ceil(x + w));
    const y1 = Math.min(this.height, Math.ceil(y + h));
    for (let py = y0; py < y1; py++) {
      for (let px = x0; px < x1; px++) {
        const i = (py * this.width + px) * 4;
        this.pixels[i] = r;
        this.pixels[i + 1] = g;
        this.pixels[i + 2] = b;
        this.pixels[i + 3] = a;
      }
    }
  }
  drawImage(..._args) {
  }
  save() {
  }
  restore() {
  }
  translate(_x, _y) {
  }
  /** Returns a copy of the raw RGBA buffer, e.g. for handing to a GIF/PNG encoder. */
  toRGBA() {
    return this.pixels.slice();
  }
};
function hexToRgba(hex) {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return [r, g, b, 255];
}

// node_modules/gifenc/dist/gifenc.esm.js
var X = { signature: "GIF", version: "89a", trailer: 59, extensionIntroducer: 33, applicationExtensionLabel: 255, graphicControlExtensionLabel: 249, imageSeparator: 44, signatureSize: 3, versionSize: 3, globalColorTableFlagMask: 128, colorResolutionMask: 112, sortFlagMask: 8, globalColorTableSizeMask: 7, applicationIdentifierSize: 8, applicationAuthCodeSize: 3, disposalMethodMask: 28, userInputFlagMask: 2, transparentColorFlagMask: 1, localColorTableFlagMask: 128, interlaceFlagMask: 64, idSortFlagMask: 32, localColorTableSizeMask: 7 };
function F(t = 256) {
  let e = 0, s = new Uint8Array(t);
  return { get buffer() {
    return s.buffer;
  }, reset() {
    e = 0;
  }, bytesView() {
    return s.subarray(0, e);
  }, bytes() {
    return s.slice(0, e);
  }, writeByte(r) {
    n(e + 1), s[e] = r, e++;
  }, writeBytes(r, o = 0, i = r.length) {
    n(e + i);
    for (let c = 0; c < i; c++) s[e++] = r[c + o];
  }, writeBytesView(r, o = 0, i = r.byteLength) {
    n(e + i), s.set(r.subarray(o, o + i), e), e += i;
  } };
  function n(r) {
    var o = s.length;
    if (o >= r) return;
    var i = 1024 * 1024;
    r = Math.max(r, o * (o < i ? 2 : 1.125) >>> 0), o != 0 && (r = Math.max(r, 256));
    let c = s;
    s = new Uint8Array(r), e > 0 && s.set(c.subarray(0, e), 0);
  }
}
var O = 12;
var J = 5003;
var lt = [0, 1, 3, 7, 15, 31, 63, 127, 255, 511, 1023, 2047, 4095, 8191, 16383, 32767, 65535];
function at(t, e, s, n, r = F(512), o = new Uint8Array(256), i = new Int32Array(J), c = new Int32Array(J)) {
  let x = i.length, a = Math.max(2, n);
  o.fill(0), c.fill(0), i.fill(-1);
  let l = 0, f = 0, g = a + 1, h = g, b = false, w = h, _ = (1 << w) - 1, u = 1 << g - 1, k = u + 1, B = u + 2, p = 0, A = s[0], z = 0;
  for (let y = x; y < 65536; y *= 2) ++z;
  z = 8 - z, r.writeByte(a), I(u);
  let d = s.length;
  for (let y = 1; y < d; y++) {
    t: {
      let m = s[y], v = (m << O) + A, M = m << z ^ A;
      if (i[M] === v) {
        A = c[M];
        break t;
      }
      let V = M === 0 ? 1 : x - M;
      for (; i[M] >= 0; ) if (M -= V, M < 0 && (M += x), i[M] === v) {
        A = c[M];
        break t;
      }
      I(A), A = m, B < 1 << O ? (c[M] = B++, i[M] = v) : (i.fill(-1), B = u + 2, b = true, I(u));
    }
  }
  return I(A), I(k), r.writeByte(0), r.bytesView();
  function I(y) {
    for (l &= lt[f], f > 0 ? l |= y << f : l = y, f += w; f >= 8; ) o[p++] = l & 255, p >= 254 && (r.writeByte(p), r.writeBytesView(o, 0, p), p = 0), l >>= 8, f -= 8;
    if ((B > _ || b) && (b ? (w = h, _ = (1 << w) - 1, b = false) : (++w, _ = w === O ? 1 << w : (1 << w) - 1)), y == k) {
      for (; f > 0; ) o[p++] = l & 255, p >= 254 && (r.writeByte(p), r.writeBytesView(o, 0, p), p = 0), l >>= 8, f -= 8;
      p > 0 && (r.writeByte(p), r.writeBytesView(o, 0, p), p = 0);
    }
  }
}
var $ = at;
function D(t, e, s) {
  return t << 8 & 63488 | e << 2 & 992 | s >> 3;
}
function G(t, e, s, n) {
  return t >> 4 | e & 240 | (s & 240) << 4 | (n & 240) << 8;
}
function j(t, e, s) {
  return t >> 4 << 8 | e & 240 | s >> 4;
}
function R(t, e, s) {
  return t < e ? e : t > s ? s : t;
}
function T(t) {
  return t * t;
}
function tt(t, e, s) {
  var n = 0, r = 1e100;
  let o = t[e], i = o.cnt, c = o.ac, x = o.rc, a = o.gc, l = o.bc;
  for (var f = o.fw; f != 0; f = t[f].fw) {
    let h = t[f], b = h.cnt, w = i * b / (i + b);
    if (!(w >= r)) {
      var g = 0;
      s && (g += w * T(h.ac - c), g >= r) || (g += w * T(h.rc - x), !(g >= r) && (g += w * T(h.gc - a), !(g >= r) && (g += w * T(h.bc - l), !(g >= r) && (r = g, n = f))));
    }
  }
  o.err = r, o.nn = n;
}
function Q() {
  return { ac: 0, rc: 0, gc: 0, bc: 0, cnt: 0, nn: 0, fw: 0, bk: 0, tm: 0, mtm: 0, err: 0 };
}
function ut(t, e) {
  let s = e === "rgb444" ? 4096 : 65536, n = new Array(s), r = t.length;
  if (e === "rgba4444") for (let o = 0; o < r; ++o) {
    let i = t[o], c = i >> 24 & 255, x = i >> 16 & 255, a = i >> 8 & 255, l = i & 255, f = G(l, a, x, c), g = f in n ? n[f] : n[f] = Q();
    g.rc += l, g.gc += a, g.bc += x, g.ac += c, g.cnt++;
  }
  else if (e === "rgb444") for (let o = 0; o < r; ++o) {
    let i = t[o], c = i >> 16 & 255, x = i >> 8 & 255, a = i & 255, l = j(a, x, c), f = l in n ? n[l] : n[l] = Q();
    f.rc += a, f.gc += x, f.bc += c, f.cnt++;
  }
  else for (let o = 0; o < r; ++o) {
    let i = t[o], c = i >> 16 & 255, x = i >> 8 & 255, a = i & 255, l = D(a, x, c), f = l in n ? n[l] : n[l] = Q();
    f.rc += a, f.gc += x, f.bc += c, f.cnt++;
  }
  return n;
}
function H(t, e, s = {}) {
  let { format: n = "rgb565", clearAlpha: r = true, clearAlphaColor: o = 0, clearAlphaThreshold: i = 0, oneBitAlpha: c = false } = s;
  if (!t || !t.buffer) throw new Error("quantize() expected RGBA Uint8Array data");
  if (!(t instanceof Uint8Array) && !(t instanceof Uint8ClampedArray)) throw new Error("quantize() expected RGBA Uint8Array data");
  let x = new Uint32Array(t.buffer), a = s.useSqrt !== false, l = n === "rgba4444", f = ut(x, n), g = f.length, h = g - 1, b = new Uint32Array(g + 1);
  for (var w = 0, u = 0; u < g; ++u) {
    let C = f[u];
    if (C != null) {
      var _ = 1 / C.cnt;
      l && (C.ac *= _), C.rc *= _, C.gc *= _, C.bc *= _, f[w++] = C;
    }
  }
  T(e) / w < 0.022 && (a = false);
  for (var u = 0; u < w - 1; ++u) f[u].fw = u + 1, f[u + 1].bk = u, a && (f[u].cnt = Math.sqrt(f[u].cnt));
  a && (f[u].cnt = Math.sqrt(f[u].cnt));
  var k, B, p;
  for (u = 0; u < w; ++u) {
    tt(f, u, false);
    var A = f[u].err;
    for (B = ++b[0]; B > 1 && (p = B >> 1, !(f[k = b[p]].err <= A)); B = p) b[B] = k;
    b[B] = u;
  }
  var z = w - e;
  for (u = 0; u < z; ) {
    for (var d; ; ) {
      var I = b[1];
      if (d = f[I], d.tm >= d.mtm && f[d.nn].mtm <= d.tm) break;
      d.mtm == h ? I = b[1] = b[b[0]--] : (tt(f, I, false), d.tm = u);
      var A = f[I].err;
      for (B = 1; (p = B + B) <= b[0] && (p < b[0] && f[b[p]].err > f[b[p + 1]].err && p++, !(A <= f[k = b[p]].err)); B = p) b[B] = k;
      b[B] = I;
    }
    var y = f[d.nn], m = d.cnt, v = y.cnt, _ = 1 / (m + v);
    l && (d.ac = _ * (m * d.ac + v * y.ac)), d.rc = _ * (m * d.rc + v * y.rc), d.gc = _ * (m * d.gc + v * y.gc), d.bc = _ * (m * d.bc + v * y.bc), d.cnt += y.cnt, d.mtm = ++u, f[y.bk].fw = y.fw, f[y.fw].bk = y.bk, y.mtm = h;
  }
  let M = [];
  var V = 0;
  for (u = 0; ; ++V) {
    let L = R(Math.round(f[u].rc), 0, 255), C = R(Math.round(f[u].gc), 0, 255), Y = R(Math.round(f[u].bc), 0, 255), E = 255;
    if (l) {
      if (E = R(Math.round(f[u].ac), 0, 255), c) {
        let st = typeof c == "number" ? c : 127;
        E = E <= st ? 0 : 255;
      }
      r && E <= i && (L = C = Y = o, E = 0);
    }
    let K = l ? [L, C, Y, E] : [L, C, Y];
    if (xt(M, K) || M.push(K), (u = f[u].fw) == 0) break;
  }
  return M;
}
function xt(t, e) {
  for (let s = 0; s < t.length; s++) {
    let n = t[s], r = n[0] === e[0] && n[1] === e[1] && n[2] === e[2], o = n.length >= 4 && e.length >= 4 ? n[3] === e[3] : true;
    if (r && o) return true;
  }
  return false;
}
function nt(t, e, s = "rgb565") {
  if (!t || !t.buffer) throw new Error("quantize() expected RGBA Uint8Array data");
  if (!(t instanceof Uint8Array) && !(t instanceof Uint8ClampedArray)) throw new Error("quantize() expected RGBA Uint8Array data");
  if (e.length > 256) throw new Error("applyPalette() only works with 256 colors or less");
  let n = new Uint32Array(t.buffer), r = n.length, o = s === "rgb444" ? 4096 : 65536, i = new Uint8Array(r), c = new Array(o), x = s === "rgba4444";
  if (s === "rgba4444") for (let a = 0; a < r; a++) {
    let l = n[a], f = l >> 24 & 255, g = l >> 16 & 255, h = l >> 8 & 255, b = l & 255, w = G(b, h, g, f), _ = w in c ? c[w] : c[w] = gt(b, h, g, f, e);
    i[a] = _;
  }
  else {
    let a = s === "rgb444" ? j : D;
    for (let l = 0; l < r; l++) {
      let f = n[l], g = f >> 16 & 255, h = f >> 8 & 255, b = f & 255, w = a(b, h, g), _ = w in c ? c[w] : c[w] = bt(b, h, g, e);
      i[l] = _;
    }
  }
  return i;
}
function gt(t, e, s, n, r) {
  let o = 0, i = 1e100;
  for (let c = 0; c < r.length; c++) {
    let x = r[c], a = x[3], l = q(a - n);
    if (l > i) continue;
    let f = x[0];
    if (l += q(f - t), l > i) continue;
    let g = x[1];
    if (l += q(g - e), l > i) continue;
    let h = x[2];
    l += q(h - s), !(l > i) && (i = l, o = c);
  }
  return o;
}
function bt(t, e, s, n) {
  let r = 0, o = 1e100;
  for (let i = 0; i < n.length; i++) {
    let c = n[i], x = c[0], a = q(x - t);
    if (a > o) continue;
    let l = c[1];
    if (a += q(l - e), a > o) continue;
    let f = c[2];
    a += q(f - s), !(a > o) && (o = a, r = i);
  }
  return r;
}
function q(t) {
  return t * t;
}
function ct(t = {}) {
  let { initialCapacity: e = 4096, auto: s = true } = t, n = F(e), r = 5003, o = new Uint8Array(256), i = new Int32Array(r), c = new Int32Array(r), x = false;
  return { reset() {
    n.reset(), x = false;
  }, finish() {
    n.writeByte(X.trailer);
  }, bytes() {
    return n.bytes();
  }, bytesView() {
    return n.bytesView();
  }, get buffer() {
    return n.buffer;
  }, get stream() {
    return n;
  }, writeHeader: a, writeFrame(l, f, g, h = {}) {
    let { transparent: b = false, transparentIndex: w = 0, delay: _ = 0, palette: u = null, repeat: k = 0, colorDepth: B = 8, dispose: p = -1 } = h, A = false;
    if (s ? x || (A = true, a(), x = true) : A = Boolean(h.first), f = Math.max(0, Math.floor(f)), g = Math.max(0, Math.floor(g)), A) {
      if (!u) throw new Error("First frame must include a { palette } option");
      pt(n, f, g, u, B), it(n, u), k >= 0 && dt(n, k);
    }
    let z = Math.round(_ / 10);
    wt(n, p, z, b, w);
    let d = Boolean(u) && !A;
    ht(n, f, g, d ? u : null), d && it(n, u), yt(n, l, f, g, B, o, i, c);
  } };
  function a() {
    ft(n, "GIF89a");
  }
}
function wt(t, e, s, n, r) {
  t.writeByte(33), t.writeByte(249), t.writeByte(4), r < 0 && (r = 0, n = false);
  var o, i;
  n ? (o = 1, i = 2) : (o = 0, i = 0), e >= 0 && (i = e & 7), i <<= 2;
  let c = 0;
  t.writeByte(0 | i | c | o), S(t, s), t.writeByte(r || 0), t.writeByte(0);
}
function pt(t, e, s, n, r = 8) {
  let o = 1, i = 0, c = Z(n.length) - 1, x = o << 7 | r - 1 << 4 | i << 3 | c, a = 0, l = 0;
  S(t, e), S(t, s), t.writeBytes([x, a, l]);
}
function dt(t, e) {
  t.writeByte(33), t.writeByte(255), t.writeByte(11), ft(t, "NETSCAPE2.0"), t.writeByte(3), t.writeByte(1), S(t, e), t.writeByte(0);
}
function it(t, e) {
  let s = 1 << Z(e.length);
  for (let n = 0; n < s; n++) {
    let r = [0, 0, 0];
    n < e.length && (r = e[n]), t.writeByte(r[0]), t.writeByte(r[1]), t.writeByte(r[2]);
  }
}
function ht(t, e, s, n) {
  if (t.writeByte(44), S(t, 0), S(t, 0), S(t, e), S(t, s), n) {
    let r = 0, o = 0, i = Z(n.length) - 1;
    t.writeByte(128 | r | o | 0 | i);
  } else t.writeByte(0);
}
function yt(t, e, s, n, r = 8, o, i, c) {
  $(s, n, e, r, t, o, i, c);
}
function S(t, e) {
  t.writeByte(e & 255), t.writeByte(e >> 8 & 255);
}
function ft(t, e) {
  for (var s = 0; s < e.length; s++) t.writeByte(e.charCodeAt(s));
}
function Z(t) {
  return Math.max(Math.ceil(Math.log2(t)), 1);
}

// src/render/gif-encoder.ts
import { writeFileSync } from "node:fs";
var GifFrameEncoder = class {
  encoder = ct();
  width;
  height;
  fpsDelayMs;
  outputPath;
  palette = null;
  constructor(outputPath, width, height, fps) {
    this.outputPath = outputPath;
    this.width = width;
    this.height = height;
    this.fpsDelayMs = Math.round(1e3 / fps);
  }
  pushFrame(rgba) {
    if (!this.palette) {
      this.palette = H(rgba, 256);
    }
    const indexed = nt(rgba, this.palette);
    this.encoder.writeFrame(indexed, this.width, this.height, {
      palette: this.palette,
      delay: this.fpsDelayMs
      // loop: 0 -> infinite loop, set once on the first frame is sufficient for gifenc.
    });
  }
  finalize() {
    this.encoder.finish();
    const bytes = this.encoder.bytes();
    writeFileSync(this.outputPath, Buffer.from(bytes));
  }
};

// src/render/ffmpeg-frame-encoder.ts
import { createRequire } from "node:module";
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync as writeFileSync2 } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
var require2 = createRequire(import.meta.url);
var cachedSharp;
function getSharp() {
  cachedSharp ??= require2("sharp");
  return cachedSharp;
}
var FfmpegFrameEncoder = class {
  width;
  height;
  fps;
  outputPath;
  tempDir;
  frameIndex = 0;
  constructor(outputPath, width, height, fps) {
    this.outputPath = outputPath;
    this.width = width;
    this.height = height;
    this.fps = fps;
    this.tempDir = mkdtempSync(join(tmpdir(), "contrib-blaster-frames-"));
  }
  async pushFrame(rgba) {
    const framePath = join(this.tempDir, `frame-${String(this.frameIndex).padStart(6, "0")}.png`);
    const png = await getSharp()(rgba, { raw: { width: this.width, height: this.height, channels: 4 } }).png().toBuffer();
    writeFileSync2(framePath, png);
    this.frameIndex++;
  }
  async finalize() {
    if (this.frameIndex === 0) {
      throw new Error(`${this.constructor.name}.finalize() called with zero frames captured`);
    }
    try {
      await this.runFfmpeg(this.buildArgs(join(this.tempDir, "frame-%06d.png")));
    } finally {
      rmSync(this.tempDir, { recursive: true, force: true });
    }
  }
  runFfmpeg(args) {
    return new Promise((resolve, reject) => {
      const proc = spawn("ffmpeg", args, { stdio: ["ignore", "ignore", "pipe"] });
      let stderr = "";
      proc.stderr.on("data", (chunk) => {
        stderr += chunk.toString();
      });
      proc.on("error", (err) => {
        reject(new Error(`Failed to launch ffmpeg (is it installed and on PATH?): ${err.message}`));
      });
      proc.on("close", (code) => {
        if (code === 0) resolve();
        else reject(new Error(`ffmpeg exited with code ${code}:
${stderr.slice(-2e3)}`));
      });
    });
  }
};

// src/render/webp-encoder.ts
var WebpFrameEncoder = class extends FfmpegFrameEncoder {
  buildArgs(inputPattern) {
    return [
      "-y",
      "-framerate",
      String(this.fps),
      "-i",
      inputPattern,
      "-loop",
      "0",
      // infinite loop
      "-lossless",
      "0",
      "-quality",
      "80",
      "-vsync",
      "0",
      this.outputPath
    ];
  }
};

// src/render/mp4-encoder.ts
var Mp4FrameEncoder = class extends FfmpegFrameEncoder {
  buildArgs(inputPattern) {
    return [
      "-y",
      "-framerate",
      String(this.fps),
      "-i",
      inputPattern,
      "-vf",
      // Even width/height required by yuv420p; pixel-art dims (tiles * tile size) can land odd.
      "pad=ceil(iw/2)*2:ceil(ih/2)*2",
      "-pix_fmt",
      "yuv420p",
      "-movflags",
      "+faststart",
      this.outputPath
    ];
  }
};

// src/cli.ts
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
var TILE_SIZE_PX = 12;
function createEncoder(format, outputPath, width, height, fps) {
  switch (format) {
    case "gif":
      return new GifFrameEncoder(outputPath, width, height, fps);
    case "webp":
      return new WebpFrameEncoder(outputPath, width, height, fps);
    case "mp4":
      return new Mp4FrameEncoder(outputPath, width, height, fps);
  }
}
async function run(grid, options) {
  mkdirSync(dirname(options.outputPath), { recursive: true });
  const scene = createScene(options.animation, grid);
  const world = new World(hashGridForSeed(grid));
  scene.init(world);
  const width = grid.weeks.length * TILE_SIZE_PX;
  const height = (grid.weeks[0]?.length ?? 7) * TILE_SIZE_PX;
  const camera = new Camera(0, 0, TILE_SIZE_PX);
  const canvas = new PixelCanvas(width, height);
  const encoder = createEncoder(options.format, options.outputPath, width, height, options.fps);
  const timeline = new Timeline();
  const result = await timeline.run(
    scene,
    world,
    () => {
      canvas.clearRect(0, 0, width, height);
      scene.render(canvas, camera, world);
      return Buffer.from(canvas.toRGBA());
    },
    encoder,
    { fps: options.fps, maxLoops: 1 }
  );
  console.log(
    `Wrote ${options.outputPath} (${options.format}) \u2014 ${result.frameCount} frames, ${result.loopCount} loop(s)` + (result.hitMaxFrames ? " (hit safety frame cap)" : "")
  );
}
function hashGridForSeed(grid) {
  let hash = 0;
  for (const week of grid.weeks) {
    for (const day of week) {
      hash = Math.imul(31, hash) + day.count | 0;
    }
  }
  return hash >>> 0;
}

// src/index.ts
function getInput(name, fallback) {
  const value = process.env[`INPUT_${name.toUpperCase()}`];
  if (value !== void 0 && value !== "") return value;
  if (fallback !== void 0) return fallback;
  throw new Error(`Missing required input: ${name}`);
}
function setFailed(message) {
  console.error(`::error::${message}`);
  process.exitCode = 1;
}
function setOutput(name, value) {
  const outputFile = process.env.GITHUB_OUTPUT;
  if (outputFile) {
    appendFileSync(outputFile, `${name}=${value}
`);
  } else {
    console.log(`output ${name}=${value}`);
  }
}
async function main() {
  try {
    const animation = getInput("animation", "bomber");
    const output = getInput("output", "gif");
    const outputPath = getInput("output-path", `./output/contrib-animation.${output}`);
    const fps = Number(getInput("fps", "24"));
    const token = getInput("github-token");
    const defaultLogin = process.env.GITHUB_REPOSITORY?.split("/")[0];
    const login = getInput("login", defaultLogin);
    if (!["gif", "webp", "mp4"].includes(output)) {
      setFailed(`Invalid "output" input: "${output}". Must be one of: gif, webp, mp4.`);
      return;
    }
    if (!Number.isFinite(fps) || fps <= 0) {
      setFailed(`Invalid "fps" input: "${fps}". Must be a positive number.`);
      return;
    }
    const grid = await fetchContributionGrid(login, token);
    await run(grid, { animation, outputPath, fps, format: output });
    setOutput("animation-path", outputPath);
  } catch (err) {
    if (err instanceof GitHubFetchError) {
      setFailed(`Failed to fetch contribution data: ${err.message}`);
    } else {
      setFailed(err instanceof Error ? err.message : String(err));
    }
  }
}
main();
