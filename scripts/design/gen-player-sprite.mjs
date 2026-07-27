import { writeFileSync } from "node:fs";

const W = 20, H = 20;
const grid = Array.from({ length: H }, () => Array(W).fill(null));

function set(x, y, k) { if (x >= 0 && x < W && y >= 0 && y < H) grid[y][x] = k; }
function circle(cx, cy, r, k, outlineK) {
  for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) {
    const d = Math.sqrt(x*x+y*y);
    if (d <= r) set(cx+x, cy+y, k);
    else if (d <= r+1 && outlineK) set(cx+x, cy+y, outlineK);
  }
}
function rect(x0,y0,x1,y1,k) { for (let y=y0;y<=y1;y++) for (let x=x0;x<=x1;x++) set(x,y,k); }

circle(9, 12, 5, "B", "K");
for (let y = 10; y <= 16; y++) for (let x = 10; x <= 13; x++) {
  const d = Math.hypot(x-9, y-12);
  if (d <= 5 && d > 3) set(x, y, "S");
}
set(7, 10, "K"); set(7, 11, "E");
set(11, 10, "K"); set(11, 11, "E");
set(6, 12, "C"); set(12, 12, "C");
rect(6, 17, 7, 18, "T");
rect(11, 17, 12, 18, "T");
rect(6, 6, 7, 9, "B"); set(6,6,"K");
rect(11, 6, 12, 9, "B"); set(12,6,"K");
circle(9, 4, 3, "M", "K");
set(8, 3, "H"); set(8, 2, "H");
set(9, 1, "F"); set(9, 0, "F");
circle(9, -1, 1, "Y", "O");

const rows = grid.map(row => row.map(c => c || ".").join(""));
rows.forEach((r,i) => console.log(`${i} len=${r.length}: ${r}`));

const palette = {
  B: "#3fb68a", S: "#2e8f6c", K: "#1b3a2f", E: "#16211d", C: "#7fd9b5",
  T: "#276b52", M: "#2f3b40", H: "#57666c", F: "#7a5c3e", O: "#ff8f00", Y: "#ffd54f",
};
const tsRows = rows.map(r => `    "${r}",`).join("\n");
const tsPalette = Object.entries(palette).map(([k,v]) => `    ${k}: "${v}",`).join("\n");
writeFileSync("bomber-sprite.ts", `export const PLAYER_SPRITE = {\n  palette: {\n${tsPalette}\n  },\n  rows: [\n${tsRows}\n  ],\n};\n`);

// Also re-render this EXACT grid for final visual confirmation
const colorRGB = {
  B:[63,182,138], S:[46,143,108], K:[27,58,47], E:[22,33,29], C:[127,217,181],
  T:[39,107,82], M:[47,59,64], H:[87,102,108], F:[122,92,62], O:[255,143,0], Y:[255,213,79],
};
const SCALE = 14;
let ppm = `P3\n${W*SCALE} ${H*SCALE}\n255\n`;
for (let y = 0; y < H; y++) {
  for (let sy = 0; sy < SCALE; sy++) {
    let line = "";
    for (let x = 0; x < W; x++) {
      const k = grid[y][x];
      const c = k ? colorRGB[k] : [255,255,255];
      for (let sx = 0; sx < SCALE; sx++) line += `${c[0]} ${c[1]} ${c[2]} `;
    }
    ppm += line.trim() + "\n";
  }
}
writeFileSync("bomber-final.ppm", ppm);
