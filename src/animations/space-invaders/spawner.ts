import { Entity } from "../../engine/entity.js";
import type { World } from "../../engine/world.js";
import type { RenderContext } from "../../engine/types.js";
import type { Camera } from "../../engine/camera.js";
import { TileMap, TileType } from "../../engine/tilemap.js";
import { Invader } from "./invader.js";
import { SpacePlayer } from "./player.js";

export class InvaderSpawner extends Entity {
  private readonly tileMap: TileMap;
  private readonly player: SpacePlayer;
  private readonly world: World;
  private waveTimer = 0;
  private currentWave = 1;
  private waveDelay = 120; // Ticks between waves

  constructor(tileMap: TileMap, player: SpacePlayer, world: World) {
    super({ x: 0, y: 0 }, /* zIndex */ 0);
    this.tileMap = tileMap;
    this.player = player;
    this.world = world;
  }

  canSpawnNextWave(): boolean {
    return this.waveTimer <= 0;
  }

  spawnWave(wave: number): void {
    this.currentWave = wave;
    this.waveTimer = this.waveDelay;

    // Spawn invaders at top rows based on contribution data
    for (let y = 0; y < Math.min(3, this.tileMap.height); y++) {
      for (let x = 0; x < this.tileMap.width; x++) {
        const tile = this.tileMap.tiles[y]?.[x];
        if (!tile) continue;

        // Only spawn on contribution tiles
        if (tile.type !== TileType.Floor && tile.type !== TileType.MetalBlock) {
          if (!tile.cleared) {
            // HP based on contribution tier
            let hp = 1;
            if (tile.type === TileType.StrongCrate) hp = 2;
            else if (tile.type === TileType.ReinforcedCrate) hp = 3;

            // Add wave scaling
            hp += Math.floor((wave - 1) / 3);

            const invader = new Invader(tile, hp, this.tileMap);
            this.world.add(invader);
          }
        }
      }
    }
  }

  update(dt: number, _world: World): void {
    if (this.waveTimer > 0) {
      this.waveTimer--;
    }
  }

  render(_ctx: RenderContext, _camera: Camera): void {
    // Spawner is invisible
  }
}