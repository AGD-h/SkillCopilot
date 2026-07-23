# HANDOFF

## Current Goal
- Maintain the verified SkillCopilot project scaffold, now published as the public `AGD-h/SkillCopilot` GitHub repository.
- First target platform: Windows 10/11; keep configuration compatible with later macOS work.
- Stack: Tauri 2, React, TypeScript, Rust, Vite, pnpm, SQLite later, and Git later.
- MVP product definition is recorded at `docs/product/mvp-definition.md` (local AI project main-brain + Skill/Agent manager). Do not add SQLite until Phase 5 evaluation says it is needed.

## Recommended Development Environment
- Main development environment: Windows-native PowerShell/CMD.
- Project workspace: `E:\SkillCopilot`.
- Do not use WSL as the main environment for Windows Tauri development.
- WSL may be used later for Linux/CI validation, with separate dependencies and build outputs.

## Environment Verified State
- Current shell is Windows-native PowerShell 7 preview, not WSL/Git Bash/Linux/cloud.
- Windows is x64 and suitable for Windows Tauri development.
- Git is installed and available on PATH.
- Node.js LTS is installed and available on PATH.
- npm is installed and available on PATH.
- Microsoft Edge WebView2 Runtime is installed.
- pnpm is installed in the user npm global directory and available on PATH.
- Rustup, rustc, and cargo are installed and available on PATH.
- Rust default host/toolchain is `stable-x86_64-pc-windows-msvc`.
- Visual Studio Build Tools 2022, MSVC C++ tools, and Windows SDK are installed.
- Local Tauri CLI was verified inside the temporary test project.
- `E:\SkillCopilot` is a Git repository with `origin` set to the public `AGD-h/SkillCopilot` GitHub repository.
- GitHub CLI (`gh`) 2.96.0 is installed and authenticated as `AGD-h`.

## Project Scaffold State
- Official Tauri 2 React and TypeScript template generated with pnpm.
- Tauri identifier: `io.github.agdh.skillcopilot` (does not conflict with the macOS `.app` extension).
- Product and window name: `SkillCopilot`.
- Rust channel configured in `rust-toolchain.toml` as stable with platform-native host selection.
- Node version recorded in `.node-version`; pnpm version recorded in `package.json`.
- pnpm build scripts are restricted to the required `esbuild` dependency in `pnpm-workspace.yaml`.
- Cross-editor line endings and indentation are defined by `.editorconfig` and `.gitattributes`.
- Cross-agent project instructions are recorded in `AGENTS.md`, `.cursor/rules/skillcopilot-main-brain.mdc`, and `.github/copilot-instructions.md`.
- MVP product definition is recorded at `docs/product/mvp-definition.md`.
- Dependency lockfiles exist at `pnpm-lock.yaml` and `src-tauri/Cargo.lock`.
- Phase 1 frontend static shell is implemented with mock data only.
- Frontend pages: Dashboard / Skills / Agents / Settings (sidebar navigation, no react-router).
- Official Tauri template greet/logo frontend example has been removed from `src/`.
- Phase 2 implemented: Dashboard reads real local workspace status via Tauri, with mock fallback.
- Phase 3 implemented: Skills page reads a real local `SKILL.md` scan via Tauri, with mock fallback.
- Phase 3.5 implemented: trilingual UI (`zh-CN` / `en` / `zh-TW`) with localStorage persistence; no i18n library dependency.
- SQLite has not been added.

## Scaffold Verification Evidence
- `pnpm install` exited with code 0; only the `esbuild` install script is allowed.
- Earlier scaffold verification: `pnpm build`, `pnpm tauri info`, `pnpm tauri build`, and `pnpm tauri dev` all succeeded on the template app.
- Direct frontend and Rust dependencies contain no SQLite package.

