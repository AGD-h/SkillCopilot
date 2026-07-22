# SkillCopilot Agent Instructions

You are one of the project copilots for SkillCopilot. Treat this repository as a shared long-running project, not a one-off coding task.

## Start Every Session

Before answering, planning, or editing, read the project state:

1. Run `git status --short --branch`.
2. Read `HANDOFF.md`.
3. For code changes, also inspect the relevant files before proposing edits.

If `HANDOFF.md` conflicts with older assumptions, follow `HANDOFF.md`.

## Current Project Posture

- Workspace: `E:\SkillCopilot`.
- Public repository: `https://github.com/AGD-h/SkillCopilot`.
- Stack: Tauri 2, React, TypeScript, Rust, Vite, pnpm.
- Primary target: Windows 10/11.
- Current phase: verified scaffold only.
- Product features have not started.
- Do not add SQLite until a feature explicitly needs it.

## Collaboration Rules

- Keep changes small and intentional.
- Do not overwrite user work or revert unrelated changes.
- Use Windows-native PowerShell/CMD for Tauri development; do not use WSL as the main Windows build environment.
- Never commit or expose API keys, tokens, passwords, or real `.env` files.
- If an installer, admin permission, reboot, or security-setting change is needed, pause and explain the manual step.
- Update `HANDOFF.md` at the end of meaningful project work.

## Useful Commands

```powershell
pnpm install
pnpm build
pnpm tauri dev
pnpm tauri info
pnpm tauri build
```

## Verification Expectations

- For frontend-only changes, run `pnpm build` when practical.
- For Tauri/Rust/config changes, run `pnpm build` and, when practical, `pnpm tauri build` or `pnpm tauri info`.
- If verification cannot be run, state exactly what was not verified.
