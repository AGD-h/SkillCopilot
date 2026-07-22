import { useMemo, useState } from "react";
import type { AgentItem, ToastState } from "../types";

interface AgentsPageProps {
  agents: AgentItem[];
  selectedId: string;
  onSelect: (id: string) => void;
  onCopy: (text: string) => void;
  toast: ToastState | null;
}

export function AgentsPage({
  agents,
  selectedId,
  onSelect,
  onCopy,
  toast,
}: AgentsPageProps) {
  const [query, setQuery] = useState("");

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
            <h1 className="page-title">Agents</h1>
            <p className="page-subtitle">
              管理子智能体角色提示词，复制后到外部工具使用。
            </p>
          </div>
          <span className="badge badge-mock">Mock · 6 agents</span>
        </header>

        <div className="toolbar">
          <label className="search-field">
            <span className="sr-only">搜索 Agents</span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜索名称、职责或来源…"
              aria-label="搜索 Agents"
            />
          </label>
        </div>

        <ul className="item-list" aria-label="Agent 列表">
          {filtered.length === 0 ? (
            <li className="empty-state">没有匹配的 Agent。</li>
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
                      来源：{agent.source}
                    </div>
                  </button>
                </li>
              );
            })
          )}
        </ul>
      </div>

      <aside className="inspector" aria-label="Agent 详情">
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
                <dt>Role</dt>
                <dd>{selected.role}</dd>
              </div>
              <div>
                <dt>Source</dt>
                <dd className="mono wrap" title={selected.source}>
                  {selected.source}
                </dd>
              </div>
              <div>
                <dt>Recommended use</dt>
                <dd>{selected.recommendedUse}</dd>
              </div>
            </dl>
            <div className="preview-block">
              <div className="preview-label">System prompt preview</div>
              <pre className="preview-body">{selected.prompt}</pre>
            </div>
            <div className="inspector-actions">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => onCopy(selected.prompt)}
              >
                复制提示词
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
          <p className="empty-state">选择一个 Agent 查看详情。</p>
        )}
      </aside>
    </div>
  );
}
