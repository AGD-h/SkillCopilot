import { useEffect, useState } from "react";
import { readWorkspaceStatus } from "../lib/workspaceApi";
import type {
  TaskPhase,
  ToastState,
  WorkspaceInfo,
  WorkspaceStatus,
} from "../types";

interface DashboardPageProps {
  workspace: WorkspaceInfo;
  phases: TaskPhase[];
  rootPath: string;
  onCopyNextStep: (text: string) => void;
  toast: ToastState | null;
}

type LoadState = "loading" | "ok" | "error";

function phaseStatusLabel(status: TaskPhase["status"]): string {
  if (status === "in_progress") return "进行中";
  if (status === "done") return "已完成";
  return "待开始";
}

function formatTimestamp(fetchedAt: string): string {
  const millis = Number(fetchedAt);
  if (!fetchedAt || Number.isNaN(millis)) return fetchedAt || "";
  return new Date(millis).toLocaleString();
}

export function DashboardPage({
  workspace,
  phases,
  rootPath,
  onCopyNextStep,
  toast,
}: DashboardPageProps) {
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [status, setStatus] = useState<WorkspaceStatus | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoadState("loading");
    setErrorMessage(null);

    readWorkspaceStatus(rootPath)
      .then((result) => {
        if (!active) return;
        setStatus(result);
        setLoadState("ok");
      })
      .catch((err: unknown) => {
        if (!active) return;
        setStatus(null);
        setErrorMessage(err instanceof Error ? err.message : String(err));
        setLoadState("error");
      });

    return () => {
      active = false;
    };
  }, [rootPath]);

  const isLive = loadState === "ok" && status !== null;
  const git = status?.git ?? null;
  const handoff = status?.handoff ?? null;
  const agents = status?.agents ?? null;

  const gitErrored = git !== null && git.branchLine.trim() === "";
  const gitBranch = git && !gitErrored ? git.branchName || "(未知分支)" : null;
  const gitTree =
    git && !gitErrored
      ? git.isClean
        ? "Working tree clean"
        : "有未提交改动"
      : null;

  const goalLines =
    isLive && handoff && handoff.currentGoal.length > 0
      ? handoff.currentGoal
      : [workspace.currentGoal];

  const nextStepLines =
    isLive && handoff && handoff.lastKnownNextStep.length > 0
      ? handoff.lastKnownNextStep
      : [workspace.nextStep];

  const constraintLines =
    isLive && handoff && handoff.importantConstraints.length > 0
      ? handoff.importantConstraints
      : workspace.constraints;

  const nextStepCopyText = nextStepLines.join("\n");

  const badge = (() => {
    if (loadState === "loading") {
      return { className: "badge badge-mock", label: "读取本地状态中…" };
    }
    if (isLive) {
      return { className: "badge", label: "Real local data" };
    }
    return { className: "badge badge-mock", label: "Fallback mock data" };
  })();

  const timeLabel = isLive
    ? formatTimestamp(status.fetchedAt)
    : workspace.lastUpdatedLabel;

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
          <span className={badge.className}>{badge.label}</span>
          <span className="meta-time">更新于 {timeLabel}</span>
        </div>
      </header>

      {loadState === "error" ? (
        <div className="callout callout-warning" role="note">
          <div className="callout-title">无法读取真实本地状态，已回退到 mock 数据</div>
          <p className="callout-body">
            {errorMessage ??
              "调用 Tauri command 失败（在纯浏览器 Vite 环境下无 Tauri 运行时属正常）。"}
          </p>
        </div>
      ) : null}

      <section className="stat-row" aria-label="状态摘要">
        <article className="stat-card">
          <div className="stat-label">Workspace</div>
          <div className="stat-title">
            {isLive ? status.workspaceName : workspace.name}
          </div>
          <div
            className="stat-path"
            title={isLive ? status.rootPath : workspace.path}
          >
            {isLive ? status.rootPath : workspace.path}
          </div>
        </article>
        <article className="stat-card">
          <div className="stat-label">Git Status</div>
          {isLive && !gitErrored ? (
            <>
              <div className="stat-title">
                {gitBranch}
                {git?.aheadBehind ? ` · ${git.aheadBehind}` : ""}
              </div>
              <div className="stat-muted">{gitTree}</div>
            </>
          ) : isLive && gitErrored ? (
            <>
              <div className="stat-title">Git 不可用</div>
              <div className="stat-muted" title={git?.rawStatus}>
                {git?.rawStatus || "无法获取 git 状态"}
              </div>
            </>
          ) : (
            <>
              <div className="stat-title">{workspace.gitSummary}</div>
              <div className="stat-muted">{workspace.workingTree}</div>
            </>
          )}
        </article>
        <article className="stat-card">
          <div className="stat-label">Data Source</div>
          <div className="stat-title">
            {isLive ? "真实本地文件" : "Mock 数据"}
          </div>
          <div className="stat-muted">
            {isLive
              ? `HANDOFF ${handoff?.exists ? "已读取" : "缺失"} · AGENTS ${
                  agents?.exists ? "已读取" : "缺失"
                }`
              : "未接真实文件（fallback）"}
          </div>
        </article>
      </section>

      <div className="dashboard-main">
        <section className="next-step-panel" aria-labelledby="next-step-title">
          <div className="next-step-top">
            <div className="section-kicker">当前目标</div>
            {goalLines.length > 1 ? (
              <ul className="compact-list">
                {goalLines.map((item, index) => (
                  <li key={`${index}-${item}`}>{item}</li>
                ))}
              </ul>
            ) : (
              <p className="goal-text">{goalLines[0]}</p>
            )}
          </div>
          <div className="next-step-divider" aria-hidden="true" />
          <div className="next-step-body">
            <h2 id="next-step-title" className="section-title">
              Next Step
            </h2>
            {nextStepLines.length > 1 ? (
              <ul className="compact-list">
                {nextStepLines.map((item, index) => (
                  <li key={`${index}-${item}`}>{item}</li>
                ))}
              </ul>
            ) : (
              <p className="next-step-text">{nextStepLines[0]}</p>
            )}
            <div className="next-step-actions">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => onCopyNextStep(nextStepCopyText)}
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
            <p className="source-line">
              来源：
              {isLive && handoff?.exists
                ? handoff.path
                : workspace.nextStepSource}
            </p>
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
            {constraintLines.map((item, index) => (
              <li key={`${index}-${item}`}>{item}</li>
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
