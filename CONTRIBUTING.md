# Contributing to contrib-blaster

Thanks for your interest in improving `contrib-blaster`! This project is open source and we welcome all contributions.

## Key Goals

The project is currently focused on:

1. **Making the visual output truly "pixel-art"** (completed! The `bomber` pack now has detailed sprites for all entities)
2. **Expanding the variety of animation packs** (new packs like Snake, Space Invaders, etc. are welcome)
3. **Getting more GitHub stars** through improved documentation, demos, and community engagement

## Project Status

- ✅ **Core Engine**: Complete and tested
- ✅ **GitHub Integration**: Working (GraphQL fetch)
- ✅ **Output Formats**: GIF, WebP, MP4 all supported
- ✅ **Sprite Art**: NEW - All entities now have detailed pixel-art sprites generated programmatically
- ❌ **Additional Packs**: Looking for contributors to create new animation packs (Snake, Space Invaders, Defender, etc.)
- ❌ **Showcase**: We need a comprehensive demo site showing all available packs

## How to contribute

### Option 1: Add a new Animation Pack

The engine is designed to be modular. Each animation pack lives in `src/animations/<name>/` and implements the `Scene` interface.

**Template to copy:****

```bash
mkdir src/animations/<new-pack>
cd src/animations/<new-pack>
# Copy the bomber template
cp -r ../bomber/* .
# Implement your unique gameplay mechanics
```

### Option 2: Create sprites for existing entities

The current `bomber` pack uses programmatically generated sprites. If you're artistically inclined, you can create custom sprites for:

- Player characters
- Crates (different themes: wooden, metal, tech, etc.)
- Explosions
- Power-ups

**Your sprites will be used to regenerate the `sprites-generated.ts` file.**

### Option 3: Improve the showcase

We need a better demonstration site. Ideas:

- A web page showing real-world examples from GitHub users
- A live demo allowing visitors to input a GitHub username
- Documentation with before/after screenshots

### Option 4: Help with GitHub Stars

Since this is a GitHub Action, its success depends on GitHub stars, usage, and good documentation. You can help by:

- Writing better examples in the README
- Creating tutorials for users
- Adding the project to developer newsletters or blog posts
- Creating a logo/branding guide for the project

## Getting Started

1. Fork the repository: `git clone https://github.com/iamRooney/contrib-blaster.git`
2. Make your changes
3. Run tests: `npm test`
4. Build: `npm run build`
5. Create a PR with your implementation

## Communication

Open a discussion with the maintainer (`iamRooney`) before starting work on large features to avoid duplication. For small bug fixes or sprite art, feel free to open a PR directly.

## Current Maintainer

`iamRooney` - The original author and primary maintainer. Responds to PRs and issues, helps with direction.

## Code of Conduct

We value diverse voices and ideas. Please be respectful in all interactions and give credit where due.

## Looking for Contributors

**Immediate needs:**
- [ ] Someone to create a "Space Invaders" animation pack
- [ ] Someone to create a "Snake" animation pack
- [ ] Someone to create custom sprite artwork
- [ ] Someone to help with documentation and examples
- [ ] Someone to help with promotion (blog posts, newsletters, etc.)

**What we can provide:**
- A working template for new packs
- Access to the engine core (it supports gameplay variety)
- A platform to showcase your work

The project is open and ready for new energy and ideas!

## License

MIT - Use this project to your heart's content, just give credit.

## Links

- [GitHub Repository](httpsAGC DETAILS FOR IMPROVING GITHUB STARS AND VISIBILITY)

This is a GitHub Action, so the number of stars is crucial for its success. This project needs visibility to attract users and grow its star count.

### PR (Pull Request) Strategy

PRs are the primary way to get the project noticed. Every time we merge a change:

- **Documentation PRs**: Immediately visible to anyone viewing the repo
- **Visual PRs**: Show off the improved sprites and animations
- **New Feature PRs**: Attract users looking for specific functionality
- **Bug Fix PRs**: Essential for trust and reliability

Each PR should:

1. **Make the project visibly better**: A simple bug fix isn't enough for star growth
2. **Improve documentation**: Better docs = more users = more stars
3. **Show visual improvement**: New sprites, demos, or examples are highly visible
4. **Add value**: New packs, tools, or integrations that help users

### Key PR Targets for Star Growth

**High-Impact PRs (immediate visibility):**

- `feat: Add Space Invaders animation pack` - Completely new gameplay
- `feat: Add Snake animation pack` - Classic, recognizable game
- `docs: Improve README with real examples` - Better documentation
- `visual: Update demo animation` - Show off the new sprites

**Continuous Improvement:**

- `fix: Improve rendering performance` - Better for GitHub Actions
- `feat: Add CLI for local testing` - Makes the tool more accessible
- `feat: Add support for custom themes` - Customization options

### PR Creation Best Practices

1. **Descriptive Title**: Use the exact format `feat: <name>` or `docs: <topic>`
2. **Detailed Body**: Explain what was changed, why, and how it helps users
3. **Include Screenshots**: Visual evidence of the improvement
4. **Good Commit Messages**: End with `Co-authored-by: Claude Code`
5. **Include Attribution**: End PR descriptions with 🤖 Generated with Claude Code

### Continuous Improvement Approach

Rather than waiting for major PRs, we should:

- **Small, frequent PRs**: Multiple PRs over time rather than one big one
- **Visual PRs**: Regular updates to sprites and animations
- **Documentation PRs**: Regular improvements to docs
- **Feature PRs**: Gradual addition of new packs

This steady pace keeps the project active and visible to GitHub's algorithm.

## Project Growth Plan

**Phase 1 (Immediate - 2 weeks)**:

1. Merge sprite improvements (new crates, bombs, explosions)
2. Add Space Invaders pack (completely different gameplay)
3. Add Snake pack (classic game)
4. Update README with real examples
5. Create comprehensive demo

**Phase 2 (2-4 weeks)**:

1. Performance improvements
2. CLI tool for local testing
3. Custom themes support
4. More packs (Pac-Man, Tetris, etc.)

**Phase 3 (Long term)**:

1. Web showcase site
2. More integrations (social media, blog embeds)
3. Active community on Discord/Stack Overflow

### PR Checklist

When creating a PR:

- [ ] Check the `CONTRIBUTING.md` for any specific instructions
- [ ] Follow existing code style and conventions
- [ ] Update documentation if it affects user behavior
- [ ] Add tests for new features
- [ ] Include screenshots or demos of the improvement
- [ ] Write a clear commit message ending with `Co-authored-by: Claude Code`
- [ ] Include the PR footer: `🤖 Generated with Claude Code`

### Current Maintainer

`iamRooney` - Responds to all PRs and helps with direction. Open to suggestions and new ideas.

This repository is ready for your contributions! We're excited to see what you can do to make this project great.

---

**Remember**: GitHub stars come from visibility. The more we merge PRs and keep the project active, the more likely GitHub is to showcase it to new users.

Get started! The more PRs we merge, the faster we grow!