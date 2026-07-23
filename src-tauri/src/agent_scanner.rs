//! Read-only scanner for supported Agent configuration files.

use std::collections::HashSet;
use std::fs::{File, Metadata};
use std::io::{ErrorKind, Read};
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};

use serde::{Deserialize, Serialize};

const MAX_DEPTH: usize = 6;
const MAX_AGENTS: usize = 200;
const MAX_FILE_SIZE: u64 = 1024 * 1024;
const MAX_WARNINGS: usize = 100;
const ROLE_MAX_CHARS: usize = 200;
const LIMIT_REACHED: &str = "not scanned after global agent limit was reached";

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AgentScanRequest {
    pub root_path: String,
}

#[derive(Serialize, Debug, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct AgentScanResult {
    pub workspace_root: String,
    pub sources: Vec<AgentSourceStatus>,
    pub agents: Vec<AgentItem>,
    pub warnings: Vec<String>,
    pub warning_count: u32,
    pub warnings_truncated: bool,
    pub truncated: bool,
    pub scanned_at: String,
}

#[derive(Serialize, Debug, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct AgentSourceStatus {
    pub path: String,
    pub kind: String,
    pub exists: bool,
    pub agent_count: u32,
    pub error: Option<String>,
}

#[derive(Serialize, Debug, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct AgentItem {
    pub id: String,
    pub name: String,
    pub role: String,
    pub path: String,
    pub relative_path: String,
    pub source_kind: String,
    pub prompt_body: String,
    pub updated_at: String,
    pub always_apply: Option<bool>,
    pub globs: Option<String>,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
enum SourceKind {
    Project,
    Cursor,
    Copilot,
}

impl SourceKind {
    fn as_str(self) -> &'static str {
        match self {
            Self::Project => "project",
            Self::Cursor => "cursor",
            Self::Copilot => "copilot",
        }
    }

    fn order(self) -> u8 {
        match self {
            Self::Project => 0,
            Self::Cursor => 1,
            Self::Copilot => 2,
        }
    }
}

enum SourceMode {
    File { name: String },
    CursorDirectory,
}

struct SourceSpec {
    path: PathBuf,
    kind: SourceKind,
    mode: SourceMode,
}

impl SourceSpec {
    fn file(path: PathBuf, kind: SourceKind, name: &str) -> Self {
        Self {
            path,
            kind,
            mode: SourceMode::File {
                name: name.to_string(),
            },
        }
    }
}

pub fn run_scan(root_path: &str) -> Result<AgentScanResult, String> {
    if root_path.trim().is_empty() {
        return Err("rootPath is empty".to_string());
    }
    Ok(scan_with_limit(root_path, MAX_AGENTS))
}

#[cfg(test)]
fn default_sources(root: &Path) -> Vec<(PathBuf, SourceKind)> {
    vec![
        (root.join("AGENTS.md"), SourceKind::Project),
        (root.join(".cursor").join("rules"), SourceKind::Cursor),
        (
            root.join(".github").join("copilot-instructions.md"),
            SourceKind::Copilot,
        ),
    ]
}

fn source_specs(root: &Path) -> Vec<SourceSpec> {
    vec![
        SourceSpec::file(root.join("AGENTS.md"), SourceKind::Project, "AGENTS"),
        SourceSpec {
            path: root.join(".cursor").join("rules"),
            kind: SourceKind::Cursor,
            mode: SourceMode::CursorDirectory,
        },
        SourceSpec::file(
            root.join(".github").join("copilot-instructions.md"),
            SourceKind::Copilot,
            "GitHub Copilot Instructions",
        ),
    ]
}

fn scan_with_limit(workspace_root: &str, max_agents: usize) -> AgentScanResult {
    scan_sources(
        workspace_root,
        source_specs(Path::new(workspace_root)),
        max_agents,
    )
}

fn scan_sources(
    workspace_root: &str,
    sources: Vec<SourceSpec>,
    max_agents: usize,
) -> AgentScanResult {
    let workspace = Path::new(workspace_root);
    let canonical_workspace = std::fs::canonicalize(workspace).ok();
    let mut agents = Vec::new();
    let mut statuses = Vec::new();
    let mut warnings = Vec::new();
    let mut warning_count = 0_u32;
    let mut seen = HashSet::new();
    let mut truncated = false;

    for source in sources {
        if truncated {
            statuses.push(unscanned_status(&source));
            continue;
        }
        statuses.push(scan_source(
            source,
            workspace,
            canonical_workspace.as_deref(),
            &mut agents,
            &mut seen,
            &mut warnings,
            &mut warning_count,
            &mut truncated,
            max_agents,
        ));
    }

    agents.sort_by(|a: &AgentItem, b| {
        source_order(&a.source_kind)
            .cmp(&source_order(&b.source_kind))
            .then_with(|| a.name.cmp(&b.name))
            .then_with(|| a.path.cmp(&b.path))
    });

    AgentScanResult {
        workspace_root: workspace_root.to_string(),
        sources: statuses,
        agents,
        warnings_truncated: warning_count as usize > warnings.len(),
        warnings,
        warning_count,
        truncated,
        scanned_at: timestamp_millis(),
    }
}

