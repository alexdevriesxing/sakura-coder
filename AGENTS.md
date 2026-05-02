# AGENTS.md — Sakura Coder Repository Rules

This repository builds Sakura Coder, a local-first desktop IDE for AI-assisted planning, coding, workflow-aware asset generation, and audio generation.

## Absolute Rules

1. Never edit files outside this repository.
2. Never delete files without explicit approval.
3. Never deploy, publish or push without explicit approval.
4. Never read `.env`, credentials or private keys unless explicitly approved.
5. Always inspect relevant files before changing them.
6. Always keep changes small and reviewable.
7. Always run validation after code changes (`npm run check`).
8. Always preserve the safety model: mode permissions, checkpointing and diff approval.
9. Never overwrite existing assets - use numeric suffixes if filename exists.
10. Never generate copyrighted, trademarked, or infringing content.

## Workflow Profiles

Sakura Coder uses 7 workflow profiles. When working with a project:

1. Check `.sakura/config.json` for `activeWorkflowId`
2. Use workflow-specific system prompts from `src/workflows/registry.ts`
3. Use workflow-specific asset types from the profile
4. Use workflow-specific audio types from the profile
5. Generate assets to workflow-specific output folders

### Workflow-Specific Assets

| Workflow | Image Output | Audio Output |
|----------|-------------|--------------|
| game-development | assets/generated/sprites/, tilesets/, backgrounds/ | assets/generated/audio/game/ |
| website-webapp | assets/generated/web/hero/, social/ | assets/generated/audio/web/ |
| app-development | assets/generated/app/icons/, onboarding/ | assets/generated/audio/app/ |
| ai-cloudflare | assets/generated/ai/hero/, diagrams/ | assets/generated/audio/ai/ |
| asset-generation | assets/generated/asset-studio/ | assets/generated/audio/asset-studio/ |
| audio-generation | (none) | assets/generated/audio/studio/ |

### Non-Infringing Rules (All Workflows)

- Never prompt for copyrighted characters or logos
- Never prompt for "in the style of" living artists
- Never clone celebrity voices
- Never generate exact soundalikes of iconic game/film audio
- Always include negative prompts for copyright safety
- Always save metadata with generated assets
- Never overwrite existing files - append numeric suffix

## Build Order

1. Make the current scaffold compile.
2. Confirm Tauri commands work.
3. Confirm project creation with workflow selection works.
4. Confirm file tree/read/write works.
5. Confirm checkpoint creation works.
6. Confirm Qwen mock mode works.
7. Confirm Flux mock mode works.
8. Confirm Minimax mock mode works.
9. Adapt Worker schemas for live mode.
10. Add tests for workflows.
11. Add preview UI for assets/audio.

## Coding Style

- TypeScript strict mode.
- Avoid giant components.
- Keep backend security checks in Rust, not only frontend.
- Frontend safety checks are UX; Rust safety checks are enforcement.
- Prefer explicit types.
- Do not introduce a database until file-based `.sakura/` storage is stable.
- Keep provider logic isolated in `src/lib/aiClient.ts`.
- Keep workflow registry in `src/workflows/registry.ts`.

## Qwen / Agent Rules

Qwen should be treated like a strong but non-frontier coding assistant. Give it:

- clear mode (ask/context/plan/docs/build/review/debug/asset/audio/refactor/release)
- exact file paths
- context files
- small tasks
- JSON schema for file-change proposals
- validation command
- known risks
- workflow-specific system prompt from `getWorkflowProfile()`

Do not ask Qwen to do unbounded autonomous work.

## Validation Commands

```bash
npm run check     # typecheck + tests
npm run typecheck # TypeScript only
npm run test     # vitest only
npm run lint     # eslint
npm run tauri:dev # full Tauri dev
```
