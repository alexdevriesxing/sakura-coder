# Safe Edit Workflow

Sakura Coder must never silently edit files.

## Required flow

1. User asks for implementation.
2. Sakura sets mode to Build, Refactor or Docs.
3. Sakura asks Qwen for structured file-change proposal.
4. Sakura validates the proposal.
5. Sakura loads current file contents.
6. Sakura generates diff preview.
7. User approves or rejects.
8. Sakura creates checkpoint.
9. Sakura applies changes.
10. Sakura refreshes file tree.
11. Sakura runs validation if allowed.
12. Sakura logs session.
13. Sakura summarizes results.

## Apply Rules

- Markdown changes can be applied in Docs/Context/Plan modes after approval.
- Code changes can only be applied in Build/Refactor modes after approval.
- Deletes require exact confirmation.
- Critical actions are blocked unless the user types the exact phrase.
