import { useEffect, useRef, useState } from "react";
import { AgentsPage } from "./components/AgentsPage";
import { DashboardPage } from "./components/DashboardPage";
import { SettingsPage } from "./components/SettingsPage";
import { Sidebar } from "./components/Sidebar";
import { SkillsPage } from "./components/SkillsPage";
import {
  mockAgents,
  mockDataSources,
  mockPhaseGates,
  mockPhases,
  mockSafetyBoundaries,
  mockSkills,
  mockWorkspace,
} from "./data/mock";
import { copyText } from "./lib/clipboard";
import type { PageId, ToastState } from "./types";
import "./App.css";

function App() {
  const [page, setPage] = useState<PageId>("dashboard");
  const [toast, setToast] = useState<ToastState | null>(null);
  const [selectedSkillId, setSelectedSkillId] = useState(
    mockSkills[0]?.id ?? "",
  );
  const [selectedAgentId, setSelectedAgentId] = useState(
    mockAgents[0]?.id ?? "",
  );
  const toastTimer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (toastTimer.current !== null) {
        window.clearTimeout(toastTimer.current);
      }
    };
  }, []);

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
        ? { message: "已复制", kind: "ok" }
        : { message: "复制失败，请手动选择文本", kind: "fail" },
    );
  }

  return (
    <div className="app-shell">
      <Sidebar
        page={page}
        onNavigate={setPage}
        workspaceName={mockWorkspace.name}
        branch={mockWorkspace.branch}
      />
      <main className="app-main" id="main-content">
        {page === "dashboard" ? (
          <DashboardPage
            workspace={mockWorkspace}
            phases={mockPhases}
            onCopyNextStep={() => handleCopy(mockWorkspace.nextStep)}
            toast={toast}
          />
        ) : null}
        {page === "skills" ? (
          <SkillsPage
            skills={mockSkills}
            selectedId={selectedSkillId}
            onSelect={setSelectedSkillId}
            onCopy={handleCopy}
            toast={toast}
          />
        ) : null}
        {page === "agents" ? (
          <AgentsPage
            agents={mockAgents}
            selectedId={selectedAgentId}
            onSelect={setSelectedAgentId}
            onCopy={handleCopy}
            toast={toast}
          />
        ) : null}
        {page === "settings" ? (
          <SettingsPage
            workspace={mockWorkspace}
            dataSources={mockDataSources}
            phaseGates={mockPhaseGates}
            safetyBoundaries={mockSafetyBoundaries}
          />
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
