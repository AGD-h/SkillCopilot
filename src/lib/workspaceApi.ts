import { invoke } from "@tauri-apps/api/core";
import type { SkillScanResult, WorkspaceStatus } from "../types";

/**
 * Read-only local workspace status from the Tauri backend.
 * Wraps the Rust `read_workspace_status` command. The argument is nested under
 * `request` to match the command signature `read_workspace_status(request)`,
 * and `rootPath` maps to the Rust `root_path` field (serde camelCase).
 */
export async function readWorkspaceStatus(
  rootPath: string,
): Promise<WorkspaceStatus> {
  return invoke<WorkspaceStatus>("read_workspace_status", {
    request: { rootPath },
  });
}

/**
 * Read-only local Skill scan from the Tauri backend.
 * Wraps the Rust `scan_local_skills` command. As with `read_workspace_status`,
 * the argument is nested under `request`, and `rootPath` maps to the Rust
 * `root_path` field (serde camelCase).
 */
export async function scanLocalSkills(
  rootPath: string,
): Promise<SkillScanResult> {
  return invoke<SkillScanResult>("scan_local_skills", {
    request: { rootPath },
  });
}