#[allow(clippy::too_many_arguments)]
fn scan_source(
    source: SourceSpec,
    workspace: &Path,
    canonical_workspace: Option<&Path>,
    agents: &mut Vec<AgentItem>,
    seen: &mut HashSet<String>,
    warnings: &mut Vec<String>,
    warning_count: &mut u32,
    truncated: &mut bool,
    max_agents: usize,
) -> AgentSourceStatus {
    let path_text = strip_verbatim(&source.path);
    let metadata = match std::fs::symlink_metadata(&source.path) {
        Ok(metadata) => metadata,
        Err(error) => {
            return AgentSourceStatus {
                path: path_text,
                kind: source.kind.as_str().to_string(),
                exists: false,
                agent_count: 0,
                error: if error.kind() == ErrorKind::NotFound {
                    None
                } else {
                    Some(short_error(&error))
                },
            };
        }
    };

    if is_link_like(&metadata) {
        return status_error(
            &source,
            true,
            "source is a symlink or junction; not followed",
        );
    }

    let before = agents.len();
    let error = match source.mode {
        SourceMode::File { name } => {
            if !metadata.is_file() {
                Some("source is not a file".to_string())
            } else {
                process_candidate(
                    &source.path,
                    workspace,
                    canonical_workspace,
                    source.kind,
                    name,
                    agents,
                    seen,
                    warnings,
                    warning_count,
                    truncated,
                    max_agents,
                );
                None
            }
        }
        SourceMode::CursorDirectory => {
            if !metadata.is_dir() {
                Some("source is not a directory".to_string())
            } else {
                scan_cursor_directory(
                    &source.path,
                    workspace,
                    canonical_workspace,
                    agents,
                    seen,
                    warnings,
                    warning_count,
                    truncated,
                    max_agents,
                )
            }
        }
    };

    AgentSourceStatus {
        path: path_text,
        kind: source.kind.as_str().to_string(),
        exists: true,
        agent_count: (agents.len() - before) as u32,
        error,
    }
}

#[allow(clippy::too_many_arguments)]
fn scan_cursor_directory(
    root: &Path,
    workspace: &Path,
    canonical_workspace: Option<&Path>,
    agents: &mut Vec<AgentItem>,
    seen: &mut HashSet<String>,
    warnings: &mut Vec<String>,
    warning_count: &mut u32,
    truncated: &mut bool,
    max_agents: usize,
) -> Option<String> {
    let canonical_root = match std::fs::canonicalize(root) {
        Ok(path) => path,
        Err(error) => return Some(format!("failed to canonicalize source: {error}")),
    };
    if canonical_workspace
        .map(|workspace_root| !path_is_within_root(&canonical_root, workspace_root))
        .unwrap_or(false)
    {
        return Some("source resolves outside workspace root".to_string());
    }

    let mut stack = vec![(root.to_path_buf(), 0_usize)];
    let mut root_error = None;
    while let Some((directory, depth)) = stack.pop() {
        if *truncated {
            break;
        }
        let entries = match std::fs::read_dir(&directory) {
            Ok(entries) => entries,
            Err(error) => {
                if depth == 0 {
                    root_error = Some(format!("failed to read source directory: {error}"));
                } else {
                    push_warning(
                        warnings,
                        warning_count,
                        format!(
                            "Skipped unreadable directory {}: {error}",
                            strip_verbatim(&directory)
                        ),
                    );
                }
                continue;
            }
        };
        for entry in entries {
            if *truncated {
                break;
            }
            let entry = match entry {
                Ok(entry) => entry,
                Err(error) => {
                    push_warning(
                        warnings,
                        warning_count,
                        format!("Skipped unreadable directory entry: {error}"),
                    );
                    continue;
                }
            };
            let metadata = match std::fs::symlink_metadata(entry.path()) {
                Ok(metadata) => metadata,
                Err(error) => {
                    push_warning(
                        warnings,
                        warning_count,
                        format!(
                            "Skipped unreadable entry {}: {error}",
                            strip_verbatim(&entry.path())
                        ),
                    );
                    continue;
                }
            };
            if is_link_like(&metadata) {
                continue;
            }
            let path = entry.path();
            if metadata.is_dir() {
                if depth < MAX_DEPTH {
                    stack.push((path, depth + 1));
                }
            } else if metadata.is_file()
                && path.extension().is_some_and(|extension| {
                    extension.to_string_lossy().eq_ignore_ascii_case("mdc")
                })
            {
                let name = path
                    .file_stem()
                    .map(|stem| stem.to_string_lossy().to_string())
                    .unwrap_or_else(|| "Agent".to_string());
                process_candidate(
                    &path,
                    workspace,
                    canonical_workspace,
                    SourceKind::Cursor,
                    name,
                    agents,
                    seen,
                    warnings,
                    warning_count,
                    truncated,
                    max_agents,
                );
            }
        }
    }
    root_error
}

