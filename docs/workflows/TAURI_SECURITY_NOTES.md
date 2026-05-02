# Tauri Security Notes

The Rust backend is the enforcement layer.

## Required Enforcement

- reject absolute paths for project-relative file operations
- reject `..` path traversal
- block destructive commands
- create checkpoints before writes
- keep file operations under root path
- exclude `.git`, `node_modules`, `target`, `dist` from tree scans and checkpoints

## Before Production

- tighten `src-tauri/capabilities/default.json`
- reduce filesystem plugin permissions
- add tests for Rust path validation
- consider encrypted local storage for API keys
- never store secrets in `.sakura/sessions`
