# contrib-blaster

Turn your GitHub contribution graph into a retro pixel-art game animation, generated as a GitHub Action and embeddable in your README.

The first animation pack bombs your contribution graph, biggest days first, Bomberman-style — using entirely original artwork, characters, and branding (no copyrighted assets).

## Usage

```yaml
name: Update contribution animation
on:
  schedule:
    - cron: "0 0 * * *"
  workflow_dispatch:

jobs:
  animate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: your-username/contrib-blaster@v1
        with:
          animation: bomber
          output: gif
          github-token: ${{ secrets.GITHUB_TOKEN }}
      - uses: stefanzweifel/git-auto-commit-action@v5
        with:
          commit_message: "chore: update contribution animation"
          file_pattern: "output/*.gif"
```

Then embed it in your profile README:

```markdown
![Contribution animation](./output/contrib-animation.gif)
```

## Inputs

| Input | Default | Description |
|---|---|---|
| `animation` | `bomber` | Which animation pack to run |
| `output` | `gif` | Output format: `gif`, `webp`, or `mp4` |
| `output-path` | `./output/contrib-animation.gif` | Where to write the file |
| `fps` | `24` | Output frame rate |
| `login` | repo owner | GitHub username whose contributions to animate |
| `github-token` | *(required)* | Needs `read:user` scope; the default workflow `GITHUB_TOKEN` works for a user's own public contributions |

## Requirements

- **`webp` and `mp4` output require `ffmpeg` on the runner's PATH.** GitHub's `ubuntu-latest` hosted runners ship it preinstalled. If you're using a custom/self-hosted runner, install `ffmpeg` yourself first, or use `output: gif` (no external binary required — it's pure JS).
- Private-repo contributions only count toward the animation if your GitHub profile has "Include private contributions" enabled — this is a GitHub account setting, not something this Action can override.

## Current status

This project is under active development. Honest snapshot of what's real:

**Working:**
- Full simulation engine (tile map generation, pathfinding, target-priority bombing, loop/reset)
- Real GitHub GraphQL contribution fetch
- GIF, WebP, and MP4 output — all three verified against a full realistic 53-week contribution grid

**Not yet done:**
- Real pixel art — every entity currently renders as a flat colored rectangle, not sprite art
- Only the `bomber` animation pack exists; the engine is built to support others (see [Architecture](#architecture)) but none are written yet

## Architecture

The animation engine is generic — the `bomber` pack is a plugin, not baked into the core. Adding a new animation pack (Snake, Space Shooter, etc.) means implementing the `Scene` interface in `src/animations/<name>/` and registering it; nothing in `src/engine/` needs to change.

```
src/
  engine/       core: Entity, World, Scene interface, TileMap, Timeline, Camera, pathfinding
  animations/
    bomber/     the first animation pack
  github/       GraphQL contribution fetch
  render/       PixelCanvas + GIF/WebP/MP4 encoders
```

## Publishing

This is a JS Action — consuming workflows run `dist/index.js` directly with **no build step on their end**. That means:

1. Run `npm run build:action` and **commit the resulting `dist/index.js`** before tagging a release. It's intentionally tracked in git (see the note in `.gitignore`), unlike a typical Node project.
2. `sharp` is a native addon and can't be bundled into a single JS file (see `scripts/build-action.mjs`) — it's marked `external`, meaning its actual package (with the platform-specific compiled binary) needs to exist in `node_modules` at runtime. **`node_modules` also needs to be committed** for this Action to work when consumed via `uses: your-username/contrib-blaster@v1` — run `npm ci --omit=dev` before committing, so only production dependencies (not `vitest`, `esbuild`, etc.) end up in the published tree.
3. Tag releases as `v1.0.0`, `v1.1.0`, etc., and move a floating `v1` tag forward to match GitHub Actions convention, so consumers pinning `uses: your-username/contrib-blaster@v1` get patches automatically.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md).

## License

[MIT](./LICENSE)
