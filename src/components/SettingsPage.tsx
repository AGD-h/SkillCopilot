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
            本地数据来源与阶段门禁说明（Phase 1 为 mock）。
          </p>
        </div>
        <span className="badge badge-mock">Mock binding</span>
      </header>

      <div className="callout callout-warning" role="note">
        <div className="callout-title">当前未读取真实文件</div>
        <p className="callout-body">
          Phase 1 仅展示 mock 数据，不调用 Tauri
          command，也不扫描磁盘。切换文件夹、真实 HANDOFF / Git
          状态将在 Phase 2 启用。
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
              <div className="stat-muted">状态：Mock binding（展示用）</div>
            </div>
            <div className="settings-action">
              <button type="button" className="btn btn-secondary" disabled>
                Change folder
              </button>
              <p className="hint-text">Phase 2 才可用：选择真实本地目录。</p>
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
