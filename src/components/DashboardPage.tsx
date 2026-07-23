import { useEffect, useRef, useState } from "react";
import { useI18n } from "../i18n/I18nProvider";
import { intlLocale } from "../i18n/locale";
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
  rootPath: string | null;
  onCopyNextStep: (text: string) => void;
  onPickWorkspace: () => void;
  picking: boolean;
  onGitBranch: (branch: string | null) => void;
  toast: ToastState | null;
}

type LoadState = "idle" | "loading" | "ok" | "error";

function phaseStatusKey(
  status: TaskPhase["status"],
): "phase.status.done" | "phase.status.in_progress" | "phase.status.pending" {
  if (status === "in_progress") return "phase.status.in_progress";
  if (status === "done") return "phase.status.done";
  return "phase.status.pending";
}

export function DashboardPage({
  workspace,
  phases,
  rootPath,
  onCopyNextStep,
  onPickWorkspace,
  picking,
  onGitBranch,
  toast,
}: DashboardPageProps) {
  const { locale, t } = useI18n();
  const [loadState, setLoadState] = useState<LoadState>(
    rootPath ? "loading" : "idle",
  );
  const [status, setStatus] = useState<WorkspaceStatus | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const requestSeq = useRef(0);

  useEffect(() => {
    if (!rootPath) {
      requestSeq.current += 1;
      setLoadState("idle");
      setStatus(null);
      setErrorMessage(null);
      onGitBranch(null);
      return;
    }

    const seq = requestSeq.current + 1;
    requestSeq.current = seq;
    setLoadState("loading");
    setErrorMessage(null);
    setStatus(null);
    onGitBranch(null);

    readWorkspaceStatus(rootPath)
      .then((result) => {
        if (seq !== requestSeq.current) return;
        setStatus(result);
        setLoadState("ok");
        const branch =
          result.git.branchLine.trim() === ""
            ? null
            : result.git.branchName || null;
        onGitBranch(branch);
      })
      .catch((err: unknown) => {
        if (seq !== requestSeq.current) return;
        setStatus(null);
        setErrorMessage(err instanceof Error ? err.message : String(err));
        setLoadState("error");
        onGitBranch(null);
      });

    return () => {
      requestSeq.current += 1;
    };
  }, [rootPath, onGitBranch]);

  if (!rootPath) {
    return (
      <div className="page dashboard-page">
        <header className="page-header">
          <div className="page-header-text">
            <h1 className="page-title">{t("dashboard.title")}</h1>
            <p className="page-subtitle">{t("dashboard.subtitle")}</p>
          </div>
          <span className="badge badge-mock">
            {t("dashboard.noWorkspaceBadge")}
          </span>
        </header>

        <div className="empty-workspace-panel" role="note">
          <h2 className="section-title">{t("dashboard.noWorkspaceTitle")}</h2>
          <p className="empty-workspace-body">
            {t("dashboard.noWorkspaceBody")}
          </p>
          <p className="hint-text">{t("common.workspaceReadonlyHint")}</p>
          <button
            type="button"
            className="btn btn-primary"
            disabled={picking}
            aria-busy={picking || undefined}
            onClick={onPickWorkspace}
          >
            {picking
              ? t("common.selectingFolder")
              : t("common.selectFolder")}
          </button>
        </div>

        <section className="phase-timeline" aria-labelledby="phase-title">
          <h2 id="phase-title" className="section-title">
            {t("dashboard.phaseTimeline")}
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
                      {t(phaseStatusKey(phase.status))}
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

  const isLive = loadState === "ok" && status !== null;
  const git = status?.git ?? null;
  const handoff = status?.handoff ?? null;
  const agents = status?.agents ?? null;

  const gitErrored = git !== null && git.branchLine.trim() === "";
  const gitBranch =
    git && !gitErrored
      ? git.branchName || t("dashboard.unknownBranch")
      : null;
  const gitTree =
    git && !gitErrored
      ? git.isClean
        ? t("dashboard.workingTreeClean")
        : t("dashboard.workingTreeDirty")
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
      return {
        className: "badge badge-mock",
        label: t("dashboard.loadingBadge"),
      };
    }
    if (isLive) {
      return { className: "badge", label: t("common.realLocalData") };
    }
    return {
      className: "badge badge-mock",
      label: t("common.fallbackMockData"),
    };
  })();

  const timeLabel = isLive
    ? (() => {
        const millis = Number(status.fetchedAt);
        if (!status.fetchedAt || Number.isNaN(millis)) {
          return status.fetchedAt || "";
        }
        return new Date(millis).toLocaleString(intlLocale(locale));
      })()
    : workspace.lastUpdatedLabel;

  return (
    <div className="page dashboard-page">
      <header className="page-header">
        <div className="page-header-text">
          <h1 className="page-title">{t("dashboard.title")}</h1>
          <p className="page-subtitle">{t("dashboard.subtitle")}</p>
        </div>
        <div className="page-header-meta">
          <span className={badge.className}>{badge.label}</span>
          <span className="meta-time">
            {t("dashboard.updatedAt", { time: timeLabel })}
          </span>
        </div>
      </header>

      {loadState === "error" ? (
        <div className="callout callout-warning" role="note">
          <div className="callout-title">{t("dashboard.fallbackTitle")}</div>
          <p className="callout-body">
            {errorMessage
              ? `${t("dashboard.fallbackBody")} ${errorMessage}`
              : t("dashboard.fallbackBody")}
          </p>
        </div>
      ) : null}

      <section className="stat-row" aria-label={t("dashboard.statsAria")}>
        <article className="stat-card">
          <div className="stat-label">{t("common.workspace")}</div>
          <div className="stat-title">
            {isLive ? status.workspaceName : workspace.name}
          </div>
          <div
            className="stat-path"
            title={isLive ? status.rootPath : rootPath}
          >
            {isLive ? status.rootPath : rootPath}
          </div>
        </article>
        <article className="stat-card">
          <div className="stat-label">{t("dashboard.gitStatus")}</div>
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
              <div className="stat-title">{t("dashboard.gitUnavailable")}</div>
              <div className="stat-muted" title={git?.rawStatus}>
                {git?.rawStatus || t("dashboard.gitStatusMissing")}
              </div>
            </>
          ) : loadState === "loading" ? (
            <>
              <div className="stat-title">{t("common.loading")}</div>
              <div className="stat-muted">{t("sidebar.branchPlaceholder")}</div>
            </>
          ) : (
            <>
              <div className="stat-title">{workspace.gitSummary}</div>
              <div className="stat-muted">{workspace.workingTree}</div>
            </>
          )}
        </article>
        <article className="stat-card">
          <div className="stat-label">{t("dashboard.dataSource")}</div>
          <div className="stat-title">
            {isLive
              ? t("dashboard.dataSourceLive")
              : loadState === "loading"
                ? t("common.loading")
                : t("dashboard.dataSourceMock")}
          </div>
          <div className="stat-muted">
            {isLive
              ? t("dashboard.dataSourceMetaLive", {
                  handoff: handoff?.exists
                    ? t("dashboard.fileRead")
                    : t("dashboard.fileMissing"),
                  agents: agents?.exists
                    ? t("dashboard.fileRead")
                    : t("dashboard.fileMissing"),
                })
              : t("dashboard.dataSourceMetaFallback")}
          </div>
        </article>
      </section>

      <div className="dashboard-main">
        <section className="next-step-panel" aria-labelledby="next-step-title">
          <div className="next-step-top">
            <div className="section-kicker">{t("dashboard.currentGoal")}</div>
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
              {t("dashboard.nextStep")}
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
                {t("dashboard.copyNextStep")}
              </button>
              {toast ? (
                <span
                  className={`inline-toast is-${toast.kind}`}
                  aria-hidden="true"
                >
                  {toast.message}
                </span>
              ) : null}
            </div>
            <p className="source-line">
              {t("dashboard.sourcePrefix")}
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
            {t("dashboard.constraints")}
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
          {t("dashboard.phaseTimeline")}
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
                    {t(phaseStatusKey(phase.status))}
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
