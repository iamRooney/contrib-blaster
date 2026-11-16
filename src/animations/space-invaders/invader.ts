import { Entity } from "../../engine/entity.js";
import type { World } from "../../engine/world.js";
import type { Camera } from "../../engine/camera.js";
import type { RenderContext } from "../../engine/types.js";
import type { Vec2 } from "../../engine/types.js";
import type { TileOccupant, Destructible } from "../../engine/components.js";
import { TileMap, TileType, type Tile } from "../../engine/tilemap.js";

const MOVE_INTERVAL = 60;
const SHOOT_CHANCE = 0.002;

export class Invader extends Entity implements TileOccupant, Destructible {
  tileX: number;
  tileY: number;
  hp: number;
  private readonly tile: Tile;
  private readonly tileMap: TileMap;
  private moveTimer = 0;
  private moveDirection = 1;
  private destroyed = false;
  private readonly type: 'basic' | 'strong' | 'boss';

  constructor(tile: Tile, hp: number = 1, tileMap: TileMap) {
    super({ x: tile.gridX, y: tile.gridY }, /* zIndex */ 5);
    this.tile = tile;
    this.tileX = tile.gridX;
    this.tileY = tile.gridY;
    this.hp = hp;
    this.tileMap = tileMap;

    if (tile.contributionCount >= 10) {
      this.type = 'boss';
    } else if (tile.contributionCount >= 4) {
      this.type = 'strong';
    } else {
      this.type = 'basic';
    }
  }

  isDestroyed(): boolean {
    return this.destroyed;
  }

  onExplosionHit(damage: number): void {
    this.takeDamage(damage);
  }

  takeDamage(damage: number = 1): void {
    this.hp -= damage;
    if (this.hp <= 0) {
      this.destroyed = true;
      this.tile.cleared = true;
      this.destroy();
    }
  }

  update(dt: number, world: World): void {
    if (this.destroyed) return;

    this.moveTimer++;
    if (this.moveTimer >= MOVE_INTERVAL) {
      this.moveTimer = 0;
      this.tryMove(world);
    }

    if (Math.random() < SHOOT_CHANCE) {
      this.shoot(world);
    }
  }

  private tryMove(world: World): void {
    const newX = this.tileX + this.moveDirection;
    if (newX >= 0 && newX < this.tileMap.width && this.tileMap.isWalkable(newX, this.tileY)) {
      this.tileX = newX;
      this.position.x = newX;
    } else {
      this.moveDirection *= -1;
      const newY = this.tileY + 1;
      if (newY < this.tileMap.height && this.tileMap.isWalkable(this.tileX, newY)) {
        this.tileY = newY;
        this.position.y = newY;
      }
    }
  }

  private shoot(world: World): void {
    const bullet = new InvaderBullet({ x: this.tileX, y: this.tileY + 1 }, 1);
    world.add(bullet);
  }

  render(ctx: RenderContext, camera: Camera): void {
    if (this.destroyed) return;
    const screen = camera.worldToScreen(this.position);
    const tileSize = camera.zoom;

    let bodyColor: string;
    let detailColor: string;

    switch (this.type) {
      case 'boss':
        bodyColor = "#ff4444";
        detailColor = "#cc0000";
        break;
      case 'strong':
        bodyColor = "#ffaa00";
        detailColor = "#cc8800";
        break;
      default:
        bodyColor = "#66cc66";
        detailColor = "#44aa44";
    }

    ctx.fillStyle = bodyColor;

    if (this.type === 'boss') {
      ctx.fillRect(screen.x, screen.y, tileSize, tileSize);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(screen.x + tileSize * 0.2, screen.y + tileSize * 0.25, tileSize * 0.15, tileSize * 0.15);
      ctx.fillRect(screen.x + tileSize * 0.65, screen.y + tileSize * 0.25, tileSize * 0.15, tileSize * 0.15);
      ctx.fillStyle = detailColor;
      ctx.fillRect(screen.x + tileSize * 0.3, screen.y + tileSize * 0.6, tileSize * 0.4, tileSize * 0.1);
    } else if (this.type === 'strong') {
      ctx.fillRect(screen.x + tileSize * 0.1, screen.y, tileSize * 0.8, tileSize * 0.7);
      ctx.fillRect(screen.x + tileSize * 0.2, screen.y + tileSize * 0.7, tileSize * 0.2, tileSize * 0.3);
      ctx.fillRect(screen.x + tileSize * 0.6, screen.y + tileSize * 0.7, tileSize * 0.2, tileSize * 0.3);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(screen.x + tileSize * 0.25, screen.y + tileSize * 0.2, tileSize * 0.15, tileSize * 0.15);
      ctx.fillRect(screen.x + tileSize * 0.6, screen.y + tileSize * 0.2, tileSize * 0.15, tileSize * 0.15);
    } else {
      ctx.fillRect(screen.x + tileSize * 0.15, screen.y, tileSize * 0.7, tileSize * 0.6);
      ctx.fillRect(screen.x + tileSize * 0.2, screen.y + tileSize * 0.6, tileSize * 0.2, tileSize * 0.4);
      ctx.fillRect(screen.x + tileSize * 0.6, screen.y + tileSize * 0.6, tileSize * 0.2, tileSize * 0.4);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(screen.x + tileSize * 0.3, screen.y + tileSize * 0.15, tileSize * 0.12, tileSize * 0.12);
      ctx.fillRect(screen.x + tileSize * 0.58, screen.y + tileSize * 0.15, tileSize * 0.12, tileSize * 0.12);
    }
  }
}

class InvaderBullet extends Entity {
  private life = 40;
  private direction: number;

  constructor(position: Vec2, direction: number) {
    super(position, /* zIndex */ 6);
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
      if (typeof (entity as any).tileX === 'number' &&
          typeof (entity as any).tileY === 'number' &&
          typeof (entity as any).isDestroyed === 'function' &&
          typeof (entity as any).takeDamage === 'function' &&
          !(entity as any).isDestroyed()) {
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
    ctx.fillStyle = "#ff4444";
    ctx.fillRect(screen.x + camera.zoom * 0.4, screen.y, camera.zoom * 0.2, camera.zoom * 0.5);
  }
}