# HANDOFF

## Current Goal
- Maintain the verified SkillCopilot project scaffold, now published as the public `AGD-h/SkillCopilot` GitHub repository.
- First target platform: Windows 10/11; keep configuration compatible with later macOS work.
- Stack: Tauri 2, React, TypeScript, Rust, Vite, pnpm, SQLite later, and Git later.
- Do not implement product features or add SQLite during this scaffold phase.

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
- Dependency lockfiles exist at `pnpm-lock.yaml` and `src-tauri/Cargo.lock`.
- The frontend and Rust files remain the official template connectivity example; no product behavior has been implemented.

## Scaffold Verification Evidence
- `pnpm install` exited with code 0; only the `esbuild` install script is allowed.
- `pnpm build` exited with code 0 and produced `dist`.
- `pnpm tauri info` detected Windows x64, WebView2, Visual Studio Build Tools 2022, Rust stable MSVC, React, and Vite.
- `pnpm tauri build` exited with code 0 after the final identifier change.
- Release executable: `src-tauri/target/release/skillcopilot.exe`.
- MSI bundle: `src-tauri/target/release/bundle/msi/SkillCopilot_0.1.0_x64_en-US.msi`.
- NSIS bundle: `src-tauri/target/release/bundle/nsis/SkillCopilot_0.1.0_x64-setup.exe`.
- The release executable responded and created six new WebView2 processes; the verification process was then stopped.
- `pnpm tauri dev` started Vite at `http://localhost:1420`, compiled the debug Rust application, launched a responding window, and created six WebView2 processes.
- All eleven explicitly identified processes from the development verification tree were stopped; no process from that tree remained.
- Direct frontend and Rust dependencies contain no SQLite package.

## Publishing State
- License: MIT, recorded in `LICENSE`, `package.json`, and `src-tauri/Cargo.toml`.
- Git repository initialized on branch `main` with the scaffold as the first commit.
- Public repository: `https://github.com/AGD-h/SkillCopilot`, pushed via authenticated GitHub CLI.

## Pending Work
- Replace the official template connectivity example only when product development begins.
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
- Publishing phase is complete. Begin product feature development only when the user requests it.
- Do not add SQLite until the feature that needs it is being implemented.

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