#[allow(clippy::too_many_arguments)]
fn process_candidate(
    path: &Path,
    workspace: &Path,
    canonical_workspace: Option<&Path>,
    kind: SourceKind,
    name: String,
    agents: &mut Vec<AgentItem>,
    seen: &mut HashSet<String>,
    warnings: &mut Vec<String>,
    warning_count: &mut u32,
    truncated: &mut bool,
    max_agents: usize,
) {
    let canonical = match std::fs::canonicalize(path) {
        Ok(path) => path,
        Err(error) => {
            push_warning(
                warnings,
                warning_count,
                format!(
                    "Skipped uncanonicalizable Agent file {}: {error}",
                    strip_verbatim(path)
                ),
            );
            return;
        }
    };
    if canonical_workspace
        .map(|root| !path_is_within_root(&canonical, root))
        .unwrap_or(false)
    {
        push_warning(
            warnings,
            warning_count,
            format!(
                "Skipped Agent file outside workspace root: {}",
                strip_verbatim(path)
            ),
        );
        return;
    }
    let id = strip_verbatim(&canonical);
    if seen.contains(&id) {
        return;
    }
    let (prompt_body, metadata) = match read_bounded(&canonical) {
        Ok(value) => value,
        Err(message) => {
            push_warning(warnings, warning_count, message);
            return;
        }
    };
    if agents.len() >= max_agents {
        *truncated = true;
        return;
    }
    seen.insert(id.clone());
    let display = parse_display_metadata(&prompt_body, kind);
    agents.push(AgentItem {
        id,
        name: display.name.unwrap_or(name),
        role: display.role,
        path: strip_verbatim(path),
        relative_path: path
            .strip_prefix(workspace)
            .unwrap_or(path)
            .to_string_lossy()
            .replace('\\', "/"),
        source_kind: kind.as_str().to_string(),
        prompt_body,
        updated_at: modified_millis(&metadata),
        always_apply: display.always_apply,
        globs: display.globs,
    });
}

struct DisplayMetadata {
    name: Option<String>,
    role: String,
    always_apply: Option<bool>,
    globs: Option<String>,
}

fn parse_display_metadata(content: &str, kind: SourceKind) -> DisplayMetadata {
    let lines: Vec<&str> = content.lines().collect();
    let first = lines
        .first()
        .map(|line| line.trim_start_matches('\u{feff}').trim())
        .unwrap_or("");
    let mut body_start = 0;
    let mut role = None;
    let mut always_apply = None;
    let mut globs = None;

    if kind == SourceKind::Cursor && first == "---" {
        if let Some(closing) = lines
            .iter()
            .enumerate()
            .skip(1)
            .find_map(|(index, line)| (line.trim() == "---").then_some(index))
        {
            body_start = closing + 1;
            for line in &lines[1..closing] {
                let Some((key, value)) = parse_frontmatter_pair(line) else {
                    continue;
                };
                match key.as_str() {
                    "description" if !value.is_empty() => role = Some(value),
                    "alwaysapply" => {
                        always_apply = match value.as_str() {
                            "true" => Some(true),
                            "false" => Some(false),
                            _ => None,
                        }
                    }
                    "globs" if !value.is_empty() => globs = Some(value),
                    _ => {}
                }
            }
        } else {
            // Do not trust malformed frontmatter. Skip only recognized
            // metadata lines when finding display text; prompt_body remains
            // byte-for-byte unchanged.
            body_start = 1;
            while body_start < lines.len() {
                let recognized = parse_frontmatter_pair(lines[body_start])
                    .map(|(key, _)| matches!(key.as_str(), "description" | "alwaysapply" | "globs"))
                    .unwrap_or(false);
                if !recognized {
                    break;
                }
                body_start += 1;
            }
        }
    }

    let name = first_h1(&lines[body_start..]);
    let role = role
        .or_else(|| first_display_paragraph(&lines[body_start..]))
        .unwrap_or_else(|| match kind {
            SourceKind::Project => "Project agent instructions".to_string(),
            SourceKind::Cursor => "Cursor rule".to_string(),
            SourceKind::Copilot => "GitHub Copilot instructions".to_string(),
        });

    DisplayMetadata {
        name,
        role: truncate_chars(&role, ROLE_MAX_CHARS),
        always_apply,
        globs,
    }
}

