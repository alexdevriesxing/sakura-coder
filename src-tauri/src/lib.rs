use base64::Engine;
use chrono::Utc;
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::ffi::OsStr;
use std::fs;
use std::io::Write;
use std::path::{Component, Path, PathBuf};
use std::process::Command;
use walkdir::WalkDir;

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SakuraProject {
    pub name: String,
    pub root_path: String,
    pub template: String,
    pub workflow_id: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct FileNode {
    pub name: String,
    pub path: String,
    pub relative_path: String,
    pub kind: String,
    pub children: Option<Vec<FileNode>>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct GeneratedAsset {
    pub id: String,
    pub filename: String,
    pub relative_path: String,
    pub prompt: String,
    pub negative_prompt: String,
    pub asset_type: String,
    pub model: String,
    pub created_at: String,
    pub source_worker: String,
    pub status: String,
    pub preview_url: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TerminalCommandResult {
    command: String,
    cwd: String,
    exit_code: Option<i32>,
    stdout: String,
    stderr: String,
    risk_level: String,
    blocked: bool,
}

fn now() -> String {
    Utc::now().to_rfc3339()
}

fn normalize_root(root_path: &str) -> Result<PathBuf, String> {
    let path = PathBuf::from(root_path);
    if root_path.trim().is_empty() {
        return Err("Project root path cannot be empty.".into());
    }
    Ok(path)
}

fn validate_relative_path(relative_path: &str) -> Result<PathBuf, String> {
    if relative_path.trim().is_empty() {
        return Err("Relative path cannot be empty.".into());
    }
    let candidate = Path::new(relative_path);
    if candidate.is_absolute() {
        return Err("Absolute paths are not allowed for project file operations.".into());
    }
    for component in candidate.components() {
        if matches!(component, Component::ParentDir | Component::RootDir | Component::Prefix(_)) {
            return Err("Path traversal is not allowed.".into());
        }
    }
    Ok(candidate.to_path_buf())
}

fn resolve_project_path(root_path: &str, relative_path: &str) -> Result<PathBuf, String> {
    let root = normalize_root(root_path)?;
    let relative = validate_relative_path(relative_path)?;
    Ok(root.join(relative))
}

fn ensure_parent(path: &Path) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|error| error.to_string())?;
    }
    Ok(())
}

fn write_text(path: &Path, content: &str) -> Result<(), String> {
    ensure_parent(path)?;
    fs::write(path, content).map_err(|error| error.to_string())
}

fn slugify(input: &str) -> String {
    input
        .chars()
        .map(|c| if c.is_ascii_alphanumeric() { c.to_ascii_lowercase() } else { '-' })
        .collect::<String>()
        .split('-')
        .filter(|part| !part.is_empty())
        .collect::<Vec<_>>()
        .join("-")
}

