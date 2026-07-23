import { useI18n } from "../i18n/I18nProvider";
import type { MessageKey } from "../i18n/messages";
import type { PageId } from "../types";

interface NavItem {
  id: PageId;
  labelKey: MessageKey;
  hintKey: MessageKey;
  mark: string;
}

const NAV_ITEMS: NavItem[] = [
  {
    id: "dashboard",
    labelKey: "sidebar.nav.dashboard",
    hintKey: "sidebar.nav.dashboardHint",
    mark: "D",
  },
  {
    id: "skills",
    labelKey: "sidebar.nav.skills",
    hintKey: "sidebar.nav.skillsHint",
    mark: "S",
  },
  {
    id: "agents",
    labelKey: "sidebar.nav.agents",
    hintKey: "sidebar.nav.agentsHint",
    mark: "A",
  },
  {
    id: "settings",
    labelKey: "sidebar.nav.settings",
    hintKey: "sidebar.nav.settingsHint",
    mark: "G",
  },
];

interface SidebarProps {
  page: PageId;
  onNavigate: (page: PageId) => void;
  workspaceName: string;
  branch: string;
  title?: string;
}

export function Sidebar({
  page,
  onNavigate,
  workspaceName,
  branch,
  title,
}: SidebarProps) {
  const { t } = useI18n();

  return (
    <aside className="sidebar" aria-label={t("sidebar.navAria")}>
      <div className="sidebar-top">
        <div className="brand">
          <div className="brand-name">SkillCopilot</div>
          <div className="brand-sub">{t("sidebar.brandSub")}</div>
        </div>
        <div
          className="workspace-pill"
          title={title ?? `${workspaceName} / ${branch}`}
        >
          <span className="workspace-pill-name">{workspaceName}</span>
          <span className="workspace-pill-sep">/</span>
          <span className="workspace-pill-branch">{branch}</span>
        </div>
      </div>

      <nav className="sidebar-nav" aria-label={t("sidebar.pagesAria")}>
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
                <span className="nav-label">{t(item.labelKey)}</span>
                <span className="nav-hint">{t(item.hintKey)}</span>
              </span>
            </button>
          );
        })}
      </nav>

      <div className="sidebar-bottom">
        <div className="status-chip">{t("sidebar.statusChip")}</div>
        <div className="status-note">{t("sidebar.noDatabase")}</div>
      </div>
    </aside>
  );
}
