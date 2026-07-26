import { writeFileSync } from "node:fs";
// Re-run the same grid-building logic, then emit as char-rows + palette for the actual TS file.

const W = 20, H = 20;
const grid = Array.from({ length: H }, () => Array(W).fill(null));

const colorKey = {
  "B": "#f0ead6",  // BONE
  "S": "#c8bea5",  // BONE_SHADOW
  "K": "#1e1e1e",  // OUTLINE
  "R": "#c0392b",  // BANDANA
  "M": "#323e44",  // BOMB
  "H": "#505f64",  // BOMB_HL
  "F": "#785a3c",  // FUSE
  "O": "#ff8f00",  // FLAME_OUTER
  "Y": "#ffd54f",  // FLAME_INNER
};

function set(x, y, k) { if (x >= 0 && x < W && y >= 0 && y < H) grid[y][x] = k; }
function circle(cx, cy, r, k, outlineK) {
  for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) {
    const d = Math.sqrt(x*x+y*y);
    if (d <= r) set(cx+x, cy+y, k);
    else if (d <= r+1 && outlineK) set(cx+x, cy+y, outlineK);
  }
}
function rect(x0,y0,x1,y1,k) { for (let y=y0;y<=y1;y++) for (let x=x0;x<=x1;x++) set(x,y,k); }

circle(7, 5, 3, "B", "K");
set(6,5,"K"); set(8,5,"K");
rect(4,2,10,3,"R"); set(4,2,"K"); set(10,2,"K");
rect(10,3,12,4,"R");
rect(5,7,9,8,"B"); rect(5,7,9,7,"K");
for (let x=5;x<=9;x+=2) set(x,8,"K");
rect(5,9,9,13,"B");
for (let y=10;y<=12;y++) { set(5,y,"K"); set(9,y,"K"); }
for (let y=10;y<=12;y++) rect(6,y,8,y, y%2===0 ? "S" : "B");
for (let y=9;y<=13;y++) set(7,y,"K");
rect(3,10,4,13,"B"); set(3,10,"K");
rect(10,9,12,11,"B"); set(10,9,"K");
rect(5,14,6,18,"B"); rect(8,14,9,18,"B");
set(5,14,"K"); set(8,14,"K");
for (let y=15;y<=17;y+=2) { set(5,y,"K"); set(8,y,"K"); }
circle(14,11,3,"M","K");
set(13,10,"H"); set(13,9,"H");
set(14,7,"F"); set(14,6,"F");
circle(14,5,1,"Y","O");
set(14,4,"O");

const rows = grid.map(row => row.map(c => c || ".").join(""));
rows.forEach((r,i) => console.log(`row ${i} len=${r.length}: ${r}`));

const tsRows = rows.map(r => `    "${r}",`).join("\n");
const tsPalette = Object.entries(colorKey).map(([k,v]) => `    ${k}: "${v}",`).join("\n");
writeFileSync("sprite-output.ts", `export const PLAYER_SPRITE = {\n  palette: {\n${tsPalette}\n  },\n  rows: [\n${tsRows}\n  ],\n};\n`);

// Also render to PNG for visual confirmation
const colorRGB = {
  "B": [240,234,214], "S": [200,190,165], "K": [30,30,30], "R": [192,57,43],
  "M": [50,62,68], "H": [80,95,100], "F": [120,90,60], "O": [255,143,0], "Y": [255,213,79],
};
const SCALE = 16;
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
writeFileSync("sprite-final.ppm", ppm);
