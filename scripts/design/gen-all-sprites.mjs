import { writeFileSync } from "node:fs";

// ============================================================================
// SPRITE GENERATOR FOR contrib-blaster
// Generates all pixel art sprites programmatically for crisp, consistent results
// ============================================================================

const W = 20, H = 20;
const grid = Array.from({ length: H }, () => Array(W).fill(null));

function set(x, y, k) { if (x >= 0 && x < W && y >= 0 && y < H) grid[y][x] = k; }
function circle(cx, cy, r, k, outlineK = null) {
  for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) {
    const d = Math.sqrt(x*x + y*y);
    if (d <= r) set(cx+x, cy+y, k);
    else if (outlineK && d <= r+1) set(cx+x, cy+y, outlineK);
  }
}
function rect(x0, y0, x1, y1, k) { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) set(x, y, k); }
function clearGrid() { for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) grid[y][x] = null; }
function gridToRows() { return grid.map(row => row.map(c => c || ".").join("")); }

// ============================================================================
// PALETTES - Vibrant, GitHub-graph-friendly, distinct per sprite type
// ============================================================================

// Player palette (The Blaster - teal/green theme)
const PLAYER_PALETTE = {
  B: "#3fb68a",  // Main body teal
  S: "#2e8f6c",  // Body shadow
  K: "#1b3a2f",  // Outline
  E: "#16211d",  // Eyes (dark)
  C: "#7fd9b5",  // Highlight
  T: "#276b52",  // Feet
  M: "#2f3b40",  // Bandana dark
  H: "#57666c",  // Bandana mid
  F: "#7a5c3e",  // Bomb body
  O: "#ff8f00",  // Bomb fuse orange
  Y: "#ffd54f",  // Bomb fuse yellow
};

// Crate palettes - distinct per tier, using GitHub contribution colors as base
const WEAK_CRATE_PALETTE = {
  W: "#9be9a8",  // GitHub level1 green
  D: "#7ad188",  // Darker
  L: "#5cc470",  // Light highlight
  K: "#3a8f4a",  // Outline
  C: "#bfffc8",  // Corner highlight
};

const STRONG_CRATE_PALETTE = {
  W: "#40c463",  // GitHub level2 green
  D: "#32a050",
  L: "#6ee08a",
  K: "#25733d",
  C: "#90f0a8",
};

const REINFORCED_CRATE_PALETTE = {
  W: "#30a14e",  // GitHub level3 green
  D: "#26803e",
  L: "#54c86e",
  K: "#1a5c2a",
  C: "#78e090",
};

const METAL_BLOCK_PALETTE = {
  W: "#216e39",  // GitHub level4 dark green
  D: "#174d26",
  L: "#2d8f46",
  K: "#0d3317",
  C: "#3aa052",
  R: "#4a5058",  // Rivet gray
  S: "#2f363d",  // Seam dark
};

// Explosion palette - hot colors for impact
const EXPLOSION_PALETTE = {
  W: "#fff8dc",  // Core white-yellow
  Y: "#ffd54f",  // Yellow
  O: "#ff8f00",  // Orange
  R: "#e65100",  // Red-orange
  D: "#bf360c",  // Dark red
  S: "#ffcc80",  // Smoke
};

// Effect sprites palette
const EFFECT_PALETTE = {
  W: "#ffffff",
  Y: "#fff9c4",
  O: "#ffb74d",
  R: "#ef6c00",
  B: "#64b5f6",  // Blue for shield/powerup
  P: "#ba68c8",  // Purple for special
};

function writeSpriteTS(name, palette, rows, description) {
  const tsPalette = Object.entries(palette).map(([k,v]) => `    ${k}: "${v}",`).join("\n");
  const tsRows = rows.map(r => `    "${r}",`).join("\n");
  const content = `import { type Sprite } from "../../engine/types.js";

/**
 * ${description}
 * Generated procedurally for perfect symmetry and consistency.
 * Do not edit manually - modify scripts/design/gen-all-sprites.mjs instead.
 */
export const ${name}: Sprite = {
  palette: {
${tsPalette}
  },
  rows: [
${tsRows}
  ],
};
`;
  writeFileSync(`src/animations/bomber/${name.toLowerCase().replace(/_/g, "-")}.ts`, content);
  console.log(`Generated ${name} (${rows.length} rows x ${rows[0]?.length || 0} cols)`);
}

