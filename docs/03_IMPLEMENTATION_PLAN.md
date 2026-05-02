# Sakura Coder — Implementation Plan

## Phase 1 — Compile and launch

- Install dependencies.
- Fix Tauri API version issues.
- Run typecheck.
- Run tests.
- Launch Tauri dev app.

## Phase 2 — Stabilize file operations

- Create project from UI.
- Load file tree.
- Open Markdown file.
- Save with checkpoint.
- Inspect checkpoint contents.

## Phase 3 — Worker schemas

- Inspect Qwen Worker.
- Inspect Flux Worker.
- Update `aiClient.ts`.
- Add response normalization.
- Add clear errors for bad payloads.

## Phase 4 — Patch application

- Add structured Qwen file-change output.
- Parse and validate file changes.
- Create diff preview.
- Apply approved patch.
- Refresh file tree.

## Phase 5 — Release quality

- Add recent projects.
- Add native folder picker.
- Add asset gallery thumbnails.
- Add stronger tests.
- Tighten Tauri permissions.
