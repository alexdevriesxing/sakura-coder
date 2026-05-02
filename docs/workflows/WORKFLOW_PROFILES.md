# Workflow Profiles

Sakura Coder uses workflow profiles to customize AI behavior, asset generation, and generated documentation based on the project type.

## Profile Selection

When creating a project, select a workflow profile:

1. **General Coding** - Default for existing repositories
2. **Game Development Studio** - For games
3. **Website & Webapp Studio** - For websites
4. **App Development Studio** - For desktop/mobile apps
5. **AI / Cloudflare Worker Studio** - For Workers AI
6. **Asset Generation Studio** - For asset packs
7. **Audio Generation Studio** - For audio

## Workflow-Specific Features

| Workflow | Image Asset Types | Audio Types | Docs |
|----------|-----------------|------------|------|
| General Coding | 2 | 0 | README, IMPLEMENTATION_PLAN |
| Game Development | 10 | 11 | GDD, CORE_GAMEPLAY_LOOP, ASSET_BIBLE |
| Website Webapp | 7 | 3 | WEBSITE_BRIEF, PAGE_MAP, SEO_PLAN |
| App Development | 5 | 3 | PRD, USER_ROLES, DATA_MODEL |
| AI Cloudflare | 3 | 2 | AI_APP_BRIEF, WORKER_ARCHITECTURE |
| Asset Generation | 4 | 2 | ASSET_BIBLE, PROMPT_PACK |
| Audio Generation | 0 | 7 | AUDIO_BRIEF, MUSIC_STYLE_GUIDE |

## Image Output Folders

- Game: `assets/generated/sprites/`, `assets/generated/tilesets/`, `assets/generated/backgrounds/`
- Website: `assets/generated/web/hero/`, `assets/generated/web/social/`
- App: `assets/generated/app/icons/`, `assets/generated/app/onboarding/`
- AI: `assets/generated/ai/hero/`, `assets/generated/ai/diagrams/`

## Audio Output Folders

- Game: `assets/generated/audio/game/sfx/`, `assets/generated/audio/game/music/`
- Website: `assets/generated/audio/web/notifications/`, `assets/generated/audio/web/brand/`
- App: `assets/generated/audio/app/notifications/`, `assets/generated/audio/app/states/`
- Audio Studio: `assets/generated/audio/studio/music/`, `assets/generated/audio/studio/sfx/`

## Prompt Templates

Each workflow provides:

- `imagePromptTemplate` - For Flux image generation
- `imageNegativePromptTemplate` - Copyright safety negatives
- `audioPromptTemplate` - For Minimax audio generation
- `audioNegativePromptTemplate` - Copyright safety negatives

## Non-Infringing Rules

All workflows enforce:

- No copyrighted characters
- No protected logos
- No celebrity voice clones
- No famous game soundalikes
- No trademarked characters

## Mock vs Live Mode

Set `VITE_AI_PROVIDER_MODE=mock` for development.

Switch to `live` only after Worker schemas are verified.