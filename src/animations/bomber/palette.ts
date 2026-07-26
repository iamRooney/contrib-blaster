import { TileType } from "../../engine/tilemap.js";
import type { RenderContext } from "../../engine/types.js";

/**
 * GitHub's real contribution-calendar colors (light theme). These are
 * publicly documented/well-known values, not proprietary secrets — GitHub
 * itself exposes them via CSS custom properties on github.com, and they're
 * widely referenced across the ecosystem (contribution-graph tools,
 * browser extensions, etc). Using them here makes the game world visually
 * read as "your actual contribution graph," which is the whole point of
 * this project.
 */
export const GITHUB_COLORS = {
  /** Zero-contribution square background. */
  level0: "#ebedf0",
  level1: "#9be9a8",
  level2: "#40c463",
  level3: "#30a14e",
  level4: "#216e39",
  /** Page background behind the grid itself. */
  pageBackground: "#ffffff",
  /** Axis label text color. */
  labelText: "#57606a",
} as const;

/** Maps a tile's contribution tier directly to GitHub's own square colors. */
export function colorForTileType(type: TileType): string {
  switch (type) {
    case TileType.Floor:
      return GITHUB_COLORS.level0;
    case TileType.WeakCrate:
      return GITHUB_COLORS.level1;
    case TileType.StrongCrate:
      return GITHUB_COLORS.level2;
    case TileType.ReinforcedCrate:
      return GITHUB_COLORS.level3;
    case TileType.MetalBlock:
      // Structural obstacles are never contribution tiles (see tilemap.ts
      // applyStructuralPattern), so this never overlaps with real data —
      // level4's dark green reads as "solid/blocked" against the lighter tiers.
      return GITHUB_COLORS.level4;
  }
}

/**
 * Draws one contribution square GitHub-style: inset from the full tile
 * bounds (leaving a visible gap to its neighbors, like the real graph)
 * and with clipped corners for a rounded look. At typical tile sizes
 * (12-20px) a true anti-aliased border-radius isn't meaningfully
 * achievable on a raw pixel buffer, so corners are clipped to a flat
 * diagonal cut instead — reads as "rounded" at a glance without needing
 * sub-pixel blending.
 */
export function fillContributionSquare(
  ctx: RenderContext,
  screenX: number,
  screenY: number,
  tileSizePx: number,
  color: string,
): void {
  const gap = Math.max(1, Math.round(tileSizePx * 0.12));
  const size = tileSizePx - gap;
  const corner = Math.max(1, Math.round(size * 0.22));

  ctx.fillStyle = color;
  // Main body, minus the corner triangles (drawn as two overlapping rects
  // that together cover everything except the four corner clips).
  ctx.fillRect(screenX + corner, screenY, size - corner * 2, size);
  ctx.fillRect(screenX, screenY + corner, size, size - corner * 2);
  // Corner fill-ins (diagonal stair-step approximation of a rounded corner).
  for (let i = 0; i < corner; i++) {
    const inset = corner - i;
    ctx.fillRect(screenX + inset, screenY + i, size - inset * 2, 1);
    ctx.fillRect(screenX + inset, screenY + size - 1 - i, size - inset * 2, 1);
  }
}
