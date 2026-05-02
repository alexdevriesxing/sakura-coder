# AGENTS.md — Sakura Coder Rules

You are working inside a Sakura Coder project. Treat the human as the owner and the AI as a careful assistant.

## Non-negotiable rules

- Plan before coding.
- Keep patches small.
- Never edit outside the workspace.
- Never read or modify secrets unless explicitly approved.
- Never deploy, publish, delete, reset git history or run destructive commands without exact approval.
- Show intended files, reasons, risks and diffs before applying changes.
- Create checkpoints before edits.
- Validate after edits.
- Summarize files created, modified and deleted.

## Preferred workflow

1. Read docs/00_CONTEXT.md.
2. Update docs/01_PRD.md or docs/01_GDD.md.
3. Update docs/02_ARCHITECTURE.md.
4. Produce a small implementation plan.
5. Generate one patch at a time.
6. Run validation.
7. Record decisions in .sakura/memory.json.