fn default_docs(name: &str, template: &str, workflow_id: &str) -> Vec<(&'static str, String)> {
    let workflow_folders = match workflow_id {
        "game-development" => vec![
            "assets/generated/sprites",
            "assets/generated/spritesheets",
            "assets/generated/tilesets",
            "assets/generated/backgrounds",
            "assets/generated/ui",
            "assets/generated/audio/game",
        ],
        "website-webapp" => vec![
            "assets/generated/web/hero",
            "assets/generated/web/articles",
            "assets/generated/web/social",
            "assets/generated/audio/web",
        ],
        "app-development" => vec![
            "assets/generated/app/icons",
            "assets/generated/app/onboarding",
            "assets/generated/audio/app",
        ],
        "ai-cloudflare" => vec![
            "assets/generated/ai/hero",
            "assets/generated/ai/diagrams",
            "assets/generated/audio/ai",
        ],
        "asset-generation" => vec![
            "assets/generated/asset-studio",
            "assets/generated/audio/asset-studio",
        ],
        "audio-generation" => vec![
            "assets/generated/audio/studio/music",
            "assets/generated/audio/studio/sfx",
            "assets/generated/audio/studio/voice",
        ],
        "python-scripting" => vec![
            "assets/generated/python/docs",
            "assets/generated/python/viz",
        ],
        "retro-game-dev" => vec![
            "assets/generated/retro/sprites",
            "assets/generated/retro/tilesets",
            "assets/generated/retro/screens",
            "assets/generated/retro/audio",
        ],
        _ => vec!["assets/generated"],
    };

    let mut docs = vec![
        ("docs/00_CONTEXT.md", format!("# {name} — Context\n\nWorkflow: {workflow_id}\n\n## Raw User Idea\n\nWrite or paste the project idea here.\n")),
        ("docs/01_PRD.md", format!("# {name} — Product Requirements Document\n\nWorkflow: {workflow_id}\n\n## Problem\n\n## Users\n\n## MVP Scope\n")),
        ("docs/02_ARCHITECTURE.md", "# Technical Architecture\n\n## Stack\n\n## Modules\n\n## Data Flow\n\n## Security\n".into()),
        ("docs/03_IMPLEMENTATION_PLAN.md", "# Implementation Plan\n\n## Phase 1\n\n## Phase 2\n\n## Validation\n".into()),
        ("docs/04_AGENT_RULES.md", "# Agent Rules\n\n- Plan first.\n- Diff before apply.\n- Checkpoint before edit.\n- Never deploy without approval.\n".into()),
        ("docs/05_ASSET_BIBLE.md", "# Asset Bible\n\n## Visual Style\n\n## Prompt Rules\n\n## Filename Rules\n".into()),
        ("docs/06_TEST_PLAN.md", "# Test Plan\n\n## Unit Tests\n\n## Integration Tests\n\n## Manual QA\n".into()),
        ("docs/07_RELEASE_CHECKLIST.md", "# Release Checklist\n\n- [ ] Typecheck\n- [ ] Tests\n- [ ] Build\n- [ ] Review generated assets\n- [ ] Confirm deployment target\n".into()),
    ];

    if workflow_id == "game-development" {
        docs.push(("docs/GDD.md", "# Game Design Document\n\n## Game Overview\n\n## Core Gameplay Loop\n\n## Target Platforms\n".into()));
        docs.push(("docs/CORE_GAMEPLAY_LOOP.md", "# Core Gameplay Loop\n\n## Player Actions\n\n## Game Rules\n\n## Win/Lose Conditions\n".into()));
    }

    if workflow_id == "website-webapp" {
        docs.push(("docs/DESIGN_SYSTEM.md", "# Design System\n\n## Typography\n\n## Color Palette\n\n## Components (shadcn/ui)\n".into()));
        docs.push(("docs/DATABASE_SCHEMA.md", "# Database Schema\n\n## Tables\n\n## Relations\n\n## Migrations (Drizzle)\n".into()));
        docs.push(("docs/DOCKER_SETUP.md", "# Docker Setup\n\n## Local Development\n\n## Production Build\n\n## Docker Compose\n".into()));
        docs.push(("docker/docker-compose.yml", "version: '3.8'\nservices:\n  db:\n    image: postgres:15-alpine\n    environment:\n      POSTGRES_DB: sakura_db\n      POSTGRES_USER: user\n      POSTGRES_PASSWORD: password\n    ports:\n      - \"5432:5432\"\n".into()));
    }

    if workflow_id == "retro-game-dev" {
        docs.push(("docs/RETRO_DESIGN.md", "# Retro Game Design\n\n## System Constraints\n\n## Palette\n\n## Sprite/Tile Budget\n".into()));
        docs.push(("docs/MEMORY_MAP.md", "# Memory Map\n\n## Zero Page / RAM\n\n## ROM Banks\n\n## Hardware Registers\n".into()));
        docs.push(("Makefile", "# Retro Project Makefile\n\nall: build\n\nbuild:\n\t@echo \"Running retro build...\"\n".into()));
    }

    docs.push(("docs/prompts/QWEN_SYSTEM_PROMPT.md", "# Qwen System Prompt\n\nWorkflow-specific instructions will be injected here based on the active workflow.\n".into()));
    docs.push(("AGENTS.md", "# AGENTS.md\n\n- Plan first.\n- Diff before apply.\n- No destructive commands.\n- Workflow: {workflow_id}\n".into()));
    docs.push(("README.md", format!("# {name}\n\nCreated with Sakura Coder.\nWorkflow: {workflow_id}\n\nRun docs first, then plan, then build.\n")));

    docs
}

