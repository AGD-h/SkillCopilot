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
import type { PageId } from "./types";
import "./App.css";

function App() {
  const [page, setPage] = useState<PageId>("dashboard");
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (toastTimer.current !== null) {
        window.clearTimeout(toastTimer.current);
      }
    };
  }, []);

  function showToast(message: string) {
    if (toastTimer.current !== null) {
      window.clearTimeout(toastTimer.current);
    }
    setToast(message);
    toastTimer.current = window.setTimeout(() => {
      setToast(null);
      toastTimer.current = null;
    }, 1800);
  }

  async function handleCopy(text: string) {
    const result = await copyText(text);
    showToast(result === "ok" ? "已复制" : "复制失败，请手动选择文本");
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
            toast={page === "dashboard" ? toast : null}
          />
        ) : null}
        {page === "skills" ? (
          <SkillsPage
            skills={mockSkills}
            onCopy={handleCopy}
            toast={page === "skills" ? toast : null}
          />
        ) : null}
        {page === "agents" ? (
          <AgentsPage
            agents={mockAgents}
            onCopy={handleCopy}
            toast={page === "agents" ? toast : null}
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
    </div>
  );
}

export default App;
