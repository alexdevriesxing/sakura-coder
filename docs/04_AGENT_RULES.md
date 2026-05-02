# Sakura Coder — Agent Rules

## Mode Rules

- Ask: no edits, no terminal.
- Context: docs only.
- Plan: docs/plans only, no source edits.
- Docs: Markdown only.
- Build: code edits with diff approval.
- Review: no edits.
- Debug: safe commands only.
- Asset: image generation and asset metadata only.
- Refactor: high-risk mode, small scoped patches.
- Release: validation and packaging only; no deploy without approval.

## Patch Rules

Every patch must include:

- files affected
- reason per file
- old content or loaded baseline
- new content
- risk level
- validation plan

## Terminal Rules

Safe:

- typecheck
- test
- lint
- build preview where non-deploying
- git status/diff/log

Blocked:

- deletes
- production deploys
- publish commands
- hard resets
- recursive destructive commands
- sudo/admin escalation