## Phase 1 Verification
- `pnpm build` exited with code 0 after the Phase 1 frontend shell implementation.
- `git diff --check` passed for the Phase 1 change set.
- `pnpm tauri dev` was not run for Phase 1.
- `pnpm tauri build` was not run for Phase 1.
- UI polish pass completed (spacing, mock badges, toast success/fail, sticky inspector, 800-wide responsive densify, Settings mock callout).
- After polish: `pnpm build` exited with code 0; `git diff --check` passed.
- `pnpm dev` was run briefly; Vite served `http://localhost:1420/` and returned SkillCopilot title HTML; the process was then stopped.
- Manual browser viewport visual QA at approx 800x600 and 1280x800 was not performed (no interactive browser viewport check in this session).
- `pnpm tauri dev` / `pnpm tauri build` were not run for the polish pass.

## Phase 2 Implementation
- Added read-only Tauri command `read_workspace_status(request: { rootPath })` in `src-tauri/src/lib.rs`, registered alongside `greet` in `generate_handler!`.
- The command returns `WorkspaceStatus { workspaceName, rootPath, git, handoff, agents, fetchedAt }` (serde `rename_all = "camelCase"`), and never panics: missing/unreadable files are reported per-summary via `exists=false` + `error`, and git failures are captured in `git.rawStatus` instead of failing the whole call.
- Git is read via `std::process::Command` argument vectors: `git -C <root> status --short --branch` (no shell string, no repo-mutating subcommands). Parsing extracts `branchLine` (first `## ` line), `branchName`, `aheadBehind` (`[...]` text), `isClean` (no non-branch non-empty lines), and full `rawStatus`.
- HANDOFF.md parsing extracts bullet lines under `## Current Goal`, `## Last Known Next Step`, `## Important Constraints`, plus a char-safe 1200-char `rawExcerpt`. AGENTS.md provides a char-safe 1200-char excerpt.
- Frontend: new `src/lib/workspaceApi.ts` exports `readWorkspaceStatus(rootPath)`; new types in `src/types.ts` (`WorkspaceStatus` / `GitStatus` / `HandoffSummary` / `AgentsSummary`).
- Dashboard (`src/components/DashboardPage.tsx`) loads real status on mount for `E:\SkillCopilot`, shows loading/real/fallback badge ("Real local data" vs "Fallback mock data"), renders real workspace name / path / git branch + clean|dirty + ahead-behind / Current Goal / Next Step / Constraints, and falls back to mock (with an error callout) when the Tauri runtime is unavailable, so it never white-screens.
- Settings (`src/components/SettingsPage.tsx`) copy updated: Phase 2 reads real HANDOFF/AGENTS/Git status, but the workspace folder picker is still not implemented (root fixed to `E:\SkillCopilot`).
- No new dependencies added; no SQLite; no database crate; no capability/config changes (user-defined Tauri commands do not require capability entries).

## Phase 2 Verification
- `pnpm build` (`tsc && vite build`) exited with code 0.
- `cargo check` for `src-tauri` exited with code 0 (full Tauri app type-checked/compiled).
- `git diff --check` exited with code 0 (only informational CRLF→LF normalization notices, per `.gitattributes`; no whitespace errors).
- `pnpm tauri info` ran successfully (Tauri 2.11.5, WebView2 150.0.4078.83, rustc 1.97.1, React + Vite).
- `pnpm tauri dev` ran successfully in a later runtime acceptance session:
  - Vite served `http://localhost:1420/` and returned HTTP 200 with page title `SkillCopilot`.
  - The Rust dev profile compiled successfully (`Finished dev profile ... target(s)`).
  - `skillcopilot.exe` launched and ran.
  - WebView2 child processes were created under the dev process tree (6 processes), indicating the window's WebView rendered.
  - Log scan found no panic, no `error`, no invoke error, and no frontend error.
  - The dev process tree was then stopped; port 1420 was released; no residual dev/GUI processes remained.
- Honest limitations of that session: automation cannot capture the native WebView2 window, so the `Real local data` badge/text and click-through across the four pages were NOT confirmed by pixel-level or interactive visual QA. This does not block Phase 2 code from shipping; it is retained as a follow-up manual UI QA item.