fn scaffold_template(root: &Path, name: &str, template: &str, workflow_id: &str) -> Result<(), String> {
    let workflow_folders = match workflow_id {
        "game-development" => vec![
            ".sakura/checkpoints",
            ".sakura/diffs",
            ".sakura/sessions",
            ".sakura/image-generations",
            ".sakura/audio-generations",
            "docs/prompts",
            "docs/workflows",
            "src",
            "assets/generated/sprites",
            "assets/generated/spritesheets",
            "assets/generated/tilesets",
            "assets/generated/backgrounds",
            "assets/generated/ui",
            "assets/generated/audio/game/sfx",
            "assets/generated/audio/game/music",
            "assets/generated/audio/game/ambience",
            "assets/prompts",
        ],
        "website-webapp" => vec![
            ".sakura/checkpoints",
            ".sakura/diffs",
            ".sakura/sessions",
            ".sakura/image-generations",
            ".sakura/audio-generations",
            "docs/prompts",
            "docs/workflows",
            "src/lib/db",
            "src/components/ui",
            "public",
            "docker",
            "assets/generated/web/hero",
            "assets/generated/web/articles",
            "assets/generated/web/social",
            "assets/generated/web/mockups",
            "assets/generated/web/docs",
            "assets/generated/audio/web",
            "assets/prompts",
        ],
        "app-development" => vec![
            ".sakura/checkpoints",
            ".sakura/diffs",
            ".sakura/sessions",
            ".sakura/image-generations",
            ".sakura/audio-generations",
            "docs/prompts",
            "docs/workflows",
            "src",
            "assets/generated/app/icons",
            "assets/generated/app/onboarding",
            "assets/generated/audio/app",
            "assets/prompts",
        ],
        "ai-cloudflare" => vec![
            ".sakura/checkpoints",
            ".sakura/diffs",
            ".sakura/sessions",
            ".sakura/image-generations",
            ".sakura/audio-generations",
            "docs/prompts",
            "docs/workflows",
            "src",
            "assets/generated/ai/hero",
            "assets/generated/ai/diagrams",
            "assets/generated/audio/ai",
            "assets/prompts",
        ],
        "asset-generation" => vec![
            ".sakura/checkpoints",
            ".sakura/diffs",
            ".sakura/sessions",
            ".sakura/image-generations",
            ".sakura/audio-generations",
            "docs/prompts",
            "docs/workflows",
            "assets/generated/asset-studio",
            "assets/generated/audio/asset-studio",
            "assets/prompts",
        ],
        "audio-generation" => vec![
            "assets/generated/audio/studio/music",
            "assets/generated/audio/studio/sfx",
            "assets/generated/audio/studio/voice",
            "assets/generated/audio/studio/podcast",
            "assets/prompts",
        ],
        "python-scripting" => vec![
            ".sakura/checkpoints",
            ".sakura/diffs",
            ".sakura/sessions",
            ".sakura/image-generations",
            ".sakura/audio-generations",
            "docs/prompts",
            "docs/workflows",
            "src",
            "data",
            "notebooks",
            "tests",
            "assets/generated/python/docs",
            "assets/generated/python/viz",
            "assets/prompts",
        ],
        "retro-game-dev" => vec![
            ".sakura/checkpoints",
            ".sakura/diffs",
            ".sakura/sessions",
            ".sakura/image-generations",
            ".sakura/audio-generations",
            "docs/prompts",
            "docs/workflows",
            "src",
            "assets/sprites",
            "assets/tiles",
            "assets/music",
            "tools",
            "bin",
            "assets/generated/retro/sprites",
            "assets/generated/retro/tilesets",
            "assets/generated/retro/screens",
            "assets/generated/retro/audio",
            "assets/prompts",
        ],
        _ => vec![
            ".sakura/checkpoints",
            ".sakura/diffs",
            ".sakura/sessions",
            ".sakura/image-generations",
            ".sakura/audio-generations",
            "docs/prompts",
            "docs/workflows",
            "src",
            "assets/generated",
            "assets/prompts",
        ],
    };

    for folder in workflow_folders {
        fs::create_dir_all(root.join(folder)).map_err(|error| error.to_string())?;
    }

    for (path, content) in default_docs(name, template, workflow_id) {
        write_text(&root.join(path), &content)?;
    }

    let project = SakuraProject {
        name: name.to_string(),
        root_path: root.to_string_lossy().to_string(),
        template: template.to_string(),
        workflow_id: Some(workflow_id.to_string()),
        created_at: now(),
        updated_at: now(),
    };
    write_text(&root.join(".sakura/config.json"), &serde_json::to_string_pretty(&project).map_err(|e| e.to_string())?)?;
    write_text(
        &root.join(".sakura/memory.json"),
        &serde_json::to_string_pretty(&json!({
            "projectName": name,
            "workflowId": workflow_id,
            "projectType": template,
            "stack": [],
            "rules": ["checkpoint before edit", "diff before apply", "no destructive commands"],
            "decisions": [{"date": now(), "decision": "Project initialized with workflow."}],
            "openQuestions": [],
            "goals": [],
            "assumptions": [],
            "preferredStack": [],
            "guardrails": [],
            "generatedDocuments": [],
            "assetStyleGuide": {},
            "audioStyleGuide": {},
            "generatedAssets": [],
            "generatedAudio": [],
            "workerEndpoints": {
                "qwen": "https://qwen-coder-worker.alexdevriesxing.workers.dev/",
                "flux": "https://flux-image-worker.alexdevriesxing.workers.dev/",
                "minimax": "https://minimax-music-worker.alexdevriesxing.workers.dev/"
            }
        })).map_err(|e| e.to_string())?,
    )?;

    match template {
        "cloudflare-worker" => write_text(&root.join("src/worker.ts"), "export default {\n  async fetch(request: Request): Promise<Response> {\n    return Response.json({ ok: true, service: 'sakura-worker' });\n  }\n};\n")?,
        "phaser-game" | "phaser-asset-heavy-game" => write_text(&root.join("src/main.ts"), "// Phaser starter placeholder. Ask Sakura Build Mode to generate the Phaser 3 app after the GDD is approved.\n")?,
        _ => write_text(&root.join("src/index.ts"), "// Sakura project source entry.\n")?,
    }

    Ok(())
}