fn first_h1(lines: &[&str]) -> Option<String> {
    lines.iter().find_map(|line| {
        let trimmed = line.trim_start_matches('\u{feff}').trim();
        trimmed
            .strip_prefix("# ")
            .map(str::trim)
            .filter(|value| !value.is_empty())
            .map(str::to_string)
    })
}

fn truncate_chars(value: &str, max_chars: usize) -> String {
    value.chars().take(max_chars).collect()
}

fn parse_frontmatter_pair(line: &str) -> Option<(String, String)> {
    let (key, raw_value) = line.split_once(':')?;
    let key = key.trim().to_ascii_lowercase();
    if key.is_empty() {
        return None;
    }
    Some((key, strip_matched_quotes(raw_value.trim()).to_string()))
}

fn strip_matched_quotes(value: &str) -> &str {
    if value.len() >= 2
        && ((value.starts_with('"') && value.ends_with('"'))
            || (value.starts_with('\'') && value.ends_with('\'')))
    {
        &value[1..value.len() - 1]
    } else {
        value
    }
}

fn first_display_paragraph(lines: &[&str]) -> Option<String> {
    let mut paragraph = Vec::new();
    for line in lines {
        let trimmed = line.trim_start_matches('\u{feff}').trim();
        if trimmed.is_empty() || trimmed == "---" {
            if paragraph.is_empty() {
                continue;
            }
            break;
        }
        if trimmed.starts_with('#') {
            if paragraph.is_empty() {
                continue;
            }
            break;
        }
        paragraph.push(trimmed);
    }
    (!paragraph.is_empty()).then(|| paragraph.join(" "))
}

fn read_bounded(path: &Path) -> Result<(String, Metadata), String> {
    let mut file = File::open(path).map_err(|error| {
        format!(
            "Skipped unreadable Agent file {}: {error}",
            strip_verbatim(path)
        )
    })?;
    let metadata = file.metadata().map_err(|error| {
        format!(
            "Skipped unreadable Agent file {}: {error}",
            strip_verbatim(path)
        )
    })?;
    let mut bytes = Vec::new();
    (&mut file)
        .take(MAX_FILE_SIZE + 1)
        .read_to_end(&mut bytes)
        .map_err(|error| {
            format!(
                "Skipped unreadable Agent file {}: {error}",
                strip_verbatim(path)
            )
        })?;
    if bytes.len() as u64 > MAX_FILE_SIZE {
        return Err(format!(
            "Skipped Agent file larger than 1 MiB: {}",
            strip_verbatim(path)
        ));
    }
    let body = String::from_utf8(bytes)
        .map_err(|_| format!("Skipped non-UTF-8 Agent file: {}", strip_verbatim(path)))?;
    Ok((body, metadata))
}

fn status_error(source: &SourceSpec, exists: bool, message: &str) -> AgentSourceStatus {
    AgentSourceStatus {
        path: strip_verbatim(&source.path),
        kind: source.kind.as_str().to_string(),
        exists,
        agent_count: 0,
        error: Some(message.to_string()),
    }
}

fn unscanned_status(source: &SourceSpec) -> AgentSourceStatus {
    let exists = std::fs::symlink_metadata(&source.path).is_ok();
    status_error(source, exists, LIMIT_REACHED)
}

fn source_order(source: &str) -> u8 {
    match source {
        "project" => SourceKind::Project.order(),
        "cursor" => SourceKind::Cursor.order(),
        "copilot" => SourceKind::Copilot.order(),
        _ => u8::MAX,
    }
}

fn push_warning(warnings: &mut Vec<String>, warning_count: &mut u32, message: String) {
    *warning_count = warning_count.saturating_add(1);
    if warnings.len() < MAX_WARNINGS {
        warnings.push(message);
    }
}

fn is_link_like(metadata: &Metadata) -> bool {
    if metadata.file_type().is_symlink() {
        return true;
    }
    #[cfg(windows)]
    {
        use std::os::windows::fs::MetadataExt;
        const FILE_ATTRIBUTE_REPARSE_POINT: u32 = 0x400;
        metadata.file_attributes() & FILE_ATTRIBUTE_REPARSE_POINT != 0
    }
    #[cfg(not(windows))]
    {
        false
    }
}

