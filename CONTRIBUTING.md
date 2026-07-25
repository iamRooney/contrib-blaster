# Contributing

## Setup

```bash
npm install
npm test          # run the test suite
npm run build      # type-check + compile
npm run build:action  # bundle for the Action itself (dist/index.js)
```

## Adding a new animation pack

The engine core (`src/engine/`) never imports from `src/animations/*` — that boundary is what keeps this reusable. To add a new pack:

1. Create `src/animations/<name>/scene.ts` implementing the `Scene` interface (`init`, `update`, `render`, `isComplete`, `reset`) from `src/engine/scene.ts`.
2. Decide how contribution intensity maps to your game's concept.
3. Define your pack's entities extending the shared `Entity` base class (`src/engine/entity.ts`).
4. Create `src/animations/<name>/index.ts` that calls `registerAnimation("<name>", (grid) => new YourScene(grid))`.
5. Add tests under `test/animations/<name>/` — see `test/animations/bomber/` for the pattern (unit tests for individual entities/logic, plus an end-to-end test that runs the full `Scene` interface through `init → complete → reset → complete` again).

No changes to `TileMap`, `Timeline`, `Renderer`, `Camera`, or `SpriteManager` should be required. If you find yourself needing to modify `src/engine/`, that's worth raising as a separate discussion first — it affects every animation pack, not just yours.

## Testing philosophy

Run the actual simulation, don't just assert on individual function outputs. The bugs that matter most in this project (multi-hit crates never getting destroyed, unreachable targets being permanently discarded, etc.) were only caught by running a full `Player`/`Scene` loop to completion and checking the end state — unit tests on isolated methods wouldn't have caught them. See `test/animations/bomber/player.test.ts` and `test/animations/bomber/scene.test.ts` for the pattern.

## Code style

- TypeScript strict mode is on (`noUncheckedIndexedAccess` included) — please don't add `any` or non-null assertions (`!`) without a comment explaining why they're safe.
- Prefer small, focused modules — the engine/animation-pack boundary works because files stay narrowly scoped.

## Pull requests

Please include a brief description of what changed and why, and make sure `npm test` and `npm run build` both pass.
