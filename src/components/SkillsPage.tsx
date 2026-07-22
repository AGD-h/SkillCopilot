import { useMemo, useState } from "react";
import type { SkillItem, ToastState } from "../types";

interface SkillsPageProps {
  skills: SkillItem[];
  selectedId: string;
  onSelect: (id: string) => void;
  onCopy: (text: string) => void;
  toast: ToastState | null;
}

const TAG_LABEL: Record<SkillItem["tag"], string> = {
  process: "process",
  recon: "recon",
  verification: "verification",
  docs: "docs",
};

export function SkillsPage({
  skills,
  selectedId,
  onSelect,
  onCopy,
  toast,
}: SkillsPageProps) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return skills;
    return skills.filter((skill) => {
      const hay =
        `${skill.name} ${skill.description} ${skill.path} ${skill.tag}`.toLowerCase();
      return hay.includes(q);
    });
  }, [query, skills]);

  const selected =
    filtered.find((skill) => skill.id === selectedId) ??
    filtered[0] ??
    null;

  return (
    <div className="page split-page">
      <div className="split-main">
        <header className="page-header compact-header">
          <div className="page-header-text">
            <h1 className="page-title">Skills</h1>
            <p className="page-subtitle">
              浏览可复用 Skill，查看触发场景与正文。
            </p>
          </div>
          <span className="badge badge-mock">Mock · 4 skills</span>
        </header>

        <div className="toolbar">
          <label className="search-field">
            <span className="sr-only">搜索 Skills</span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜索名称、描述或路径…"
              aria-label="搜索 Skills"
            />
          </label>
        </div>

        <ul className="item-list" aria-label="Skill 列表">
          {filtered.length === 0 ? (
            <li className="empty-state">没有匹配的 Skill。</li>
          ) : (
            filtered.map((skill) => {
              const active = selected?.id === skill.id;
              return (
                <li key={skill.id}>
                  <button
                    type="button"
                    className={`list-item${active ? " is-selected" : ""}`}
                    onClick={() => onSelect(skill.id)}
                    aria-current={active ? "true" : undefined}
                  >
                    <div className="list-item-top">
                      <span className="list-item-title">{skill.name}</span>
                      <span className={`tag tag-${skill.tag}`}>
                        {TAG_LABEL[skill.tag]}
                      </span>
                    </div>
                    <div className="list-item-desc">{skill.description}</div>
                    <div className="path-chip" title={skill.path}>
                      {skill.path}
                    </div>
                  </button>
                </li>
              );
            })
          )}
        </ul>
      </div>

      <aside className="inspector" aria-label="Skill 详情">
        {selected ? (
          <>
            <div className="inspector-header">
              <h2 className="inspector-title">{selected.name}</h2>
              <p className="inspector-desc">{selected.description}</p>
            </div>
            <dl className="meta-grid">
              <div>
                <dt>Source path</dt>
                <dd className="mono wrap" title={selected.path}>
                  {selected.path}
                </dd>
              </div>
              <div>
                <dt>Trigger</dt>
                <dd>{selected.trigger}</dd>
              </div>
            </dl>
            <div className="preview-block">
              <div className="preview-label">Mock body</div>
              <pre className="preview-body">{selected.body}</pre>
            </div>
            <div className="inspector-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => onCopy(selected.path)}
              >
                复制路径
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => onCopy(selected.body)}
              >
                复制正文
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
          <p className="empty-state">选择一个 Skill 查看详情。</p>
        )}
      </aside>
    </div>
  );
}
