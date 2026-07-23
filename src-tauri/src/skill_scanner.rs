//! Read-only local Skill scanner.
//!
//! Walks a fixed set of default scan roots looking for `SKILL.md` files
//! (case-insensitive), parses a lightweight frontmatter/first-paragraph
//! summary, and returns a stable, de-duplicated, sorted list. The scanner is
//! strictly read-only: it never writes, never follows symlinks/junctions, and
//! never panics on user input or disk contents.

use std::collections::HashSet;
use std::fs::Metadata;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};

use serde::{Deserialize, Serialize};

/// Maximum directory recursion depth (root directory is depth 0).
const MAX_DEPTH: usize = 8;
/// Maximum number of skills returned before the result is marked truncated.
const MAX_SKILLS: usize = 500;
/// Maximum size of a single `SKILL.md` we will read (1 MiB).
const MAX_FILE_SIZE: u64 = 1024 * 1024;
/// Upper bound on collected warnings so the vector cannot grow without limit.
const MAX_WARNINGS: usize = 100;
/// Char-safe truncation length for description/trigger summaries.
const SUMMARY_MAX_CHARS: usize = 200;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SkillScanRequest {
    pub root_path: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SkillScanResult {
    pub workspace_root: String,
    pub roots: Vec<SkillRootStatus>,
    pub skills: Vec<SkillItem>,
    pub warnings: Vec<String>,
    pub truncated: bool,
    pub scanned_at: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SkillRootStatus {
    pub path: String,
    pub source: String,
    pub exists: bool,
    pub skill_count: u32,
    pub error: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SkillItem {
    pub id: String,
    pub name: String,
    pub description: String,
    pub path: String,
    pub relative_path: String,
    pub source_root: String,
    pub trigger: String,
    pub body: String,
    pub updated_at: String,
    pub tag: String,
}

/// Entry point used by the Tauri command. Validates input and scans the
/// default roots derived from the given workspace root.
pub fn run_scan(root_path: &str) -> Result<SkillScanResult, String> {
    if root_path.trim().is_empty() {
        return Err("rootPath is empty".to_string());
    }

    let workspace_root = Path::new(root_path);
    let roots = default_roots(workspace_root);
    Ok(scan_with_roots(root_path, roots))
}

/// Builds the default scan roots for a workspace. Missing directories are not
/// an error here; existence is resolved during scanning.
fn default_roots(workspace_root: &Path) -> Vec<(PathBuf, &'static str)> {
    let mut roots: Vec<(PathBuf, &'static str)> = Vec::new();
    roots.push((workspace_root.join(".agents").join("skills"), "workspace"));
    roots.push((workspace_root.join(".cursor").join("skills"), "workspace"));

    if let Some(home) = user_home() {
        roots.push((home.join(".codex").join("skills"), "user"));
        roots.push((home.join(".cursor").join("skills"), "user"));
    }

    roots
}

/// Windows user home via `USERPROFILE`, falling back to `HOME` (future macOS).
fn user_home() -> Option<PathBuf> {
    std::env::var_os("USERPROFILE")
        .filter(|value| !value.is_empty())
        .map(PathBuf::from)
        .or_else(|| {
            std::env::var_os("HOME")
                .filter(|value| !value.is_empty())
                .map(PathBuf::from)
        })
}

/// Scans an explicit list of roots. Kept separate from [`run_scan`] so tests
/// can drive the scanner against temporary directories without touching real
/// user Skill files.
fn scan_with_roots(workspace_root: &str, roots: Vec<(PathBuf, &'static str)>) -> SkillScanResult {
    let mut skills: Vec<SkillItem> = Vec::new();
    let mut warnings: Vec<String> = Vec::new();
    let mut seen: HashSet<String> = HashSet::new();
    let mut truncated = false;
    let mut root_statuses: Vec<SkillRootStatus> = Vec::new();

    for (root, source) in roots {
        let status = scan_root(
            &root,
            source,
            &mut skills,
            &mut warnings,
            &mut seen,
            &mut truncated,
        );
        root_statuses.push(status);
    }

    skills.sort_by(|a, b| a.name.cmp(&b.name).then_with(|| a.path.cmp(&b.path)));

    SkillScanResult {
        workspace_root: workspace_root.to_string(),
        roots: root_statuses,
        skills,
        warnings,
        truncated,
        scanned_at: current_timestamp_millis(),
    }
}

/// Walks a single root (iteratively, depth-limited) collecting `SKILL.md`
/// files. A missing root reports `exists = false` without failing the scan;
/// a failure inside one root never blocks the others.
fn scan_root(
    root: &Path,
    source: &str,
    skills: &mut Vec<SkillItem>,
    warnings: &mut Vec<String>,
    seen: &mut HashSet<String>,
    truncated: &mut bool,
) -> SkillRootStatus {
    let display = strip_verbatim(root);

    let meta = match std::fs::symlink_metadata(root) {
        Ok(meta) => meta,
        Err(_) => {
            return SkillRootStatus {
                path: display,
                source: source.to_string(),
                exists: false,
                skill_count: 0,
                error: None,
            };
        }
    };

    if meta.file_type().is_symlink() {
        return SkillRootStatus {
            path: display,
            source: source.to_string(),
            exists: true,
            skill_count: 0,
            error: Some("scan root is a symlink; not followed".to_string()),
        };
    }

    if !meta.is_dir() {
        return SkillRootStatus {
            path: display,
            source: source.to_string(),
            exists: true,
            skill_count: 0,
            error: Some("scan root is not a directory".to_string()),
        };
    }

    let mut error: Option<String> = None;
    let mut count: u32 = 0;
    let mut stack: Vec<(PathBuf, usize)> = vec![(root.to_path_buf(), 0)];
    let mut is_root_dir = true;

    while let Some((dir, depth)) = stack.pop() {
        if *truncated {
            break;
        }

        let entries = match std::fs::read_dir(&dir) {
            Ok(entries) => entries,
            Err(err) => {
                if is_root_dir {
                    error = Some(format!("failed to read directory: {err}"));
                } else {
                    push_warning(
                        warnings,
                        format!(
                            "Skipped unreadable directory {}: {err}",
                            strip_verbatim(&dir)
                        ),
                    );
                }
                is_root_dir = false;
                continue;
            }
        };
        is_root_dir = false;

        for entry in entries {
            if *truncated {
                break;
            }
            let entry = match entry {
                Ok(entry) => entry,
                Err(_) => continue,
            };
            let file_type = match entry.file_type() {
                Ok(file_type) => file_type,
                Err(_) => continue,
            };
            if file_type.is_symlink() {
                continue;
            }

            let entry_path = entry.path();
            let file_name = entry.file_name();
            let name_str = file_name.to_string_lossy();

            if file_type.is_dir() {
                if is_ignored_dir(&name_str) {
                    continue;
                }
                if depth + 1 <= MAX_DEPTH {
                    stack.push((entry_path, depth + 1));
                }
                continue;
            }

            if file_type.is_file() && name_str.eq_ignore_ascii_case("SKILL.md") {
                if skills.len() >= MAX_SKILLS {
                    *truncated = true;
                    break;
                }
                match process_skill_file(&entry_path, root, seen) {
                    ProcessOutcome::Added(item) => {
                        skills.push(*item);
                        count += 1;
                    }
                    ProcessOutcome::Duplicate => {}
                    ProcessOutcome::Warning(message) => push_warning(warnings, message),
                }
            }
        }
    }

    SkillRootStatus {
        path: display,
        source: source.to_string(),
        exists: true,
        skill_count: count,
        error,
    }
}

enum ProcessOutcome {
    Added(Box<SkillItem>),
    Duplicate,
    Warning(String),
}

/// Reads and parses one `SKILL.md` into a [`SkillItem`], or explains via a
/// [`ProcessOutcome`] why it was skipped. Never panics on disk contents.
fn process_skill_file(path: &Path, root: &Path, seen: &mut HashSet<String>) -> ProcessOutcome {
    let canonical = std::fs::canonicalize(path).unwrap_or_else(|_| path.to_path_buf());
    let id = strip_verbatim(&canonical);

    if !seen.insert(id.clone()) {
        return ProcessOutcome::Duplicate;
    }

    let meta = match std::fs::metadata(path) {
        Ok(meta) => meta,
        Err(err) => {
            return ProcessOutcome::Warning(format!(
                "Skipped unreadable SKILL.md {}: {err}",
                strip_verbatim(path)
            ));
        }
    };

    if meta.len() > MAX_FILE_SIZE {
        return ProcessOutcome::Warning(format!(
            "Skipped SKILL.md larger than 1 MiB: {}",
            strip_verbatim(path)
        ));
    }

    let bytes = match std::fs::read(path) {
        Ok(bytes) => bytes,
        Err(err) => {
            return ProcessOutcome::Warning(format!(
                "Skipped unreadable SKILL.md {}: {err}",
                strip_verbatim(path)
            ));
        }
    };

    let content = match String::from_utf8(bytes) {
        Ok(content) => content,
        Err(_) => {
            return ProcessOutcome::Warning(format!(
                "Skipped non-UTF-8 SKILL.md: {}",
                strip_verbatim(path)
            ));
        }
    };

    let parent_dir_name = path
        .parent()
        .and_then(|parent| parent.file_name())
        .map(|name| name.to_string_lossy().to_string())
        .unwrap_or_else(|| "skill".to_string());

    let meta_summary = parse_skill(&content, &parent_dir_name);

    let relative_path = path
        .strip_prefix(root)
        .map(|rest| rest.to_string_lossy().to_string())
        .unwrap_or_else(|_| {
            path.file_name()
                .map(|name| name.to_string_lossy().to_string())
                .unwrap_or_default()
        });

    ProcessOutcome::Added(Box::new(SkillItem {
        id,
        name: meta_summary.name,
        description: meta_summary.description,
        path: strip_verbatim(path),
        relative_path,
        source_root: strip_verbatim(root),
        trigger: meta_summary.trigger,
        body: content,
        updated_at: mtime_millis(&meta),
        tag: "local".to_string(),
    }))
}

struct SkillMeta {
    name: String,
    description: String,
    trigger: String,
}

/// Parses lightweight metadata from a `SKILL.md` body:
/// * a top `---` frontmatter block with simple `key: value` lines
///   (`name` / `description` / `trigger`), matched paired quotes stripped;
/// * `name` falls back to the parent directory name;
/// * `description` falls back to the first non-empty, non-heading paragraph;
/// * `trigger` falls back to the description.
/// All summaries are char-safe truncated so UTF-8 is never split.
fn parse_skill(content: &str, parent_dir_name: &str) -> SkillMeta {
    let lines: Vec<&str> = content.lines().collect();
    let mut index = 0;
    let mut front_name: Option<String> = None;
    let mut front_description: Option<String> = None;
    let mut front_trigger: Option<String> = None;

    let has_frontmatter = lines
        .first()
        .map(|line| line.trim_start_matches('\u{feff}').trim() == "---")
        .unwrap_or(false);

    if has_frontmatter {
        index = 1;
        while index < lines.len() {
            let line = lines[index];
            if line.trim() == "---" {
                index += 1;
                break;
            }
            if let Some((key, value)) = parse_kv(line) {
                match key.as_str() {
                    "name" => front_name = non_empty(value),
                    "description" => front_description = non_empty(value),
                    "trigger" => front_trigger = non_empty(value),
                    _ => {}
                }
            }
            index += 1;
        }
    }

    let name = front_name.unwrap_or_else(|| parent_dir_name.to_string());

    let description =
        front_description.unwrap_or_else(|| first_paragraph(&lines[index.min(lines.len())..]));
    let description = truncate_chars(&description, SUMMARY_MAX_CHARS);

    let trigger = front_trigger.unwrap_or_else(|| description.clone());
    let trigger = truncate_chars(&trigger, SUMMARY_MAX_CHARS);

    SkillMeta {
        name,
        description,
        trigger,
    }
}

/// Parses a single-line `key: value` frontmatter entry. Returns `None` for
/// lines without a colon or with an empty key.
fn parse_kv(line: &str) -> Option<(String, String)> {
    let colon = line.find(':')?;
    let key = line[..colon].trim().to_lowercase();
    if key.is_empty() {
        return None;
    }
    let value = strip_quotes(line[colon + 1..].trim()).to_string();
    Some((key, value))
}

fn non_empty(value: String) -> Option<String> {
    if value.trim().is_empty() {
        None
    } else {
        Some(value.trim().to_string())
    }
}

/// First non-empty, non-heading paragraph joined into a single line.
fn first_paragraph(lines: &[&str]) -> String {
    let mut collected: Vec<&str> = Vec::new();
    for line in lines {
        let trimmed = line.trim();
        if trimmed.is_empty() {
            if collected.is_empty() {
                continue;
            }
            break;
        }
        if trimmed.starts_with('#') {
            if collected.is_empty() {
                continue;
            }
            break;
        }
        collected.push(trimmed);
    }
    collected.join(" ")
}

/// Strips a single pair of matching surrounding single or double quotes.
fn strip_quotes(value: &str) -> &str {
    let value = value.trim();
    let mut chars = value.chars();
    match (chars.next(), chars.next_back()) {
        (Some('"'), Some('"')) | (Some('\''), Some('\'')) if value.chars().count() >= 2 => {
            &value[1..value.len() - 1]
        }
        _ => value,
    }
}

/// Char-safe truncation: never splits a multi-byte UTF-8 code point.
fn truncate_chars(value: &str, max_chars: usize) -> String {
    value.chars().take(max_chars).collect()
}

fn is_ignored_dir(name: &str) -> bool {
    matches!(name, ".git" | "node_modules" | "target")
}

fn push_warning(warnings: &mut Vec<String>, message: String) {
    if warnings.len() < MAX_WARNINGS {
        warnings.push(message);
    }
}

/// Removes the Windows verbatim (`\\?\`) prefix from canonicalized paths so
/// paths shown to users stay readable.
fn strip_verbatim(path: &Path) -> String {
    let text = path.to_string_lossy().to_string();
    text.strip_prefix(r"\\?\")
        .map(|rest| rest.to_string())
        .unwrap_or(text)
}

fn mtime_millis(meta: &Metadata) -> String {
    meta.modified()
        .ok()
        .and_then(|time| time.duration_since(UNIX_EPOCH).ok())
        .map(|elapsed| elapsed.as_millis().to_string())
        .unwrap_or_default()
}

fn current_timestamp_millis() -> String {
    match SystemTime::now().duration_since(UNIX_EPOCH) {
        Ok(elapsed) => elapsed.as_millis().to_string(),
        Err(_) => String::new(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn unique_temp_dir(tag: &str) -> PathBuf {
        let nanos = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|elapsed| elapsed.as_nanos())
            .unwrap_or(0);
        let mut dir = std::env::temp_dir();
        dir.push(format!(
            "skillcopilot_test_{tag}_{}_{}",
            std::process::id(),
            nanos
        ));
        std::fs::create_dir_all(&dir).expect("create temp dir");
        dir
    }

    fn write_file(path: &Path, contents: &str) {
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent).expect("create parent dir");
        }
        std::fs::write(path, contents).expect("write file");
    }

    #[test]
    fn frontmatter_fields_are_parsed() {
        let content = "---\nname: My Skill\ndescription: \"Does useful things\"\ntrigger: 'when needed'\n---\n\n# Heading\n\nBody paragraph.\n";
        let meta = parse_skill(content, "parent-dir");
        assert_eq!(meta.name, "My Skill");
        assert_eq!(meta.description, "Does useful things");
        assert_eq!(meta.trigger, "when needed");
    }

    #[test]
    fn falls_back_to_parent_dir_and_first_paragraph() {
        let content = "# Title\n\nThis is the first paragraph.\n\nSecond paragraph.\n";
        let meta = parse_skill(content, "codebase-recon");
        assert_eq!(meta.name, "codebase-recon");
        assert_eq!(meta.description, "This is the first paragraph.");
        assert_eq!(meta.trigger, "This is the first paragraph.");
    }

    #[test]
    fn chinese_summary_truncation_is_utf8_safe() {
        let body = "一".repeat(500);
        let content = format!("{body}\n");
        let meta = parse_skill(&content, "zh");
        assert_eq!(meta.description.chars().count(), SUMMARY_MAX_CHARS);
        // Round-trips as valid UTF-8 (would panic on a split code point).
        assert!(meta.description.chars().all(|c| c == '一'));
    }

    #[test]
    fn recursively_finds_nested_skill_files() {
        let root = unique_temp_dir("nested");
        write_file(
            &root.join("alpha").join("SKILL.md"),
            "---\nname: Alpha\n---\nAlpha body.\n",
        );
        write_file(
            &root
                .join("alpha")
                .join("deep")
                .join("beta")
                .join("SKILL.md"),
            "---\nname: Beta\n---\nBeta body.\n",
        );

        let result = scan_with_roots("workspace", vec![(root.clone(), "workspace")]);
        assert_eq!(result.skills.len(), 2);
        assert_eq!(result.roots[0].skill_count, 2);
        assert!(result.roots[0].exists);

        std::fs::remove_dir_all(&root).ok();
    }

    #[test]
    fn ignores_plain_readme_files() {
        let root = unique_temp_dir("readme");
        write_file(&root.join("README.md"), "# Readme\n\nNot a skill.\n");
        write_file(&root.join("notes.md"), "# Notes\n");
        write_file(
            &root.join("real").join("SKILL.md"),
            "---\nname: Real\n---\nReal body.\n",
        );

        let result = scan_with_roots("workspace", vec![(root.clone(), "workspace")]);
        assert_eq!(result.skills.len(), 1);
        assert_eq!(result.skills[0].name, "Real");

        std::fs::remove_dir_all(&root).ok();
    }

    #[test]
    fn missing_root_reports_not_exists_without_panic() {
        let mut missing = std::env::temp_dir();
        missing.push(format!(
            "skillcopilot_test_missing_{}_{}",
            std::process::id(),
            SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .map(|e| e.as_nanos())
                .unwrap_or(0)
        ));

        let result = scan_with_roots("workspace", vec![(missing, "user")]);
        assert_eq!(result.skills.len(), 0);
        assert_eq!(result.roots.len(), 1);
        assert!(!result.roots[0].exists);
        assert!(result.roots[0].error.is_none());
    }

    #[test]
    fn oversized_skill_is_skipped_with_warning() {
        let root = unique_temp_dir("oversize");
        let big = "a".repeat((MAX_FILE_SIZE as usize) + 16);
        write_file(&root.join("huge").join("SKILL.md"), &big);

        let result = scan_with_roots("workspace", vec![(root.clone(), "workspace")]);
        assert_eq!(result.skills.len(), 0);
        assert!(result
            .warnings
            .iter()
            .any(|warning| warning.contains("larger than 1 MiB")));

        std::fs::remove_dir_all(&root).ok();
    }

    #[test]
    fn skills_are_sorted_by_name_then_path() {
        let root = unique_temp_dir("sorted");
        write_file(
            &root.join("z").join("SKILL.md"),
            "---\nname: Apple\n---\nBody.\n",
        );
        write_file(
            &root.join("a").join("SKILL.md"),
            "---\nname: Mango\n---\nBody.\n",
        );
        write_file(
            &root.join("m").join("SKILL.md"),
            "---\nname: Apple\n---\nBody.\n",
        );

        let result = scan_with_roots("workspace", vec![(root.clone(), "workspace")]);
        let names: Vec<&str> = result.skills.iter().map(|s| s.name.as_str()).collect();
        assert_eq!(names, vec!["Apple", "Apple", "Mango"]);
        // Two "Apple" entries must be ordered by path (m before z).
        assert!(result.skills[0].path < result.skills[1].path);

        std::fs::remove_dir_all(&root).ok();
    }

    #[test]
    fn duplicate_canonical_paths_are_deduplicated() {
        let root = unique_temp_dir("dedupe");
        write_file(
            &root.join("one").join("SKILL.md"),
            "---\nname: One\n---\nBody.\n",
        );

        // Same physical root passed twice as two logical roots.
        let result = scan_with_roots(
            "workspace",
            vec![(root.clone(), "workspace"), (root.clone(), "user")],
        );
        assert_eq!(result.skills.len(), 1);
        // First root claims it; the second finds only a duplicate.
        assert_eq!(result.roots[0].skill_count, 1);
        assert_eq!(result.roots[1].skill_count, 0);

        std::fs::remove_dir_all(&root).ok();
    }
}
