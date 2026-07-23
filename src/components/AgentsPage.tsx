import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { mockAgents } from "../data/mock";
import { useI18n } from "../i18n/I18nProvider";
import { intlLocale } from "../i18n/locale";
import { scanAgentConfigs } from "../lib/workspaceApi";
import type {
  AgentItem,
  AgentScanResult,
  AgentSourceKind,
  LocalAgentItem,
  ToastState,
} from "../types";

interface AgentsPageProps {
  rootPath: string;
  query: string;
  onQueryChange: (query: string) => void;
  selectedId: string;
  onSelect: (id: string) => void;
  onCopy: (text: string) => void;
  toast: ToastState | null;
}

type LoadState = "loading" | "success" | "fallback";

const fallbackAgents: LocalAgentItem[] = mockAgents.map(
  (agent: AgentItem): LocalAgentItem => ({
    id: agent.id,
    name: agent.name,
    role: agent.role,
    path: agent.source,
    relativePath: agent.source,
    sourceKind: "project",
    promptBody: agent.prompt,
    updatedAt: "",
    alwaysApply: null,
    globs: null,
  }),
);

export function AgentsPage({
  rootPath,
  query,
  onQueryChange,
  selectedId,
  onSelect,
  onCopy,
  toast,
}: AgentsPageProps) {
  const { locale, t } = useI18n();
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [result, setResult] = useState<AgentScanResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const requestSeq = useRef(0);

  const runScan = useCallback(() => {
    const seq = requestSeq.current + 1;
    requestSeq.current = seq;
    setLoadState("loading");
    setErrorMessage(null);

    scanAgentConfigs(rootPath)
      .then((scan) => {
        if (seq !== requestSeq.current) return;
        setResult(scan);
        setLoadState("success");
      })
      .catch((err: unknown) => {
        if (seq !== requestSeq.current) return;
        setResult(null);
        setErrorMessage(err instanceof Error ? err.message : String(err));
        setLoadState("fallback");
      });
  }, [rootPath]);

  useEffect(() => {
    runScan();
    return () => {
      requestSeq.current += 1;
    };
  }, [runScan]);

  const isFallback = loadState === "fallback";
  const agents = isFallback ? fallbackAgents : (result?.agents ?? []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return agents;
    return agents.filter((agent) => {
      const hay =
        `${agent.name} ${agent.role} ${agent.path} ${agent.relativePath} ${agent.sourceKind} ${agent.promptBody}`.toLowerCase();
      return hay.includes(q);
    });
  }, [agents, query]);

  const selected =
    filtered.find((agent) => agent.id === selectedId) ??
    filtered[0] ??
    null;

  const failedSources =
    result?.sources.filter((source) => source.error) ?? [];
  const warningCount = result?.warningCount ?? 0;
  const warningsTruncated = result?.warningsTruncated ?? false;
  const truncated = result?.truncated ?? false;
  const warningPreview = result?.warnings.slice(0, 3) ?? [];
  const remainingWarnings = Math.max(
    0,
    warningCount - warningPreview.length,
  );
  const isPartial =
    loadState === "success" &&
    (failedSources.length > 0 ||
      warningCount > 0 ||
      warningsTruncated ||
      truncated);
  const showEmptyState =
    loadState === "success" && agents.length === 0 && query.trim() === "";

  const badge = (() => {
    if (loadState === "loading" && !result) {
      return {
        className: "badge badge-mock",
        label: t("agents.loadingBadge"),
      };
    }
    if (isFallback) {
      return {
        className: "badge badge-mock",
        label: t("agents.fallbackBadge", { count: agents.length }),
      };
    }
    return {
      className: "badge",
      label: t("agents.realBadge", { count: agents.length }),
    };
  })();

  const partialDetails = [
    failedSources.length > 0
      ? t("agents.failedSources", { count: failedSources.length })
      : null,
    warningCount > 0
      ? t("agents.warningCount", { count: warningCount })
      : null,
    truncated ? t("agents.truncatedCap") : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const formatTimestamp = (updatedAt: string): string => {
    const millis = Number(updatedAt);
    if (!updatedAt || Number.isNaN(millis)) return "—";
    return new Date(millis).toLocaleString(intlLocale(locale));
  };

  const sourceLabel = (kind: AgentSourceKind): string => {
    if (kind === "cursor") return t("agents.sourceKind.cursor");
    if (kind === "copilot") return t("agents.sourceKind.copilot");
    return t("agents.sourceKind.project");
  };

  return (
    <div className="page split-page agents-page resource-page">
      <div className="split-main">
        <header className="page-header compact-header">
          <div className="page-header-text">
            <h1 className="page-title">{t("agents.title")}</h1>
            <p className="page-subtitle">{t("agents.subtitle")}</p>
          </div>
          <span className={badge.className}>{badge.label}</span>
        </header>

        {isFallback ? (
          <div className="callout callout-warning" role="note">
            <div className="callout-title">{t("agents.fallbackTitle")}</div>
            <p className="callout-body">
              {errorMessage
                ? `${t("agents.fallbackBody")} ${errorMessage}`
                : t("agents.fallbackBody")}
            </p>
          </div>
        ) : null}

        {isPartial ? (
          <div className="callout callout-warning" role="note">
            <div className="callout-title">{t("agents.partialTitle")}</div>
            <p className="callout-body">
              {t("agents.partialBody", { details: partialDetails })}
            </p>
            {warningPreview.length > 0 ? (
              <ul className="callout-list">
                {warningPreview.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            ) : null}
            {remainingWarnings > 0 ? (
              <p className="callout-body">
                {t("agents.remainingWarnings", {
                  count: remainingWarnings,
                })}
              </p>
            ) : null}
            {warningsTruncated ? (
              <p className="callout-body">
                {t("agents.warningsTruncated")}
              </p>
            ) : null}
          </div>
        ) : null}

        <div className="toolbar">
          <label className="search-field">
            <span className="sr-only">{t("agents.searchSr")}</span>
            <input
              type="search"
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              placeholder={t("agents.searchPlaceholder")}
              aria-label={t("agents.searchAria")}
            />
          </label>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={runScan}
            disabled={loadState === "loading"}
          >
            {loadState === "loading"
              ? t("agents.refreshing")
              : t("agents.refresh")}
          </button>
        </div>

        <ul className="item-list" aria-label={t("agents.listAria")}>
          {loadState === "loading" && agents.length === 0 ? (
            <li className="empty-state">{t("agents.loadingList")}</li>
          ) : showEmptyState ? (
            <li className="empty-state">{t("agents.emptyScan")}</li>
          ) : filtered.length === 0 ? (
            <li className="empty-state">{t("agents.emptySearch")}</li>
          ) : (
            filtered.map((agent) => {
              const active = selected?.id === agent.id;
              return (
                <li key={agent.id}>
                  <button
                    type="button"
                    className={`list-item${active ? " is-selected" : ""}`}
                    onClick={() => onSelect(agent.id)}
                    aria-current={active ? "true" : undefined}
                  >
                    <div className="list-item-top">
                      <span className="list-item-title">{agent.name}</span>
                      <span
                        className={`tag tag-agent-${agent.sourceKind}`}
                      >
                        {sourceLabel(agent.sourceKind)}
                      </span>
                    </div>
                    <div className="list-item-desc">{agent.role}</div>
                    <div
                      className="path-chip"
                      title={agent.relativePath}
                    >
                      {agent.relativePath}
                    </div>
                  </button>
                </li>
              );
            })
          )}
        </ul>
      </div>

      <aside className="inspector" aria-label={t("agents.inspectorAria")}>
        {selected ? (
          <>
            <div className="inspector-header">
              <div className="agent-name-row">
                <h2 className="inspector-title">{selected.name}</h2>
                <span
                  className={`tag tag-agent-${selected.sourceKind}`}
                >
                  {sourceLabel(selected.sourceKind)}
                </span>
              </div>
              <p className="inspector-desc">{selected.role}</p>
            </div>
            <dl className="meta-grid">
              <div>
                <dt>{t("agents.role")}</dt>
                <dd>{selected.role}</dd>
              </div>
              <div>
                <dt>{t("agents.sourceKind")}</dt>
                <dd>{sourceLabel(selected.sourceKind)}</dd>
              </div>
              <div>
                <dt>{t("agents.absolutePath")}</dt>
                <dd className="mono wrap" title={selected.path}>
                  {selected.path}
                </dd>
              </div>
              <div>
                <dt>{t("agents.relativePath")}</dt>
                <dd className="mono wrap" title={selected.relativePath}>
                  {selected.relativePath}
                </dd>
              </div>
              <div>
                <dt>{t("agents.updated")}</dt>
                <dd>{formatTimestamp(selected.updatedAt)}</dd>
              </div>
              {selected.alwaysApply !== null &&
              selected.alwaysApply !== undefined ? (
                <div>
                  <dt>{t("agents.alwaysApply")}</dt>
                  <dd>{String(selected.alwaysApply)}</dd>
                </div>
              ) : null}
              {selected.globs ? (
                <div>
                  <dt>{t("agents.globs")}</dt>
                  <dd className="mono wrap">{selected.globs}</dd>
                </div>
              ) : null}
            </dl>
            <div className="preview-block">
              <div className="preview-label">{t("agents.promptPreview")}</div>
              <pre className="preview-body">{selected.promptBody}</pre>
            </div>
            <div className="inspector-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => onCopy(selected.path)}
              >
                {t("agents.copyPath")}
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => onCopy(selected.promptBody)}
              >
                {t("agents.copyPrompt")}
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
          </>
        ) : (
          <p className="empty-state">
            {showEmptyState
              ? t("agents.emptyScan")
              : t("agents.selectHint")}
          </p>
        )}
      </aside>
    </div>
  );
}