#[tauri::command]
fn create_project(root_path: String, name: String, template: String, workflow_id: String) -> Result<SakuraProject, String> {
    let root = normalize_root(&root_path)?;
    fs::create_dir_all(&root).map_err(|error| error.to_string())?;
    scaffold_template(&root, &name, &template, &workflow_id)?;
    load_project(root.to_string_lossy().to_string())
}

#[tauri::command]
fn load_project(root_path: String) -> Result<SakuraProject, String> {
    let root = normalize_root(&root_path)?;
    let config_path = root.join(".sakura/config.json");
    if !config_path.exists() {
        return Err("No .sakura/config.json found. Create a Sakura project first.".into());
    }
    let content = fs::read_to_string(config_path).map_err(|error| error.to_string())?;
    serde_json::from_str(&content).map_err(|error| error.to_string())
}

fn node_from_path(root: &Path, path: &Path, max_depth: usize) -> Result<FileNode, String> {
    let metadata = fs::metadata(path).map_err(|error| error.to_string())?;
    let relative = path.strip_prefix(root).unwrap_or(path).to_string_lossy().replace('\\', "/");
    let name = path.file_name().and_then(OsStr::to_str).unwrap_or(".").to_string();
    if metadata.is_dir() {
        let mut children = vec![];
        if max_depth > 0 {
            let mut entries = fs::read_dir(path)
                .map_err(|error| error.to_string())?
                .filter_map(Result::ok)
                .map(|entry| entry.path())
                .filter(|child| {
                    let name = child.file_name().and_then(OsStr::to_str).unwrap_or("");
                    !matches!(name, "node_modules" | "target" | ".git" | "dist")
                })
                .collect::<Vec<_>>();
            entries.sort();
            for child in entries.into_iter().take(500) {
                children.push(node_from_path(root, &child, max_depth - 1)?);
            }
        }
        Ok(FileNode { name, path: path.to_string_lossy().into(), relative_path: relative, kind: "directory".into(), children: Some(children) })
    } else {
        Ok(FileNode { name, path: path.to_string_lossy().into(), relative_path: relative, kind: "file".into(), children: None })
    }
}

