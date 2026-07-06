use base64::Engine;
use chrono::Utc;
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::collections::HashSet;
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

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ProjectFileContent {
    relative_path: String,
    content: String,
    exists: bool,
    error: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ProjectContextFile {
    relative_path: String,
    content: String,
    reason: String,
    truncated: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ProjectContextBundle {
    files: Vec<ProjectContextFile>,
    file_tree_summary: Vec<String>,
    search_results: Vec<SearchResult>,
    memory: Option<serde_json::Value>,
    diff_summaries: Vec<String>,
    truncated: bool,
    dropped_files: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ProjectFileChange {
    id: String,
    relative_path: String,
    action: String,
    reason: String,
    old_content: Option<String>,
    new_content: Option<String>,
    new_relative_path: Option<String>,
    risk_level: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ProjectChangeApplyResult {
    checkpoint: String,
    applied: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct AgentToolResult {
    tool_name: String,
    ok: bool,
    output: serde_json::Value,
    error: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SemanticIndexEntry {
    relative_path: String,
    language: String,
    symbols: Vec<String>,
    imports: Vec<String>,
    preview: String,
    line_count: usize,
    updated_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SemanticSearchResult {
    relative_path: String,
    score: i32,
    symbols: Vec<String>,
    imports: Vec<String>,
    preview: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Diagnostic {
    source: String,
    severity: String,
    message: String,
    relative_path: Option<String>,
    line_number: Option<usize>,
    command: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Rule {
    id: String,
    scope: String,
    relative_path: String,
    content: String,
    enabled: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Memory {
    id: String,
    content: String,
    source: String,
    created_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct McpServer {
    id: String,
    name: String,
    command: String,
    args: Vec<String>,
    enabled: bool,
    approval_mode: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct GitFileStatus {
    path: String,
    status: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct GitStatus {
    branch: String,
    clean: bool,
    files: Vec<GitFileStatus>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct PreviewSession {
    id: String,
    url: Option<String>,
    status: String,
    notes: Vec<String>,
    screenshot_path: Option<String>,
    created_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct BackgroundJob {
    id: String,
    goal: String,
    status: String,
    created_at: String,
    updated_at: String,
    log: Vec<String>,
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
        if matches!(
            component,
            Component::ParentDir | Component::RootDir | Component::Prefix(_)
        ) {
            return Err("Path traversal is not allowed.".into());
        }
    }
    Ok(candidate.to_path_buf())
}

fn validate_file_name(file_name: &str) -> Result<(), String> {
    if file_name.trim().is_empty()
        || file_name.contains('/')
        || file_name.contains('\\')
        || file_name.contains("..")
        || file_name == "."
    {
        return Err("Invalid filename.".into());
    }
    Ok(())
}

fn normalized_relative_path(root: &Path, path: &Path) -> String {
    path.strip_prefix(root)
        .unwrap_or(path)
        .to_string_lossy()
        .replace('\\', "/")
}

fn path_has_component(relative_path: &str, names: &[&str]) -> bool {
    relative_path
        .replace('\\', "/")
        .split('/')
        .any(|part| names.iter().any(|name| part.eq_ignore_ascii_case(name)))
}

fn is_ignored_context_path(relative_path: &str) -> bool {
    let normalized = relative_path.replace('\\', "/");
    path_has_component(
        &normalized,
        &["node_modules", "target", ".git", "dist", "build"],
    ) || normalized.starts_with(".sakura/checkpoints")
}

fn is_secret_like(relative_path: &str) -> bool {
    let lower = relative_path.replace('\\', "/").to_lowercase();
    let name = lower.rsplit('/').next().unwrap_or(&lower);
    name == ".env"
        || name.starts_with(".env.")
        || name.ends_with(".pem")
        || name.ends_with(".key")
        || name.ends_with(".p12")
        || name.ends_with(".pfx")
        || lower.contains("/secrets/")
}

fn is_probably_text_file(relative_path: &str) -> bool {
    let lower = relative_path.to_lowercase();
    let text_exts = [
        ".ts",
        ".tsx",
        ".js",
        ".jsx",
        ".json",
        ".md",
        ".mdx",
        ".rs",
        ".toml",
        ".css",
        ".html",
        ".yml",
        ".yaml",
        ".txt",
        ".sh",
        ".ps1",
        ".py",
        ".sql",
        ".xml",
        ".svg",
        ".gitignore",
        ".prettierrc",
    ];
    text_exts.iter().any(|ext| lower.ends_with(ext))
}

fn infer_language(relative_path: &str) -> String {
    let lower = relative_path.to_lowercase();
    let language = if lower.ends_with(".tsx") {
        "tsx"
    } else if lower.ends_with(".ts") {
        "typescript"
    } else if lower.ends_with(".jsx") {
        "jsx"
    } else if lower.ends_with(".js") {
        "javascript"
    } else if lower.ends_with(".rs") {
        "rust"
    } else if lower.ends_with(".py") {
        "python"
    } else if lower.ends_with(".css") {
        "css"
    } else if lower.ends_with(".html") {
        "html"
    } else if lower.ends_with(".md") || lower.ends_with(".mdx") {
        "markdown"
    } else if lower.ends_with(".json") {
        "json"
    } else {
        "text"
    };
    language.into()
}

fn extract_symbols(content: &str) -> Vec<String> {
    let mut symbols = Vec::new();
    for line in content.lines() {
        let trimmed = line.trim();
        let candidates = [
            "export function ",
            "function ",
            "export const ",
            "const ",
            "let ",
            "class ",
            "export class ",
            "interface ",
            "type ",
            "pub fn ",
            "fn ",
            "def ",
        ];
        for prefix in candidates {
            if let Some(rest) = trimmed.strip_prefix(prefix) {
                let name = rest
                    .split(|c: char| !(c.is_ascii_alphanumeric() || c == '_' || c == '-'))
                    .next()
                    .unwrap_or("")
                    .trim();
                if name.len() > 1 && !symbols.iter().any(|s| s == name) {
                    symbols.push(name.to_string());
                }
            }
        }
        if symbols.len() >= 40 {
            break;
        }
    }
    symbols
}

fn extract_imports(content: &str) -> Vec<String> {
    let mut imports = Vec::new();
    for line in content.lines() {
        let trimmed = line.trim();
        let importish = trimmed.starts_with("import ")
            || trimmed.starts_with("export ")
            || trimmed.starts_with("use ")
            || trimmed.starts_with("from ");
        if !importish {
            continue;
        }
        let cleaned = trimmed.chars().take(180).collect::<String>();
        if !imports.iter().any(|item| item == &cleaned) {
            imports.push(cleaned);
        }
        if imports.len() >= 30 {
            break;
        }
    }
    imports
}

fn read_index(root: &Path) -> Vec<SemanticIndexEntry> {
    let path = root.join(".sakura/index/semantic.jsonl");
    let Ok(content) = fs::read_to_string(path) else {
        return vec![];
    };
    content
        .lines()
        .filter_map(|line| serde_json::from_str::<SemanticIndexEntry>(line).ok())
        .collect()
}

fn run_shell(root: &Path, command: &str) -> Result<(Option<i32>, String, String), String> {
    #[cfg(target_os = "windows")]
    let output = Command::new("cmd")
        .args(["/C", command])
        .current_dir(root)
        .output();

    #[cfg(not(target_os = "windows"))]
    let output = Command::new("sh")
        .args(["-lc", command])
        .current_dir(root)
        .output();

    let output = output.map_err(|error| error.to_string())?;
    Ok((
        output.status.code(),
        String::from_utf8_lossy(&output.stdout).to_string(),
        String::from_utf8_lossy(&output.stderr).to_string(),
    ))
}

fn run_command_args(
    root: &Path,
    program: &str,
    args: &[&str],
) -> Result<(Option<i32>, String, String), String> {
    let output = Command::new(program)
        .args(args)
        .current_dir(root)
        .output()
        .map_err(|error| error.to_string())?;
    Ok((
        output.status.code(),
        String::from_utf8_lossy(&output.stdout).to_string(),
        String::from_utf8_lossy(&output.stderr).to_string(),
    ))
}

fn parse_diagnostics(source: &str, command: &str, output: &str) -> Vec<Diagnostic> {
    output
        .lines()
        .filter(|line| {
            let lower = line.to_lowercase();
            lower.contains("error") || lower.contains("warning") || lower.contains("failed")
        })
        .take(80)
        .map(|line| {
            let severity = if line.to_lowercase().contains("warning") {
                "warning"
            } else {
                "error"
            };
            Diagnostic {
                source: source.into(),
                severity: severity.into(),
                message: line.trim().chars().take(600).collect(),
                relative_path: line
                    .split(':')
                    .next()
                    .filter(|part| part.contains('.') && !part.contains(' '))
                    .map(|part| part.replace('\\', "/")),
                line_number: line
                    .split(':')
                    .nth(1)
                    .and_then(|part| part.parse::<usize>().ok()),
                command: Some(command.into()),
            }
        })
        .collect()
}

fn copy_dir_contents(src: &Path, dest: &Path) -> Result<(), String> {
    for entry in WalkDir::new(src).into_iter().filter_map(Result::ok) {
        let path = entry.path();
        if path == src {
            continue;
        }
        let rel = path.strip_prefix(src).map_err(|error| error.to_string())?;
        let target = dest.join(rel);
        if entry.file_type().is_dir() {
            fs::create_dir_all(&target).map_err(|error| error.to_string())?;
        } else {
            ensure_parent(&target)?;
            fs::copy(path, target).map_err(|error| error.to_string())?;
        }
    }
    Ok(())
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
        .map(|c| {
            if c.is_ascii_alphanumeric() {
                c.to_ascii_lowercase()
            } else {
                '-'
            }
        })
        .collect::<String>()
        .split('-')
        .filter(|part| !part.is_empty())
        .collect::<Vec<_>>()
        .join("-")
}

fn default_docs(name: &str, _template: &str, workflow_id: &str) -> Vec<(&'static str, String)> {
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
        docs.push((
            "docs/DESIGN_SYSTEM.md",
            "# Design System\n\n## Typography\n\n## Color Palette\n\n## Components (shadcn/ui)\n"
                .into(),
        ));
        docs.push((
            "docs/DATABASE_SCHEMA.md",
            "# Database Schema\n\n## Tables\n\n## Relations\n\n## Migrations (Drizzle)\n".into(),
        ));
        docs.push((
            "docs/DOCKER_SETUP.md",
            "# Docker Setup\n\n## Local Development\n\n## Production Build\n\n## Docker Compose\n"
                .into(),
        ));
        docs.push(("docker/docker-compose.yml", "version: '3.8'\nservices:\n  db:\n    image: postgres:15-alpine\n    environment:\n      POSTGRES_DB: sakura_db\n      POSTGRES_USER: user\n      POSTGRES_PASSWORD: password\n    ports:\n      - \"5432:5432\"\n".into()));
    }

    if workflow_id == "retro-game-dev" {
        docs.push((
            "docs/RETRO_DESIGN.md",
            "# Retro Game Design\n\n## System Constraints\n\n## Palette\n\n## Sprite/Tile Budget\n"
                .into(),
        ));
        docs.push((
            "docs/MEMORY_MAP.md",
            "# Memory Map\n\n## Zero Page / RAM\n\n## ROM Banks\n\n## Hardware Registers\n".into(),
        ));
        docs.push(("Makefile", "# Retro Project Makefile\n\nall: build\n\nbuild:\n\t@echo \"Running retro build...\"\n".into()));
    }

    docs.push(("docs/prompts/QWEN_SYSTEM_PROMPT.md", "# Qwen System Prompt\n\nWorkflow-specific instructions will be injected here based on the active workflow.\n".into()));
    docs.push(("AGENTS.md", "# AGENTS.md\n\n- Plan first.\n- Diff before apply.\n- No destructive commands.\n- Workflow: {workflow_id}\n".into()));
    docs.push(("README.md", format!("# {name}\n\nCreated with Sakura Coder.\nWorkflow: {workflow_id}\n\nRun docs first, then plan, then build.\n")));

    docs
}

fn scaffold_template(
    root: &Path,
    name: &str,
    template: &str,
    workflow_id: &str,
) -> Result<(), String> {
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
    write_text(
        &root.join(".sakura/config.json"),
        &serde_json::to_string_pretty(&project).map_err(|e| e.to_string())?,
    )?;
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
        }))
        .map_err(|e| e.to_string())?,
    )?;

    match template {
        "cloudflare-worker" => write_text(&root.join("src/worker.ts"), "export default {\n  async fetch(request: Request): Promise<Response> {\n    return Response.json({ ok: true, service: 'sakura-worker' });\n  }\n};\n")?,
        "chrome-extension" => {
            write_text(&root.join("manifest.json"), "{\n  \"manifest_version\": 3,\n  \"name\": \"Sakura Extension\",\n  \"version\": \"1.0.0\",\n  \"action\": { \"default_popup\": \"index.html\" }\n}")?;
            write_text(&root.join("index.html"), "<!DOCTYPE html><html><body><h1>Sakura Extension</h1></body></html>")?;
        },
        "python-scripting" => {
            write_text(&root.join("main.py"), "import os\n\ndef main():\n    print('Hello from Sakura Coder!')\n\nif __name__ == '__main__':\n    main()")?;
            write_text(&root.join("requirements.txt"), "numpy\npandas\nmatplotlib\n")?;
        },
        "mobile-app-expo" => write_text(&root.join("app.json"), "{\n  \"expo\": {\n    \"name\": \"Sakura Mobile\",\n    \"slug\": \"sakura-mobile\",\n    \"version\": \"1.0.0\"\n  }\n}")?,
        "phaser-game" | "phaser-asset-heavy-game" => write_text(&root.join("src/main.ts"), "// Phaser starter placeholder. Ask Sakura Build Mode to generate the Phaser 3 app after the GDD is approved.\n")?,
        _ => write_text(&root.join("src/index.ts"), "// Sakura project source entry.\n")?,
    }

    Ok(())
}

#[tauri::command]
fn create_project(
    root_path: String,
    name: String,
    template: String,
    workflow_id: String,
) -> Result<SakuraProject, String> {
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
        // If not a Sakura project, initialize it with "blank" template
        let name = root
            .file_name()
            .and_then(OsStr::to_str)
            .unwrap_or("New Project")
            .to_string();
        scaffold_template(&root, &name, "blank", "general-coding")?;
    }
    let content = fs::read_to_string(config_path).map_err(|error| error.to_string())?;
    serde_json::from_str(&content).map_err(|error| error.to_string())
}

fn node_from_path(root: &Path, path: &Path, max_depth: usize) -> Result<FileNode, String> {
    let metadata = fs::metadata(path).map_err(|error| error.to_string())?;
    let relative = path
        .strip_prefix(root)
        .unwrap_or(path)
        .to_string_lossy()
        .replace('\\', "/");
    let name = path
        .file_name()
        .and_then(OsStr::to_str)
        .unwrap_or(".")
        .to_string();
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
        Ok(FileNode {
            name,
            path: path.to_string_lossy().into(),
            relative_path: relative,
            kind: "directory".into(),
            children: Some(children),
        })
    } else {
        Ok(FileNode {
            name,
            path: path.to_string_lossy().into(),
            relative_path: relative,
            kind: "file".into(),
            children: None,
        })
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
    entries
        .into_iter()
        .map(|path| node_from_path(&root, &path, 4))
        .collect()
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
        if !path.is_file() {
            continue;
        }
        let rel = path
            .strip_prefix(&root)
            .map_err(|error| error.to_string())?;
        let rel_s = rel.to_string_lossy().replace('\\', "/");
        if rel_s.starts_with(".sakura/checkpoints")
            || rel_s.contains("node_modules")
            || rel_s.contains("target/")
            || rel_s.starts_with(".git")
        {
            continue;
        }
        let dest = checkpoint_dir.join(rel);
        ensure_parent(&dest)?;
        fs::copy(path, dest).map_err(|error| error.to_string())?;
    }

    Ok(checkpoint_id)
}

#[tauri::command]
fn write_project_file(
    root_path: String,
    relative_path: String,
    content: String,
    create_checkpoint: bool,
) -> Result<String, String> {
    if is_secret_like(&relative_path) {
        return Err(format!(
            "Refusing to write secret-like file {}.",
            relative_path
        ));
    }
    let checkpoint = if create_checkpoint {
        crate::create_checkpoint(root_path.clone(), format!("before-write-{}", relative_path))?
    } else {
        "no-checkpoint".into()
    };
    let path = resolve_project_path(&root_path, &relative_path)?;
    write_text(&path, &content)?;
    Ok(checkpoint)
}

#[tauri::command]
fn read_project_files(
    root_path: String,
    relative_paths: Vec<String>,
) -> Result<Vec<ProjectFileContent>, String> {
    let mut results = Vec::new();
    for relative_path in relative_paths {
        if is_secret_like(&relative_path) {
            results.push(ProjectFileContent {
                relative_path,
                content: String::new(),
                exists: false,
                error: Some("Secret-like files are excluded from agent context.".into()),
            });
            continue;
        }

        let path = resolve_project_path(&root_path, &relative_path)?;
        match fs::read_to_string(&path) {
            Ok(content) => results.push(ProjectFileContent {
                relative_path,
                content,
                exists: true,
                error: None,
            }),
            Err(error) => results.push(ProjectFileContent {
                relative_path,
                content: String::new(),
                exists: path.exists(),
                error: Some(error.to_string()),
            }),
        }
    }
    Ok(results)
}

#[tauri::command]
fn apply_project_changes(
    root_path: String,
    changes: Vec<ProjectFileChange>,
    create_checkpoint: bool,
) -> Result<ProjectChangeApplyResult, String> {
    if changes.is_empty() {
        return Ok(ProjectChangeApplyResult {
            checkpoint: "no-changes".into(),
            applied: vec![],
        });
    }

    for change in &changes {
        validate_relative_path(&change.relative_path)?;
        if is_secret_like(&change.relative_path) {
            return Err(format!(
                "Refusing to modify secret-like file {}.",
                change.relative_path
            ));
        }
        if let Some(new_relative_path) = &change.new_relative_path {
            validate_relative_path(new_relative_path)?;
            if is_secret_like(new_relative_path) {
                return Err(format!(
                    "Refusing to write secret-like file {}.",
                    new_relative_path
                ));
            }
        }
    }

    let checkpoint = if create_checkpoint {
        crate::create_checkpoint(
            root_path.clone(),
            format!("before-batch-apply-{}-changes", changes.len()),
        )?
    } else {
        "no-checkpoint".into()
    };

    let mut applied = Vec::new();
    for change in changes {
        let path = resolve_project_path(&root_path, &change.relative_path)?;
        match change.action.as_str() {
            "create" => {
                if path.exists() {
                    return Err(format!(
                        "Cannot create {}; file already exists.",
                        change.relative_path
                    ));
                }
                write_text(&path, change.new_content.as_deref().unwrap_or(""))?;
                applied.push(change.relative_path);
            }
            "modify" => {
                if let Some(expected_old) = &change.old_content {
                    let current = fs::read_to_string(&path).map_err(|error| error.to_string())?;
                    if &current != expected_old {
                        return Err(format!(
                            "Stale content for {}; refresh the diff before applying.",
                            change.relative_path
                        ));
                    }
                }
                write_text(&path, change.new_content.as_deref().unwrap_or(""))?;
                applied.push(change.relative_path);
            }
            "delete" => {
                if path.is_dir() {
                    fs::remove_dir_all(&path).map_err(|error| error.to_string())?;
                } else if path.exists() {
                    fs::remove_file(&path).map_err(|error| error.to_string())?;
                }
                applied.push(change.relative_path);
            }
            "rename" => {
                let new_relative_path = change
                    .new_relative_path
                    .as_ref()
                    .ok_or("Rename changes require newRelativePath.")?;
                let dest = resolve_project_path(&root_path, new_relative_path)?;
                ensure_parent(&dest)?;
                fs::rename(&path, &dest).map_err(|error| error.to_string())?;
                if let Some(new_content) = &change.new_content {
                    write_text(&dest, new_content)?;
                }
                applied.push(format!("{} -> {}", change.relative_path, new_relative_path));
            }
            other => return Err(format!("Unsupported change action: {other}")),
        }
    }

    Ok(ProjectChangeApplyResult {
        checkpoint,
        applied,
    })
}

#[tauri::command]
fn write_binary_file(
    root_path: String,
    relative_path: String,
    base64_content: String,
) -> Result<(), String> {
    if is_secret_like(&relative_path) {
        return Err(format!(
            "Refusing to write secret-like file {}.",
            relative_path
        ));
    }
    let path = resolve_project_path(&root_path, &relative_path)?;
    ensure_parent(&path)?;
    let bytes = base64::engine::general_purpose::STANDARD
        .decode(base64_content)
        .map_err(|e| e.to_string())?;
    fs::write(path, bytes).map_err(|error| error.to_string())
}

#[tauri::command]
fn delete_project_file(root_path: String, relative_path: String) -> Result<(), String> {
    if is_secret_like(&relative_path) {
        return Err(format!(
            "Refusing to delete secret-like file {}.",
            relative_path
        ));
    }
    let path = resolve_project_path(&root_path, &relative_path)?;
    if path.is_dir() {
        fs::remove_dir_all(path).map_err(|e| e.to_string())
    } else {
        fs::remove_file(path).map_err(|e| e.to_string())
    }
}

#[tauri::command]
fn create_project_directory(root_path: String, relative_path: String) -> Result<(), String> {
    let path = resolve_project_path(&root_path, &relative_path)?;
    fs::create_dir_all(path).map_err(|e| e.to_string())
}

#[tauri::command]
fn append_session_log(root_path: String, entry: serde_json::Value) -> Result<String, String> {
    let root = normalize_root(&root_path)?;
    let log_path = root.join(".sakura/sessions/session-log.jsonl");
    ensure_parent(&log_path)?;
    let mut file = fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(&log_path)
        .map_err(|error| error.to_string())?;
    let payload = json!({"timestamp": now(), "entry": entry});
    writeln!(file, "{}", payload).map_err(|error| error.to_string())?;
    Ok(log_path.to_string_lossy().to_string())
}

fn command_risk(command: &str) -> (&'static str, bool) {
    let lower = command.to_lowercase();
    let secret_read = [".env", ".pem", ".p12", ".pfx", "/secrets/", "\\secrets\\"];
    let exfil_or_read = [
        "cat ",
        "type ",
        "get-content",
        "gc ",
        "curl ",
        "iwr ",
        "invoke-webrequest",
        "wget ",
        "scp ",
        "copy ",
        "cp ",
    ];
    if secret_read.iter().any(|item| lower.contains(item))
        && exfil_or_read.iter().any(|item| lower.contains(item))
    {
        return ("critical", true);
    }
    let blocked = [
        "rm -rf",
        "del /s",
        "rmdir /s",
        "remove-item -recurse -force",
        "git reset --hard",
        "git clean -fd",
        "powershell -encodedcommand",
        "pwsh -encodedcommand",
        "format ",
        "diskpart",
        "mkfs",
        "dd if=",
        "npm publish",
        "wrangler deploy",
        "vercel deploy --prod",
        "docker system prune",
        "chmod -r 777",
        "chown -r",
        "sudo ",
    ];
    if blocked.iter().any(|item| lower.contains(item)) {
        return ("critical", true);
    }
    let high = [
        "npm install",
        "pnpm add",
        "yarn add",
        "git push",
        "git commit",
        "git merge",
        "git rebase",
        "pip install",
        "cargo add",
    ];
    if high.iter().any(|item| lower.contains(item)) {
        return ("high", false);
    }
    ("low", false)
}

#[tauri::command]
fn run_safe_command(
    root_path: String,
    command: String,
    mode: String,
    user_approved: bool,
) -> Result<TerminalCommandResult, String> {
    let root = normalize_root(&root_path)?;
    let (risk, blocked) = command_risk(&command);
    if blocked
        || (risk == "high" && !user_approved)
        || !(mode == "build" || mode == "debug" || mode == "refactor" || mode == "release")
    {
        return Ok(TerminalCommandResult {
            command,
            cwd: root.to_string_lossy().into(),
            exit_code: None,
            stdout: "".into(),
            stderr: "Command blocked by Sakura safety gate.".into(),
            risk_level: risk.into(),
            blocked: true,
        });
    }

    #[cfg(target_os = "windows")]
    let output = Command::new("cmd")
        .args(["/C", &command])
        .current_dir(&root)
        .output();

    #[cfg(not(target_os = "windows"))]
    let output = Command::new("sh")
        .args(["-lc", &command])
        .current_dir(&root)
        .output();

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
fn save_generated_asset(
    root_path: String,
    asset: GeneratedAsset,
    uri: Option<String>,
) -> Result<GeneratedAsset, String> {
    let root = normalize_root(&root_path)?;
    validate_file_name(&asset.filename)?;
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
                let bytes = base64::engine::general_purpose::STANDARD
                    .decode(data)
                    .map_err(|e| e.to_string())?;
                fs::write(asset_dir.join(&asset.filename), bytes)
                    .map_err(|error| error.to_string())?;
            }
        }
    }

    let metadata_path = root
        .join(".sakura/image-generations")
        .join(format!("{}.json", asset.id));
    write_text(
        &metadata_path,
        &serde_json::to_string_pretty(&asset).map_err(|error| error.to_string())?,
    )?;
    Ok(asset)
}

#[derive(Debug, Serialize, Deserialize, Clone)]
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
    #[serde(rename = "loop")]
    pub loop_audio: bool,
    pub bpm: Option<i32>,
    pub key: Option<String>,
    pub preview_url: Option<String>,
}

#[tauri::command]
fn save_generated_audio(
    root_path: String,
    audio: GeneratedAudio,
    uri: Option<String>,
) -> Result<GeneratedAudio, String> {
    let root = normalize_root(&root_path)?;
    validate_file_name(&audio.filename)?;
    let audio_dir = root.join("assets/generated/audio");
    fs::create_dir_all(&audio_dir).map_err(|error| error.to_string())?;

    // Handle data URI: "data:audio/mpeg;base64,..." or "data:audio/wav;base64,..."
    if let Some(uri) = uri {
        let parts: Vec<&str> = uri.splitn(2, ',').collect();
        if parts.len() == 2 {
            let data = parts[1];
            let bytes = base64::engine::general_purpose::STANDARD
                .decode(data)
                .map_err(|e| e.to_string())?;
            fs::write(audio_dir.join(&audio.filename), bytes).map_err(|error| error.to_string())?;
        }
    }

    let metadata_path = root
        .join(".sakura/audio-generations")
        .join(format!("{}.json", audio.id));
    write_text(
        &metadata_path,
        &serde_json::to_string_pretty(&audio).map_err(|error| error.to_string())?,
    )?;
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
    let query_lower = query.to_lowercase();

    for entry in WalkDir::new(&root).into_iter().filter_map(Result::ok) {
        if entry.file_type().is_file() {
            let path = entry.path();
            // Skip binary files and hidden folders
            if path.to_string_lossy().contains(".sakura")
                || path.to_string_lossy().contains("node_modules")
            {
                continue;
            }

            if let Ok(content) = fs::read_to_string(path) {
                for (i, line) in content.lines().enumerate() {
                    if line.to_lowercase().contains(&query_lower) {
                        results.push(SearchResult {
                            path: path.to_string_lossy().into_owned(),
                            relative_path: path
                                .strip_prefix(&root)
                                .unwrap_or(path)
                                .to_string_lossy()
                                .into_owned(),
                            line_number: i + 1,
                            line_content: line.trim().to_string(),
                        });
                        if results.len() > 100 {
                            break;
                        } // Limit results
                    }
                }
            }
        }
        if results.len() > 100 {
            break;
        }
    }
    Ok(results)
}

fn collect_tree_summary(root: &Path, max_entries: usize) -> Vec<String> {
    let mut entries = Vec::new();
    for entry in WalkDir::new(root)
        .max_depth(4)
        .into_iter()
        .filter_map(Result::ok)
    {
        if entries.len() >= max_entries {
            break;
        }
        let path = entry.path();
        if path == root {
            continue;
        }
        let rel = normalized_relative_path(root, path);
        if is_ignored_context_path(&rel) || is_secret_like(&rel) {
            continue;
        }
        if entry.file_type().is_dir() {
            entries.push(format!("{rel}/"));
        } else if is_probably_text_file(&rel) {
            entries.push(rel);
        }
    }
    entries
}

fn query_terms(input: &str) -> Vec<String> {
    let stop = [
        "the", "and", "for", "with", "that", "this", "from", "into", "please", "sakura",
    ];
    let mut seen = HashSet::new();
    input
        .split(|c: char| !c.is_ascii_alphanumeric() && c != '_' && c != '-')
        .map(|term| term.trim().to_lowercase())
        .filter(|term| term.len() >= 4 && !stop.contains(&term.as_str()))
        .filter(|term| seen.insert(term.clone()))
        .take(8)
        .collect()
}

fn search_project_terms(root: &Path, terms: &[String], max_results: usize) -> Vec<SearchResult> {
    if terms.is_empty() {
        return vec![];
    }

    let mut results = Vec::new();
    for entry in WalkDir::new(root).into_iter().filter_map(Result::ok) {
        if results.len() >= max_results {
            break;
        }
        if !entry.file_type().is_file() {
            continue;
        }
        let path = entry.path();
        let rel = normalized_relative_path(root, path);
        if is_ignored_context_path(&rel) || is_secret_like(&rel) || !is_probably_text_file(&rel) {
            continue;
        }
        if let Ok(content) = fs::read_to_string(path) {
            for (i, line) in content.lines().enumerate() {
                let lower = line.to_lowercase();
                if terms.iter().any(|term| lower.contains(term)) {
                    results.push(SearchResult {
                        path: path.to_string_lossy().into_owned(),
                        relative_path: rel.clone(),
                        line_number: i + 1,
                        line_content: line.trim().chars().take(240).collect(),
                    });
                    if results.len() >= max_results {
                        break;
                    }
                }
            }
        }
    }
    results
}

fn add_context_file(
    root: &Path,
    relative_path: &str,
    reason: &str,
    seen: &mut HashSet<String>,
    files: &mut Vec<ProjectContextFile>,
    dropped_files: &mut Vec<String>,
    total_chars: &mut usize,
    max_file_chars: usize,
    max_total_chars: usize,
) {
    let normalized = relative_path.replace('\\', "/");
    if seen.contains(&normalized) {
        return;
    }
    if is_ignored_context_path(&normalized)
        || is_secret_like(&normalized)
        || !is_probably_text_file(&normalized)
    {
        dropped_files.push(normalized);
        return;
    }
    let path = root.join(&normalized);
    let Ok(mut content) = fs::read_to_string(&path) else {
        dropped_files.push(normalized);
        return;
    };

    let mut truncated = false;
    if content.len() > max_file_chars {
        content.truncate(max_file_chars);
        content.push_str("\n[truncated]");
        truncated = true;
    }

    if *total_chars + content.len() > max_total_chars {
        dropped_files.push(normalized);
        return;
    }

    *total_chars += content.len();
    seen.insert(normalized.clone());
    files.push(ProjectContextFile {
        relative_path: normalized,
        content,
        reason: reason.into(),
        truncated,
    });
}

fn collect_diff_summaries(root: &Path, max_entries: usize) -> Vec<String> {
    let diff_dir = root.join(".sakura/diffs");
    if !diff_dir.exists() {
        return vec![];
    }
    let mut entries = fs::read_dir(diff_dir)
        .ok()
        .into_iter()
        .flat_map(|items| items.filter_map(Result::ok))
        .filter(|entry| entry.path().is_file())
        .collect::<Vec<_>>();
    entries.sort_by_key(|entry| entry.metadata().and_then(|m| m.modified()).ok());
    entries
        .into_iter()
        .rev()
        .take(max_entries)
        .map(|entry| entry.file_name().to_string_lossy().into_owned())
        .collect()
}

#[tauri::command]
fn build_project_context(
    root_path: String,
    user_message: String,
    open_file_relative_path: Option<String>,
) -> Result<ProjectContextBundle, String> {
    let root = normalize_root(&root_path)?;
    let mut files = Vec::new();
    let mut dropped_files = Vec::new();
    let mut seen = HashSet::new();
    let mut total_chars = 0usize;
    let max_file_chars = 8_000usize;
    let max_total_chars = 42_000usize;

    if let Some(open_file) = open_file_relative_path.as_deref() {
        add_context_file(
            &root,
            open_file,
            "open file",
            &mut seen,
            &mut files,
            &mut dropped_files,
            &mut total_chars,
            max_file_chars,
            max_total_chars,
        );
    }

    for priority in [
        "AGENTS.md",
        "README.md",
        "package.json",
        "Cargo.toml",
        "tsconfig.json",
        "vite.config.ts",
        "docs/00_CONTEXT.md",
        "docs/02_ARCHITECTURE.md",
        "docs/03_IMPLEMENTATION_PLAN.md",
    ] {
        add_context_file(
            &root,
            priority,
            "priority project file",
            &mut seen,
            &mut files,
            &mut dropped_files,
            &mut total_chars,
            max_file_chars,
            max_total_chars,
        );
    }

    let terms = query_terms(&user_message);
    let search_results = search_project_terms(&root, &terms, 30);
    for result in search_results.iter().take(6) {
        add_context_file(
            &root,
            &result.relative_path,
            "search hit",
            &mut seen,
            &mut files,
            &mut dropped_files,
            &mut total_chars,
            max_file_chars,
            max_total_chars,
        );
    }

    let memory_path = root.join(".sakura/memory.json");
    let memory = fs::read_to_string(memory_path)
        .ok()
        .and_then(|content| serde_json::from_str(&content).ok());

    Ok(ProjectContextBundle {
        files,
        file_tree_summary: collect_tree_summary(&root, 240),
        search_results,
        memory,
        diff_summaries: collect_diff_summaries(&root, 8),
        truncated: !dropped_files.is_empty(),
        dropped_files,
    })
}

#[tauri::command]
fn build_semantic_index(root_path: String) -> Result<Vec<SemanticIndexEntry>, String> {
    let root = normalize_root(&root_path)?;
    let index_dir = root.join(".sakura/index");
    fs::create_dir_all(&index_dir).map_err(|error| error.to_string())?;

    let mut entries = Vec::new();
    for entry in WalkDir::new(&root).into_iter().filter_map(Result::ok) {
        if !entry.file_type().is_file() {
            continue;
        }
        let path = entry.path();
        let relative_path = normalized_relative_path(&root, path);
        if is_ignored_context_path(&relative_path)
            || is_secret_like(&relative_path)
            || !is_probably_text_file(&relative_path)
        {
            continue;
        }
        let Ok(content) = fs::read_to_string(path) else {
            continue;
        };
        let preview = content
            .lines()
            .filter(|line| !line.trim().is_empty())
            .take(18)
            .collect::<Vec<_>>()
            .join("\n")
            .chars()
            .take(1_500)
            .collect::<String>();
        entries.push(SemanticIndexEntry {
            relative_path,
            language: infer_language(&normalized_relative_path(&root, path)),
            symbols: extract_symbols(&content),
            imports: extract_imports(&content),
            preview,
            line_count: content.lines().count(),
            updated_at: now(),
        });
    }

    entries.sort_by(|a, b| a.relative_path.cmp(&b.relative_path));
    let index_path = index_dir.join("semantic.jsonl");
    let mut file = fs::OpenOptions::new()
        .create(true)
        .truncate(true)
        .write(true)
        .open(&index_path)
        .map_err(|error| error.to_string())?;
    for entry in &entries {
        writeln!(
            file,
            "{}",
            serde_json::to_string(entry).map_err(|error| error.to_string())?
        )
        .map_err(|error| error.to_string())?;
    }
    Ok(entries)
}

#[tauri::command]
fn query_semantic_index(
    root_path: String,
    query: String,
) -> Result<Vec<SemanticSearchResult>, String> {
    let root = normalize_root(&root_path)?;
    let mut entries = read_index(&root);
    if entries.is_empty() {
        entries = build_semantic_index(root_path)?;
    }

    let terms = query_terms(&query);
    let raw_query = query.to_lowercase();
    let mut results = entries
        .into_iter()
        .filter_map(|entry| {
            let haystack = format!(
                "{}\n{}\n{}\n{}",
                entry.relative_path,
                entry.symbols.join("\n"),
                entry.imports.join("\n"),
                entry.preview
            )
            .to_lowercase();
            let mut score = 0;
            if !raw_query.trim().is_empty() && haystack.contains(raw_query.trim()) {
                score += 20;
            }
            for term in &terms {
                if entry.relative_path.to_lowercase().contains(term) {
                    score += 8;
                }
                if entry
                    .symbols
                    .iter()
                    .any(|symbol| symbol.to_lowercase().contains(term))
                {
                    score += 10;
                }
                if haystack.contains(term) {
                    score += 4;
                }
            }
            if score == 0 {
                return None;
            }
            Some(SemanticSearchResult {
                relative_path: entry.relative_path,
                score,
                symbols: entry.symbols,
                imports: entry.imports,
                preview: entry.preview,
            })
        })
        .collect::<Vec<_>>();
    results.sort_by(|a, b| {
        b.score
            .cmp(&a.score)
            .then_with(|| a.relative_path.cmp(&b.relative_path))
    });
    results.truncate(20);
    Ok(results)
}

#[tauri::command]
fn get_diagnostics(root_path: String) -> Result<Vec<Diagnostic>, String> {
    let root = normalize_root(&root_path)?;
    let mut diagnostics = Vec::new();

    if root.join("package.json").exists() {
        let package = fs::read_to_string(root.join("package.json")).unwrap_or_default();
        let scripts = serde_json::from_str::<serde_json::Value>(&package)
            .ok()
            .and_then(|value| value.get("scripts").cloned())
            .unwrap_or_else(|| json!({}));
        for (source, command) in [
            ("typescript", "npm run typecheck"),
            ("eslint", "npm run lint"),
        ] {
            if scripts
                .get(source.strip_suffix("script").unwrap_or(source))
                .is_some()
                || (source == "typescript" && scripts.get("typecheck").is_some())
                || (source == "eslint" && scripts.get("lint").is_some())
            {
                let (_code, stdout, stderr) = run_shell(&root, command)?;
                diagnostics.extend(parse_diagnostics(
                    source,
                    command,
                    &format!("{stdout}\n{stderr}"),
                ));
            }
        }
    }

    if root.join("Cargo.toml").exists() {
        let (_code, stdout, stderr) = run_shell(&root, "cargo check")?;
        diagnostics.extend(parse_diagnostics(
            "rust",
            "cargo check",
            &format!("{stdout}\n{stderr}"),
        ));
    }

    Ok(diagnostics)
}

#[tauri::command]
fn git_status(root_path: String) -> Result<GitStatus, String> {
    let root = normalize_root(&root_path)?;
    let (_branch_code, branch_stdout, _branch_stderr) =
        run_command_args(&root, "git", &["branch", "--show-current"])?;
    let (_status_code, status_stdout, _status_stderr) =
        run_command_args(&root, "git", &["status", "--porcelain"])?;
    let files = status_stdout
        .lines()
        .filter_map(|line| {
            if line.len() < 4 {
                return None;
            }
            Some(GitFileStatus {
                status: line.chars().take(2).collect::<String>().trim().to_string(),
                path: line.chars().skip(3).collect::<String>().replace('\\', "/"),
            })
        })
        .collect::<Vec<_>>();
    Ok(GitStatus {
        branch: branch_stdout.trim().to_string(),
        clean: files.is_empty(),
        files,
    })
}

#[tauri::command]
fn git_diff(root_path: String, staged: bool) -> Result<String, String> {
    let root = normalize_root(&root_path)?;
    let args = if staged {
        vec!["diff", "--staged"]
    } else {
        vec!["diff"]
    };
    let (_code, stdout, stderr) = run_command_args(&root, "git", &args)?;
    Ok(format!("{stdout}{stderr}"))
}

#[tauri::command]
fn git_commit(root_path: String, message: String, user_approved: bool) -> Result<String, String> {
    if !user_approved {
        return Err("Git commit requires explicit user approval.".into());
    }
    let root = normalize_root(&root_path)?;
    let (add_code, _add_stdout, add_stderr) = run_command_args(&root, "git", &["add", "-A"])?;
    if add_code != Some(0) {
        return Err(add_stderr);
    }
    let (commit_code, commit_stdout, commit_stderr) =
        run_command_args(&root, "git", &["commit", "-m", &message])?;
    if commit_code != Some(0) {
        return Err(format!("{commit_stdout}{commit_stderr}"));
    }
    Ok(commit_stdout)
}

#[tauri::command]
fn restore_checkpoint(root_path: String, checkpoint: String) -> Result<String, String> {
    if checkpoint.trim().is_empty()
        || checkpoint.contains("..")
        || checkpoint.contains('/')
        || checkpoint.contains('\\')
    {
        return Err("Invalid checkpoint id.".into());
    }
    let root = normalize_root(&root_path)?;
    let checkpoint_dir = root.join(".sakura/checkpoints").join(&checkpoint);
    if !checkpoint_dir.is_dir() {
        return Err("Checkpoint not found.".into());
    }
    let guard = create_checkpoint(root_path.clone(), format!("before-restore-{checkpoint}"))?;
    copy_dir_contents(&checkpoint_dir, &root)?;
    Ok(guard)
}

#[tauri::command]
fn list_rules(root_path: String) -> Result<Vec<Rule>, String> {
    let root = normalize_root(&root_path)?;
    let mut rules = Vec::new();

    for entry in WalkDir::new(&root)
        .max_depth(6)
        .into_iter()
        .filter_map(Result::ok)
    {
        if !entry.file_type().is_file() {
            continue;
        }
        let path = entry.path();
        let rel = normalized_relative_path(&root, path);
        let is_agent_rule = path.file_name() == Some(OsStr::new("AGENTS.md"));
        let is_local_rule = rel.starts_with(".sakura/rules/") && rel.ends_with(".md");
        if !is_agent_rule && !is_local_rule {
            continue;
        }
        if let Ok(content) = fs::read_to_string(path) {
            let scope = if is_agent_rule {
                path.parent()
                    .and_then(|parent| parent.strip_prefix(&root).ok())
                    .map(|parent| parent.to_string_lossy().replace('\\', "/"))
                    .filter(|scope| !scope.is_empty())
                    .unwrap_or_else(|| "/".into())
            } else {
                "global".into()
            };
            rules.push(Rule {
                id: slugify(&rel),
                scope,
                relative_path: rel,
                content,
                enabled: true,
            });
        }
    }

    rules.sort_by(|a, b| a.relative_path.cmp(&b.relative_path));
    Ok(rules)
}

#[tauri::command]
fn list_memories(root_path: String) -> Result<Vec<Memory>, String> {
    let root = normalize_root(&root_path)?;
    let memory_path = root.join(".sakura/memories/memories.jsonl");
    let Ok(content) = fs::read_to_string(memory_path) else {
        return Ok(vec![]);
    };
    Ok(content
        .lines()
        .filter_map(|line| serde_json::from_str::<Memory>(line).ok())
        .collect())
}

#[tauri::command]
fn save_memory(root_path: String, content: String, source: String) -> Result<Memory, String> {
    let root = normalize_root(&root_path)?;
    let memory = Memory {
        id: format!("memory-{}", Utc::now().timestamp_millis()),
        content,
        source,
        created_at: now(),
    };
    let memory_path = root.join(".sakura/memories/memories.jsonl");
    ensure_parent(&memory_path)?;
    let mut file = fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(memory_path)
        .map_err(|error| error.to_string())?;
    writeln!(
        file,
        "{}",
        serde_json::to_string(&memory).map_err(|error| error.to_string())?
    )
    .map_err(|error| error.to_string())?;
    Ok(memory)
}

#[tauri::command]
fn delete_memory(root_path: String, memory_id: String) -> Result<Vec<Memory>, String> {
    let root = normalize_root(&root_path)?;
    let memories = list_memories(root_path)?
        .into_iter()
        .filter(|memory| memory.id != memory_id)
        .collect::<Vec<_>>();
    let memory_path = root.join(".sakura/memories/memories.jsonl");
    ensure_parent(&memory_path)?;
    let mut file = fs::OpenOptions::new()
        .create(true)
        .truncate(true)
        .write(true)
        .open(memory_path)
        .map_err(|error| error.to_string())?;
    for memory in &memories {
        writeln!(
            file,
            "{}",
            serde_json::to_string(memory).map_err(|error| error.to_string())?
        )
        .map_err(|error| error.to_string())?;
    }
    Ok(memories)
}

#[tauri::command]
fn list_mcp_servers(root_path: String) -> Result<Vec<McpServer>, String> {
    let root = normalize_root(&root_path)?;
    let config_path = root.join(".sakura/mcp.json");
    if !config_path.exists() {
        return Ok(vec![]);
    }
    let content = fs::read_to_string(config_path).map_err(|error| error.to_string())?;
    let value =
        serde_json::from_str::<serde_json::Value>(&content).map_err(|error| error.to_string())?;
    let servers_value = value.get("servers").cloned().unwrap_or(value);
    if servers_value.is_array() {
        return serde_json::from_value::<Vec<McpServer>>(servers_value)
            .map_err(|error| error.to_string());
    }

    let mut servers = Vec::new();
    if let Some(map) = servers_value.as_object() {
        for (id, server_value) in map {
            let name = server_value
                .get("name")
                .and_then(|value| value.as_str())
                .unwrap_or(id);
            let command = server_value
                .get("command")
                .and_then(|value| value.as_str())
                .unwrap_or("");
            let args = server_value
                .get("args")
                .and_then(|value| value.as_array())
                .map(|items| {
                    items
                        .iter()
                        .filter_map(|item| item.as_str().map(|value| value.to_string()))
                        .collect::<Vec<_>>()
                })
                .unwrap_or_default();
            let enabled = server_value
                .get("enabled")
                .and_then(|value| value.as_bool())
                .unwrap_or(false);
            let approval_mode = server_value
                .get("approvalMode")
                .or_else(|| server_value.get("approval_mode"))
                .and_then(|value| value.as_str())
                .unwrap_or("prompt")
                .to_string();
            servers.push(McpServer {
                id: id.to_string(),
                name: name.to_string(),
                command: command.to_string(),
                args,
                enabled,
                approval_mode,
            });
        }
    }
    Ok(servers)
}

#[tauri::command]
fn save_mcp_servers(root_path: String, servers: Vec<McpServer>) -> Result<Vec<McpServer>, String> {
    let root = normalize_root(&root_path)?;
    let config_path = root.join(".sakura/mcp.json");
    ensure_parent(&config_path)?;
    let mut server_map = serde_json::Map::new();
    for server in &servers {
        server_map.insert(
            server.id.clone(),
            json!({
                "name": server.name,
                "command": server.command,
                "args": server.args,
                "enabled": server.enabled,
                "approvalMode": server.approval_mode,
            }),
        );
    }
    write_text(
        &config_path,
        &serde_json::to_string_pretty(&json!({ "servers": server_map }))
            .map_err(|error| error.to_string())?,
    )?;
    Ok(servers)
}

#[tauri::command]
fn call_mcp_tool(
    root_path: String,
    server_id: String,
    tool_name: String,
    args: serde_json::Value,
    user_approved: bool,
) -> Result<AgentToolResult, String> {
    let root = normalize_root(&root_path)?;
    let server = list_mcp_servers(root_path)?
        .into_iter()
        .find(|server| server.id == server_id)
        .ok_or("MCP server not found.")?;
    if !server.enabled {
        return Err("MCP server is disabled.".into());
    }
    if !user_approved {
        return Err("MCP tool call requires approval.".into());
    }
    if server.command.trim().is_empty() {
        return Err("MCP server command is empty.".into());
    }
    let output = Command::new(&server.command)
        .args(&server.args)
        .arg(&tool_name)
        .arg(args.to_string())
        .current_dir(root)
        .output()
        .map_err(|error| error.to_string())?;
    Ok(AgentToolResult {
        tool_name,
        ok: output.status.success(),
        output: json!({
            "exitCode": output.status.code(),
            "stdout": String::from_utf8_lossy(&output.stdout).to_string(),
            "stderr": String::from_utf8_lossy(&output.stderr).to_string(),
        }),
        error: if output.status.success() {
            None
        } else {
            Some(String::from_utf8_lossy(&output.stderr).to_string())
        },
    })
}

#[tauri::command]
fn run_preview_check(root_path: String, url: Option<String>) -> Result<PreviewSession, String> {
    let root = normalize_root(&root_path)?;
    let mut notes = Vec::new();
    let detected_url = if let Some(url) = url {
        notes.push("Using requested preview URL.".into());
        Some(url)
    } else if root.join("package.json").exists() {
        let package = fs::read_to_string(root.join("package.json")).unwrap_or_default();
        let has_dev = serde_json::from_str::<serde_json::Value>(&package)
            .ok()
            .and_then(|value| value.get("scripts").cloned())
            .and_then(|scripts| scripts.get("dev").cloned())
            .is_some();
        if has_dev {
            notes.push("Detected package.json dev script. Start or reuse the dev server, then inspect the iframe preview.".into());
            Some("http://127.0.0.1:5173".into())
        } else {
            notes.push("No dev script found in package.json.".into());
            None
        }
    } else if root.join("index.html").exists() {
        notes.push("Detected static index.html preview.".into());
        Some(format!(
            "file:///{}",
            root.join("index.html").to_string_lossy().replace('\\', "/")
        ))
    } else {
        notes.push("No preview entry point detected.".into());
        None
    };

    Ok(PreviewSession {
        id: format!("preview-{}", Utc::now().timestamp_millis()),
        url: detected_url,
        status: "inspected".into(),
        notes,
        screenshot_path: None,
        created_at: now(),
    })
}

#[tauri::command]
fn list_background_jobs(root_path: String) -> Result<Vec<BackgroundJob>, String> {
    let root = normalize_root(&root_path)?;
    let jobs_dir = root.join(".sakura/jobs");
    if !jobs_dir.exists() {
        return Ok(vec![]);
    }
    let mut jobs = fs::read_dir(jobs_dir)
        .map_err(|error| error.to_string())?
        .filter_map(Result::ok)
        .filter_map(|entry| fs::read_to_string(entry.path()).ok())
        .filter_map(|content| serde_json::from_str::<BackgroundJob>(&content).ok())
        .collect::<Vec<_>>();
    jobs.sort_by(|a, b| b.updated_at.cmp(&a.updated_at));
    Ok(jobs)
}

#[tauri::command]
fn create_background_job(root_path: String, goal: String) -> Result<BackgroundJob, String> {
    let root = normalize_root(&root_path)?;
    let job = BackgroundJob {
        id: format!("job-{}", Utc::now().timestamp_millis()),
        goal,
        status: "queued".into(),
        created_at: now(),
        updated_at: now(),
        log: vec!["Job queued locally.".into()],
    };
    let job_path = root.join(".sakura/jobs").join(format!("{}.json", job.id));
    ensure_parent(&job_path)?;
    write_text(
        &job_path,
        &serde_json::to_string_pretty(&job).map_err(|error| error.to_string())?,
    )?;
    Ok(job)
}

#[tauri::command]
fn update_background_job(
    root_path: String,
    job_id: String,
    status: String,
    log_entry: Option<String>,
) -> Result<BackgroundJob, String> {
    let root = normalize_root(&root_path)?;
    if job_id.contains("..") || job_id.contains('/') || job_id.contains('\\') {
        return Err("Invalid job id.".into());
    }
    let job_path = root.join(".sakura/jobs").join(format!("{job_id}.json"));
    let content = fs::read_to_string(&job_path).map_err(|error| error.to_string())?;
    let mut job =
        serde_json::from_str::<BackgroundJob>(&content).map_err(|error| error.to_string())?;
    job.status = status;
    job.updated_at = now();
    if let Some(entry) = log_entry {
        job.log.push(entry);
    }
    write_text(
        &job_path,
        &serde_json::to_string_pretty(&job).map_err(|error| error.to_string())?,
    )?;
    Ok(job)
}

#[tauri::command]
fn execute_agent_tool(
    root_path: String,
    tool_name: String,
    args: serde_json::Value,
    mode: String,
    user_approved: bool,
) -> Result<AgentToolResult, String> {
    let result = match tool_name.as_str() {
        "list_project_tree" => json!(list_project_tree(root_path.clone())?),
        "search_project" => {
            let query = args
                .get("query")
                .and_then(|value| value.as_str())
                .unwrap_or("")
                .to_string();
            json!(search_project(root_path.clone(), query)?)
        }
        "read_project_files" => {
            let relative_paths = args
                .get("relativePaths")
                .or_else(|| args.get("relative_paths"))
                .and_then(|value| value.as_array())
                .map(|items| {
                    items
                        .iter()
                        .filter_map(|item| item.as_str().map(|value| value.to_string()))
                        .collect::<Vec<_>>()
                })
                .unwrap_or_default();
            json!(read_project_files(root_path.clone(), relative_paths)?)
        }
        "propose_file_changes" => args.clone(),
        "run_safe_command" => {
            let command = args
                .get("command")
                .and_then(|value| value.as_str())
                .unwrap_or("")
                .to_string();
            json!(run_safe_command(
                root_path.clone(),
                command,
                mode,
                user_approved
            )?)
        }
        "build_project_context" => {
            let message = args
                .get("message")
                .and_then(|value| value.as_str())
                .unwrap_or("")
                .to_string();
            let open_file = args
                .get("openFile")
                .and_then(|value| value.as_str())
                .map(|value| value.to_string());
            json!(build_project_context(
                root_path.clone(),
                message,
                open_file
            )?)
        }
        "build_semantic_index" => json!(build_semantic_index(root_path.clone())?),
        "query_semantic_index" => {
            let query = args
                .get("query")
                .and_then(|value| value.as_str())
                .unwrap_or("")
                .to_string();
            json!(query_semantic_index(root_path.clone(), query)?)
        }
        "get_diagnostics" => json!(get_diagnostics(root_path.clone())?),
        "git_status" => json!(git_status(root_path.clone())?),
        "git_diff" => {
            let staged = args
                .get("staged")
                .and_then(|value| value.as_bool())
                .unwrap_or(false);
            json!(git_diff(root_path.clone(), staged)?)
        }
        "list_checkpoints" => json!(list_checkpoints(root_path.clone())?),
        "restore_checkpoint" => {
            if !user_approved {
                return Ok(AgentToolResult {
                    tool_name,
                    ok: false,
                    output: json!({}),
                    error: Some("Checkpoint restore requires explicit approval.".into()),
                });
            }
            let checkpoint = args
                .get("checkpoint")
                .and_then(|value| value.as_str())
                .unwrap_or("")
                .to_string();
            json!(restore_checkpoint(root_path.clone(), checkpoint)?)
        }
        "list_rules" => json!(list_rules(root_path.clone())?),
        "list_memories" => json!(list_memories(root_path.clone())?),
        "list_mcp_servers" => json!(list_mcp_servers(root_path.clone())?),
        "call_mcp_tool" => {
            let server_id = args
                .get("serverId")
                .and_then(|value| value.as_str())
                .unwrap_or("")
                .to_string();
            let nested_tool_name = args
                .get("toolName")
                .and_then(|value| value.as_str())
                .unwrap_or("")
                .to_string();
            let tool_args = args.get("args").cloned().unwrap_or_else(|| json!({}));
            return call_mcp_tool(
                root_path,
                server_id,
                nested_tool_name,
                tool_args,
                user_approved,
            );
        }
        "run_preview_check" | "refresh_visual_preview" => {
            let url = args
                .get("url")
                .and_then(|value| value.as_str())
                .map(|value| value.to_string());
            json!(run_preview_check(root_path.clone(), url)?)
        }
        "create_background_job" => {
            let goal = args
                .get("goal")
                .and_then(|value| value.as_str())
                .unwrap_or("")
                .to_string();
            json!(create_background_job(root_path.clone(), goal)?)
        }
        "list_background_jobs" => json!(list_background_jobs(root_path.clone())?),
        other => {
            return Ok(AgentToolResult {
                tool_name: other.into(),
                ok: false,
                output: json!({}),
                error: Some(format!("Unknown Sakura agent tool: {other}")),
            });
        }
    };

    Ok(AgentToolResult {
        tool_name,
        ok: true,
        output: result,
        error: None,
    })
}

#[tauri::command]
fn list_checkpoints(root_path: String) -> Result<Vec<String>, String> {
    let root = normalize_root(&root_path)?;
    let checkpoints_dir = root.join(".sakura/checkpoints");
    if !checkpoints_dir.exists() {
        return Ok(vec![]);
    }
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
    if !memory_path.exists() {
        return Err("No memory found.".into());
    }
    let content = fs::read_to_string(memory_path).map_err(|error| error.to_string())?;
    serde_json::from_str(&content).map_err(|error| error.to_string())
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_http::init())
        .invoke_handler(tauri::generate_handler![
            create_project,
            load_project,
            list_project_tree,
            read_project_file,
            read_project_files,
            write_project_file,
            apply_project_changes,
            write_binary_file,
            delete_project_file,
            create_project_directory,
            create_checkpoint,
            append_session_log,
            run_safe_command,
            save_generated_asset,
            save_generated_audio,
            list_checkpoints,
            restore_checkpoint,
            load_project_memory,
            build_project_context,
            build_semantic_index,
            query_semantic_index,
            get_diagnostics,
            git_status,
            git_diff,
            git_commit,
            list_rules,
            list_memories,
            save_memory,
            delete_memory,
            list_mcp_servers,
            save_mcp_servers,
            call_mcp_tool,
            run_preview_check,
            list_background_jobs,
            create_background_job,
            update_background_job,
            execute_agent_tool,
            search_project
        ])
        .run(tauri::generate_context!())
        .expect("error while running Sakura Coder");
}
