import { type Sprite } from "../../engine/types.js";

/**
 * Bomb entity - round bomb with burning fuse
 * Generated procedurally for perfect symmetry and consistency.
 * Do not edit manually - modify scripts/design/gen-all-sprites.mjs instead.
 */
export const BOMB_SPRITE: Sprite = {
  palette: {
    W: "#fff8dc",
    Y: "#ffd54f",
    O: "#ff8f00",
    R: "#e65100",
    D: "#bf360c",
    S: "#ffcc80",
  },
  rows: [
    ".........W..........",
    ".........O..........",
    ".........Y..........",
    "........YOY.........",
    "........YYY.........",
    ".........O..........",
    ".........O..........",
    "......KKKFKKK.......",
    ".....KKFOFFFKK......",
    ".....KFOOOFFFK......",
    ".....KOOOOOFFK......",
    ".....FFOOOFFFF......",
    ".....KFFOFFFFK......",
    ".....KFFFFFFFK......",
    ".....KKFFFFFKK......",
    "......KKKFKKK.......",
    "....................",
    "....................",
    "....................",
    "....................",
  ],
};
