// Standalone demo generator - run with: npx tsx scripts/generate-demo.mjs
import "../src/animations/bomber/index.js"; // Register "bomber" animation
import { createScene } from "../src/engine/scene-manager.js";
import { World } from "../src/engine/world.js";
import { Timeline } from "../src/engine/timeline.js";
import { Camera } from "../src/engine/camera.js";
import { PixelCanvas } from "../src/render/pixel-canvas.js";
import { GifFrameEncoder } from "../src/render/gif-encoder.js";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const TILE_SIZE_PX = 16;
const LEFT_MARGIN_PX = 24;
const TOP_MARGIN_PX = 14;

// Generate a realistic contribution grid for demo purposes
function generateDemoGrid() {
  const weeks = 53;
  const daysPerWeek = 7;
  const weeksArray = [];

  const today = new Date();
  const endDate = new Date(today);
  endDate.setDate(endDate.getDate() - 1); // Yesterday

  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - (weeks * daysPerWeek - 1));

  for (let w = 0; w < weeks; w++) {
    const week = [];
    for (let d = 0; d < daysPerWeek; d++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + w * 7 + d);

      if (date > endDate) {
        week.push({ date: date.toISOString().split('T')[0], count: 0 });
        continue;
      }

      const dayOfWeek = date.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

      let count = 0;
      const rand = Math.random();

      if (isWeekend) {
        if (rand < 0.7) count = 0;
        else if (rand < 0.9) count = 1 + Math.floor(Math.random() * 2);
        else count = 3 + Math.floor(Math.random() * 3);
      } else {
        if (rand < 0.2) count = 0;
        else if (rand < 0.6) count = 1 + Math.floor(Math.random() * 3);
        else if (rand < 0.9) count = 4 + Math.floor(Math.random() * 6);
        else count = 10 + Math.floor(Math.random() * 10);
      }

      // Add streaks
      if (d > 0 && week[d-1].count > 0 && Math.random() < 0.4) {
        count = Math.max(count, 1 + Math.floor(Math.random() * 3));
      }

      week.push({
        date: date.toISOString().split('T')[0],
        count
      });
    }
    weeksArray.push(week);
  }

  return { weeks: weeksArray };
}

function hashGridForSeed(grid) {
  let hash = 0;
  for (const week of grid.weeks) {
    for (const day of week) {
      hash = (Math.imul(31, hash) + day.count) | 0;
    }
  }
  return hash >>> 0;
}

async function generateDemo() {
  const grid = generateDemoGrid();
  const outputPath = join(__dirname, "..", "docs", "demo.gif");

  console.log("Generating demo animation...");
  console.log(`Output: ${outputPath}`);

  mkdirSync(dirname(outputPath), { recursive: true });

  const scene = createScene("bomber", grid);
  const world = new World(hashGridForSeed(grid));
  scene.init(world);

  const width = grid.weeks.length * TILE_SIZE_PX + LEFT_MARGIN_PX;
  const height = (grid.weeks[0]?.length ?? 7) * TILE_SIZE_PX + TOP_MARGIN_PX;
  const camera = new Camera(0, 0, TILE_SIZE_PX, LEFT_MARGIN_PX, TOP_MARGIN_PX);
  const canvas = new PixelCanvas(width, height);
  const encoder = new GifFrameEncoder(outputPath, width, height, 24);

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
    { fps: 24, maxLoops: 1 },
  );

  console.log(
    `Wrote ${outputPath} (gif) — ${result.frameCount} frames, ${result.loopCount} loop(s)` +
      (result.hitMaxFrames ? " (hit safety frame cap)" : ""),
  );
  console.log("Demo generation complete!");
}

generateDemo().catch(console.error);