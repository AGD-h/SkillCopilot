import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AgentsPage } from "./components/AgentsPage";
import { DashboardPage } from "./components/DashboardPage";
import { SettingsPage } from "./components/SettingsPage";
import { Sidebar } from "./components/Sidebar";
import { SkillsPage } from "./components/SkillsPage";
import {
  createMockDataSources,
  createMockPhaseGates,
  createMockPhases,
  createMockSafetyBoundaries,
  createMockWorkspace,
} from "./data/mock";
import { useI18n } from "./i18n/I18nProvider";
import { copyText } from "./lib/clipboard";
import { pickWorkspaceDirectory } from "./lib/workspacePicker";
import {
  clearStoredWorkspaceRoot,
  readStoredWorkspaceRoot,
  workspaceDisplayName,
  writeStoredWorkspaceRoot,
} from "./lib/workspaceRoot";
import type { PageId, ToastState } from "./types";
import "./App.css";

function App() {
  const { locale, t } = useI18n();
  const [page, setPage] = useState<PageId>("dashboard");
  // Mount pages on first visit, then keep them mounted (hidden) so locale
  // switches and revisits do not remount data-loading pages.
  const [visitedPages, setVisitedPages] = useState<ReadonlySet<PageId>>(
    () => new Set<PageId>(["dashboard"]),
  );
  const [toast, setToast] = useState<ToastState | null>(null);
  const [selectedAgentId, setSelectedAgentId] = useState("");
  const [agentQuery, setAgentQuery] = useState("");
  const [selectedSkillId, setSelectedSkillId] = useState("");
  const [skillQuery, setSkillQuery] = useState("");
  const [workspaceRoot, setWorkspaceRoot] = useState<string | null>(() =>
    readStoredWorkspaceRoot(),
  );
  const [sidebarBranch, setSidebarBranch] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const toastTimer = useRef<number | null>(null);
  const pickingRef = useRef(false);

  const mockWorkspace = useMemo(() => createMockWorkspace(t), [t]);
  const mockPhases = useMemo(() => createMockPhases(t), [t]);
  const mockDataSources = useMemo(() => createMockDataSources(t), [t]);
  const mockPhaseGates = useMemo(() => createMockPhaseGates(t), [t]);
  const mockSafetyBoundaries = useMemo(
    () => createMockSafetyBoundaries(t),
    [t],
  );

  const navigate = useCallback((next: PageId) => {
    setPage(next);
    setVisitedPages((prev) => {
      if (prev.has(next)) return prev;
      const copy = new Set(prev);
      copy.add(next);
      return copy;
    });
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimer.current !== null) {
        window.clearTimeout(toastTimer.current);
      }
    };
  }, []);

  // Clear an in-flight toast when the locale changes so old-language text
  // does not briefly mix with the new UI. Does not touch visitedPages or
  // workspaceRoot — locale must not rescan.
  useEffect(() => {
    if (toastTimer.current !== null) {
      window.clearTimeout(toastTimer.current);
      toastTimer.current = null;
    }
    setToast(null);
  }, [locale]);

  // Switching workspace clears cross-page search/selection and sidebar branch
  // so an old project's UI state cannot leak into the new one.
  useEffect(() => {
    setSidebarBranch(null);
    setSkillQuery("");
    setSelectedSkillId("");
    setAgentQuery("");
    setSelectedAgentId("");
  }, [workspaceRoot]);

  function showToast(next: ToastState) {
    if (toastTimer.current !== null) {
      window.clearTimeout(toastTimer.current);
    }
    setToast(next);
    toastTimer.current = window.setTimeout(() => {
      setToast(null);
      toastTimer.current = null;
    }, 1800);
  }

  async function handleCopy(text: string) {
    const result = await copyText(text);
    showToast(
      result === "ok"
        ? { message: t("toast.copied"), kind: "ok" }
        : { message: t("toast.copyFailed"), kind: "fail" },
    );
  }

  const handlePickWorkspace = useCallback(async () => {
    if (pickingRef.current) return;
    pickingRef.current = true;
    setPicking(true);
    try {
      const result = await pickWorkspaceDirectory();
      if (result.kind === "cancel") {
        return;
      }
      if (result.kind === "error") {
        showToast({
          message:
            result.reason === "unavailable"
              ? t("toast.workspacePickUnavailable")
              : t("toast.workspacePickFailed"),
          kind: "fail",
        });
        return;
      }
      const persisted = writeStoredWorkspaceRoot(result.path);
      setWorkspaceRoot(result.path);
      showToast({
        message: persisted
          ? t("toast.workspaceSwitched")
          : t("toast.workspaceSwitchedUnsaved"),
        kind: persisted ? "ok" : "fail",
      });
    } finally {
      pickingRef.current = false;
      setPicking(false);
    }
  }, [t]);

  const handleClearWorkspace = useCallback(() => {
    const cleared = clearStoredWorkspaceRoot();
    if (!cleared) {
      showToast({
        message: t("toast.workspaceClearFailed"),
        kind: "fail",
      });
      return;
    }
    setWorkspaceRoot(null);
    showToast({ message: t("toast.workspaceCleared"), kind: "ok" });
  }, [t]);

  const handleGitBranch = useCallback((branch: string | null) => {
    setSidebarBranch(branch);
  }, []);

  const sidebarName = workspaceRoot
    ? workspaceDisplayName(workspaceRoot)
    : t("sidebar.workspaceUnset");
  const sidebarBranchLabel = workspaceRoot
    ? sidebarBranch || t("sidebar.branchPlaceholder")
    : t("sidebar.branchPlaceholder");
  const sidebarTitle = workspaceRoot
    ? `${workspaceRoot} / ${sidebarBranchLabel}`
    : `${t("sidebar.workspaceUnset")} / ${t("sidebar.branchPlaceholder")}`;

  return (
    <div className="app-shell">
      <Sidebar
        page={page}
        onNavigate={navigate}
        workspaceName={sidebarName}
        branch={sidebarBranchLabel}
        title={sidebarTitle}
      />
      <main className="app-main" id="main-content">
        {visitedPages.has("dashboard") ? (
          <div
            className="page-slot"
            hidden={page !== "dashboard"}
            aria-hidden={page !== "dashboard"}
          >
            <DashboardPage
              workspace={mockWorkspace}
              phases={mockPhases}
              rootPath={workspaceRoot}
              onCopyNextStep={handleCopy}
              onPickWorkspace={handlePickWorkspace}
              picking={picking}
              onGitBranch={handleGitBranch}
              toast={toast}
            />
          </div>
        ) : null}
        {visitedPages.has("skills") ? (
          <div
            className="page-slot"
            hidden={page !== "skills"}
            aria-hidden={page !== "skills"}
          >
            <SkillsPage
              rootPath={workspaceRoot}
              query={skillQuery}
              onQueryChange={setSkillQuery}
              selectedId={selectedSkillId}
              onSelect={setSelectedSkillId}
              onCopy={handleCopy}
              onPickWorkspace={handlePickWorkspace}
              picking={picking}
              toast={toast}
            />
          </div>
        ) : null}
        {visitedPages.has("agents") ? (
          <div
            className="page-slot"
            hidden={page !== "agents"}
            aria-hidden={page !== "agents"}
          >
            <AgentsPage
              rootPath={workspaceRoot}
              query={agentQuery}
              onQueryChange={setAgentQuery}
              selectedId={selectedAgentId}
              onSelect={setSelectedAgentId}
              onCopy={handleCopy}
              onPickWorkspace={handlePickWorkspace}
              picking={picking}
              toast={toast}
            />
          </div>
        ) : null}
        {visitedPages.has("settings") ? (
          <div
            className="page-slot"
            hidden={page !== "settings"}
            aria-hidden={page !== "settings"}
          >
            <SettingsPage
              workspaceRoot={workspaceRoot}
              dataSources={mockDataSources}
              phaseGates={mockPhaseGates}
              safetyBoundaries={mockSafetyBoundaries}
              picking={picking}
              onPickWorkspace={handlePickWorkspace}
              onClearWorkspace={handleClearWorkspace}
            />
          </div>
        ) : null}
      </main>
      {toast ? (
        <div
          className={`app-toast is-${toast.kind}`}
          role="status"
          aria-live="polite"
        >
          {toast.message}
        </div>
      ) : null}
    </div>
  );
}

export default App;