## Phase 3 Implementation
- Added a dedicated read-only scanner module `src-tauri/src/skill_scanner.rs`; `src-tauri/src/lib.rs` only declares `mod skill_scanner`, keeps a thin `#[tauri::command] scan_local_skills(request)` wrapper, and registers it alongside `greet` and `read_workspace_status` in `generate_handler!`.
- Command `scan_local_skills(request: { rootPath })` returns `SkillScanResult { workspaceRoot, roots, skills, warnings, warningCount, warningsTruncated, truncated, scannedAt }` (serde `rename_all = "camelCase"`); it returns a readable `Err` only when `rootPath` is empty and otherwise never panics.
- `SkillRootStatus { path, source(workspace|user), exists, skillCount, error }` and `SkillItem { id, name, description, path, relativePath, sourceRoot, trigger, body, updatedAt, tag="local" }`. `id` is the canonicalized absolute path (verbatim `\\?\` prefix stripped) for a stable, non-random identity.
- Default scan roots (a missing root is `exists=false`, never a global failure; one failing root never blocks the others):
  1. `<workspace>\.agents\skills` (source=workspace)
  2. `<workspace>\.cursor\skills` (source=workspace)
  3. `%USERPROFILE%\.codex\skills` (source=user; falls back to `HOME` for future macOS)
  4. `%USERPROFILE%\.cursor\skills` (source=user)
- Root error classification: `ErrorKind::NotFound` → `exists=false` / `error=None`; other access errors → `exists=false` with a short readable error; root present but not a directory / is a symlink / cannot `read_dir` → `exists=true` with an error. Directory entry / `file_type` failures emit warnings instead of silent `continue`.
- Scan behavior: recursive (max depth 8), only files named `SKILL.md` (Windows case-insensitive), skips `.git` / `node_modules` / `target` with ASCII case-insensitive name matching, does not follow symlinks/junctions, canonicalizes roots and candidates and rejects paths outside the scan root, de-duplicates by canonical path only after a successful parse, caps at 500 *valid unique* skills (`truncated=true` only when a further valid unique skill is observed; duplicates / oversized / non-UTF-8 never flip truncation), marks remaining unscanned roots with `error="not scanned after global skill limit was reached"`, uses bounded `File::open` + `Read::take(1 MiB + 1)` (no unbounded `fs::read`), keeps `warningCount` for the true total while retaining at most 100 warning strings (`warningsTruncated`), and returns skills sorted by name then path.
- Parse rules (no YAML dependency): read a top `---` frontmatter block for simple single-line `name` / `description` / `trigger` (matched paired quotes stripped); unclosed frontmatter is treated as malformed and ignored with body fallback; empty frontmatter fields fall back; BOM-tolerant; `name` falls back to the parent directory name; `description` falls back to the first non-empty, non-heading paragraph; `trigger` falls back to `description`; summaries are char-safe truncated to 200 chars so multi-byte UTF-8 is never split.
- Frontend: `src/lib/workspaceApi.ts` adds `scanLocalSkills(rootPath)`; `src/types.ts` adds `SkillScanResult` / `SkillRootStatus` / `LocalSkillItem` / `DataSourceStatus` matching the Rust camelCase shapes (no `any`), including `warningCount` / `warningsTruncated`.
- Skills page (`src/components/SkillsPage.tsx`) is now self-contained: it scans on mount for `E:\SkillCopilot`, has a refresh button, guards against out-of-order/unmounted responses via a request sequence, and shows explicit states: loading (`Loading local skills`), success (`Real local data · N skills`), fallback (`Fallback mock data · N skills` + error callout, never labeled real), partial (real data when any of failed roots / `warningCount` / `warningsTruncated` / `truncated` is set — title “扫描完成，但部分项目被跳过”, up to 3 warning previews), empty (real success with 0 skills: 未在默认扫描目录中找到 SKILL.md), and search-empty (没有匹配的 Skill). Search covers name/description/trigger/path/relativePath; the inspector shows name, description, absolute path, relative path, source root, trigger, updatedAt (local time), and full read-only Markdown body (no Markdown renderer added); copy-path copies the absolute path and copy-body copies the unmodified body.
- Layout: default Tauri window is 800×600; Skills keeps list + inspector dual-pane there (compact sidebar 168px, inspector ~260px, list `min-width:0` + independent scroll). True stack breakpoint for `.split-page` is ~700px so hundreds of skills do not push the inspector below the full list. `tauri.conf.json` window size was not changed.
- Settings (`src/components/SettingsPage.tsx`) copy updated to Phase 3; data sources now distinguish `real` vs `planned` (Skill roots listed as real, `.cursor/rules/` and copilot instructions as planned Phase 4). Workspace picker remains unimplemented; root stays fixed to `E:\SkillCopilot`.
- No new dependencies; no changes to `package.json`, `Cargo.toml`, `tauri.conf.json`, or capabilities; no SQLite; the scanner never writes to disk.

## Phase 3 Verification
- Initial Phase 3 landing: `cargo fmt --check`, `cargo test` (9), `cargo check`, `pnpm build`, `pnpm tauri info`, and `git diff --check` all passed; a temporary read-only real-scan check found 13 skills including `codebase-recon`.
- Follow-up edge-case fix commit (`Fix Phase 3 scanner edge cases`):
  - `cargo fmt --manifest-path src-tauri/Cargo.toml -- --check`: exited 0.
  - `cargo test --manifest-path src-tauri/Cargo.toml`: 26 passed, 0 failed (root-error classification; valid-unique cap truncation with configurable limit helpers; bounded 1 MiB reads; warningCount/warningsTruncated; case-insensitive ignore dirs; unclosed/BOM/empty frontmatter; plus the original Phase 3 unit coverage).
  - `cargo check --manifest-path src-tauri/Cargo.toml`: exited 0.
  - `pnpm build`: exited 0.
  - `pnpm tauri info`: ran successfully.
  - `git diff --check`: exited 0.
  - Real read-only rescan of `E:\SkillCopilot` after the fix (temporary smoke test, removed before commit): 13 skills, `truncated=false`, `warning_count=0`, `codebase-recon` present.
- Final review-fix commit (`Finalize Phase 3 scanner review fixes`):
  - Unclosed-frontmatter body fallback tightened: when no closing `---` is found, no frontmatter fields are trusted; the opening fence and only the three recognized metadata lines (`name` / `description` / `trigger`) are skipped, so an unknown `key: value` line such as `Usage: run this` becomes the body start (and thus the description/trigger fallback) instead of being swallowed.
  - Two cap tests (`oversized_after_cap_does_not_set_truncated`, `non_utf8_after_cap_does_not_set_truncated`) were rewritten to put the cap-reaching valid skills and the invalid file in separate roots with a fixed `[root_valid, root_invalid]` order, removing the previous dependence on unspecified `read_dir` ordering; the tests now also assert the second root was actually scanned (`exists=true`, no root error, `skill_count=0`) plus the matching warning.
  - Added Windows path case-insensitivity coverage: `path_is_within_root` gained a `#[cfg(windows)]` branch that compares component-by-component with ASCII-case-insensitive matching (plus a discriminant check so different component kinds never collide), while non-Windows keeps `Path::starts_with`. New `#[cfg(windows)]` tests confirm same-path-different-case is accepted and similar-prefix-but-different-directory (`C:\foo` vs `C:\foobar`) is rejected.
  - `cargo fmt --manifest-path src-tauri/Cargo.toml -- --check`: exited 0.
  - `cargo test --manifest-path src-tauri/Cargo.toml`: 32 passed, 0 failed (6 new tests: 4 unclosed-frontmatter cases + 2 Windows path cases; previous 26 retained).
  - `cargo check --manifest-path src-tauri/Cargo.toml`: exited 0.
  - `pnpm build`: exited 0.
  - `git diff --check`: exited 0.
- `pnpm tauri dev` was NOT run for Phase 3 or the edge-case fix. Native WebView2 pixel-level / interactive UI QA (including 800×600 dual-pane visual confirmation) was NOT performed by automation and remains a manual follow-up. Phase 2 already validated that the Tauri dev runtime launches and renders. Browser `pnpm dev` viewport screenshots for 800×600 / 1280×800 were also NOT taken in this session.

## Phase 3.5 Implementation
- Added a zero-dependency i18n layer under `src/i18n/`: `locale.ts` (Locale union, system detection, `skillcopilot.locale` localStorage), `messages.ts` (flat `MessageKey` dictionaries — `zh-CN` baseline; `en` / `zh-TW` typed as `Record<MessageKey, string>` so a missing key fails `pnpm build`), and `I18nProvider.tsx` (`locale` / `setLocale` / `t`, updates `document.documentElement.lang`, simple `{param}` interpolation).
- `src/main.tsx` wraps `<App />` once with `<I18nProvider>`; components call `useI18n()` — no prop-drilling of `t`.
- Locale detection uses core BCP-47 subtags (via `Intl.Locale` with a manual fallback parser): stop at singleton extensions (`u`/`x`/…); `zh` + `Hant` or region `TW`/`HK`/`MO` → zh-TW; other `zh*` → zh-CN; non-zh → en; empty/API failure → zh-CN. Extended tags such as `zh-TW-u-nu-hanidec` resolve to zh-TW.
- Pages use a `visitedPages` set: start with Dashboard only; first navigation mounts that page; afterwards pages stay mounted but `hidden`, so locale switches do not remount or re-scan. Skills/Agents query + selection live in App state.
- Copy feedback: only the global `.app-toast` is a live region (`role="status"` + `aria-live="polite"`); per-page `.inline-toast` remains visual-only (`aria-hidden="true"`).
- `document.documentElement.lang` syncs in `useLayoutEffect` (before paint). Locale-option hover uses `var(--code-bg)` with dark-mode active colors so hover/active stay readable.
- Translation boundary: UI chrome, badges, toasts, empty/loading/error wrappers, Settings notes, phase labels, and app-owned mock status text are translated. HANDOFF/AGENTS/Git raw content, Skill/Agent source bodies/paths/names, and Rust warning strings stay original (UI may add a translated wrapper prefix).
- Settings gains a three-button segmented language control (labels always show 简体中文 / English / 繁體中文; `button` + `aria-pressed`; translated group `aria-label`). Copy explains system-follow, remembered choice, and “local files stay original”.
- App-owned mock factories (`createMockWorkspace` / `createMockPhases` / `createMockDataSources` / gates / safety) rebuild via `useMemo` on `t`. Phase statuses corrected: Phase 1–3 done, Phase 4–5 pending. Sidebar chip updated from obsolete “Phase 1 Mock Mode” to “Phase 3 · Local data” (trilingual).
- Locale switch clears any in-flight toast, does not change `visitedPages`, does not reset page/search/selection, and does not re-invoke `readWorkspaceStatus` / `scanLocalSkills`. Dates use `toLocaleString(locale)`.
- No new npm/Cargo dependencies; no SQLite; no Tauri/Rust command changes; no writes beyond `localStorage`. Dictionaries remain 164 keys each.

## Phase 3.5 Verification
- Initial landing: `pnpm build` / browser visual QA recorded under the original “Add trilingual UI localization” commit.
- Review-fix commit (`Fix localization review issues`):
  - BCP-47 matrix (Node `--experimental-strip-types` import of `locale.ts`): 14/14 cases passed, including `zh-TW-u-nu-hanidec`, `zh-HK-x-private`, `zh-MO-u-ca-chinese`, `zh-Hant-TW-u-nu-hanidec`, `en-Hant-TW` → en, empty → zh-CN.
  - Browser DOM QA via temporary out-of-repo Playwright script against `pnpm dev` (not added to the project): initial Dashboard has no `.skills-page` / `.settings-page`; Skills mounts on first visit; locale switch keeps Skills mounted with search/selection; return to Skills is not mid-scan; only one `[role="status"]` (global toast); inline toasts `aria-hidden="true"`; dark `prefers-color-scheme` locale active colors readable; reload keeps `lang`/`localStorage` as zh-TW; 1280 locale control no overflow. Script removed after the run.
  - `pnpm build`: exited 0.
  - `git diff --check`: exited 0.
  - `rg 'role="status"' src` → only `App.tsx` global toast.
  - `scanLocalSkills` / `readWorkspaceStatus` effects still depend only on `rootPath`.
  - Dev server stopped; port 1420 not listening.
- `pnpm tauri dev` / `pnpm tauri build` were NOT run (frontend-only phase).

## Publishing State
- License: MIT, recorded in `LICENSE`, `package.json`, and `src-tauri/Cargo.toml`.
- Git repository initialized on branch `main` with the scaffold as the first commit.
- Public repository: `https://github.com/AGD-h/SkillCopilot`, pushed via authenticated GitHub CLI.

## Pending Work
- Phase 2 done: Tauri read-only access to `HANDOFF.md`, `AGENTS.md`, and `git status` is implemented and Dashboard uses real data with mock fallback.
- Phase 3 done: local `SKILL.md` scanning is implemented and the Skills page shows a real, searchable Skill list with read-only detail (mock fallback when the Tauri runtime is unavailable).
- Phase 3.5 done: UI supports zh-CN / en / zh-TW with Settings language control and localStorage persistence; local file contents remain untranslated.
- Phase 4 is the next phase: scan Agent configuration files and show real Agent entries with copyable prompts on the Agents page.
- Settings workspace folder picker is still not implemented (root fixed to `E:\SkillCopilot`).
- Verify `pnpm tauri dev` renders the real Dashboard and Skills page in an actual window when a display is available (manual UI QA still pending).
- SQLite has still NOT been added and must not be added until the Phase 5 evaluation concludes it is needed.
- For normal development, open a fresh PowerShell or Cursor terminal so the Rust PATH is loaded.

## Temporary Validation Project
- Created at: `C:\dev\tauri-environment-check`.
- Template: Tauri 2 + React + TypeScript + Vite + pnpm.
- `pnpm install` passed after approving the required `esbuild` build script.
- `pnpm build` passed.
- `pnpm tauri build` passed and produced MSI/NSIS bundles.
- Release exe launched successfully and WebView2 runtime processes were observed.
- Do not delete the validation project automatically.
- Do not add SQLite or business dependencies during environment validation.

## Important Constraints
- Do not install duplicate tools that already satisfy requirements.
- Do not use unknown install scripts.
- Do not uninstall existing software.
- Do not disable Windows security or antivirus features.
- Do not configure or expose API keys, tokens, passwords, or secrets.
- If an installer requires administrator permission, a graphical installer, or a reboot, pause and give manual instructions.

## Last Known Next Step
- Phase 4：扫描 Agent 配置文件并在 Agents 页展示真实条目与可复制提示词。
- Do not add SQLite until Phase 5 evaluation concludes it is required.

## Verified Tool Versions
- Windows: Windows 11/10.0.26200 x64.
- Git: 2.54.0.windows.1.
- Node.js: 24.18.0.
- npm: 11.16.0.
- pnpm: 11.15.1.
- rustup: 1.29.0.
- rustc: 1.97.1.
- cargo: 1.97.1.
- Rust toolchain: `stable-x86_64-pc-windows-msvc`.
- Visual Studio Build Tools: 17.14.37502.11.
- MSVC compiler: 19.44.35228.
- MSVC linker: 14.44.35228.
- Windows SDK: 10.0.26100.0 include directory present.
- WebView2 Runtime: 150.0.4078.83.
- Real project Tauri CLI: 2.11.4.
- Real project Tauri Rust crate: 2.11.5.
- Real project Tauri JavaScript API: 2.11.1.
- Real project React: 19.2.7.
- Real project TypeScript: 5.8.3.
- Real project Vite: 7.3.6.
