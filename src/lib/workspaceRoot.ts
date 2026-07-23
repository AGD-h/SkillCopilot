/** localStorage key for the bound workspace absolute path. Path only — never bodies. */
export const WORKSPACE_ROOT_STORAGE_KEY = "skillcopilot.workspaceRoot";

/** Normalize a candidate path: trim; empty → null. Does not rewrite separators or shorten. */
export function normalizeWorkspaceRoot(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/** Read and validate the stored workspace root. Missing/blank → null. */
export function readStoredWorkspaceRoot(
  storage: Pick<Storage, "getItem"> | null | undefined = defaultStorage(),
): string | null {
  if (!storage) return null;
  try {
    return normalizeWorkspaceRoot(storage.getItem(WORKSPACE_ROOT_STORAGE_KEY));
  } catch {
    return null;
  }
}

/** Persist a validated non-empty path under the exact storage key. */
export function writeStoredWorkspaceRoot(
  path: string,
  storage: Pick<Storage, "setItem"> | null | undefined = defaultStorage(),
): boolean {
  const normalized = normalizeWorkspaceRoot(path);
  if (!normalized || !storage) return false;
  try {
    storage.setItem(WORKSPACE_ROOT_STORAGE_KEY, normalized);
    return true;
  } catch {
    return false;
  }
}

/** Remove the workspace key only. Never touches filesystem content.
 * Returns true when removeItem succeeds; false when storage is missing or throws.
 */
export function clearStoredWorkspaceRoot(
  storage: Pick<Storage, "removeItem"> | null | undefined = defaultStorage(),
): boolean {
  if (!storage) return false;
  try {
    storage.removeItem(WORKSPACE_ROOT_STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}

/**
 * Last path segment for display. Preserves Unicode; does not truncate long
 * Windows or CJK paths — UI ellipsis handles overflow.
 */
export function workspaceDisplayName(rootPath: string): string {
  const trimmed = rootPath.trim();
  if (!trimmed) return "";
  const withoutTrailing = trimmed.replace(/[\\/]+$/u, "");
  const parts = withoutTrailing.split(/[\\/]/u).filter((part) => part.length > 0);
  return parts.length > 0 ? parts[parts.length - 1] : withoutTrailing;
}

function defaultStorage(): Storage | null {
  try {
    if (typeof localStorage === "undefined") return null;
    return localStorage;
  } catch {
    return null;
  }
}
