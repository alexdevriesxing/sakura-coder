# Antigravity Build Brief — Sakura Coder Robust Starter

## Mission

Continue building Sakura Coder into a production-grade local-first desktop IDE for:

- planning
- context capture
- PRD/GDD generation
- Markdown document creation
- Qwen Coder assisted code generation
- Flux image/asset generation
- checkpointed file editing
- diff approval
- safe terminal execution

## Current State

The scaffold already includes:

- Tauri 2 app shell
- React/TypeScript/Vite frontend
- Monaco editor
- Zustand app store
- Project launcher
- Project templates
- `.sakura/` folder creation
- docs creation
- Tauri file tree/read/write commands
- checkpoints
- guarded command execution
- session log writing
- Qwen provider abstraction
- Flux provider abstraction
- mock/live provider mode
- context builder
- asset studio
- diff approval panel
- safety tests

## First Task: Validate Before Feature Work

Run:

```bash
npm install
npm run typecheck
npm run test
npm run tauri:dev
```

Fix any compile/runtime errors before adding new functionality.

## Do Not Skip

- Do not bypass the diff approval model.
- Do not weaken Rust path validation.
- Do not allow destructive terminal commands.
- Do not let the agent edit outside the workspace.
- Do not deploy or publish.

## Immediate Antigravity Tasks

### Phase 1 — Stabilize

1. Install dependencies.
2. Fix any Tauri 2 API changes.
3. Confirm `npm run typecheck` passes.
4. Confirm `npm run test` passes.
5. Confirm `npm run tauri:dev` launches.
6. Create a test project from the launcher.
7. Confirm file tree loading.
8. Confirm opening and saving Markdown files.
9. Confirm checkpoint folder creation.
10. Confirm safe terminal blocks dangerous commands.

### Phase 2 — Worker Integration

Adapt `src/lib/aiClient.ts` to the actual schemas of:

```txt
https://qwen-coder-worker.alexdevriesxing.workers.dev/
https://flux-image-worker.alexdevriesxing.workers.dev/
```

Recommended Qwen Worker contract:

```json
{
  "mode": "plan",
  "goal": "string",
  "input": "string",
  "systemPrompt": "string",
  "project": {
    "name": "string",
    "rootPath": "string",
    "template": "string"
  },
  "contextFiles": [
    {
      "relativePath": "docs/00_CONTEXT.md",
      "content": "..."
    }
  ]
}
```

Recommended response:

```json
{
  "kind": "plan",
  "content": "markdown text",
  "summary": "short summary",
  "riskLevel": "low",
  "proposedFiles": []
}
```

Recommended Flux Worker contract:

```json
{
  "prompt": "string",
  "negativePrompt": "string",
  "filename": "string",
  "assetType": "hero-image",
  "width": 1536,
  "height": 864
}
```

Recommended response:

```json
{
  "id": "asset-id",
  "filename": "asset.png",
  "imageBase64": "optional base64 image",
  "previewUrl": "optional URL",
  "model": "flux",
  "prompt": "...",
  "negativePrompt": "..."
}
```

### Phase 3 — Real Patch Flow

Implement structured agent patch handling:

1. Ask Qwen for file-change JSON only.
2. Validate JSON against `docs/prompts/BUILD_MODE_JSON_SCHEMA.md`.
3. Load existing files.
4. Create diff preview.
5. Show risk per file.
6. Require user approval.
7. Create checkpoint.
8. Apply patch.
9. Refresh file tree.
10. Run validation.
11. Append session log.

### Phase 4 — Better UX

Add:

- native folder picker
- search over project files
- recent projects
- memory viewer/editor
- prompt library
- asset gallery grid with thumbnails
- AGENTS.md viewer
- validation results panel
- Git status panel

### Phase 5 — Production Readiness

Add:

- stricter Tauri filesystem permissions
- signed builds
- crash/error boundary
- local settings file
- encrypted secrets storage if API keys are ever introduced
- stronger patch parser
- test coverage for Rust path validation
- E2E test checklist

## Definition of Done

Sakura Coder is ready when:

- New project creation works.
- Context-to-doc generation works.
- Qwen returns plans and structured file changes.
- Flux generates or returns images/assets.
- File edits always require diff approval.
- Checkpoints are created before edits.
- Dangerous commands are blocked in Rust.
- Validation can be run from the UI.
- The app can be built by Tauri.
