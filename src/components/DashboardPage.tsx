import type { TaskPhase, ToastState, WorkspaceInfo } from "../types";

interface DashboardPageProps {
  workspace: WorkspaceInfo;
  phases: TaskPhase[];
  onCopyNextStep: () => void;
  toast: ToastState | null;
}

function phaseStatusLabel(status: TaskPhase["status"]): string {
  if (status === "in_progress") return "进行中";
  if (status === "done") return "已完成";
  return "待开始";
}

export function DashboardPage({
  workspace,
  phases,
  onCopyNextStep,
  toast,
}: DashboardPageProps) {
  return (
    <div className="page dashboard-page">
      <header className="page-header">
        <div className="page-header-text">
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">
            查看当前项目状态、交接约束与下一步。
          </p>
        </div>
        <div className="page-header-meta">
          <span className="badge badge-mock">Mock data · 未接真实文件</span>
          <span className="meta-time">更新于 {workspace.lastUpdatedLabel}</span>
        </div>
      </header>

      <section className="stat-row" aria-label="状态摘要">
        <article className="stat-card">
          <div className="stat-label">Workspace</div>
          <div className="stat-title">{workspace.name}</div>
          <div className="stat-path" title={workspace.path}>
            {workspace.path}
          </div>
        </article>
        <article className="stat-card">
          <div className="stat-label">Git Status</div>
          <div className="stat-title">{workspace.gitSummary}</div>
          <div className="stat-muted">{workspace.workingTree}</div>
        </article>
        <article className="stat-card">
          <div className="stat-label">Current Phase</div>
          <div className="stat-title">{workspace.phaseLabel}</div>
          <div className="stat-muted">{workspace.phaseFocus}</div>
        </article>
      </section>

      <div className="dashboard-main">
        <section className="next-step-panel" aria-labelledby="next-step-title">
          <div className="next-step-top">
            <div className="section-kicker">当前目标</div>
            <p className="goal-text">{workspace.currentGoal}</p>
          </div>
          <div className="next-step-divider" aria-hidden="true" />
          <div className="next-step-body">
            <h2 id="next-step-title" className="section-title">
              Next Step
            </h2>
            <p className="next-step-text">{workspace.nextStep}</p>
            <div className="next-step-actions">
              <button
                type="button"
                className="btn btn-primary"
                onClick={onCopyNextStep}
              >
                复制下一步
              </button>
              {toast ? (
                <span
                  className={`inline-toast is-${toast.kind}`}
                  role="status"
                >
                  {toast.message}
                </span>
              ) : null}
            </div>
            <p className="source-line">来源：{workspace.nextStepSource}</p>
          </div>
        </section>

        <section
          className="constraints-panel"
          aria-labelledby="constraints-title"
        >
          <h2 id="constraints-title" className="section-title">
            Constraints
          </h2>
          <ul className="compact-list">
            {workspace.constraints.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      </div>

      <section className="phase-timeline" aria-labelledby="phase-title">
        <h2 id="phase-title" className="section-title">
          Phase Timeline
        </h2>
        <ol className="timeline">
          {phases.map((phase, index) => (
            <li
              key={phase.id}
              className={`timeline-item is-${phase.status}`}
            >
              <div className="timeline-dot" aria-hidden="true" />
              {index < phases.length - 1 ? (
                <div className="timeline-line" aria-hidden="true" />
              ) : null}
              <div className="timeline-content">
                <div className="timeline-name">
                  {phase.name}
                  <span className={`phase-badge is-${phase.status}`}>
                    {phaseStatusLabel(phase.status)}
                  </span>
                </div>
                <div className="timeline-summary">{phase.summary}</div>
              </div>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
