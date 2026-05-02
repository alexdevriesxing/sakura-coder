# Sakura Coder — Test Plan

## Unit Tests

- safety command classification
- secret file read classification
- diff generation
- prompt generation
- document factory output

## Manual Tests

1. Create project.
2. Load project.
3. Open file.
4. Save file with checkpoint.
5. Run safe terminal command.
6. Attempt blocked destructive command.
7. Generate context doc.
8. Generate asset metadata.
9. Call Qwen in mock mode.
10. Switch live mode after Worker schema confirmation.

## Rust Tests to Add

- path traversal blocked
- absolute file paths rejected
- checkpoint excludes `.sakura/checkpoints`
- command risk classifier blocks destructive commands
