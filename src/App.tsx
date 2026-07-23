import { useEffect, useMemo, useRef, useState } from "react";
import { AgentsPage } from "./components/AgentsPage";
import { DashboardPage } from "./components/DashboardPage";
import { SettingsPage } from "./components/SettingsPage";
import { Sidebar } from "./components/Sidebar";
import { SkillsPage } from "./components/SkillsPage";
import {
  WORKSPACE_BRANCH,
  WORKSPACE_NAME,
  WORKSPACE_ROOT_PATH,
  createMockDataSources,
  createMockPhaseGates,
  createMockPhases,
  createMockSafetyBoundaries,
  createMockWorkspace,
  mockAgents,
} from "./data/mock";
import { useI18n } from "./i18n/I18nProvider";
import { copyText } from "./lib/clipboard";
import type { PageId, ToastState } from "./types";
import "./App.css";

function App() {
  const { locale, t } = useI18n();
  const [page, setPage] = useState<PageId>("dashboard");
  const [toast, setToast] = useState<ToastState | null>(null);
  const [selectedAgentId, setSelectedAgentId] = useState(
    mockAgents[0]?.id ?? "",
  );
  const [agentQuery, setAgentQuery] = useState("");
  const [selectedSkillId, setSelectedSkillId] = useState("");
  const [skillQuery, setSkillQuery] = useState("");
  const toastTimer = useRef<number | null>(null);

  const mockWorkspace = useMemo(() => createMockWorkspace(t), [t]);
  const mockPhases = useMemo(() => createMockPhases(t), [t]);
  const mockDataSources = useMemo(() => createMockDataSources(t), [t]);
  const mockPhaseGates = useMemo(() => createMockPhaseGates(t), [t]);
  const mockSafetyBoundaries = useMemo(
    () => createMockSafetyBoundaries(t),
    [t],
  );

  useEffect(() => {
    return () => {
      if (toastTimer.current !== null) {
        window.clearTimeout(toastTimer.current);
      }
    };
  }, []);

  // Clear an in-flight toast when the locale changes so old-language text
  // does not briefly mix with the new UI.
  useEffect(() => {
    if (toastTimer.current !== null) {
      window.clearTimeout(toastTimer.current);
      toastTimer.current = null;
    }
    setToast(null);
  }, [locale]);

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

  return (
    <div className="app-shell">
      <Sidebar
        page={page}
        onNavigate={setPage}
        workspaceName={WORKSPACE_NAME}
        branch={WORKSPACE_BRANCH}
      />
      <main className="app-main" id="main-content">
        {/* Keep pages mounted so locale switches (and returning from Settings)
            do not remount data-loading pages or reset in-page UI state. */}
        <div
          className="page-slot"
          hidden={page !== "dashboard"}
          aria-hidden={page !== "dashboard"}
        >
          <DashboardPage
            workspace={mockWorkspace}
            phases={mockPhases}
            rootPath={WORKSPACE_ROOT_PATH}
            onCopyNextStep={handleCopy}
            toast={toast}
          />
        </div>
        <div
          className="page-slot"
          hidden={page !== "skills"}
          aria-hidden={page !== "skills"}
        >
          <SkillsPage
            rootPath={WORKSPACE_ROOT_PATH}
            query={skillQuery}
            onQueryChange={setSkillQuery}
            selectedId={selectedSkillId}
            onSelect={setSelectedSkillId}
            onCopy={handleCopy}
            toast={toast}
          />
        </div>
        <div
          className="page-slot"
          hidden={page !== "agents"}
          aria-hidden={page !== "agents"}
        >
          <AgentsPage
            agents={mockAgents}
            query={agentQuery}
            onQueryChange={setAgentQuery}
            selectedId={selectedAgentId}
            onSelect={setSelectedAgentId}
            onCopy={handleCopy}
            toast={toast}
          />
        </div>
        <div
          className="page-slot"
          hidden={page !== "settings"}
          aria-hidden={page !== "settings"}
        >
          <SettingsPage
            workspace={mockWorkspace}
            dataSources={mockDataSources}
            phaseGates={mockPhaseGates}
            safetyBoundaries={mockSafetyBoundaries}
          />
        </div>
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
