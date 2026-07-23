import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { scanLocalSkills } from "../lib/workspaceApi";
import { mockSkills } from "../data/mock";
import type {
  LocalSkillItem,
  SkillItem,
  SkillScanResult,
  ToastState,
} from "../types";

interface SkillsPageProps {
  rootPath: string;
  onCopy: (text: string) => void;
  toast: ToastState | null;
}

type LoadState = "loading" | "success" | "fallback";

/** Adapts the Phase 1 mock skills into the real scan item shape so the
 * fallback view can reuse the same rendering path without lying about being
 * real data. */
const fallbackSkills: LocalSkillItem[] = mockSkills.map(
  (skill: SkillItem): LocalSkillItem => ({
    id: skill.id,
    name: skill.name,
    description: skill.description,
    path: skill.path,
    relativePath: skill.path,
    sourceRoot: "mock",
    trigger: skill.trigger,
    body: skill.body,
    updatedAt: "",
    tag: "local",
  }),
);

function formatTimestamp(updatedAt: string): string {
  const millis = Number(updatedAt);
  if (!updatedAt || Number.isNaN(millis)) return "—";
  return new Date(millis).toLocaleString();
}

export function SkillsPage({ rootPath, onCopy, toast }: SkillsPageProps) {
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [result, setResult] = useState<SkillScanResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const requestSeq = useRef(0);

  const runScan = useCallback(() => {
    const seq = requestSeq.current + 1;
    requestSeq.current = seq;
    setLoadState("loading");
    setErrorMessage(null);

    scanLocalSkills(rootPath)
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
    // Invalidate any in-flight request when the effect is torn down so a late
    // response cannot call setState after unmount or override a newer scan.
    return () => {
      requestSeq.current += 1;
    };
  }, [runScan]);

  const isFallback = loadState === "fallback";
  const skills: LocalSkillItem[] = isFallback
    ? fallbackSkills
    : (result?.skills ?? []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return skills;
    return skills.filter((skill) => {
      const hay =
        `${skill.name} ${skill.description} ${skill.trigger} ${skill.path} ${skill.relativePath}`.toLowerCase();
      return hay.includes(q);
    });
  }, [query, skills]);

  const selected =
    filtered.find((skill) => skill.id === selectedId) ?? filtered[0] ?? null;

  const failedRoots = result?.roots.filter((root) => root.error) ?? [];
  const isPartial = loadState === "success" && failedRoots.length > 0;

  const badge = (() => {
    if (loadState === "loading" && !result) {
      return { className: "badge badge-mock", label: "Loading local skills" };
    }
    if (isFallback) {
      return {
        className: "badge badge-mock",
        label: `Fallback mock data · ${skills.length} skills`,
      };
    }
    return {
      className: "badge",
      label: `Real local data · ${skills.length} skills`,
    };
  })();

  const showEmptyState =
    loadState === "success" && skills.length === 0 && query.trim() === "";

  return (
    <div className="page split-page">
      <div className="split-main">
        <header className="page-header compact-header">
          <div className="page-header-text">
            <h1 className="page-title">Skills</h1>
            <p className="page-subtitle">
              扫描本地 SKILL.md，查看触发场景与只读正文。
            </p>
          </div>
          <span className={badge.className}>{badge.label}</span>
        </header>

        {isFallback ? (
          <div className="callout callout-warning" role="note">
            <div className="callout-title">
              无法扫描真实本地 Skill，已回退到 mock 数据
            </div>
            <p className="callout-body">
              {errorMessage ??
                "调用 Tauri command 失败（在纯浏览器 Vite 环境下无 Tauri 运行时属正常）。"}
            </p>
          </div>
        ) : null}

        {isPartial ? (
          <div className="callout callout-warning" role="note">
            <div className="callout-title">
              部分扫描根不可用（已展示可读取到的真实 Skill）
            </div>
            <p className="callout-body">
              {failedRoots.length} 个扫描根读取失败，其余结果仍为真实本地数据。
            </p>
          </div>
        ) : null}

        {result?.truncated ? (
          <div className="callout callout-warning" role="note">
            <div className="callout-title">结果已截断</div>
            <p className="callout-body">
              Skill 数量超过上限，仅展示前 500 条。
            </p>
          </div>
        ) : null}

        <div className="toolbar">
          <label className="search-field">
            <span className="sr-only">搜索 Skills</span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜索名称、描述、触发或路径…"
              aria-label="搜索 Skills"
            />
          </label>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={runScan}
            disabled={loadState === "loading"}
          >
            {loadState === "loading" ? "扫描中…" : "刷新"}
          </button>
        </div>

        <ul className="item-list" aria-label="Skill 列表">
          {showEmptyState ? (
            <li className="empty-state">
              未在默认扫描目录中找到 SKILL.md。
            </li>
          ) : filtered.length === 0 ? (
            <li className="empty-state">没有匹配的 Skill。</li>
          ) : (
            filtered.map((skill) => {
              const active = selected?.id === skill.id;
              return (
                <li key={skill.id}>
                  <button
                    type="button"
                    className={`list-item${active ? " is-selected" : ""}`}
                    onClick={() => setSelectedId(skill.id)}
                    aria-current={active ? "true" : undefined}
                  >
                    <div className="list-item-top">
                      <span className="list-item-title">{skill.name}</span>
                      <span className="tag tag-local">{skill.tag}</span>
                    </div>
                    <div className="list-item-desc">{skill.description}</div>
                    <div className="path-chip" title={skill.relativePath}>
                      {skill.relativePath}
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
                <dt>Absolute path</dt>
                <dd className="mono wrap" title={selected.path}>
                  {selected.path}
                </dd>
              </div>
              <div>
                <dt>Relative path</dt>
                <dd className="mono wrap" title={selected.relativePath}>
                  {selected.relativePath}
                </dd>
              </div>
              <div>
                <dt>Source root</dt>
                <dd className="mono wrap" title={selected.sourceRoot}>
                  {selected.sourceRoot}
                </dd>
              </div>
              <div>
                <dt>Trigger</dt>
                <dd>{selected.trigger}</dd>
              </div>
              <div>
                <dt>Updated</dt>
                <dd>{formatTimestamp(selected.updatedAt)}</dd>
              </div>
            </dl>
            <div className="preview-block">
              <div className="preview-label">Skill body</div>
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
          <p className="empty-state">
            {showEmptyState
              ? "未在默认扫描目录中找到 SKILL.md。"
              : "选择一个 Skill 查看详情。"}
          </p>
        )}
      </aside>
    </div>
  );
}
