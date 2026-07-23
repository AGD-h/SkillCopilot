//! Read-only local Skill scanner.
//!
//! Walks a fixed set of default scan roots looking for `SKILL.md` files
//! (case-insensitive), parses a lightweight frontmatter/first-paragraph
//! summary, and returns a stable, de-duplicated, sorted list. The scanner is
//! strictly read-only: it never writes, never follows symlinks/junctions, and
//! never panics on user input or disk contents.

use std::collections::HashSet;
use std::fs::{File, Metadata};
use std::io::{ErrorKind, Read};
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};

use serde::{Deserialize, Serialize};

/// Maximum directory recursion depth (root directory is depth 0).
const MAX_DEPTH: usize = 8;
/// Maximum number of skills returned before the result is marked truncated.
const MAX_SKILLS: usize = 500;
/// Maximum size of a single `SKILL.md` we will read (1 MiB).
const MAX_FILE_SIZE: u64 = 1024 * 1024;
/// Upper bound on collected warning *messages* returned to the client.
const MAX_WARNINGS: usize = 100;
/// Char-safe truncation length for description/trigger summaries.
const SUMMARY_MAX_CHARS: usize = 200;

const LIMIT_REACHED_MSG: &str = "not scanned after global skill limit was reached";

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SkillScanRequest {
    pub root_path: String,
}

#[derive(Serialize, Debug, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct SkillScanResult {
    pub workspace_root: String,
    pub roots: Vec<SkillRootStatus>,
    pub skills: Vec<SkillItem>,
    pub warnings: Vec<String>,
    pub warning_count: u32,
    pub warnings_truncated: bool,
    pub truncated: bool,
    pub scanned_at: String,
}

#[derive(Serialize, Debug, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct SkillRootStatus {
    pub path: String,
    pub source: String,
    pub exists: bool,
    pub skill_count: u32,
    pub error: Option<String>,
}

#[derive(Serialize, Debug, PartialEq, Eq)]
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

