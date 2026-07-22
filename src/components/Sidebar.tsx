import type { PageId } from "../types";

interface NavItem {
  id: PageId;
  label: string;
  hint: string;
  mark: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: "dashboard", label: "Dashboard", hint: "Project status", mark: "D" },
  { id: "skills", label: "Skills", hint: "Reusable prompts", mark: "S" },
  { id: "agents", label: "Agents", hint: "Role prompts", mark: "A" },
  { id: "settings", label: "Settings", hint: "Local sources", mark: "G" },
];

interface SidebarProps {
  page: PageId;
  onNavigate: (page: PageId) => void;
  workspaceName: string;
  branch: string;
}

export function Sidebar({
  page,
  onNavigate,
  workspaceName,
  branch,
}: SidebarProps) {
  return (
    <aside className="sidebar" aria-label="主导航">
      <div className="sidebar-top">
        <div className="brand">
          <div className="brand-name">SkillCopilot</div>
          <div className="brand-sub">Local AI project cockpit</div>
        </div>
        <div className="workspace-pill" title={`${workspaceName} / ${branch}`}>
          <span className="workspace-pill-name">{workspaceName}</span>
          <span className="workspace-pill-sep">/</span>
          <span className="workspace-pill-branch">{branch}</span>
        </div>
      </div>

      <nav className="sidebar-nav" aria-label="页面">
        {NAV_ITEMS.map((item) => {
          const active = page === item.id;
          return (
            <button
              key={item.id}
              type="button"
              className={`nav-item${active ? " is-active" : ""}`}
              aria-current={active ? "page" : undefined}
              onClick={() => onNavigate(item.id)}
            >
              <span className="nav-mark" aria-hidden="true">
                {item.mark}
              </span>
              <span className="nav-text">
                <span className="nav-label">{item.label}</span>
                <span className="nav-hint">{item.hint}</span>
              </span>
            </button>
          );
        })}
      </nav>

      <div className="sidebar-bottom">
        <div className="status-chip">Phase 1 Mock Mode</div>
        <div className="status-note">No database attached</div>
      </div>
    </aside>
  );
}
