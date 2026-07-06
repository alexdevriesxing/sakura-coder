# Sakura Coder — Architecture

## Stack

- Desktop shell: Tauri 2
- Frontend: React + TypeScript + Vite
- Editor: Monaco
- State: Zustand
- Backend: Rust Tauri commands
- AI providers: Cloudflare Workers
- LLM routing: OpenRouter free models -> Cloudflare Workers AI Gateway
- Storage: local filesystem

## Frontend Modules

```txt
src/components/ProjectLauncher.tsx
src/components/MissionControl.tsx
src/components/FileTree.tsx
src/components/EditorPane.tsx
src/components/AgentPanel.tsx
src/components/ContextBuilder.tsx
src/components/AssetStudio.tsx
src/components/DiffApprovalPanel.tsx
src/components/TerminalPanel.tsx
```

## Backend Commands

```txt
create_project
load_project
list_project_tree
read_project_file
write_project_file
create_checkpoint
append_session_log
run_safe_command
save_generated_asset
```

## Security Model

The frontend provides UX safety. The Rust backend enforces core safety.

- Path traversal blocked.
- Absolute paths blocked for file operations.
- File operations resolved inside project root.
- Dangerous commands blocked.
- High-risk commands require approval.
- Checkpointing runs before writes.

## Provider Model

`src/lib/aiClient.ts` supports:

```txt
mock mode: local fake responses
live mode: calls Cloudflare Workers
```

Antigravity must adapt schemas after inspecting your actual Worker payload formats.

The Qwen Worker now returns Sakura route metadata:

```txt
_sakura.providerUsed
_sakura.modelUsed
_sakura.quotaStatus
_sakura.waterfallAttempts
```

Streaming responses mirror the route summary with `X-Sakura-*` headers.