/// Scans an explicit list of roots at the production skill limit.
fn scan_with_roots(workspace_root: &str, roots: Vec<(PathBuf, &'static str)>) -> SkillScanResult {
    scan_with_roots_limited(workspace_root, roots, MAX_SKILLS)
}

/// Scans with a configurable skill cap (tests use small limits).
fn scan_with_roots_limited(
    workspace_root: &str,
    roots: Vec<(PathBuf, &'static str)>,
    max_skills: usize,
) -> SkillScanResult {
    let mut skills: Vec<SkillItem> = Vec::new();
    let mut warnings: Vec<String> = Vec::new();
    let mut warning_count: u32 = 0;
    let mut seen: HashSet<String> = HashSet::new();
    let mut truncated = false;
    let mut root_statuses: Vec<SkillRootStatus> = Vec::new();

    for (root, source) in roots {
        if truncated {
            root_statuses.push(unscanned_root_status(&root, source));
            continue;
        }

        let status = scan_root(
            &root,
            source,
            &mut skills,
            &mut warnings,
            &mut warning_count,
            &mut seen,
            &mut truncated,
            max_skills,
        );
        root_statuses.push(status);
    }

    skills.sort_by(|a, b| a.name.cmp(&b.name).then_with(|| a.path.cmp(&b.path)));

    let warnings_truncated = warning_count as usize > warnings.len();

    SkillScanResult {
        workspace_root: workspace_root.to_string(),
        roots: root_statuses,
        skills,
        warnings,
        warning_count,
        warnings_truncated,
        truncated,
        scanned_at: current_timestamp_millis(),
    }
}

/// Lightweight status for roots never walked because the global skill limit
/// was already reached.
fn unscanned_root_status(root: &Path, source: &str) -> SkillRootStatus {
    let display = strip_verbatim(root);
    match std::fs::symlink_metadata(root) {
        Ok(_) => SkillRootStatus {
            path: display,
            source: source.to_string(),
            exists: true,
            skill_count: 0,
            error: Some(LIMIT_REACHED_MSG.to_string()),
        },
        Err(err) if err.kind() == ErrorKind::NotFound => SkillRootStatus {
            path: display,
            source: source.to_string(),
            exists: false,
            skill_count: 0,
            error: Some(LIMIT_REACHED_MSG.to_string()),
        },
        Err(_) => SkillRootStatus {
            path: display,
            source: source.to_string(),
            exists: false,
            skill_count: 0,
            error: Some(LIMIT_REACHED_MSG.to_string()),
        },
    }
}

/// Classifies a `symlink_metadata` failure for a scan root.
///
/// * `NotFound` -> normal missing root (`exists=false`, no error)
/// * anything else -> `exists=false` with a short readable error
fn classify_root_access_error(err: &std::io::Error) -> (bool, Option<String>) {
    if err.kind() == ErrorKind::NotFound {
        (false, None)
    } else {
        (false, Some(short_io_error(err)))
    }
}

fn short_io_error(err: &std::io::Error) -> String {
    // Keep messages short and free of environment variable values / file bodies.
    format!("{} ({})", err.kind(), err)
}

/// Walks a single root (iteratively, depth-limited) collecting `SKILL.md`
/// files. A missing root reports `exists = false` without failing the scan;
/// a failure inside one root never blocks the others.
fn scan_root(
    root: &Path,
    source: &str,
    skills: &mut Vec<SkillItem>,
    warnings: &mut Vec<String>,
    warning_count: &mut u32,
    seen: &mut HashSet<String>,
    truncated: &mut bool,
    max_skills: usize,
) -> SkillRootStatus {
    let display = strip_verbatim(root);

    let meta = match std::fs::symlink_metadata(root) {
        Ok(meta) => meta,
        Err(err) => {
            let (exists, error) = classify_root_access_error(&err);
            return SkillRootStatus {
                path: display,
                source: source.to_string(),
                exists,
                skill_count: 0,
                error,
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

    let canonical_root = match std::fs::canonicalize(root) {
        Ok(path) => path,
        Err(err) => {
            return SkillRootStatus {
                path: display,
                source: source.to_string(),
                exists: true,
                skill_count: 0,
                error: Some(format!("failed to canonicalize scan root: {err}")),
            };
        }
    };

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
                        warning_count,
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
                Err(err) => {
                    push_warning(
                        warnings,
                        warning_count,
                        format!(
                            "Skipped unreadable directory entry under {}: {err}",
                            strip_verbatim(&dir)
                        ),
                    );
                    continue;
                }
            };
            let file_type = match entry.file_type() {
                Ok(file_type) => file_type,
                Err(err) => {
                    push_warning(
                        warnings,
                        warning_count,
                        format!(
                            "Skipped entry with unreadable type under {}: {err}",
                            strip_verbatim(&dir)
                        ),
                    );
                    continue;
                }
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
                // Only a successfully parsed, unique skill may consume a slot
                // or flip `truncated`. Invalid / duplicate / oversized /
                // non-UTF-8 candidates must not.
                match process_skill_file(&entry_path, root, &canonical_root, seen) {
                    ProcessOutcome::Added(item) => {
                        if skills.len() >= max_skills {
                            // This would have been the (max_skills + 1)-th
                            // valid unique skill -- do not keep it.
                            *truncated = true;
                            break;
                        }
                        skills.push(*item);
                        count += 1;
                    }
                    ProcessOutcome::Duplicate => {}
                    ProcessOutcome::Warning(message) => {
                        push_warning(warnings, warning_count, message)
                    }
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
///
/// Paths are only inserted into `seen` after a successful parse so failed
/// candidates do not permanently occupy a de-duplication slot.
fn process_skill_file(
    path: &Path,
    root: &Path,
    canonical_root: &Path,
    seen: &mut HashSet<String>,
) -> ProcessOutcome {
    let canonical = match std::fs::canonicalize(path) {
        Ok(path) => path,
        Err(err) => {
            return ProcessOutcome::Warning(format!(
                "Skipped uncanonicalizable SKILL.md {}: {err}",
                strip_verbatim(path)
            ));
        }
    };

    if !path_is_within_root(&canonical, canonical_root) {
        return ProcessOutcome::Warning(format!(
            "Skipped SKILL.md outside scan root: {}",
            strip_verbatim(path)
        ));
    }

    let id = strip_verbatim(&canonical);
    if seen.contains(&id) {
        return ProcessOutcome::Duplicate;
    }

    let (content, meta) = match read_skill_bounded(&canonical) {
        Ok(pair) => pair,
        Err(message) => return ProcessOutcome::Warning(message),
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

    seen.insert(id.clone());

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

/// Opens the file once, reads at most `MAX_FILE_SIZE + 1` bytes, and rejects
/// anything larger. Uses the opened handle's metadata for mtime.
fn read_skill_bounded(path: &Path) -> Result<(String, Metadata), String> {
    let mut file = File::open(path).map_err(|err| {
        format!(
            "Skipped unreadable SKILL.md {}: {err}",
            strip_verbatim(path)
        )
    })?;

    let meta = file.metadata().map_err(|err| {
        format!(
            "Skipped unreadable SKILL.md {}: {err}",
            strip_verbatim(path)
        )
    })?;

    let mut limited = (&mut file).take(MAX_FILE_SIZE + 1);
    let mut bytes = Vec::new();
    limited.read_to_end(&mut bytes).map_err(|err| {
        format!(
            "Skipped unreadable SKILL.md {}: {err}",
            strip_verbatim(path)
        )
    })?;

    if bytes.len() as u64 > MAX_FILE_SIZE {
        return Err(format!(
            "Skipped SKILL.md larger than 1 MiB: {}",
            strip_verbatim(path)
        ));
    }

    let content = String::from_utf8(bytes)
        .map_err(|_| format!("Skipped non-UTF-8 SKILL.md: {}", strip_verbatim(path)))?;

    Ok((content, meta))
}

/// Returns true when `candidate` is the root itself or a descendant of it.
///
/// On Windows the filesystem is case-insensitive, so a candidate that differs
/// from the root only in ASCII case must still be accepted. We compare
/// component-by-component (never a raw string prefix, which would let
/// `C:\foo` match `C:\foobar`).
fn path_is_within_root(candidate: &Path, root: &Path) -> bool {
    #[cfg(windows)]
    {
        path_is_within_root_windows(candidate, root)
    }
    #[cfg(not(windows))]
    {
        if candidate == root {
            return true;
        }
        candidate.starts_with(root)
    }
}

#[cfg(windows)]
fn path_is_within_root_windows(candidate: &Path, root: &Path) -> bool {
    use std::ffi::OsStr;
    use std::os::windows::ffi::OsStrExt;

    fn ascii_bytes(component: &std::path::Component) -> Vec<u8> {
        let os: &OsStr = component.as_os_str();
        let mut bytes = Vec::with_capacity(os.len() / 2);
        for wide in os.encode_wide() {
            if let Ok(byte) = u8::try_from(wide) {
                bytes.push(byte.to_ascii_lowercase());
            } else {
                // Non-ASCII component: fall back to exact UTF-16LE bytes so a
                // non-ASCII path can never match a different non-ASCII path.
                for half in wide.to_le_bytes() {
                    bytes.push(half);
                }
            }
        }
        bytes
    }

    let candidate_components: Vec<_> = candidate.components().collect();
    let root_components: Vec<_> = root.components().collect();

    if candidate_components.len() < root_components.len() {
        return false;
    }

    for (candidate_comp, root_comp) in candidate_components.iter().zip(root_components.iter()) {
        // Component kinds must align (Prefix vs Prefix, RootDir vs RootDir,
        // Normal vs Normal, ...). This also prevents a same-bytes collision
        // between different component kinds.
        if std::mem::discriminant(candidate_comp) != std::mem::discriminant(root_comp) {
            return false;
        }
        if ascii_bytes(candidate_comp) != ascii_bytes(root_comp) {
            return false;
        }
    }
    true
}

struct SkillMeta {
    name: String,
    description: String,
    trigger: String,
}

/// Parses lightweight metadata from a `SKILL.md` body.
fn parse_skill(content: &str, parent_dir_name: &str) -> SkillMeta {
    let lines: Vec<&str> = content.lines().collect();
    let mut index = 0;
    let mut front_name: Option<String> = None;
    let mut front_description: Option<String> = None;
    let mut front_trigger: Option<String> = None;

    let first = lines
        .first()
        .map(|line| line.trim_start_matches('\u{feff}').trim())
        .unwrap_or("");
    let has_opening = first == "---";

    if has_opening {
        let mut closed = false;
        let mut probe = 1;
        while probe < lines.len() {
            if lines[probe].trim() == "---" {
                closed = true;
                break;
            }
            probe += 1;
        }

        if closed {
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
        } else {
            // Malformed / unclosed frontmatter: do not trust any frontmatter
            // fields. Skip the opening fence and only the three recognized
            // metadata lines (name/description/trigger); any other line --
            // including an unknown `key: value` pair such as `Usage: run
            // this` -- becomes the body start so it is not swallowed.
            index = 1;
            while index < lines.len() {
                let line = lines[index];
                let trimmed = line.trim_start_matches('\u{feff}').trim();
                if trimmed.is_empty() || trimmed.starts_with('#') {
                    break;
                }
                let is_known_metadata = parse_kv(line)
                    .map(|(key, _)| matches!(key.as_str(), "name" | "description" | "trigger"))
                    .unwrap_or(false);
                if is_known_metadata {
                    index += 1;
                    continue;
                }
                break;
            }
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

fn first_paragraph(lines: &[&str]) -> String {
    let mut collected: Vec<&str> = Vec::new();
    for line in lines {
        let trimmed = line.trim_start_matches('\u{feff}').trim();
        if trimmed.is_empty() || trimmed == "---" {
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

fn truncate_chars(value: &str, max_chars: usize) -> String {
    value.chars().take(max_chars).collect()
}

fn is_ignored_dir(name: &str) -> bool {
    name.eq_ignore_ascii_case(".git")
        || name.eq_ignore_ascii_case("node_modules")
        || name.eq_ignore_ascii_case("target")
}

fn push_warning(warnings: &mut Vec<String>, warning_count: &mut u32, message: String) {
    *warning_count = warning_count.saturating_add(1);
    if warnings.len() < MAX_WARNINGS {
        warnings.push(message);
    }
}

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
    use std::io;

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

    fn write_bytes(path: &Path, bytes: &[u8]) {
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent).expect("create parent dir");
        }
        std::fs::write(path, bytes).expect("write bytes");
    }

    fn write_n_skills(root: &Path, count: usize) {
        for i in 0..count {
            write_file(
                &root.join(format!("skill-{i:04}")).join("SKILL.md"),
                &format!("---\nname: Skill-{i:04}\n---\nBody {i}.\n"),
            );
        }
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
        let body = "\u{4e00}".repeat(500);
        let content = format!("{body}\n");
        let meta = parse_skill(&content, "zh");
        assert_eq!(meta.description.chars().count(), SUMMARY_MAX_CHARS);
        assert!(meta.description.chars().all(|c| c == '\u{4e00}'));
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
    fn not_found_is_classified_as_normal_missing() {
        let err = io::Error::new(ErrorKind::NotFound, "gone");
        let (exists, error) = classify_root_access_error(&err);
        assert!(!exists);
        assert!(error.is_none());
    }

    #[test]
    fn non_not_found_root_errors_are_not_normal_missing() {
        let err = io::Error::new(ErrorKind::PermissionDenied, "denied");
        let (exists, error) = classify_root_access_error(&err);
        assert!(!exists);
        assert!(error.is_some());
        let message = error.unwrap();
        assert!(message.contains("permission denied") || message.contains("PermissionDenied"));
    }

    #[test]
    fn root_that_is_a_file_reports_exists_with_error() {
        let root = unique_temp_dir("file-root");
        let file_path = root.join("not-a-dir");
        write_file(&file_path, "hello");

        let result = scan_with_roots("workspace", vec![(file_path.clone(), "workspace")]);
        assert!(result.roots[0].exists);
        assert_eq!(result.roots[0].skill_count, 0);
        assert!(result.roots[0]
            .error
            .as_deref()
            .unwrap_or("")
            .contains("not a directory"));

        std::fs::remove_dir_all(&root).ok();
    }

    #[test]
    fn oversized_skill_is_skipped_with_warning() {
        let root = unique_temp_dir("oversize");
        let big = "a".repeat((MAX_FILE_SIZE as usize) + 16);
        write_file(&root.join("huge").join("SKILL.md"), &big);

        let result = scan_with_roots("workspace", vec![(root.clone(), "workspace")]);
        assert_eq!(result.skills.len(), 0);
        assert!(result.warning_count >= 1);
        assert!(result
            .warnings
            .iter()
            .any(|warning| warning.contains("larger than 1 MiB")));

        std::fs::remove_dir_all(&root).ok();
    }

    #[test]
    fn exactly_max_skills_is_not_truncated() {
        let root = unique_temp_dir("exact-cap");
        write_n_skills(&root, 3);

        let result = scan_with_roots_limited("workspace", vec![(root.clone(), "workspace")], 3);
        assert_eq!(result.skills.len(), 3);
        assert!(!result.truncated);

        std::fs::remove_dir_all(&root).ok();
    }

    #[test]
    fn one_over_max_sets_truncated_and_keeps_cap() {
        let root = unique_temp_dir("over-cap");
        write_n_skills(&root, 4);

        let result = scan_with_roots_limited("workspace", vec![(root.clone(), "workspace")], 3);
        assert_eq!(result.skills.len(), 3);
        assert!(result.truncated);

        std::fs::remove_dir_all(&root).ok();
    }

    #[test]
    fn duplicates_after_cap_do_not_set_truncated() {
        let root_a = unique_temp_dir("cap-dup-a");
        write_n_skills(&root_a, 2);
        let result = scan_with_roots_limited(
            "workspace",
            vec![(root_a.clone(), "workspace"), (root_a.clone(), "user")],
            2,
        );
        assert_eq!(result.skills.len(), 2);
        assert!(!result.truncated);
        assert_eq!(result.roots[1].skill_count, 0);

        std::fs::remove_dir_all(&root_a).ok();
    }

    #[test]
    fn oversized_after_cap_does_not_set_truncated() {
        // Put the cap-reaching valid skills and the oversized file in separate
        // roots so the result does not depend on read_dir ordering within a
        // single directory.
        let root_valid = unique_temp_dir("cap-oversize-valid");
        write_n_skills(&root_valid, 2);

        let root_invalid = unique_temp_dir("cap-oversize-invalid");
        let big = "a".repeat((MAX_FILE_SIZE as usize) + 8);
        write_file(&root_invalid.join("huge").join("SKILL.md"), &big);

        let result = scan_with_roots_limited(
            "workspace",
            vec![
                (root_valid.clone(), "workspace"),
                (root_invalid.clone(), "user"),
            ],
            2,
        );
        assert_eq!(result.skills.len(), 2);
        assert!(!result.truncated);
        // The second root was actually scanned (not skipped by the limit): it
        // exists, has no root-level error, but contributed 0 valid skills.
        assert!(result.roots[1].exists);
        assert!(result.roots[1].error.is_none());
        assert_eq!(result.roots[1].skill_count, 0);
        assert!(result.warning_count >= 1);
        assert!(result
            .warnings
            .iter()
            .any(|warning| warning.contains("larger than 1 MiB")));

        std::fs::remove_dir_all(&root_valid).ok();
        std::fs::remove_dir_all(&root_invalid).ok();
    }

    #[test]
    fn non_utf8_after_cap_does_not_set_truncated() {
        // Separate roots remove the read_dir ordering dependency: the valid
        // skills reach the cap first, then the non-UTF-8 file is scanned in a
        // distinct root and only emits a warning.
        let root_valid = unique_temp_dir("cap-utf8-valid");
        write_n_skills(&root_valid, 2);

        let root_invalid = unique_temp_dir("cap-utf8-invalid");
        write_bytes(
            &root_invalid.join("bad").join("SKILL.md"),
            &[0xFF, 0xFE, 0xFD],
        );

        let result = scan_with_roots_limited(
            "workspace",
            vec![
                (root_valid.clone(), "workspace"),
                (root_invalid.clone(), "user"),
            ],
            2,
        );
        assert_eq!(result.skills.len(), 2);
        assert!(!result.truncated);
        assert!(result.roots[1].exists);
        assert!(result.roots[1].error.is_none());
        assert_eq!(result.roots[1].skill_count, 0);
        assert!(result.warning_count >= 1);
        assert!(result
            .warnings
            .iter()
            .any(|warning| warning.contains("non-UTF-8")));

        std::fs::remove_dir_all(&root_valid).ok();
        std::fs::remove_dir_all(&root_invalid).ok();
    }

    #[test]
    fn remaining_roots_marked_when_limit_reached() {
        let root_a = unique_temp_dir("limit-a");
        let root_b = unique_temp_dir("limit-b");
        write_n_skills(&root_a, 3);
        write_n_skills(&root_b, 2);

        let result = scan_with_roots_limited(
            "workspace",
            vec![(root_a.clone(), "workspace"), (root_b.clone(), "user")],
            2,
        );
        assert_eq!(result.skills.len(), 2);
        assert!(result.truncated);
        assert_eq!(result.roots[1].error.as_deref(), Some(LIMIT_REACHED_MSG));
        assert_eq!(result.roots[1].skill_count, 0);

        std::fs::remove_dir_all(&root_a).ok();
        std::fs::remove_dir_all(&root_b).ok();
    }

    #[test]
    fn exactly_one_mib_is_readable() {
        let root = unique_temp_dir("exact-mib");
        let body = "b".repeat(MAX_FILE_SIZE as usize);
        let path = root.join("exact").join("SKILL.md");
        write_file(&path, &body);

        let result = scan_with_roots("workspace", vec![(root.clone(), "workspace")]);
        assert_eq!(result.skills.len(), 1);
        assert_eq!(result.skills[0].body.len(), MAX_FILE_SIZE as usize);
        assert_eq!(result.skills[0].body, body);

        std::fs::remove_dir_all(&root).ok();
    }

    #[test]
    fn one_mib_plus_one_is_skipped() {
        let root = unique_temp_dir("mib-plus");
        let body = "c".repeat((MAX_FILE_SIZE as usize) + 1);
        write_file(&root.join("big").join("SKILL.md"), &body);

        let result = scan_with_roots("workspace", vec![(root.clone(), "workspace")]);
        assert_eq!(result.skills.len(), 0);
        assert!(result
            .warnings
            .iter()
            .any(|warning| warning.contains("larger than 1 MiB")));

        std::fs::remove_dir_all(&root).ok();
    }

    #[test]
    fn body_matches_disk_bytes_decoded() {
        let root = unique_temp_dir("body-roundtrip");
        let content = "---\nname: Roundtrip\n---\nfull body ok\nline 2\n";
        let path = root.join("rt").join("SKILL.md");
        write_file(&path, content);

        let result = scan_with_roots("workspace", vec![(root.clone(), "workspace")]);
        assert_eq!(result.skills.len(), 1);
        assert_eq!(result.skills[0].body, content);

        std::fs::remove_dir_all(&root).ok();
    }

    #[test]
    fn ignored_dirs_are_case_insensitive() {
        assert!(is_ignored_dir(".GIT"));
        assert!(is_ignored_dir("Node_Modules"));
        assert!(is_ignored_dir("TARGET"));
        assert!(!is_ignored_dir("skills"));
    }

    #[test]
    fn mixed_case_ignored_dirs_are_skipped_during_scan() {
        let root = unique_temp_dir("ignore-case");
        write_file(
            &root.join("NODE_MODULES").join("hidden").join("SKILL.md"),
            "---\nname: Hidden\n---\nShould not appear.\n",
        );
        write_file(
            &root.join("visible").join("SKILL.md"),
            "---\nname: Visible\n---\nOk.\n",
        );

        let result = scan_with_roots("workspace", vec![(root.clone(), "workspace")]);
        assert_eq!(result.skills.len(), 1);
        assert_eq!(result.skills[0].name, "Visible");

        std::fs::remove_dir_all(&root).ok();
    }

    #[test]
    fn unclosed_frontmatter_falls_back_to_body() {
        let content =
            "---\nname: ShouldNotWin\ndescription: bad\n\n# Title\n\nReal description paragraph.\n";
        let meta = parse_skill(content, "parent");
        assert_eq!(meta.name, "parent");
        assert_eq!(meta.description, "Real description paragraph.");
    }

    #[test]
    fn unclosed_frontmatter_keeps_unknown_colon_line_as_body() {
        // `Usage: run this` contains a colon but is not a recognized metadata
        // field, so it must become the body start rather than be swallowed.
        let content = "---\nUsage: run this\n";
        let meta = parse_skill(content, "parent");
        assert_eq!(meta.name, "parent");
        assert_eq!(meta.description, "Usage: run this");
        assert_eq!(meta.trigger, "Usage: run this");
    }

    #[test]
    fn unclosed_frontmatter_ignores_known_metadata_then_keeps_body() {
        // `name:` is a recognized metadata field and is skipped, but the
        // following unknown `Usage: run this` line is the body start.
        let content = "---\nname: example\nUsage: run this\n";
        let meta = parse_skill(content, "parent");
        assert_eq!(meta.name, "parent");
        assert_eq!(meta.description, "Usage: run this");
        assert_eq!(meta.trigger, "Usage: run this");
    }

    #[test]
    fn unclosed_frontmatter_keeps_arbitrary_custom_key_as_body() {
        // An unknown `custom: value` pair is body, not frontmatter.
        let content = "---\ncustom: value\n";
        let meta = parse_skill(content, "parent");
        assert_eq!(meta.name, "parent");
        assert_eq!(meta.description, "custom: value");
        assert_eq!(meta.trigger, "custom: value");
    }

    #[test]
    fn closed_frontmatter_still_parses_known_fields() {
        // Regression guard: normal closed frontmatter behavior is unchanged.
        let content = "---\nname: Real\ndescription: \"parsed\"\ntrigger: 'now'\n---\n\nBody.\n";
        let meta = parse_skill(content, "parent");
        assert_eq!(meta.name, "Real");
        assert_eq!(meta.description, "parsed");
        assert_eq!(meta.trigger, "now");
    }

    #[test]
    fn bom_and_empty_frontmatter_fields_are_handled() {
        let content = "\u{feff}---\nname: \ndescription: \"\"\n---\n\nUseful body text.\n";
        let meta = parse_skill(content, "parent");
        assert_eq!(meta.name, "parent");
        assert_eq!(meta.description, "Useful body text.");
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

        let result = scan_with_roots(
            "workspace",
            vec![(root.clone(), "workspace"), (root.clone(), "user")],
        );
        assert_eq!(result.skills.len(), 1);
        assert_eq!(result.roots[0].skill_count, 1);
        assert_eq!(result.roots[1].skill_count, 0);

        std::fs::remove_dir_all(&root).ok();
    }

    #[test]
    fn warning_count_tracks_beyond_retained_list() {
        let root = unique_temp_dir("warn-cap");
        for i in 0..(MAX_WARNINGS + 5) {
            write_bytes(
                &root.join(format!("bad-{i:03}")).join("SKILL.md"),
                &[0xFF, 0xFE, 0xFD],
            );
        }

        let result = scan_with_roots("workspace", vec![(root.clone(), "workspace")]);
        assert_eq!(result.skills.len(), 0);
        assert_eq!(result.warnings.len(), MAX_WARNINGS);
        assert_eq!(result.warning_count, (MAX_WARNINGS + 5) as u32);
        assert!(result.warnings_truncated);

        std::fs::remove_dir_all(&root).ok();
    }

    #[cfg(windows)]
    #[test]
    fn windows_path_case_insensitivity_accepts_same_path_different_case() {
        // Same path, differing only in ASCII case, must be accepted on Windows.
        let root = PathBuf::from(r"C:\SkillCopilot\.cursor\skills");
        let candidate = PathBuf::from(r"c:\skillcopilot\.CURSOR\skills\sub\SKILL.md");
        assert!(path_is_within_root(&candidate, &root));

        // Candidate identical to root (different case) is also within root.
        let candidate_same = PathBuf::from(r"c:\skillcopilot\.cursor\skills");
        assert!(path_is_within_root(&candidate_same, &root));
    }

    #[cfg(windows)]
    #[test]
    fn windows_path_case_insensitivity_rejects_different_directory() {
        // Similar string prefix but a different directory component must be
        // rejected: `C:\foo` must not match `C:\foobar`.
        let root = PathBuf::from(r"C:\foo");
        let candidate_sibling = PathBuf::from(r"C:\foobar\SKILL.md");
        assert!(!path_is_within_root(&candidate_sibling, &root));

        // A genuinely different directory is rejected regardless of case.
        let root_two = PathBuf::from(r"C:\SkillCopilot\.cursor\skills");
        let candidate_other = PathBuf::from(r"C:\SkillCopilot\.agents\skills\SKILL.md");
        assert!(!path_is_within_root(&candidate_other, &root_two));
    }
}
