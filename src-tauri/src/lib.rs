// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
mod skill_scanner;

use std::path::Path;
use std::process::Command;
use std::time::{SystemTime, UNIX_EPOCH};

use serde::{Deserialize, Serialize};

use skill_scanner::{SkillScanRequest, SkillScanResult};

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

/// Read-only scan of the default local Skill roots for the given workspace.
/// Thin wrapper over [`skill_scanner::run_scan`]; all scanning logic lives in
/// the `skill_scanner` module.
#[tauri::command]
fn scan_local_skills(request: SkillScanRequest) -> Result<SkillScanResult, String> {
    skill_scanner::run_scan(&request.root_path)
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct WorkspaceStatusRequest {
    root_path: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct GitStatus {
    branch_line: String,
    branch_name: String,
    is_clean: bool,
    ahead_behind: String,
    raw_status: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct HandoffSummary {
    exists: bool,
    path: String,
    current_goal: Vec<String>,
    last_known_next_step: Vec<String>,
    important_constraints: Vec<String>,
    raw_excerpt: String,
    error: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct AgentsSummary {
    exists: bool,
    path: String,
    excerpt: String,
    error: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct WorkspaceStatus {
    workspace_name: String,
    root_path: String,
    git: GitStatus,
    handoff: HandoffSummary,
    agents: AgentsSummary,
    fetched_at: String,
}

/// Read-only snapshot of a local workspace: git status, HANDOFF.md and AGENTS.md.
/// Never panics; unreadable files are reported inside their summary rather than
/// failing the whole command.
#[tauri::command]
fn read_workspace_status(request: WorkspaceStatusRequest) -> Result<WorkspaceStatus, String> {
    let root_path = request.root_path;
    if root_path.trim().is_empty() {
        return Err("root_path is empty".to_string());
    }

    let root = Path::new(&root_path);
    let workspace_name = root
        .file_name()
        .and_then(|name| name.to_str())
        .map(|name| name.to_string())
        .filter(|name| !name.is_empty())
        .unwrap_or_else(|| root_path.clone());

    Ok(WorkspaceStatus {
        workspace_name,
        root_path: root_path.clone(),
        git: read_git_status(&root_path),
        handoff: read_handoff(root),
        agents: read_agents(root),
        fetched_at: current_timestamp_millis(),
    })
}

fn current_timestamp_millis() -> String {
    match SystemTime::now().duration_since(UNIX_EPOCH) {
        Ok(elapsed) => elapsed.as_millis().to_string(),
        Err(_) => String::new(),
    }
}

/// Runs `git -C <root> status --short --branch` using argument vectors only
/// (never a shell string) and never mutates the repository.
fn read_git_status(root_path: &str) -> GitStatus {
    let output = Command::new("git")
        .arg("-C")
        .arg(root_path)
        .arg("status")
        .arg("--short")
        .arg("--branch")
        .output();

    match output {
        Ok(result) if result.status.success() => {
            let stdout = String::from_utf8_lossy(&result.stdout).to_string();
            parse_git_status(stdout)
        }
        Ok(result) => {
            let stderr = String::from_utf8_lossy(&result.stderr).to_string();
            let message = if stderr.trim().is_empty() {
                format!("git exited with status {}", result.status)
            } else {
                format!("git error: {}", stderr.trim())
            };
            git_error(message)
        }
        Err(err) => git_error(format!("failed to run git: {err}")),
    }
}

fn git_error(message: String) -> GitStatus {
    GitStatus {
        branch_line: String::new(),
        branch_name: String::new(),
        is_clean: false,
        ahead_behind: String::new(),
        raw_status: message,
    }
}

fn parse_git_status(stdout: String) -> GitStatus {
    let branch_line = stdout
        .lines()
        .find(|line| line.starts_with("## "))
        .unwrap_or("")
        .to_string();

    let is_clean = stdout
        .lines()
        .filter(|line| !line.starts_with("## "))
        .all(|line| line.trim().is_empty());

    let (branch_name, ahead_behind) = parse_branch_line(&branch_line);

    GitStatus {
        branch_line,
        branch_name,
        is_clean,
        ahead_behind,
        raw_status: stdout,
    }
}

/// Extracts the branch name and any `[ahead N, behind N]` text from the
/// porcelain branch header line (e.g. `## main...origin/main [ahead 1]`).
fn parse_branch_line(branch_line: &str) -> (String, String) {
    if branch_line.is_empty() {
        return (String::new(), String::new());
    }

    let content = branch_line.trim_start_matches("## ").trim();
    let branch_name = content
        .split("...")
        .next()
        .unwrap_or("")
        .split_whitespace()
        .next()
        .unwrap_or("")
        .to_string();

    let ahead_behind = match (branch_line.find('['), branch_line.find(']')) {
        (Some(start), Some(end)) if end > start => branch_line[start..=end].to_string(),
        _ => String::new(),
    };

    (branch_name, ahead_behind)
}

fn read_handoff(root: &Path) -> HandoffSummary {
    let path = root.join("HANDOFF.md");
    let path_str = path.to_string_lossy().to_string();

    match std::fs::read_to_string(&path) {
        Ok(content) => HandoffSummary {
            exists: true,
            path: path_str,
            current_goal: extract_section(&content, "Current Goal"),
            last_known_next_step: extract_section(&content, "Last Known Next Step"),
            important_constraints: extract_section(&content, "Important Constraints"),
            raw_excerpt: char_excerpt(&content, 1200),
            error: None,
        },
        Err(err) => HandoffSummary {
            exists: false,
            path: path_str,
            current_goal: Vec::new(),
            last_known_next_step: Vec::new(),
            important_constraints: Vec::new(),
            raw_excerpt: String::new(),
            error: Some(err.to_string()),
        },
    }
}

fn read_agents(root: &Path) -> AgentsSummary {
    let path = root.join("AGENTS.md");
    let path_str = path.to_string_lossy().to_string();

    match std::fs::read_to_string(&path) {
        Ok(content) => AgentsSummary {
            exists: true,
            path: path_str,
            excerpt: char_excerpt(&content, 1200),
            error: None,
        },
        Err(err) => AgentsSummary {
            exists: false,
            path: path_str,
            excerpt: String::new(),
            error: Some(err.to_string()),
        },
    }
}

/// Char-safe truncation so we never split a UTF-8 code point.
fn char_excerpt(content: &str, max_chars: usize) -> String {
    content.chars().take(max_chars).collect()
}

/// Collects the non-empty lines under a `## <title>` heading until the next
/// `## ` heading. Bullet (`- `) prefixes are stripped.
fn extract_section(content: &str, title: &str) -> Vec<String> {
    let heading = format!("## {title}");
    let mut collecting = false;
    let mut items = Vec::new();

    for line in content.lines() {
        let is_heading = line.trim_start().starts_with("## ");
        if is_heading {
            if collecting {
                break;
            }
            if line.trim() == heading {
                collecting = true;
            }
            continue;
        }

        if collecting {
            let trimmed = line.trim();
            if trimmed.is_empty() {
                continue;
            }
            match trimmed.strip_prefix("- ") {
                Some(rest) => items.push(rest.trim().to_string()),
                None => items.push(trimmed.to_string()),
            }
        }
    }

    items
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            read_workspace_status,
            scan_local_skills
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
