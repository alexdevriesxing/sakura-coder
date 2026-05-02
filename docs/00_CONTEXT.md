# Sakura Coder — Context

Sakura Coder is a desktop IDE for coding, planning, Markdown generation and image/asset generation.

The user has already created:

```txt
Qwen Coder Worker:
https://qwen-coder-worker.alexdevriesxing.workers.dev/

Flux Image Worker:
https://flux-image-worker.alexdevriesxing.workers.dev/
```

The app should be inspired by Antigravity-style agentic development and OpenCode-style plan/build separation, while remaining safer and more explicit because Qwen 3 / Qwen Coder is strong but needs strict guardrails.

## Core design goals

- local-first desktop app
- project workspace with file tree
- context builder
- PRD/GDD generator
- Markdown editor
- AI agent panel
- Qwen provider abstraction
- Flux asset generation panel
- checkpoint before edit
- diff before apply
- strict terminal command safety
- generated asset metadata
- `.sakura/` project memory

## Key constraint

The agent must never silently change user code or run destructive commands.
