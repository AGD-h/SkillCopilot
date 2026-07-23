import type { DataSourceItem, WorkspaceInfo } from "../types";

interface SettingsPageProps {
  workspace: WorkspaceInfo;
  dataSources: DataSourceItem[];
  phaseGates: string[];
  safetyBoundaries: string[];
}

export function SettingsPage({
  workspace,
  dataSources,
  phaseGates,
  safetyBoundaries,
}: SettingsPageProps) {
  return (
    <div className="page settings-page">
      <header className="page-header">
        <div className="page-header-text">
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">
            本地数据来源与阶段门禁说明（Phase 2 已开始读取真实文件）。
          </p>
        </div>
        <span className="badge badge-mock">Workspace 选择器未实现</span>
      </header>

      <div className="callout callout-warning" role="note">
        <div className="callout-title">Phase 2：已部分接入真实本地状态</div>
        <p className="callout-body">
          Dashboard 现在通过 Tauri command 只读读取 HANDOFF.md、AGENTS.md 与{" "}
          <code>git status --short --branch</code>，失败时回退到 mock。但
          Workspace 仍固定为 <code>E:\SkillCopilot</code>，文件夹选择器、Skill
          扫描与 Agent 解析尚未实现，本页下方列表仍为 mock 说明。
        </p>
      </div>

      <section className="settings-section" aria-labelledby="workspace-settings">
        <h2 id="workspace-settings" className="section-title">
          Workspace
        </h2>
        <div className="settings-card">
          <div className="settings-row">
            <div className="settings-row-main">
              <div className="stat-label">当前路径</div>
              <div className="mono wrap" title={workspace.path}>
                {workspace.path}
              </div>
              <div className="stat-muted">
                状态：固定绑定（Dashboard 已按此路径读取真实文件）
              </div>
            </div>
            <div className="settings-action">
              <button type="button" className="btn btn-secondary" disabled>
                Change folder
              </button>
              <p className="hint-text">
                Workspace 选择器仍未实现，当前固定为 E:\SkillCopilot。
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="settings-section" aria-labelledby="data-sources">
        <h2 id="data-sources" className="section-title">
          Data Sources
        </h2>
        <ul className="source-list">
          {dataSources.map((item) => (
            <li key={item.path} className="source-item">
              <div className="source-item-top">
                <div className="mono wrap" title={item.path}>
                  {item.path}
                </div>
                <span className="source-status">mock</span>
              </div>
              <div className="stat-muted">{item.note}</div>
            </li>
          ))}
        </ul>
      </section>

      <div className="settings-grid">
        <section className="settings-section" aria-labelledby="phase-gates">
          <h2 id="phase-gates" className="section-title">
            Phase Gates
          </h2>
          <div className="settings-card">
            <ul className="compact-list">
              {phaseGates.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </section>

        <section className="settings-section" aria-labelledby="safety">
          <h2 id="safety" className="section-title">
            Safety Boundaries
          </h2>
          <div className="settings-card">
            <ul className="compact-list">
              {safetyBoundaries.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
}