// ============================================================================
// SPRITE 1: PLAYER (The Blaster) - already exists, but regenerate for consistency
// ============================================================================
clearGrid();
// Body (teal blob)
circle(9, 12, 5, "B", "K");
for (let y = 10; y <= 16; y++) for (let x = 10; x <= 13; x++) {
  const d = Math.hypot(x-9, y-12);
  if (d <= 5 && d > 3) set(x, y, "S");
}
// Eyes
set(7, 10, "K"); set(7, 11, "E");
set(11, 10, "K"); set(11, 11, "E");
// Cheeks
set(6, 12, "C"); set(12, 12, "C");
// Feet
rect(6, 17, 7, 18, "T");
rect(11, 17, 12, 18, "T");
// Arms (holding bomb)
rect(6, 6, 7, 9, "B"); set(6,6,"K");
rect(11, 6, 12, 9, "B"); set(12,6,"K");
// Bandana
circle(9, 4, 3, "M", "K");
set(8, 3, "H"); set(8, 2, "H");
// Bomb
set(9, 1, "F"); set(9, 0, "F");
circle(9, -1, 1, "Y", "O");

const PLAYER_ROWS = gridToRows();
writeSpriteTS("PLAYER_SPRITE", PLAYER_PALETTE, PLAYER_ROWS, "The Blaster - protagonist");

// ============================================================================
// SPRITE 2: WEAK CRATE (1-3 contributions) - Wooden crate
// ============================================================================
clearGrid();
// Crate body
rect(2, 2, 17, 17, "W");
// Wood grain lines
for (let y = 4; y <= 16; y += 3) {
  for (let x = 3; x <= 16; x++) set(x, y, "D");
}
// Vertical grain
for (let x = 5; x <= 15; x += 4) {
  for (let y = 3; y <= 16; y++) set(x, y, "D");
}
// Highlights
rect(3, 3, 16, 3, "L");
rect(3, 3, 3, 16, "L");
// Outline
rect(2, 2, 17, 2, "K");
rect(2, 17, 17, 17, "K");
rect(2, 2, 2, 17, "K");
rect(17, 2, 17, 17, "K");
// Corner highlights
set(3, 3, "C"); set(16, 3, "C"); set(3, 16, "C"); set(16, 16, "C");
// Metal corners (weak crate has simple brackets)
set(2, 2, "K"); set(17, 2, "K"); set(2, 17, "K"); set(17, 17, "K");

const WEAK_CRATE_ROWS = gridToRows();
writeSpriteTS("WEAK_CRATE_SPRITE", WEAK_CRATE_PALETTE, WEAK_CRATE_ROWS, "Weak Crate (1-3 contributions) - wooden crate");

// ============================================================================
// SPRITE 3: STRONG CRATE (4-9 contributions) - Reinforced wooden crate with metal bands
// ============================================================================
clearGrid();
// Crate body
rect(2, 2, 17, 17, "W");
// Metal horizontal bands
rect(2, 5, 17, 6, "D");
rect(2, 11, 17, 12, "D");
rect(2, 17, 17, 17, "D");
// Metal vertical bands
rect(5, 2, 6, 17, "D");
rect(11, 2, 12, 17, "D");
// Wood grain between bands
for (let y = 7; y <= 10; y++) for (let x = 7; x <= 10; x++) set(x, y, "L");
for (let y = 7; y <= 10; y++) for (let x = 13; x <= 14; x++) set(x, y, "L");
for (let y = 13; y <= 16; y++) for (let x = 7; x <= 10; x++) set(x, y, "L");
for (let y = 13; y <= 16; y++) for (let x = 13; x <= 14; x++) set(x, y, "L");
// Outline
rect(2, 2, 17, 2, "K");
rect(2, 17, 17, 17, "K");
rect(2, 2, 2, 17, "K");
rect(17, 2, 17, 17, "K");
// Corner brackets (metal)
set(2, 2, "K"); set(3, 2, "K"); set(2, 3, "K");
set(16, 2, "K"); set(17, 2, "K"); set(17, 3, "K");
set(2, 16, "K"); set(2, 17, "K"); set(3, 17, "K");
set(16, 17, "K"); set(17, 16, "K"); set(17, 17, "K");
// Highlights on metal bands
rect(2, 5, 17, 5, "L");
rect(2, 11, 17, 11, "L");
rect(5, 2, 5, 17, "L");
rect(11, 2, 11, 17, "L");

const STRONG_CRATE_ROWS = gridToRows();
writeSpriteTS("STRONG_CRATE_SPRITE", STRONG_CRATE_PALETTE, STRONG_CRATE_ROWS, "Strong Crate (4-9 contributions) - reinforced crate with metal bands");

