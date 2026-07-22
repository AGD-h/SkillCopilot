# SkillCopilot Project Scaffold Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create and verify a local SkillCopilot desktop application scaffold without adding product features or creating a GitHub repository.

**Architecture:** Use the official Tauri 2 React and TypeScript template with Vite and pnpm. Keep the frontend and Rust shell at template scope, pin the Rust channel for reproducibility, and document Windows-native development for future Cursor and Codex handoffs.

**Tech Stack:** Tauri 2, React, TypeScript, Rust stable MSVC, Vite, pnpm

## Global Constraints

- Work in Windows-native PowerShell under `E:\SkillCopilot`.
- Preserve and update `HANDOFF.md`.
- Do not add SQLite or product business functionality in this phase.
- Do not create a GitHub repository, remote, or push.
- Do not store API keys, credentials, or secrets.

---

### Task 1: Generate the official application scaffold

**Files:**
- Create: `package.json`, `pnpm-lock.yaml`, `index.html`, `src/**`, `src-tauri/**`
- Preserve: `HANDOFF.md`

**Interfaces:**
- Consumes: Windows-native Node.js, pnpm, Rust stable MSVC, and Visual Studio Build Tools
- Produces: A standard Tauri 2 application with React and TypeScript frontend entry points

- [x] **Step 1: Generate in an isolated temporary directory**

Run:

```powershell
pnpm create tauri-app SkillCopilot --template react-ts --manager pnpm --tauri-version 2 --identifier com.skillcopilot.app --yes
```

Expected: The generator creates a `SkillCopilot` directory containing `package.json`, `src`, and `src-tauri`.

After generation, replace the temporary identifier with `io.github.agdh.skillcopilot` so it remains valid for the planned macOS application bundle.

- [x] **Step 2: Inspect generated paths and move them into the workspace**

Expected: `E:\SkillCopilot\HANDOFF.md` remains present and all generated paths have unique destination names.

### Task 2: Add reproducible development documentation

**Files:**
- Create: `rust-toolchain.toml`
- Modify: `README.md`
- Modify: `HANDOFF.md`

**Interfaces:**
- Consumes: The generated package scripts and Tauri configuration
- Produces: Stable toolchain selection and handoff-ready setup instructions

- [x] **Step 1: Pin the Rust toolchain**

Create `rust-toolchain.toml` with the `stable` channel and minimal profile. Keep the host platform-native so future macOS development is not forced onto a Windows target; verify that the active Windows host ends in `-msvc`.

- [x] **Step 2: Document local setup and commands**

Document `pnpm install`, `pnpm dev`, `pnpm tauri dev`, `pnpm build`, and `pnpm tauri build`, including the Windows-native requirement.

- [x] **Step 3: Update the handoff state**

Record the framework files, commands, verification evidence, and explicit next step while keeping GitHub work pending.

### Task 3: Install and verify the scaffold

**Files:**
- Modify: `pnpm-lock.yaml` only if dependency installation updates it
- Create: ignored build outputs under `dist` and `src-tauri/target`

**Interfaces:**
- Consumes: The package scripts and Rust Tauri project
- Produces: Fresh build evidence for both frontend and Windows desktop application

- [x] **Step 1: Install dependencies**

Run: `pnpm install`

Expected: Exit code 0 with the lockfile resolved.

- [x] **Step 2: Verify the frontend production build**

Run: `pnpm build`

Expected: TypeScript and Vite exit with code 0 and create `dist`.

- [x] **Step 3: Inspect Tauri environment information**

Run: `pnpm tauri info`

Expected: Tauri reports the Windows MSVC environment and local package versions.

- [x] **Step 4: Verify the desktop production build**

Run: `pnpm tauri build`

Expected: Cargo, the React frontend, and Windows MSI/NSIS bundling exit with code 0.

- [x] **Step 5: Launch the built application**

Run the generated release executable, confirm the process responds, confirm WebView2 child processes appear, and stop only the exact verification processes.

Expected: The SkillCopilot template window starts and uses Microsoft Edge WebView2.

### Task 4: Audit the local deliverable

**Files:**
- Inspect: all workspace files
- Modify: `HANDOFF.md` with final verification results

**Interfaces:**
- Consumes: Build outputs and workspace state
- Produces: A verified local scaffold ready for later Git initialization and GitHub publishing

- [x] **Step 1: Confirm constraints and artifacts**

Verify there is no `.git`, no Git remote, no SQLite dependency, and no product business implementation.

- [x] **Step 2: Re-run authoritative verification**

Run `pnpm build` and `pnpm tauri build` after documentation and configuration changes.

Expected: Both commands exit with code 0.

- [x] **Step 3: Report verified and unverified state**

Report local build and launch evidence separately from pending GitHub creation.
