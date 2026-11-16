import { registerAnimation } from "../../engine/scene-manager.js";
import { SpaceInvadersScene } from "./scene.js";

registerAnimation("space-invaders", (grid) => new SpaceInvadersScene(grid));