// ============================================================================
// SPRITE 4: REINFORCED CRATE (10+ contributions) - Heavy metal/tech crate
// ============================================================================
clearGrid();
// Base metal body
rect(1, 1, 18, 18, "W");
// Panel lines
rect(1, 6, 18, 6, "D");
rect(1, 13, 18, 13, "D");
rect(6, 1, 6, 18, "D");
rect(13, 1, 13, 18, "D");
// Panel highlights (subtle)
for (let y = 2; y <= 5; y++) for (let x = 2; x <= 5; x++) set(x, y, "L");
for (let y = 2; y <= 5; y++) for (let x = 7; x <= 12; x++) set(x, y, "L");
for (let y = 2; y <= 5; y++) for (let x = 14; x <= 17; x++) set(x, y, "L");
for (let y = 7; y <= 12; y++) for (let x = 2; x <= 5; x++) set(x, y, "L");
for (let y = 7; y <= 12; y++) for (let x = 7; x <= 12; x++) set(x, y, "L");
for (let y = 7; y <= 12; y++) for (let x = 14; x <= 17; x++) set(x, y, "L");
for (let y = 14; y <= 17; y++) for (let x = 2; x <= 5; x++) set(x, y, "L");
for (let y = 14; y <= 17; y++) for (let x = 7; x <= 12; x++) set(x, y, "L");
for (let y = 14; y <= 17; y++) for (let x = 14; x <= 17; x++) set(x, y, "L");
// Rivets at panel intersections
set(6, 6, "R"); set(13, 6, "R"); set(6, 13, "R"); set(13, 13, "R");
set(6, 1, "R"); set(13, 1, "R"); set(6, 18, "R"); set(13, 18, "R");
set(1, 6, "R"); set(1, 13, "R"); set(18, 6, "R"); set(18, 13, "R");
// Outline
rect(1, 1, 18, 1, "K");
rect(1, 18, 18, 18, "K");
rect(1, 1, 1, 18, "K");
rect(18, 1, 18, 18, "K");
// Corner reinforcement
set(1, 1, "K"); set(2, 1, "K"); set(1, 2, "K");
set(17, 1, "K"); set(18, 1, "K"); set(18, 2, "K");
set(1, 17, "K"); set(1, 18, "K"); set(2, 18, "K");
set(17, 18, "K"); set(18, 17, "K"); set(18, 18, "K");
// Warning stripes on top edge (indicates high value)
for (let x = 3; x <= 16; x += 2) set(x, 1, "D");

const REINFORCED_CRATE_ROWS = gridToRows();
writeSpriteTS("REINFORCED_CRATE_SPRITE", REINFORCED_CRATE_PALETTE, REINFORCED_CRATE_ROWS, "Reinforced Crate (10+ contributions) - heavy tech crate with rivets");

// ============================================================================
// SPRITE 5: METAL BLOCK (Indestructible structural pillar) - Classic Bomberman style
// ============================================================================
clearGrid();
// Solid metal body
rect(3, 3, 16, 16, "W");
// Vertical seams
rect(7, 3, 8, 16, "S");
rect(11, 3, 12, 16, "S");
// Horizontal seams
rect(3, 7, 16, 8, "S");
rect(3, 11, 16, 12, "S");
// Panel highlights
for (let y = 4; y <= 6; y++) for (let x = 4; x <= 6; x++) set(x, y, "L");
for (let y = 4; y <= 6; y++) for (let x = 9; x <= 10; x++) set(x, y, "L");
for (let y = 4; y <= 6; y++) for (let x = 13; x <= 15; x++) set(x, y, "L");
for (let y = 9; y <= 10; y++) for (let x = 4; x <= 6; x++) set(x, y, "L");
for (let y = 9; y <= 10; y++) for (let x = 9; x <= 10; x++) set(x, y, "L");
for (let y = 9; y <= 10; y++) for (let x = 13; x <= 15; x++) set(x, y, "L");
for (let y = 13; y <= 15; y++) for (let x = 4; x <= 6; x++) set(x, y, "L");
for (let y = 13; y <= 15; y++) for (let x = 9; x <= 10; x++) set(x, y, "L");
for (let y = 13; y <= 15; y++) for (let x = 13; x <= 15; x++) set(x, y, "L");
// Rivets at all intersections
set(7, 7, "R"); set(11, 7, "R"); set(7, 11, "R"); set(11, 11, "R");
set(7, 3, "R"); set(11, 3, "R"); set(7, 16, "R"); set(11, 16, "R");
set(3, 7, "R"); set(3, 11, "R"); set(16, 7, "R"); set(16, 11, "R");
// Outline
rect(3, 3, 16, 3, "K");
rect(3, 16, 16, 16, "K");
rect(3, 3, 3, 16, "K");
rect(16, 3, 16, 16, "K");
// Corner bolts
set(3, 3, "R"); set(16, 3, "R"); set(3, 16, "R"); set(16, 16, "R");

const METAL_BLOCK_ROWS = gridToRows();
writeSpriteTS("METAL_BLOCK_SPRITE", METAL_BLOCK_PALETTE, METAL_BLOCK_ROWS, "Metal Block (indestructible structural pillar) - classic Bomberman pillar");

// ============================================================================
// SPRITE 6: EXPLOSION FRAMES - 4 frames for animation
// ============================================================================

