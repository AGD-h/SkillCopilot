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

## Publishing State
- License: MIT, recorded in `LICENSE`, `package.json`, and `src-tauri/Cargo.toml`.
- Git repository initialized on branch `main` with the scaffold as the first commit.
- Public repository: `https://github.com/AGD-h/SkillCopilot`, pushed via authenticated GitHub CLI.

## Pending Work
- Phase 2 done: Tauri read-only access to `HANDOFF.md`, `AGENTS.md`, and `git status` is implemented and Dashboard uses real data with mock fallback.
- Phase 3: scan local Skill files and show a real Skill list with read-only detail on the Skills page.
- Settings workspace folder picker is still not implemented (root fixed to `E:\SkillCopilot`).
- Verify `pnpm tauri dev` renders the real Dashboard in an actual window when a display is available.
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
- Phase 3：扫描本地 Skill 文件并在 Skills 页展示真实 Skill 列表与只读详情。
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
