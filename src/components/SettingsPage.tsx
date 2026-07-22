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
          <p className="page-subtitle">本地数据来源与阶段门禁说明（Phase 1 为 mock）。</p>
        </div>
        <span className="badge">Mock binding</span>
      </header>

      <section className="settings-section" aria-labelledby="workspace-settings">
        <h2 id="workspace-settings" className="section-title">
          Workspace
        </h2>
        <div className="settings-card">
          <div className="settings-row">
            <div>
              <div className="stat-label">当前路径</div>
              <div className="mono wrap">{workspace.path}</div>
              <div className="stat-muted">状态：Mock binding</div>
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
              <div className="mono wrap">{item.path}</div>
              <div className="stat-muted">{item.note}</div>
            </li>
          ))}
        </ul>
        <p className="hint-text">
          Phase 1 说明：当前界面使用 mock 数据，不读取真实文件，不调用 Tauri command。
        </p>
      </section>

      <section className="settings-section" aria-labelledby="phase-gates">
        <h2 id="phase-gates" className="section-title">
          Phase Gates
        </h2>
        <ul className="compact-list">
          {phaseGates.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="settings-section" aria-labelledby="safety">
        <h2 id="safety" className="section-title">
          Safety Boundaries
        </h2>
        <ul className="compact-list">
          {safetyBoundaries.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
