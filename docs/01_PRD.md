# Sakura Coder — Product Requirements Document

## Product Summary

Sakura Coder is a desktop IDE that helps users turn rough ideas into structured project documentation, code, and generated assets using AI.

## Target Users

- Solo developers
- Game designers
- Startup founders
- Content platform builders
- AI-assisted coders
- Users who need strict guardrails around non-frontier coding models

## MVP Capabilities

1. Create/open local Sakura projects.
2. Generate `.sakura/` project memory and docs.
3. Capture context from user input.
4. Generate PRD/GDD/architecture Markdown files.
5. Open and edit files in Monaco.
6. Save files with checkpointing.
7. Chat with Qwen Worker in mode-aware prompts.
8. Generate Flux asset prompts/assets.
9. Gate code edits through diff approval.
10. Block dangerous terminal commands.

## Non-goals for MVP

- Full autonomous coding.
- Cloud sync.
- Team collaboration.
- Production deployment.
- Marketplace/plugin system.

## Success Criteria

- The app can create a project and documentation scaffold.
- The app can open/edit/save files with checkpointing.
- Qwen and Flux integrations can run in mock mode and later live mode.
- Safety tests pass.
- Dangerous commands are blocked by Rust backend.