#[tauri::command]
fn list_project_tree(root_path: String) -> Result<Vec<FileNode>, String> {
    let root = normalize_root(&root_path)?;
    let mut entries = fs::read_dir(&root)
        .map_err(|error| error.to_string())?
        .filter_map(Result::ok)
        .map(|entry| entry.path())
        .filter(|child| {
            let name = child.file_name().and_then(OsStr::to_str).unwrap_or("");
            !matches!(name, "node_modules" | "target" | ".git" | "dist")
        })
        .collect::<Vec<_>>();
    entries.sort();
    entries.into_iter().map(|path| node_from_path(&root, &path, 4)).collect()
}

#[tauri::command]
fn read_project_file(root_path: String, relative_path: String) -> Result<String, String> {
    let path = resolve_project_path(&root_path, &relative_path)?;
    fs::read_to_string(path).map_err(|error| error.to_string())
}

#[tauri::command]
fn create_checkpoint(root_path: String, label: String) -> Result<String, String> {
    let root = normalize_root(&root_path)?;
    let checkpoint_id = format!("{}_{}", Utc::now().format("%Y%m%d_%H%M%S"), slugify(&label));
    let checkpoint_dir = root.join(".sakura/checkpoints").join(&checkpoint_id);
    fs::create_dir_all(&checkpoint_dir).map_err(|error| error.to_string())?;

    for entry in WalkDir::new(&root).into_iter().filter_map(Result::ok) {
        let path = entry.path();
        if !path.is_file() { continue; }
        let rel = path.strip_prefix(&root).map_err(|error| error.to_string())?;
        let rel_s = rel.to_string_lossy().replace('\\', "/");
        if rel_s.starts_with(".sakura/checkpoints") || rel_s.contains("node_modules") || rel_s.contains("target/") || rel_s.starts_with(".git") {
            continue;
        }
        let dest = checkpoint_dir.join(rel);
        ensure_parent(&dest)?;
        fs::copy(path, dest).map_err(|error| error.to_string())?;
    }

    Ok(checkpoint_id)
}

#[tauri::command]
fn write_project_file(root_path: String, relative_path: String, content: String, create_checkpoint: bool) -> Result<String, String> {
    let checkpoint = if create_checkpoint { crate::create_checkpoint(root_path.clone(), format!("before-write-{}", relative_path))? } else { "no-checkpoint".into() };
    let path = resolve_project_path(&root_path, &relative_path)?;
    write_text(&path, &content)?;
    Ok(checkpoint)
}

