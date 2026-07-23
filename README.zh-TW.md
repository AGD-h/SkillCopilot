# SkillCopilot

[English](README.md) | [简体中文](README.zh-CN.md) | 繁體中文

SkillCopilot 是本機優先的桌面應用程式，用於 AI 專案交接與 Skill / Agent 管理：查看目前 Git 與 HANDOFF 狀態，瀏覽可重用 Skill，並將 Agent 提示詞複製到 Cursor、Copilot 等工具中使用。

優先支援 Windows 10/11；設定保留後續 macOS 相容，但尚未完成正式驗證。

## 目前 MVP 已實作

- **儀表板**：唯讀讀取綁定工作區的 HANDOFF.md、AGENTS.md 與 Git 狀態
- **Skills**：掃描本機 `SKILL.md`，搜尋、唯讀詳情、複製路徑/正文
- **Agents**：掃描專案 Agent 設定（`AGENTS.md`、Cursor `.mdc`、Copilot 指令），搜尋、唯讀詳情、複製提示詞
- **Workspace 選擇**：系統原生資料夾對話框；路徑記憶在 `localStorage`（`skillcopilot.workspaceRoot`）
- **介面語言**：简体中文 / English / 繁體中文（來源檔案保持原文，不做自動翻譯）

## 本機優先與隱私

- 不上傳專案內容
- 不執行所選工作區中的指令碼
- 不修改掃描到的 Skill / Agent 來源檔案
- 目前無模型 API、無遙測、無帳號體系
- 明確不引入 SQLite，見 `docs/architecture/sqlite-evaluation.md`

## Workspace 與 Skill 來源

**綁定工作區後：**

- `HANDOFF.md`、`AGENTS.md`、Git 狀態
- 工作區 Skill 根（如 `.agents/skills`、`.cursor/skills`）
- Agent 來源：`AGENTS.md`、`.cursor/rules/**/*.mdc`、`.github/copilot-instructions.md`

**使用者級 Skill 根（Skills 頁一併掃描）：**

- `%USERPROFILE%\.codex\skills`
- `%USERPROFILE%\.cursor\skills`

## 使用方式

1. 開啟 SkillCopilot
2. 選擇本機專案資料夾
3. 在儀表板核對狀態，在 Skills / Agents 中瀏覽並複製所需內容
4. 在設定中變更或忘記 Workspace，並切換介面語言

「忘記 Workspace」只清除本機偏好，不會刪除專案目錄中的任何檔案。

## 技術棧

- Tauri 2
- React 與 TypeScript
- Rust stable
- Vite
- pnpm

## Windows 開發

請使用 Windows 原生 PowerShell 或命令提示字元，不要用 WSL 作為 Windows Tauri 主建置環境。

所需工具：

- Node.js `24.18.0`（見 `.node-version`）
- pnpm `11.15.1`（見 `package.json`）
- Rust stable，`x86_64-pc-windows-msvc`
- Visual Studio 2022 建置工具（含 C++ 桌面開發）
- Windows SDK 與 Microsoft Edge WebView2 執行階段

```powershell
pnpm install
pnpm tauri dev
```

| 命令 | 用途 |
| --- | --- |
| `pnpm dev` | 僅前端 Vite |
| `pnpm build` | 前端型別檢查與建置 |
| `pnpm tauri dev` | 桌面開發模式 |
| `pnpm tauri info` | 工具鏈資訊 |
| `pnpm tauri build` | 正式版二進位與 Windows 安裝包 |

## 安裝包說明

待 GitHub Releases 發布 v0.1.0 後，從該頁面下載 MSI 或 NSIS。在此之前請用 `pnpm tauri build` 本機產生。

目前安裝包**未經商業程式碼簽章**，首次執行可能出現 Windows SmartScreen 提示。這是 Release Candidate 的預期情況，不代表已通過安全認證。

## 目前限制

- Windows 10/11 優先；macOS 未正式驗收
- 應用程式內不能編輯或寫回 HANDOFF / Skill / Agent 檔案
- 無 SQLite、無雲端同步、無聊天 UI、無市集
- 原生資料夾選擇需要桌面應用程式，純瀏覽器 Vite 預覽不可用

## 專案結構

| 路徑 | 說明 |
| --- | --- |
| `src/` | React / TypeScript 前端 |
| `src-tauri/` | Rust 後端與 Tauri 設定 |
| `docs/product/mvp-definition.md` | MVP 產品定義 |
| `docs/architecture/sqlite-evaluation.md` | Phase 5 SQLite 評估（未引入） |
| `docs/release/` | Release Candidate 清單與草稿 |
| `HANDOFF.md` | 協作交接狀態 |
| `CHANGELOG.md` | 版本紀錄 |

## 協作

改程式碼前先讀 `HANDOFF.md` 與 `AGENTS.md`。保持小範圍變更。不要提交 API key、token、密碼或真實 `.env`。

## 授權

SkillCopilot 以 [MIT License](LICENSE) 發布。
