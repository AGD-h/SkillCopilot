import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { mockSkills } from "../data/mock";
import { useI18n } from "../i18n/I18nProvider";
import { intlLocale } from "../i18n/locale";
import { scanLocalSkills } from "../lib/workspaceApi";
import type {
  LocalSkillItem,
  SkillItem,
  SkillScanResult,
  ToastState,
} from "../types";

interface SkillsPageProps {
  rootPath: string;
  query: string;
  onQueryChange: (query: string) => void;
  selectedId: string;
  onSelect: (id: string) => void;
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

export function SkillsPage({
  rootPath,
  query,
  onQueryChange,
  selectedId,
  onSelect,
  onCopy,
  toast,
}: SkillsPageProps) {
  const { locale, t } = useI18n();
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [result, setResult] = useState<SkillScanResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
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
    (failedRoots.length > 0 ||
      warningCount > 0 ||
      warningsTruncated ||
      truncated);

  const badge = (() => {
    if (loadState === "loading" && !result) {
      return {
        className: "badge badge-mock",
        label: t("skills.loadingBadge"),
      };
    }
    if (isFallback) {
      return {
        className: "badge badge-mock",
        label: t("skills.fallbackBadge", { count: skills.length }),
      };
    }
    return {
      className: "badge",
      label: t("skills.realBadge", { count: skills.length }),
    };
  })();

  const showEmptyState =
    loadState === "success" && skills.length === 0 && query.trim() === "";

  const formatTimestamp = (updatedAt: string): string => {
    const millis = Number(updatedAt);
    if (!updatedAt || Number.isNaN(millis)) return "—";
    return new Date(millis).toLocaleString(intlLocale(locale));
  };

  const partialDetails = [
    failedRoots.length > 0
      ? t("skills.failedRoots", { count: failedRoots.length })
      : null,
    warningCount > 0
      ? t("skills.warningCount", { count: warningCount })
      : null,
    truncated ? t("skills.truncatedCap") : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="page split-page skills-page">
      <div className="split-main">
        <header className="page-header compact-header">
          <div className="page-header-text">
            <h1 className="page-title">{t("skills.title")}</h1>
            <p className="page-subtitle">{t("skills.subtitle")}</p>
          </div>
          <span className={badge.className}>{badge.label}</span>
        </header>

        {isFallback ? (
          <div className="callout callout-warning" role="note">
            <div className="callout-title">{t("skills.fallbackTitle")}</div>
            <p className="callout-body">
              {errorMessage
                ? `${t("skills.fallbackBody")} ${errorMessage}`
                : t("skills.fallbackBody")}
            </p>
          </div>
        ) : null}

        {isPartial ? (
          <div className="callout callout-warning" role="note">
            <div className="callout-title">{t("skills.partialTitle")}</div>
            <p className="callout-body">
              {t("skills.partialBody", { details: partialDetails })}
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
                {t("skills.remainingWarnings", { count: remainingWarnings })}
              </p>
            ) : null}
            {warningsTruncated ? (
              <p className="callout-body">{t("skills.warningsTruncated")}</p>
            ) : null}
          </div>
        ) : null}

        <div className="toolbar">
          <label className="search-field">
            <span className="sr-only">{t("skills.searchSr")}</span>
            <input
              type="search"
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              placeholder={t("skills.searchPlaceholder")}
              aria-label={t("skills.searchAria")}
            />
          </label>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={runScan}
            disabled={loadState === "loading"}
          >
            {loadState === "loading"
              ? t("skills.refreshing")
              : t("skills.refresh")}
          </button>
        </div>

        <ul className="item-list" aria-label={t("skills.listAria")}>
          {showEmptyState ? (
            <li className="empty-state">{t("skills.emptyScan")}</li>
          ) : filtered.length === 0 ? (
            <li className="empty-state">{t("skills.emptySearch")}</li>
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
                      <span className="tag tag-local">
                        {t("skills.tagLocal")}
                      </span>
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

      <aside className="inspector" aria-label={t("skills.inspectorAria")}>
        {selected ? (
          <>
            <div className="inspector-header">
              <h2 className="inspector-title">{selected.name}</h2>
              <p className="inspector-desc">{selected.description}</p>
            </div>
            <dl className="meta-grid">
              <div>
                <dt>{t("skills.absolutePath")}</dt>
                <dd className="mono wrap" title={selected.path}>
                  {selected.path}
                </dd>
              </div>
              <div>
                <dt>{t("skills.relativePath")}</dt>
                <dd className="mono wrap" title={selected.relativePath}>
                  {selected.relativePath}
                </dd>
              </div>
              <div>
                <dt>{t("skills.sourceRoot")}</dt>
                <dd className="mono wrap" title={selected.sourceRoot}>
                  {selected.sourceRoot}
                </dd>
              </div>
              <div>
                <dt>{t("skills.trigger")}</dt>
                <dd>{selected.trigger}</dd>
              </div>
              <div>
                <dt>{t("skills.updated")}</dt>
                <dd>{formatTimestamp(selected.updatedAt)}</dd>
              </div>
            </dl>
            <div className="preview-block">
              <div className="preview-label">{t("skills.body")}</div>
              <pre className="preview-body">{selected.body}</pre>
            </div>
            <div className="inspector-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => onCopy(selected.path)}
              >
                {t("skills.copyPath")}
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => onCopy(selected.body)}
              >
                {t("skills.copyBody")}
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
              ? t("skills.emptyScan")
              : t("skills.selectHint")}
          </p>
        )}
      </aside>
    </div>
  );
}
