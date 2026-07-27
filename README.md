# contrib-blaster

**Your GitHub contribution graph, but it's a Bomberman level.**

[![CI](https://github.com/iamRooney/contrib-blaster/actions/workflows/test.yml/badge.svg)](https://github.com/iamRooney/contrib-blaster/actions/workflows/test.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)

<!--
  NOTE: this is the current real output — flat-rectangle entities, matching
  the "Current status" section below. Swap this file once real pixel-art
  sprites land.
-->
![Demo](./docs/demo.gif)

A GitHub Action that reads your real contribution graph and plays it back as a pixel-art animation — your busiest days get bombed first. Drop the output gif in your profile README and it updates itself daily. Original artwork, no fake commits, just your actual activity rendered as a tiny game.

```yaml
- uses: iamRooney/contrib-blaster@v1
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
```

```markdown
![Contribution animation](./output/contrib-animation.gif)
```

That's the whole setup — see [Usage](#usage) below for the full workflow file.

> **Early days:** the simulation engine is real and tested, but sprites are still flat rectangles, not art, and `bomber` is the only animation pack so far. If pixel art or a second pack (Snake? Space Invaders?) sounds fun to build, see [Contributing](#contributing).

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
      - uses: iamRooney/contrib-blaster@v1
        with:
          animation: bomber
          output: gif
          github-token: ${{ secrets.GITHUB_TOKEN }}
      - uses: stefanzweifel/git-auto-commit-action@v5
        with:
          commit_message: "chore: update contribution animation"
          file_pattern: "output/*.gif"
```

Then embed the result in your profile README:

```markdown
![Contribution animation](./output/contrib-animation.gif)
```

Use `gif` or `webp` for README embedding, not `mp4` — GitHub only makes video embeddable when it's manually dragged into the web editor, which a GitHub Action can't do. `mp4` output is there for cases where you're hosting the file elsewhere.

## Inputs

| Input | Default | Description |
|---|---|---|
| `animation` | `bomber` | Which animation pack to run |
| `output` | `gif` | Output format: `gif`, `webp`, or `mp4` |
| `output-path` | `./output/contrib-animation.gif` | Where to write the file |
| `fps` | `24` | Output frame rate |
| `login` | repo owner | GitHub username whose contributions to animate |
| `github-token` | *(required)* | Needs `read:user` scope; the default workflow `GITHUB_TOKEN` works for a user's own public contributions |

<details>
<summary><strong>Requirements</strong></summary>

- `webp` and `mp4` output require `ffmpeg` on the runner's PATH. GitHub's `ubuntu-latest` hosted runners ship it preinstalled; on a self-hosted runner either install `ffmpeg` yourself or use `output: gif` (pure JS, no external binary).
- Private-repo contributions only count toward the animation if your GitHub profile has "Include private contributions" enabled — that's a GitHub account setting, not something this Action can override.

</details>

<details>
<summary><strong>Current status — what's real vs. not yet</strong></summary>

**Working:**
- Full simulation engine (tile map generation, pathfinding, target-priority bombing, loop/reset)
- Real GitHub GraphQL contribution fetch
- GIF, WebP, and MP4 output — all three verified against a full realistic 53-week contribution grid

**Not yet done:**
- Real pixel art — every entity currently renders as a flat colored rectangle, not sprite art
- Only the `bomber` animation pack exists; the engine supports others (see [Architecture](#architecture)) but none are written yet

</details>

## Architecture

The animation engine is generic — `bomber` is a plugin, not baked into the core. Adding a new pack (Snake, Space Shooter, etc.) means implementing the `Scene` interface in `src/animations/<name>/`; nothing in `src/engine/` needs to change.
