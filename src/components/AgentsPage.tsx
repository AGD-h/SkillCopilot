import { useMemo } from "react";
import { useI18n } from "../i18n/I18nProvider";
import type { AgentItem, ToastState } from "../types";

interface AgentsPageProps {
  agents: AgentItem[];
  query: string;
  onQueryChange: (query: string) => void;
  selectedId: string;
  onSelect: (id: string) => void;
  onCopy: (text: string) => void;
  toast: ToastState | null;
}

export function AgentsPage({
  agents,
  query,
  onQueryChange,
  selectedId,
  onSelect,
  onCopy,
  toast,
}: AgentsPageProps) {
  const { t } = useI18n();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return agents;
    return agents.filter((agent) => {
      const hay = `${agent.name} ${agent.role} ${agent.source}`.toLowerCase();
      return hay.includes(q);
    });
  }, [agents, query]);

  const selected =
    filtered.find((agent) => agent.id === selectedId) ??
    filtered[0] ??
    null;

  return (
    <div className="page split-page">
      <div className="split-main">
        <header className="page-header compact-header">
          <div className="page-header-text">
            <h1 className="page-title">{t("agents.title")}</h1>
            <p className="page-subtitle">{t("agents.subtitle")}</p>
          </div>
          <span className="badge badge-mock">
            {t("agents.mockBadge", { count: agents.length })}
          </span>
        </header>

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
        </div>

        <ul className="item-list" aria-label={t("agents.listAria")}>
          {filtered.length === 0 ? (
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
                      <span
                        className="color-dot"
                        style={{ backgroundColor: agent.color }}
                        aria-hidden="true"
                      />
                      <span className="list-item-title">{agent.name}</span>
                    </div>
                    <div className="list-item-desc">{agent.role}</div>
                    <div className="path-chip" title={agent.source}>
                      {t("agents.sourcePrefix")}
                      {agent.source}
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
                <span
                  className="color-dot large"
                  style={{ backgroundColor: selected.color }}
                  aria-hidden="true"
                />
                <h2 className="inspector-title">{selected.name}</h2>
              </div>
              <p className="inspector-desc">{selected.role}</p>
            </div>
            <dl className="meta-grid">
              <div>
                <dt>{t("agents.role")}</dt>
                <dd>{selected.role}</dd>
              </div>
              <div>
                <dt>{t("agents.source")}</dt>
                <dd className="mono wrap" title={selected.source}>
                  {selected.source}
                </dd>
              </div>
              <div>
                <dt>{t("agents.recommendedUse")}</dt>
                <dd>{selected.recommendedUse}</dd>
              </div>
            </dl>
            <div className="preview-block">
              <div className="preview-label">{t("agents.promptPreview")}</div>
              <pre className="preview-body">{selected.prompt}</pre>
            </div>
            <div className="inspector-actions">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => onCopy(selected.prompt)}
              >
                {t("agents.copyPrompt")}
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
          </>
        ) : (
          <p className="empty-state">{t("agents.selectHint")}</p>
        )}
      </aside>
    </div>
  );
}
