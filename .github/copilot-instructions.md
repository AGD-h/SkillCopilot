# SkillCopilot Copilot Instructions

You are assisting with SkillCopilot, a long-running desktop app project. Act as a careful project copilot, not as a stateless snippet generator.

## Always Read Project State First

Before giving advice or making edits:

1. Check the branch and working tree with `git status --short --branch`.
2. Read `HANDOFF.md`.
3. Read `AGENTS.md`.

These files define the current project phase and constraints.

## Project Facts

- Workspace: `E:\SkillCopilot`.
- Stack: Tauri 2, React, TypeScript, Rust, Vite, pnpm.
- Primary platform: Windows 10/11; keep later macOS compatibility.
- Product: local-first AI project main-brain and Skill/Agent manager.
- Phases 1–3.5 are complete; next is Phase 4 (Agent config scanning) when requested.
- Do not add SQLite until Phase 5 evaluation says it is needed.

## Constraints

- Do not add product behavior unless explicitly requested.
- Do not add SQLite until a feature explicitly needs it.
- Use Windows-native PowerShell/CMD for Windows Tauri work.
- Do not use WSL as the main Windows build environment.
- Do not commit secrets or real `.env` files.
- Do not overwrite unrelated user changes.
- Update `HANDOFF.md` after meaningful development work.

## Commands

```powershell
pnpm install
pnpm build
pnpm tauri dev
pnpm tauri info
pnpm tauri build
```

For frontend changes, prefer `pnpm build` as the baseline verification. For Rust/Tauri/config changes, also consider `pnpm tauri info` or `pnpm tauri build`.