function genExplosionFrame(radius, intensity) {
  clearGrid();
  const cx = 9, cy = 10;

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx*dx + dy*dy);
      const angle = Math.atan2(dy, dx);

      // Jagged burst shape
      const baseR = radius;
      const spike = Math.sin(angle * 7 + intensity) * (radius * 0.3);
      const edgeR = baseR + spike;

      if (dist <= edgeR * 0.3) set(x, y, "W");      // Core
      else if (dist <= edgeR * 0.55) set(x, y, "Y"); // Yellow
      else if (dist <= edgeR * 0.8) set(x, y, "O");  // Orange
      else if (dist <= edgeR) set(x, y, "R");        // Red
      else if (dist <= edgeR + 1.5 && Math.random() < 0.3) set(x, y, "S"); // Smoke
    }
  }
  return gridToRows();
}

const EXPLOSION_FRAMES = [
  genExplosionFrame(3, 0),   // Frame 0 - small, intense
  genExplosionFrame(5, 0.5), // Frame 1 - expanding
  genExplosionFrame(7, 1),   // Frame 2 - max size
  genExplosionFrame(5, 1.5), // Frame 3 - contracting
  genExplosionFrame(3, 2),   // Frame 4 - fading
];

// Write explosion frames as separate sprites
EXPLOSION_FRAMES.forEach((rows, i) => {
  writeSpriteTS(`EXPLOSION_FRAME_${i}_SPRITE`, EXPLOSION_PALETTE, rows, `Explosion animation frame ${i}`);
});

// ============================================================================
// SPRITE 7: BOMB - The bomb the player places
// ============================================================================
clearGrid();
// Bomb body (round)
circle(9, 11, 4, "F", "K");
// Highlight
circle(8, 10, 2, "O");
// Fuse
set(9, 6, "O"); set(9, 5, "O"); set(9, 4, "Y"); set(8, 4, "Y"); set(10, 4, "Y");
set(9, 3, "O"); set(8, 3, "Y"); set(10, 3, "Y");
set(9, 2, "Y"); set(9, 1, "O"); set(9, 0, "Y");
// Spark at fuse tip
set(9, 0, "W");

const BOMB_ROWS = gridToRows();
writeSpriteTS("BOMB_SPRITE", EXPLOSION_PALETTE, BOMB_ROWS, "Bomb entity - round bomb with burning fuse");

// ============================================================================
// SPRITE 8: POWERUP - Special crate drop (rare)
// ============================================================================
clearGrid();
// Box
rect(4, 4, 15, 15, "W");
// Lid
rect(4, 4, 15, 6, "L");
// Cross symbol (medical/health)
set(9, 8, "R"); set(8, 9, "R"); set(9, 9, "R"); set(10, 9, "R"); set(9, 10, "R");
// Or use P for powerup symbol
set(9, 8, "P"); set(8, 9, "P"); set(9, 9, "P"); set(10, 9, "P"); set(9, 10, "P");
// Outline
rect(4, 4, 15, 4, "K");
rect(4, 15, 15, 15, "K");
rect(4, 4, 4, 15, "K");
rect(15, 4, 15, 15, "K");

const POWERUP_ROWS = gridToRows();
writeSpriteTS("POWERUP_SPRITE", EFFECT_PALETTE, POWERUP_ROWS, "Powerup crate drop - rare bonus");

// ============================================================================
// WRITE MASTER SPRITES INDEX
// ============================================================================
const masterIndex = `/**
 * Master sprite exports for bomber animation pack.
 * All sprites generated by scripts/design/gen-all-sprites.mjs
 */
export { PLAYER_SPRITE } from "./player-sprite.js";
export { WEAK_CRATE_SPRITE } from "./weak-crate-sprite.js";
export { STRONG_CRATE_SPRITE } from "./strong-crate-sprite.js";
export { REINFORCED_CRATE_SPRITE } from "./reinforced-crate-sprite.js";
export { METAL_BLOCK_SPRITE } from "./metal-block-sprite.js";
export { BOMB_SPRITE } from "./bomb-sprite.js";
export { POWERUP_SPRITE } from "./powerup-sprite.js";
export { EXPLOSION_FRAME_0_SPRITE } from "./explosion-frame-0-sprite.js";
export { EXPLOSION_FRAME_1_SPRITE } from "./explosion-frame-1-sprite.js";
export { EXPLOSION_FRAME_2_SPRITE } from "./explosion-frame-2-sprite.js";
export { EXPLOSION_FRAME_3_SPRITE } from "./explosion-frame-3-sprite.js";
export { EXPLOSION_FRAME_4_SPRITE } from "./explosion-frame-4-sprite.js";
`;

writeFileSync("src/animations/bomber/sprites-generated.ts", masterIndex);
console.log("\nGenerated master sprites index: sprites-generated.ts");
console.log("\n=== ALL SPRITES GENERATED ===");
console.log("Run 'npm run build' to compile, then test the animation!");