fn path_is_within_root(candidate: &Path, root: &Path) -> bool {
    #[cfg(windows)]
    {
        let candidate: Vec<_> = candidate.components().collect();
        let root: Vec<_> = root.components().collect();
        candidate.len() >= root.len()
            && candidate.iter().zip(root.iter()).all(|(left, right)| {
                std::mem::discriminant(left) == std::mem::discriminant(right)
                    && left
                        .as_os_str()
                        .to_string_lossy()
                        .eq_ignore_ascii_case(&right.as_os_str().to_string_lossy())
            })
    }
    #[cfg(not(windows))]
    {
        candidate.starts_with(root)
    }
}

fn strip_verbatim(path: &Path) -> String {
    let text = path.to_string_lossy();
    text.strip_prefix(r"\\?\").unwrap_or(&text).to_string()
}

fn short_error(error: &std::io::Error) -> String {
    format!("{} ({error})", error.kind())
}

fn modified_millis(metadata: &Metadata) -> String {
    metadata
        .modified()
        .ok()
        .and_then(|time| time.duration_since(UNIX_EPOCH).ok())
        .map(|duration| duration.as_millis().to_string())
        .unwrap_or_default()
}

fn timestamp_millis() -> String {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis().to_string())
        .unwrap_or_default()
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::{Path, PathBuf};
    use std::time::{SystemTime, UNIX_EPOCH};

    fn temp_dir(tag: &str) -> PathBuf {
        let nonce = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_nanos();
        let path = std::env::temp_dir().join(format!(
            "skillcopilot_agent_{tag}_{}_{}",
            std::process::id(),
            nonce
        ));
        std::fs::create_dir_all(&path).unwrap();
        path
    }

    fn write(path: &Path, body: &str) {
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent).unwrap();
        }
        std::fs::write(path, body).unwrap();
    }

    fn write_bytes(path: &Path, body: &[u8]) {
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent).unwrap();
        }
        std::fs::write(path, body).unwrap();
    }

    fn scan(root: &Path) -> AgentScanResult {
        scan_with_limit(root.to_string_lossy().as_ref(), MAX_AGENTS)
    }

    #[test]
    fn empty_root_is_rejected() {
        assert_eq!(run_scan("  ").unwrap_err(), "rootPath is empty");
    }

    #[test]
    fn default_sources_are_exact() {
        let root = Path::new("workspace");
        let sources = default_sources(root);
        assert_eq!(sources[0], (root.join("AGENTS.md"), SourceKind::Project));
        assert_eq!(
            sources[1],
            (root.join(".cursor").join("rules"), SourceKind::Cursor)
        );
        assert_eq!(
            sources[2],
            (
                root.join(".github").join("copilot-instructions.md"),
                SourceKind::Copilot
            )
        );
    }

    #[test]
    fn scans_one_agent_per_supported_file() {
        let root = temp_dir("all-sources");
        write(&root.join("AGENTS.md"), "project");
        write(&root.join(".cursor/rules/a.mdc"), "cursor");
        write(&root.join(".github/copilot-instructions.md"), "copilot");
        let result = scan(&root);
        assert_eq!(result.agents.len(), 3);
        assert_eq!(result.sources.iter().map(|s| s.agent_count).sum::<u32>(), 3);
        std::fs::remove_dir_all(root).ok();
    }

    #[test]
    fn prompt_body_is_preserved_exactly() {
        let root = temp_dir("exact");
        let body = "\u{feff}---\r\nname: untouched\r\n---\r\n\r\nPrompt  \r\n";
        write(&root.join("AGENTS.md"), body);
        assert_eq!(scan(&root).agents[0].prompt_body, body);
        std::fs::remove_dir_all(root).ok();
    }

    #[test]
    fn project_name_prefers_first_h1_and_falls_back_to_agents() {
        let root = temp_dir("project-name");
        write(&root.join("AGENTS.md"), "# Project Brain\n\nRole.\n");
        assert_eq!(scan(&root).agents[0].name, "Project Brain");
        write(&root.join("AGENTS.md"), "No heading.\n");
        assert_eq!(scan(&root).agents[0].name, "AGENTS");
        std::fs::remove_dir_all(root).ok();
    }

    #[test]
    fn cursor_name_prefers_first_body_h1_and_falls_back_to_file_stem() {
        let root = temp_dir("cursor-name");
        let path = root.join(".cursor/rules/team/backend.mdc");
        write(&path, "---\ndescription: role\n---\n# Backend Brain\n");
        assert_eq!(scan(&root).agents[0].name, "Backend Brain");
        write(&path, "No heading.\n");
        assert_eq!(scan(&root).agents[0].name, "backend");
        std::fs::remove_dir_all(root).ok();
    }

    #[test]
    fn copilot_agent_has_stable_name() {
        let root = temp_dir("copilot-name");
        let path = root.join(".github/copilot-instructions.md");
        write(&path, "# Copilot Brain\n\nRole.\n");
        assert_eq!(scan(&root).agents[0].name, "Copilot Brain");
        write(&path, "No heading.\n");
        assert_eq!(scan(&root).agents[0].name, "GitHub Copilot Instructions");
        std::fs::remove_dir_all(root).ok();
    }

    #[test]
    fn unicode_role_is_truncated_to_200_chars_without_splitting() {
        let root = temp_dir("unicode-role");
        let role = "界".repeat(250);
        write(&root.join("AGENTS.md"), &format!("# Agent\n\n{role}\n"));
        let result = scan(&root);
        assert_eq!(result.agents[0].role.chars().count(), 200);
        assert!(result.agents[0].role.chars().all(|ch| ch == '界'));
        std::fs::remove_dir_all(root).ok();
    }

    #[test]
    fn cursor_extension_matching_is_ascii_case_insensitive() {
        let root = temp_dir("case");
        write(&root.join(".cursor/rules/UPPER.MDC"), "x");
        assert_eq!(scan(&root).agents.len(), 1);
        std::fs::remove_dir_all(root).ok();
    }

    #[test]
    fn cursor_ignores_non_mdc_files() {
        let root = temp_dir("ignore");
        write(&root.join(".cursor/rules/a.md"), "x");
        write(&root.join(".cursor/rules/b.txt"), "x");
        assert!(scan(&root).agents.is_empty());
        std::fs::remove_dir_all(root).ok();
    }

    #[test]
    fn cursor_depth_six_is_included() {
        let root = temp_dir("depth-six");
        write(&root.join(".cursor/rules/1/2/3/4/5/6/a.mdc"), "x");
        assert_eq!(scan(&root).agents.len(), 1);
        std::fs::remove_dir_all(root).ok();
    }

    #[test]
    fn cursor_depth_seven_is_excluded() {
        let root = temp_dir("depth-seven");
        write(&root.join(".cursor/rules/1/2/3/4/5/6/7/a.mdc"), "x");
        assert!(scan(&root).agents.is_empty());
        std::fs::remove_dir_all(root).ok();
    }

    #[test]
    fn missing_sources_are_not_errors() {
        let root = temp_dir("missing");
        let result = scan(&root);
        assert_eq!(result.sources.len(), 3);
        assert!(result
            .sources
            .iter()
            .all(|s| !s.exists && s.error.is_none()));
        std::fs::remove_dir_all(root).ok();
    }

    #[test]
    fn source_failure_does_not_block_other_sources() {
        let root = temp_dir("isolated");
        write(&root.join("AGENTS.md/child"), "not a file");
        write(&root.join(".github/copilot-instructions.md"), "works");
        let result = scan(&root);
        assert_eq!(result.agents.len(), 1);
        assert_eq!(result.agents[0].source_kind, "copilot");
        assert!(result.sources[0].error.is_some());
        std::fs::remove_dir_all(root).ok();
    }

    #[test]
    fn cursor_source_that_is_file_reports_error() {
        let root = temp_dir("cursor-file");
        write(&root.join(".cursor/rules"), "not a directory");
        let result = scan(&root);
        assert!(result.sources[1].exists);
        assert!(result.sources[1].error.is_some());
        std::fs::remove_dir_all(root).ok();
    }

    #[test]
    fn exact_one_mib_is_accepted() {
        let root = temp_dir("one-mib");
        write(&root.join("AGENTS.md"), &"a".repeat(MAX_FILE_SIZE as usize));
        assert_eq!(
            scan(&root).agents[0].prompt_body.len(),
            MAX_FILE_SIZE as usize
        );
        std::fs::remove_dir_all(root).ok();
    }

    #[test]
    fn one_mib_plus_one_is_warned_and_skipped() {
        let root = temp_dir("oversize");
        write(
            &root.join("AGENTS.md"),
            &"a".repeat(MAX_FILE_SIZE as usize + 1),
        );
        let result = scan(&root);
        assert!(result.agents.is_empty());
        assert!(result.warnings[0].contains("larger than 1 MiB"));
        std::fs::remove_dir_all(root).ok();
    }

    #[test]
    fn non_utf8_is_warned_and_skipped() {
        let root = temp_dir("utf8");
        write_bytes(&root.join("AGENTS.md"), &[0xff, 0xfe]);
        let result = scan(&root);
        assert!(result.agents.is_empty());
        assert!(result.warnings[0].contains("non-UTF-8"));
        std::fs::remove_dir_all(root).ok();
    }

    #[test]
    fn canonical_duplicates_are_returned_once() {
        let root = temp_dir("dedupe");
        write(&root.join("AGENTS.md"), "x");
        let sources = vec![
            SourceSpec::file(root.join("AGENTS.md"), SourceKind::Project, "AGENTS.md"),
            SourceSpec::file(root.join("AGENTS.md"), SourceKind::Copilot, "duplicate"),
        ];
        let result = scan_sources(root.to_string_lossy().as_ref(), sources, 200);
        assert_eq!(result.agents.len(), 1);
        std::fs::remove_dir_all(root).ok();
    }

    #[test]
    fn exact_limit_is_not_truncated() {
        let root = temp_dir("exact-limit");
        for i in 0..3 {
            write(&root.join(format!(".cursor/rules/{i}.mdc")), "x");
        }
        let result = scan_with_limit(root.to_string_lossy().as_ref(), 3);
        assert_eq!(result.agents.len(), 3);
        assert!(!result.truncated);
        std::fs::remove_dir_all(root).ok();
    }

    #[test]
    fn valid_unique_limit_plus_one_sets_truncated() {
        let root = temp_dir("over-limit");
        for i in 0..4 {
            write(&root.join(format!(".cursor/rules/{i}.mdc")), "x");
        }
        let result = scan_with_limit(root.to_string_lossy().as_ref(), 3);
        assert_eq!(result.agents.len(), 3);
        assert!(result.truncated);
        std::fs::remove_dir_all(root).ok();
    }

    #[test]
    fn invalid_candidate_after_limit_does_not_truncate() {
        let root = temp_dir("invalid-after-limit");
        write(&root.join("AGENTS.md"), "x");
        write_bytes(&root.join(".github/copilot-instructions.md"), &[0xff]);
        let result = scan_with_limit(root.to_string_lossy().as_ref(), 1);
        assert_eq!(result.agents.len(), 1);
        assert!(!result.truncated);
        std::fs::remove_dir_all(root).ok();
    }

    #[test]
    fn warning_retention_is_bounded_but_total_is_kept() {
        let root = temp_dir("warnings");
        for i in 0..105 {
            write_bytes(&root.join(format!(".cursor/rules/{i}.mdc")), &[0xff]);
        }
        let result = scan(&root);
        assert_eq!(result.warnings.len(), 100);
        assert_eq!(result.warning_count, 105);
        assert!(result.warnings_truncated);
        std::fs::remove_dir_all(root).ok();
    }

    #[test]
    fn agents_are_sorted_by_source_then_name() {
        let root = temp_dir("sort");
        write(&root.join(".cursor/rules/z.mdc"), "z");
        write(&root.join("AGENTS.md"), "p");
        write(&root.join(".cursor/rules/a.mdc"), "a");
        write(&root.join(".github/copilot-instructions.md"), "c");
        let result = scan(&root);
        let names: Vec<_> = result.agents.iter().map(|a| a.name.as_str()).collect();
        assert_eq!(
            names,
            vec!["AGENTS", "a", "z", "GitHub Copilot Instructions"]
        );
        std::fs::remove_dir_all(root).ok();
    }

    #[test]
    fn ids_are_canonical_absolute_paths() {
        let root = temp_dir("id");
        let path = root.join("AGENTS.md");
        write(&path, "x");
        assert_eq!(
            scan(&root).agents[0].id,
            strip_verbatim(&std::fs::canonicalize(path).unwrap())
        );
        std::fs::remove_dir_all(root).ok();
    }

    #[test]
    fn serde_field_names_are_camel_case() {
        let root = temp_dir("serde");
        write(&root.join("AGENTS.md"), "x");
        let value = serde_json::to_value(scan(&root)).unwrap();
        assert!(value.get("workspaceRoot").is_some());
        assert!(value.get("warningCount").is_some());
        assert!(value["sources"][0].get("kind").is_some());
        assert!(value["sources"][0].get("source").is_none());
        assert!(value["agents"][0].get("role").is_some());
        assert!(value["agents"][0].get("sourceKind").is_some());
        assert!(value["agents"][0].get("promptBody").is_some());
        assert!(value["agents"][0].get("relativePath").is_some());
        assert!(value["agents"][0].get("alwaysApply").is_some());
        assert!(value["agents"][0].get("globs").is_some());
        assert!(value["agents"][0].get("source").is_none());
        assert!(value["agents"][0].get("tag").is_none());
        std::fs::remove_dir_all(root).ok();
    }

    #[test]
    fn cursor_frontmatter_populates_display_metadata() {
        let root = temp_dir("cursor-metadata");
        let body = "---\ndescription: \"Backend specialist\"\nalwaysApply: true\nglobs: 'src/**/*.rs'\n---\nPrompt.\n";
        write(&root.join(".cursor/rules/backend.mdc"), body);
        let agent = scan(&root).agents.remove(0);
        assert_eq!(agent.role, "Backend specialist");
        assert_eq!(agent.always_apply, Some(true));
        assert_eq!(agent.globs.as_deref(), Some("src/**/*.rs"));
        assert_eq!(agent.prompt_body, body);
        std::fs::remove_dir_all(root).ok();
    }

    #[test]
    fn cursor_false_always_apply_is_preserved() {
        let root = temp_dir("cursor-false");
        write(
            &root.join(".cursor/rules/optional.mdc"),
            "---\ndescription: Optional rule\nalwaysApply: false\n---\nPrompt.\n",
        );
        assert_eq!(scan(&root).agents[0].always_apply, Some(false));
        std::fs::remove_dir_all(root).ok();
    }

    #[test]
    fn invalid_optional_cursor_metadata_is_ignored() {
        let root = temp_dir("cursor-invalid-metadata");
        write(
            &root.join(".cursor/rules/invalid.mdc"),
            "---\nalwaysApply: sometimes\nglobs:\n---\nRule body.\n",
        );
        let agent = scan(&root).agents.remove(0);
        assert_eq!(agent.always_apply, None);
        assert_eq!(agent.globs, None);
        assert_eq!(agent.role, "Rule body.");
        std::fs::remove_dir_all(root).ok();
    }

    #[test]
    fn unclosed_cursor_frontmatter_is_not_trusted() {
        let root = temp_dir("cursor-unclosed");
        write(
            &root.join(".cursor/rules/unclosed.mdc"),
            "---\ndescription: Must not win\nalwaysApply: true\nPrompt body.\n",
        );
        let agent = scan(&root).agents.remove(0);
        assert_ne!(agent.role, "Must not win");
        assert_eq!(agent.always_apply, None);
        std::fs::remove_dir_all(root).ok();
    }

    #[test]
    fn role_falls_back_to_first_non_heading_paragraph() {
        let root = temp_dir("role-fallback");
        write(
            &root.join("AGENTS.md"),
            "# Agent title\n\nProject-wide implementation guidance.\n",
        );
        assert_eq!(
            scan(&root).agents[0].role,
            "Project-wide implementation guidance."
        );
        std::fs::remove_dir_all(root).ok();
    }

    #[test]
    fn source_labels_are_project_cursor_copilot() {
        assert_eq!(SourceKind::Project.as_str(), "project");
        assert_eq!(SourceKind::Cursor.as_str(), "cursor");
        assert_eq!(SourceKind::Copilot.as_str(), "copilot");
    }

    #[test]
    fn containment_rejects_similar_prefix_directory() {
        assert!(!path_is_within_root(
            Path::new(r"C:\foobar\x.mdc"),
            Path::new(r"C:\foo")
        ));
    }

    #[cfg(windows)]
    #[test]
    fn containment_is_windows_ascii_case_insensitive() {
        assert!(path_is_within_root(
            Path::new(r"c:\skillcopilot\.CURSOR\rules\a.mdc"),
            Path::new(r"C:\SkillCopilot\.cursor\rules")
        ));
    }

    #[cfg(windows)]
    #[test]
    fn directory_symlink_is_not_followed() {
        use std::os::windows::fs::symlink_dir;
        let root = temp_dir("dir-link");
        let outside = temp_dir("dir-link-outside");
        write(&outside.join("hidden.mdc"), "x");
        let link = root.join(".cursor/rules/link");
        std::fs::create_dir_all(link.parent().unwrap()).unwrap();
        if symlink_dir(&outside, &link).is_ok() {
            assert!(scan(&root).agents.is_empty());
        }
        std::fs::remove_dir_all(root).ok();
        std::fs::remove_dir_all(outside).ok();
    }

    #[cfg(windows)]
    #[test]
    fn file_symlink_is_not_followed() {
        use std::os::windows::fs::symlink_file;
        let root = temp_dir("file-link");
        let outside = temp_dir("file-link-outside");
        write(&outside.join("outside.mdc"), "x");
        let link = root.join(".cursor/rules/link.mdc");
        std::fs::create_dir_all(link.parent().unwrap()).unwrap();
        if symlink_file(outside.join("outside.mdc"), &link).is_ok() {
            assert!(scan(&root).agents.is_empty());
        }
        std::fs::remove_dir_all(root).ok();
        std::fs::remove_dir_all(outside).ok();
    }
}
