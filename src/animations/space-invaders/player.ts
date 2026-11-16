import { Entity } from "../../engine/entity.js";
import type { World } from "../../engine/world.js";
import type { Camera } from "../../engine/camera.js";
import type { RenderContext } from "../../engine/types.js";
import type { Vec2 } from "../../engine/types.js";
import type { TileOccupant } from "../../engine/components.js";
import { TileMap } from "../../engine/tilemap.js";

const MOVE_COOLDOWN = 4;
const SHOOT_COOLDOWN = 15;

// Use a simple duck-typing check instead of type predicate
function isInvader(entity: Entity): boolean {
  const e = entity as any;
  return typeof e.tileX === 'number' &&
         typeof e.tileY === 'number' &&
         typeof e.isDestroyed === 'function' &&
         typeof e.takeDamage === 'function';
}

export class SpacePlayer extends Entity implements TileOccupant {
  tileX: number;
  tileY: number;
  private readonly tileMap: TileMap;
  private moveCooldown = 0;
  private shootCooldown = 0;
  private hp = 3;
  private destroyed = false;

  constructor(startX: number, startY: number, tileMap: TileMap) {
    super({ x: startX, y: startY }, /* zIndex */ 10);
    this.tileX = startX;
    this.tileY = startY;
    this.tileMap = tileMap;
  }

  isDestroyed(): boolean {
    return this.destroyed;
  }

  takeDamage(): void {
    this.hp--;
    if (this.hp <= 0) {
      this.destroyed = true;
      this.destroy();
    }
  }

  update(dt: number, world: World): void {
    if (this.destroyed) return;

    if (this.moveCooldown > 0) this.moveCooldown--;
    if (this.shootCooldown > 0) this.shootCooldown--;

    this.autoPlay(world);
  }

  private autoPlay(world: World): void {
    const invaders = [...world.entities].filter(isInvader) as any[];
    if (invaders.length === 0) return;

    let closestInvader = invaders[0];
    let minDist = Math.abs(closestInvader.tileX - this.tileX);
    for (const inv of invaders.slice(1)) {
      const dist = Math.abs(inv.tileX - this.tileX);
      if (dist < minDist) {
        minDist = dist;
        closestInvader = inv;
      }
    }

    if (this.moveCooldown === 0) {
      if (closestInvader.tileX < this.tileX && this.tileMap.isWalkable(this.tileX - 1, this.tileY)) {
        this.tileX--;
        this.position = { x: this.tileX, y: this.tileY };
        this.moveCooldown = MOVE_COOLDOWN;
      } else if (closestInvader.tileX > this.tileX && this.tileMap.isWalkable(this.tileX + 1, this.tileY)) {
        this.tileX++;
        this.position = { x: this.tileX, y: this.tileY };
        this.moveCooldown = MOVE_COOLDOWN;
      }
    }

    if (this.shootCooldown === 0) {
      const aligned = invaders.some(inv => inv.tileX === this.tileX && inv.tileY > this.tileY);
      if (aligned) {
        this.shoot(world);
        this.shootCooldown = SHOOT_COOLDOWN;
      }
    }
  }

  private shoot(world: World): void {
    const bullet = new PlayerBullet({ x: this.tileX, y: this.tileY - 1 }, -1);
    world.add(bullet);
  }

  render(ctx: RenderContext, camera: Camera): void {
    if (this.destroyed) return;
    const screen = camera.worldToScreen(this.position);
    const tileSize = camera.zoom;

    ctx.fillStyle = "#4ec9b0";
    ctx.fillRect(screen.x + tileSize * 0.25, screen.y + tileSize * 0.5, tileSize * 0.5, tileSize * 0.4);
    ctx.fillStyle = "#2aa888";
    ctx.fillRect(screen.x + tileSize * 0.35, screen.y + tileSize * 0.2, tileSize * 0.3, tileSize * 0.35);
    ctx.fillStyle = "#4ec9b0";
    ctx.fillRect(screen.x, screen.y + tileSize * 0.6, tileSize * 0.2, tileSize * 0.3);
    ctx.fillRect(screen.x + tileSize * 0.8, screen.y + tileSize * 0.6, tileSize * 0.2, tileSize * 0.3);
    ctx.fillStyle = "#ffcc00";
    ctx.fillRect(screen.x + tileSize * 0.4, screen.y + tileSize * 0.9, tileSize * 0.2, tileSize * 0.1);
  }
}

class PlayerBullet extends Entity {
  private readonly direction: number;
  private life = 30;

  constructor(position: Vec2, direction: number) {
    super(position, /* zIndex */ 8);
    this.direction = direction;
  }

  update(_dt: number, world: World): void {
    this.life--;
    if (this.life <= 0) {
      this.destroy();
      return;
    }

    this.position.y += this.direction * 0.5;

    for (const entity of world.entities) {
      if (isInvader(entity) && !(entity as any).isDestroyed()) {
        if (Math.abs((entity as any).position.x - this.position.x) < 0.5 &&
            Math.abs((entity as any).position.y - this.position.y) < 0.5) {
          (entity as any).takeDamage();
          this.destroy();
          break;
        }
      }
    }

    const tileMap = world.tileMap as TileMap | null;
    if (this.position.y < 0 || this.position.y >= (tileMap?.height ?? 0)) {
      this.destroy();
    }
  }

  render(ctx: RenderContext, camera: Camera): void {
    const screen = camera.worldToScreen(this.position);
    ctx.fillStyle = "#ffff00";
    ctx.fillRect(screen.x + camera.zoom * 0.4, screen.y, camera.zoom * 0.2, camera.zoom * 0.5);
  }
}