#[tauri::command]
fn append_session_log(root_path: String, entry: serde_json::Value) -> Result<String, String> {
    let root = normalize_root(&root_path)?;
    let log_path = root.join(".sakura/sessions/session-log.jsonl");
    ensure_parent(&log_path)?;
    let mut file = fs::OpenOptions::new().create(true).append(true).open(&log_path).map_err(|error| error.to_string())?;
    let payload = json!({"timestamp": now(), "entry": entry});
    writeln!(file, "{}", payload).map_err(|error| error.to_string())?;
    Ok(log_path.to_string_lossy().to_string())
}

fn command_risk(command: &str) -> (&'static str, bool) {
    let lower = command.to_lowercase();
    let blocked = ["rm -rf", "del /s", "rmdir /s", "remove-item -recurse -force", "git reset --hard", "git clean -fd", "format ", "diskpart", "mkfs", "dd if=", "npm publish", "wrangler deploy", "vercel deploy --prod", "docker system prune", "chmod -r 777", "chown -r", "sudo "];
    if blocked.iter().any(|item| lower.contains(item)) { return ("critical", true); }
    let high = ["npm install", "pnpm add", "yarn add", "git push", "git commit", "git merge", "git rebase", "pip install", "cargo add"];
    if high.iter().any(|item| lower.contains(item)) { return ("high", false); }
    ("low", false)
}

#[tauri::command]
fn run_safe_command(root_path: String, command: String, mode: String, user_approved: bool) -> Result<TerminalCommandResult, String> {
    let root = normalize_root(&root_path)?;
    let (risk, blocked) = command_risk(&command);
    if blocked || (risk == "high" && !user_approved) || !(mode == "build" || mode == "debug" || mode == "refactor" || mode == "release") {
        return Ok(TerminalCommandResult { command, cwd: root.to_string_lossy().into(), exit_code: None, stdout: "".into(), stderr: "Command blocked by Sakura safety gate.".into(), risk_level: risk.into(), blocked: true });
    }

    #[cfg(target_os = "windows")]
    let output = Command::new("cmd").args(["/C", &command]).current_dir(&root).output();

    #[cfg(not(target_os = "windows"))]
    let output = Command::new("sh").args(["-lc", &command]).current_dir(&root).output();

    let output = output.map_err(|error| error.to_string())?;
    Ok(TerminalCommandResult {
        command,
        cwd: root.to_string_lossy().into(),
        exit_code: output.status.code(),
        stdout: String::from_utf8_lossy(&output.stdout).to_string(),
        stderr: String::from_utf8_lossy(&output.stderr).to_string(),
        risk_level: risk.into(),
        blocked: false,
    })
}

