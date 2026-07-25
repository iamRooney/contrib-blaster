import { registerAnimation } from "../../engine/scene-manager.js";
import { BomberScene } from "./scene.js";

registerAnimation("bomber", (grid) => new BomberScene(grid));
