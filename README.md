# Sakura Coder

Sakura Coder is a local-first desktop IDE for:

- AI-assisted coding (Qwen Worker)
- Workflow-aware image generation (Flux Worker)
- Workflow-aware audio generation (Minimax Music Worker)
- Markdown planning (PRDs, GDDs, implementation plans)
- Safe diff-based editing with checkpoints
- Project documentation generation
- Game development workflows
- Website/webapp workflows
- App development workflows
- AI/Cloudflare Worker workflows
- Asset generation workflows
- Audio generation workflows

## Workflow Profiles

Sakura Coder includes 7 workflow profiles that control AI behavior, available asset types, audio types, and generated documentation:

1. **General Coding** - Bug fixes, refactors, existing repos
2. **Game Development Studio** - Phaser/Flame games, sprites, SFX, music
3. **Website & Webapp Studio** - Next.js, Vite, SEO, marketing
4. **App Development Studio** - Desktop/mobile apps, CRMs
5. **AI / Cloudflare Worker Studio** - Workers AI, serverless, API products
6. **Asset Generation Studio** - Image packs, prompt libraries
7. **Audio Generation Studio** - Music loops, SFX, narration

Each workflow includes:

- Workflow-specific system prompt
- Image asset type presets with output folders
- Audio type presets with output folders
- Prompt templates and negative prompts
- Generated document templates

## Worker Endpoints

```txt
Qwen Coder Worker:
https://qwen-coder-worker.alexdevriesxing.workers.dev/

Flux Image Worker:
https://flux-image-worker.alexdevriesxing.workers.dev/

Minimax Music Worker:
https://minimax-music-worker.alexdevriesxing.workers.dev/
```

## Run locally

```bash
npm install
npm run typecheck
npm run test
npm run tauri:dev
```

## Project Creation

1. Open Sakura Coder
2. Enter project root path
3. Enter project name
4. Select template (blank, cloudflare-worker, phaser-game, etc.)
5. Select workflow profile (controls AI behavior and asset types)
6. Click "Create Project"

The workflow ID is saved to `.sakura/config.json` and the workflow profile controls:
- Available image asset types in Asset Studio
- Available audio types in Audio Studio
- Generated documentation templates
- Output folders for generated assets

## Asset Generation

**Asset Studio** - Workflow-aware image generation via Flux Worker:
- Asset type selector filters by active workflow
- Prompt templates from workflow profile
- Metadata saved to `.sakura/image-generations/`

**Audio Studio** - Workflow-aware audio generation via Minimax Music Worker:
- Audio type selector filters by active workflow
- Duration, loop, BPM, key fields
- Metadata saved to `.sakura/audio-generations/`

## Safety Model

Sakura Coder enforces:

- **Modes**: Ask, Context, Plan, Docs, Build, Review, Debug, Asset, Refactor, Release
- **Checkpoints**: Created before every file write
- **Diff approval**: Required for Build mode edits
- **Safe command gate**: Blocks destructive commands
- **Secret blocking**: `.env`, credentials blocked

## Memory

Project memory lives in `.sakura/`:
- `config.json` - Project name, workflow ID, worker URLs
- `memory.json` - Goals, assumptions, decisions, open questions
- `checkpoints/` - File snapshots before edits
- `image-generations/` - Image metadata
- `audio-generations/` - Audio metadata
