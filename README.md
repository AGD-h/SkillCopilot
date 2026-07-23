# SkillCopilot

English | [简体中文](README.zh-CN.md) | [繁體中文](README.zh-TW.md)

SkillCopilot is a local-first desktop app for AI project handoff and Skill/Agent management. It helps you see the current Git/HANDOFF state, browse reusable Skills, and copy Agent prompts for Cursor, Copilot, and similar tools.

Windows 10/11 is the primary target. macOS compatibility is kept in configuration but is not formally verified yet.

## What works in the MVP

- **Dashboard** — read-only HANDOFF.md, AGENTS.md, and Git status for the bound workspace
- **Skills** — scan local `SKILL.md` files, search, read-only detail, copy path/body
- **Agents** — scan project Agent configs (`AGENTS.md`, Cursor `.mdc` rules, Copilot instructions), search, read-only detail, copy prompts
- **Workspace picker** — native folder dialog with path remembered in `localStorage` (`skillcopilot.workspaceRoot`)
- **Languages** — 简体中文 / English / 繁體中文 for the app UI (source files stay untranslated)

## Local-first and privacy

- Does not upload project contents
- Does not run scripts from the selected workspace
- Does not modify scanned Skill/Agent source files
- No model API calls, no telemetry, and no account system in this release
- SQLite is intentionally not used; see `docs/architecture/sqlite-evaluation.md`

## Workspace and Skill sources

**Workspace-bound (after you choose a folder):**

- `HANDOFF.md`, `AGENTS.md`, Git status
- Workspace Skill roots such as `.agents/skills` and `.cursor/skills`
- Agent sources: `AGENTS.md`, `.cursor/rules/**/*.mdc`, `.github/copilot-instructions.md`

**User-level Skill roots (scanned with Skills):**

- `%USERPROFILE%\.codex\skills`
- `%USERPROFILE%\.cursor\skills`

## How to use

1. Open SkillCopilot.
2. Select a local project folder (Dashboard, Skills, Agents, or Settings).
3. Review Dashboard status, then browse Skills/Agents and copy what you need into your editor or AI tool.
4. In Settings, change or forget the Workspace, and switch the UI language.

Forgetting a Workspace only clears the local preference. It never deletes files in the project folder.

## Stack

- Tauri 2
- React and TypeScript
- Rust stable
- Vite
- pnpm

## Windows development

Use Windows-native PowerShell or Command Prompt. Do not build the Windows Tauri app from WSL.

Required tools:

- Node.js `24.18.0` (see `.node-version`)
- pnpm `11.15.1` (see `package.json`)
- Rust stable with the `x86_64-pc-windows-msvc` host
- Visual Studio 2022 Build Tools with Desktop development with C++
- Windows SDK and Microsoft Edge WebView2 Runtime

```powershell
pnpm install
pnpm tauri dev
```

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Vite frontend only |
| `pnpm build` | Type-check and build the frontend |
| `pnpm tauri dev` | Desktop app in development mode |
| `pnpm tauri info` | Toolchain information |
| `pnpm tauri build` | Production binary and Windows installers |

## Installers

When a GitHub Release for v0.1.0 is published, download MSI or NSIS from that release page. Until then, build locally with `pnpm tauri build`.

Current installers are **not commercially code-signed**. Windows SmartScreen may warn on first run. That is expected for this release candidate and is not a security certification.

## Current limits

- Windows 10/11 first; macOS not formally verified
- No in-app editing or write-back of HANDOFF / Skill / Agent files
- No SQLite / cloud sync / chat UI / marketplace
- Native folder picker requires the desktop app (`pnpm tauri dev` / release exe), not plain browser Vite

## Project layout

| Path | Purpose |
| --- | --- |
| `src/` | React and TypeScript frontend |
| `src-tauri/` | Rust backend and Tauri configuration |
| `docs/product/mvp-definition.md` | MVP product definition |
| `docs/architecture/sqlite-evaluation.md` | Phase 5 SQLite evaluation (not introduced) |
| `docs/release/` | Release candidate checklist and draft notes |
| `HANDOFF.md` | Current project state for collaborators |
| `CHANGELOG.md` | Version history |

## Collaboration

Read `HANDOFF.md` and `AGENTS.md` before changing code. Keep changes small. Never commit API keys, tokens, passwords, or real `.env` files.

## License

SkillCopilot is released under the [MIT License](LICENSE).
