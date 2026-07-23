import { useI18n } from "../i18n/I18nProvider";
import type { Locale } from "../i18n/locale";
import type { DataSourceItem } from "../types";

interface SettingsPageProps {
  workspaceRoot: string | null;
  dataSources: DataSourceItem[];
  phaseGates: string[];
  safetyBoundaries: string[];
  picking: boolean;
  onPickWorkspace: () => void;
  onClearWorkspace: () => void;
}

const LOCALE_OPTIONS: {
  id: Locale;
  labelKey:
    | "settings.locale.zhCN"
    | "settings.locale.en"
    | "settings.locale.zhTW";
}[] = [
  { id: "zh-CN", labelKey: "settings.locale.zhCN" },
  { id: "en", labelKey: "settings.locale.en" },
  { id: "zh-TW", labelKey: "settings.locale.zhTW" },
];

export function SettingsPage({
  workspaceRoot,
  dataSources,
  phaseGates,
  safetyBoundaries,
  picking,
  onPickWorkspace,
  onClearWorkspace,
}: SettingsPageProps) {
  const { locale, setLocale, t } = useI18n();
  const hasWorkspace = workspaceRoot !== null;
  const displayPath = hasWorkspace ? workspaceRoot : t("common.needWorkspace");

  return (
    <div className="page settings-page">
      <header className="page-header">
        <div className="page-header-text">
          <h1 className="page-title">{t("settings.title")}</h1>
          <p className="page-subtitle">{t("settings.subtitle")}</p>
        </div>
        <span className="badge">{t("settings.pickerBadge")}</span>
      </header>

      <section
        className="settings-section"
        aria-labelledby="language-settings"
      >
        <h2 id="language-settings" className="section-title">
          {t("settings.languageTitle")}
        </h2>
        <div className="settings-card">
          <div
            className="locale-segmented"
            role="group"
            aria-label={t("settings.languageAria")}
          >
            {LOCALE_OPTIONS.map((option) => {
              const pressed = locale === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  className={`locale-option${pressed ? " is-active" : ""}`}
                  aria-pressed={pressed}
                  onClick={() => setLocale(option.id)}
                >
                  {t(option.labelKey)}
                </button>
              );
            })}
          </div>
          <p className="hint-text locale-hint">{t("settings.languageHint")}</p>
        </div>
      </section>

      <div className="callout callout-warning" role="note">
        <div className="callout-title">{t("settings.phase4Title")}</div>
        <p className="callout-body">{t("settings.phase4Body")}</p>
      </div>

      <section className="settings-section" aria-labelledby="workspace-settings">
        <h2 id="workspace-settings" className="section-title">
          {t("settings.workspace")}
        </h2>
        <div className="settings-card">
          <div className="settings-row">
            <div className="settings-row-main">
              <div className="stat-label">{t("common.currentWorkspace")}</div>
              <div
                className="mono wrap path-ellipsis"
                title={hasWorkspace ? workspaceRoot : undefined}
              >
                {displayPath}
              </div>
              <div className="stat-muted">
                {hasWorkspace
                  ? t("settings.workspaceStatusBound")
                  : t("settings.workspaceStatusUnset")}
              </div>
            </div>
            <div className="settings-action">
              <button
                type="button"
                className="btn btn-secondary"
                disabled={picking}
                aria-busy={picking || undefined}
                aria-label={
                  hasWorkspace
                    ? t("settings.changeFolder")
                    : t("settings.selectFolder")
                }
                onClick={onPickWorkspace}
              >
                {picking
                  ? t("settings.selectingFolder")
                  : hasWorkspace
                    ? t("settings.changeFolder")
                    : t("settings.selectFolder")}
              </button>
              {hasWorkspace ? (
                <button
                  type="button"
                  className="btn btn-ghost"
                  disabled={picking}
                  aria-label={t("settings.forgetWorkspace")}
                  onClick={onClearWorkspace}
                >
                  {t("settings.forgetWorkspace")}
                </button>
              ) : null}
              <p className="hint-text">{t("settings.pickerHint")}</p>
              {hasWorkspace ? (
                <p className="hint-text">{t("settings.forgetHint")}</p>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <section className="settings-section" aria-labelledby="data-sources">
        <h2 id="data-sources" className="section-title">
          {t("settings.dataSources")}
        </h2>
        <p className="hint-text">{t("settings.skillRootsHint")}</p>
        <ul className="source-list">
          {dataSources.map((item) => (
            <li key={item.path} className="source-item">
              <div className="source-item-top">
                <div className="mono wrap" title={item.path}>
                  {item.path}
                </div>
                <span className={`source-status is-${item.status}`}>
                  {item.status === "real"
                    ? t("settings.status.real")
                    : t("settings.status.planned")}
                </span>
              </div>
              <div className="stat-muted">{item.note}</div>
            </li>
          ))}
        </ul>
      </section>

      <div className="settings-grid">
        <section className="settings-section" aria-labelledby="phase-gates">
          <h2 id="phase-gates" className="section-title">
            {t("settings.phaseGates")}
          </h2>
          <div className="settings-card">
            <ul className="compact-list">
              {phaseGates.map((item, index) => (
                <li key={`gate-${index}`}>{item}</li>
              ))}
            </ul>
          </div>
        </section>

        <section className="settings-section" aria-labelledby="safety">
          <h2 id="safety" className="section-title">
            {t("settings.safety")}
          </h2>
          <div className="settings-card">
            <ul className="compact-list">
              {safetyBoundaries.map((item, index) => (
                <li key={`safety-${index}`}>{item}</li>
              ))}
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
}
