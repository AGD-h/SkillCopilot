# SkillCopilot

English | [简体中文](README.zh-CN.md) | [繁體中文](README.zh-TW.md)

SkillCopilot is an open-source desktop application planned for Windows 10/11 first, with macOS support to follow.

This repository currently contains only the verified application scaffold. Product features and SQLite integration have not started.

## Stack

- Tauri 2
- React and TypeScript
- Rust stable
- Vite
- pnpm

## Windows prerequisites

Use a Windows-native PowerShell or Command Prompt for Windows desktop development. Do not build the Windows Tauri application from WSL.

Required tools:

- Node.js `24.18.0` (see `.node-version`)
- pnpm `11.15.1` (see `package.json`)
- Rust stable with the `x86_64-pc-windows-msvc` host
- Visual Studio 2022 Build Tools with Desktop development with C++
- Windows SDK and Microsoft Edge WebView2 Runtime

Open a fresh terminal after installing tools. On Windows, confirm Rust is using MSVC:

```powershell
rustup show active-toolchain
```

The result should contain `stable-x86_64-pc-windows-msvc`.

## Setup

Run these commands in the project root:

```powershell
pnpm install
pnpm tauri dev
```

`pnpm tauri dev` starts the Vite frontend, compiles the Rust backend, and opens the desktop window.

## Useful commands

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Start only the Vite frontend |
| `pnpm build` | Type-check and build the frontend |
| `pnpm tauri dev` | Run the desktop application in development mode |
| `pnpm tauri info` | Show Tauri and system toolchain information |
| `pnpm tauri build` | Build the frontend, Rust binary, and desktop installers |

## Project layout

| Path | Purpose |
| --- | --- |
| `src/` | React and TypeScript frontend |
| `src-tauri/` | Rust backend and Tauri configuration |
| `public/` | Static frontend assets |
| `HANDOFF.md` | Current state and next actions for Cursor, Codex, and other tools |
| `docs/superpowers/plans/` | Implementation plans used during development |

## Collaboration rules

Read `HANDOFF.md` before making changes and update it after each development session. Never commit API keys, access tokens, passwords, or real `.env` files.

## License

SkillCopilot is released under the [MIT License](LICENSE).
