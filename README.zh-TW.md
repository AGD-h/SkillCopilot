# SkillCopilot

[English](README.md) | [简体中文](README.zh-CN.md) | 繁體中文

SkillCopilot 是一款開源桌面應用程式,優先支援 Windows 10/11,後續將支援 macOS。

本儲存庫目前僅包含經過驗證的應用程式鷹架,產品功能與 SQLite 整合尚未開始。

## 技術棧

- Tauri 2
- React 與 TypeScript
- Rust stable
- Vite
- pnpm

## Windows 前置需求

請使用 Windows 原生的 PowerShell 或命令提示字元進行 Windows 桌面開發,不要在 WSL 中建置 Windows 版 Tauri 應用程式。

所需工具:

- Node.js `24.18.0`(見 `.node-version`)
- pnpm `11.15.1`(見 `package.json`)
- Rust stable,主機目標為 `x86_64-pc-windows-msvc`
- Visual Studio 2022 建置工具(含「使用 C++ 的桌面開發」工作負載)
- Windows SDK 與 Microsoft Edge WebView2 執行階段

安裝工具後請開啟一個新的終端機。在 Windows 上確認 Rust 使用的是 MSVC:

```powershell
rustup show active-toolchain
```

輸出結果應包含 `stable-x86_64-pc-windows-msvc`。

## 快速開始

在專案根目錄執行以下命令:

```powershell
pnpm install
pnpm tauri dev
```

`pnpm tauri dev` 會啟動 Vite 前端、編譯 Rust 後端並開啟桌面視窗。

## 常用命令

| 命令 | 用途 |
| --- | --- |
| `pnpm dev` | 僅啟動 Vite 前端 |
| `pnpm build` | 型別檢查並建置前端 |
| `pnpm tauri dev` | 以開發模式執行桌面應用程式 |
| `pnpm tauri info` | 顯示 Tauri 與系統工具鏈資訊 |
| `pnpm tauri build` | 建置前端、Rust 二進位檔與桌面安裝程式 |

## 專案結構

| 路徑 | 用途 |
| --- | --- |
| `src/` | React 與 TypeScript 前端 |
| `src-tauri/` | Rust 後端與 Tauri 設定 |
| `public/` | 前端靜態資源 |
| `HANDOFF.md` | 供 Cursor、Codex 等工具使用的目前狀態與後續行動 |
| `docs/superpowers/plans/` | 開發過程中使用的實作計畫 |

## 協作規則

修改程式碼前請先閱讀 `HANDOFF.md`,並在每次開發工作階段結束後更新它。切勿提交 API 金鑰、存取權杖、密碼或真實的 `.env` 檔案。

## 授權條款

SkillCopilot 基於 [MIT 授權條款](LICENSE) 發佈。
