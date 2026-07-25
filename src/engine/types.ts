/**
 * Shared primitive types used across the engine.
 *
 * `RenderContext` is intentionally NOT `CanvasRenderingContext2D` directly.
 * We don't pull in `node-canvas` (or DOM lib types) at this layer because the
 * engine core should stay renderer-agnostic — it's plugged in later in the
 * `render/` module. Once we wire up node-canvas in Step 5, this type will be
 * narrowed to whatever that library actually exposes.
 */
export interface RenderContext {
  drawImage(...args: unknown[]): void;
  fillRect(x: number, y: number, w: number, h: number): void;
  clearRect(x: number, y: number, w: number, h: number): void;
  save(): void;
  restore(): void;
  translate(x: number, y: number): void;
  [key: string]: unknown;
}

export interface Vec2 {
  x: number;
  y: number;
}

export function vec2(x: number, y: number): Vec2 {
  return { x, y };
}

export function vec2Equals(a: Vec2, b: Vec2): boolean {
  return a.x === b.x && a.y === b.y;
}

export function vec2Add(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x + b.x, y: a.y + b.y };
}

export function vec2Distance(a: Vec2, b: Vec2): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}
