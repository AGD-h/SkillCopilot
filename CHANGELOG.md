# Changelog

All notable changes to SkillCopilot are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project aims to follow [Semantic Versioning](https://semver.org/).

## [0.1.0] - Unreleased

Release Candidate for the first public MVP. Do not treat this section as a published GitHub Release until a tag and Release are created.

### Added

- Desktop shell with Dashboard, Skills, Agents, and Settings navigation
- Dashboard read-only status from `HANDOFF.md`, `AGENTS.md`, and `git status --short --branch`
- Local Skill scanning for `SKILL.md` (workspace roots plus user-level Codex/Cursor skill roots)
- Agent config scanning for `AGENTS.md`, Cursor `.mdc` rules, and GitHub Copilot instructions (one source file = one Agent)
- Search, read-only detail, and clipboard copy for Skills and Agents
- Trilingual UI: 简体中文 / English / 繁體中文 with `localStorage` locale preference
- Workspace folder selection via official Tauri Dialog (`dialog:allow-open`) and path preference key `skillcopilot.workspaceRoot`
- Unselected-workspace empty states that do not pretend mock data is real local data
- Honest toasts when localStorage write/clear of the Workspace preference fails

### Security / privacy boundaries

- Local-first, read-only scanning of bound sources
- No upload of project contents, no telemetry, no account system, no model API
- No writes to scanned Skill/Agent/HANDOFF source files from the picker or scanners
- SQLite intentionally not introduced (see `docs/architecture/sqlite-evaluation.md`)

### Known limitations

- Windows 10/11 first; macOS not formally verified
- Installers are not commercially code-signed; SmartScreen may warn
- No in-app edit/write-back of handoff or prompt files
- Native folder dialog requires the desktop app, not plain browser Vite
- Installer install/uninstall UX remains a manual acceptance gate
