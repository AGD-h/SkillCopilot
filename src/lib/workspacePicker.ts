import { normalizeWorkspaceRoot } from "./workspaceRoot";

export type WorkspacePickResult =
  | { kind: "selected"; path: string }
  | { kind: "cancel" }
  | { kind: "error"; reason: "unavailable" | "invalid" | "failed"; message: string };

export type WorkspaceOpenFn = (options: {
  directory: true;
  multiple: false;
}) => Promise<string | string[] | null>;

/**
 * Normalize a Dialog `open` return value into a single workspace path.
 * - null → cancel
 * - non-empty string → selected
 * - string[] → accepted only when the original array length is exactly 1
 *   and that sole element is a non-empty string after trim
 * - blank / multi-entry / non-string element / other → invalid
 */
export function interpretWorkspaceDialogResult(
  value: unknown,
): WorkspacePickResult {
  if (value === null || value === undefined) {
    return { kind: "cancel" };
  }

  if (typeof value === "string") {
    const path = normalizeWorkspaceRoot(value);
    if (!path) {
      return {
        kind: "error",
        reason: "invalid",
        message: "empty path",
      };
    }
    return { kind: "selected", path };
  }

  if (Array.isArray(value)) {
    if (value.length !== 1) {
      return {
        kind: "error",
        reason: "invalid",
        message:
          value.length === 0
            ? "empty selection"
            : `expected exactly one path, got ${value.length}`,
      };
    }
    const only = value[0];
    if (typeof only !== "string") {
      return {
        kind: "error",
        reason: "invalid",
        message: "non-string array entry",
      };
    }
    const path = normalizeWorkspaceRoot(only);
    if (!path) {
      return {
        kind: "error",
        reason: "invalid",
        message: "empty path",
      };
    }
    return { kind: "selected", path };
  }

  return {
    kind: "error",
    reason: "invalid",
    message: "unexpected dialog result type",
  };
}

/** Open the native folder picker. Does not use prompts or shell commands. */
export async function pickWorkspaceDirectory(
  openDialog?: WorkspaceOpenFn,
): Promise<WorkspacePickResult> {
  try {
    const openFn =
      openDialog ??
      ((await import("@tauri-apps/plugin-dialog")).open as WorkspaceOpenFn);
    const selected = await openFn({
      directory: true,
      multiple: false,
    });
    return interpretWorkspaceDialogResult(selected);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    const unavailable =
      /not allowed|plugin|webview|tauri|ipc|invoke|unavailable|undefined/i.test(
        message,
      ) || message.trim() === "";
    return {
      kind: "error",
      reason: unavailable ? "unavailable" : "failed",
      message: message || "dialog failed",
    };
  }
}