#[tauri::command]
fn save_generated_asset(root_path: String, asset: GeneratedAsset, uri: Option<String>) -> Result<GeneratedAsset, String> {
    let root = normalize_root(&root_path)?;
    let asset_dir = root.join("assets/generated");
    fs::create_dir_all(&asset_dir).map_err(|error| error.to_string())?;

    // Handle data URI: "data:image/png;base64,..."
    if let Some(uri) = uri {
        let is_image = uri.starts_with("data:image");
        let is_audio = uri.starts_with("data:audio");
        
        if is_image || is_audio {
            let parts: Vec<&str> = uri.splitn(2, ',').collect();
            if parts.len() == 2 {
                let data = parts[1];
                let bytes = base64::engine::general_purpose::STANDARD.decode(data).map_err(|e| e.to_string())?;
                fs::write(asset_dir.join(&asset.filename), bytes).map_err(|error| error.to_string())?;
            }
        }
    }

    let metadata_path = root.join(".sakura/image-generations").join(format!("{}.json", asset.id));
    write_text(&metadata_path, &serde_json::to_string_pretty(&asset).map_err(|error| error.to_string())?)?;
    Ok(asset)
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GeneratedAudio {
    pub id: String,
    pub filename: String,
    pub relative_path: String,
    pub prompt: String,
    pub negative_prompt: String,
    pub audio_type: String,
    pub provider: String,
    pub created_at: String,
    pub status: String,
    pub duration_seconds: Option<f64>,
    pub loop_audio: bool,
    pub bpm: Option<i32>,
    pub key: Option<String>,
    pub preview_url: Option<String>,
}

#[tauri::command]
fn save_generated_audio(root_path: String, audio: GeneratedAudio, uri: Option<String>) -> Result<GeneratedAudio, String> {
    let root = normalize_root(&root_path)?;
    let audio_dir = root.join("assets/generated/audio");
    fs::create_dir_all(&audio_dir).map_err(|error| error.to_string())?;

    // Handle data URI: "data:audio/mpeg;base64,..." or "data:audio/wav;base64,..."
    if let Some(uri) = uri {
        let parts: Vec<&str> = uri.splitn(2, ',').collect();
        if parts.len() == 2 {
            let data = parts[1];
            let bytes = base64::engine::general_purpose::STANDARD.decode(data).map_err(|e| e.to_string())?;
            fs::write(audio_dir.join(&audio.filename), bytes).map_err(|error| error.to_string())?;
        }
    }

    let metadata_path = root.join(".sakura/audio-generations").join(format!("{}.json", audio.id));
    write_text(&metadata_path, &serde_json::to_string_pretty(&audio).map_err(|error| error.to_string())?)?;
    Ok(audio)
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SearchResult {
    pub path: String,
    pub relative_path: String,
    pub line_number: usize,
    pub line_content: String,
}

#[tauri::command]
fn search_project(root_path: String, query: String) -> Result<Vec<SearchResult>, String> {
    let root = normalize_root(&root_path)?;
    let mut results = Vec::new();
    let query_lower = query.toLowerCase();

    for entry in WalkDir::new(&root).into_iter().filter_map(Result::ok) {
        if entry.file_type().is_file() {
            let path = entry.path();
            // Skip binary files and hidden folders
            if path.to_string_lossy().contains(".sakura") || path.to_string_lossy().contains("node_modules") {
                continue;
            }

            if let Ok(content) = fs::read_to_string(path) {
                for (i, line) in content.lines().enumerate() {
                    if line.to_lowercase().contains(&query_lower) {
                        results.push(SearchResult {
                            path: path.to_string_lossy().into_owned(),
                            relative_path: path.strip_prefix(&root).unwrap_or(path).to_string_lossy().into_owned(),
                            line_number: i + 1,
                            line_content: line.trim().to_string(),
                        });
                        if results.len() > 100 { break; } // Limit results
                    }
                }
            }
        }
        if results.len() > 100 { break; }
    }
    Ok(results)
}

#[tauri::command]
fn list_checkpoints(root_path: String) -> Result<Vec<String>, String> {
    let root = normalize_root(&root_path)?;
    let checkpoints_dir = root.join(".sakura/checkpoints");
    if !checkpoints_dir.exists() { return Ok(vec![]); }
    let mut entries = fs::read_dir(checkpoints_dir)
        .map_err(|error| error.to_string())?
        .filter_map(Result::ok)
        .filter(|e| e.path().is_dir())
        .map(|e| e.file_name().to_string_lossy().into_owned())
        .collect::<Vec<_>>();
    entries.sort_by(|a, b| b.cmp(a)); // Newest first
    Ok(entries)
}

#[tauri::command]
fn load_project_memory(root_path: String) -> Result<serde_json::Value, String> {
    let root = normalize_root(&root_path)?;
    let memory_path = root.join(".sakura/memory.json");
    if !memory_path.exists() { return Err("No memory found.".into()); }
    let content = fs::read_to_string(memory_path).map_err(|error| error.to_string())?;
    serde_json::from_str(&content).map_err(|error| error.to_string())
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            create_project,
            load_project,
            list_project_tree,
            read_project_file,
            write_project_file,
            create_checkpoint,
            append_session_log,
            run_safe_command,
            save_generated_asset,
            save_generated_audio,
            list_checkpoints,
            load_project_memory,
            search_project
        ])
        .run(tauri::generate_context!())
        .expect("error while running Sakura Coder");
}
