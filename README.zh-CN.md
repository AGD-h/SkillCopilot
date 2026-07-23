# SkillCopilot

[English](README.md) | 简体中文 | [繁體中文](README.zh-TW.md)

SkillCopilot 是本地优先的桌面应用，用于 AI 项目交接与 Skill / Agent 管理：查看当前 Git 与 HANDOFF 状态，浏览可复用 Skill，并把 Agent 提示词复制到 Cursor、Copilot 等工具中使用。

优先支持 Windows 10/11；配置保留后续 macOS 兼容，但尚未完成正式验证。

## 当前 MVP 已实现

- **仪表盘**：只读读取绑定工作区的 HANDOFF.md、AGENTS.md 与 Git 状态
- **Skills**：扫描本地 `SKILL.md`，搜索、只读详情、复制路径/正文
- **Agents**：扫描项目 Agent 配置（`AGENTS.md`、Cursor `.mdc`、Copilot 指令），搜索、只读详情、复制提示词
- **Workspace 选择**：系统原生文件夹对话框；路径记忆在 `localStorage`（`skillcopilot.workspaceRoot`）
- **界面语言**：简体中文 / English / 繁體中文（源文件保持原文，不做自动翻译）

## 本地优先与隐私

- 不上传项目内容
- 不执行所选工作区中的脚本
- 不修改扫描到的 Skill / Agent 源文件
- 当前无模型 API、无遥测、无账号体系
- 明确不引入 SQLite，见 `docs/architecture/sqlite-evaluation.md`

## Workspace 与 Skill 来源

**绑定工作区后：**

- `HANDOFF.md`、`AGENTS.md`、Git 状态
- 工作区 Skill 根（如 `.agents/skills`、`.cursor/skills`）
- Agent 来源：`AGENTS.md`、`.cursor/rules/**/*.mdc`、`.github/copilot-instructions.md`

**用户级 Skill 根（Skills 页一并扫描）：**

- `%USERPROFILE%\.codex\skills`
- `%USERPROFILE%\.cursor\skills`

## 使用方式

1. 打开 SkillCopilot
2. 选择本地项目文件夹
3. 在仪表盘核对状态，在 Skills / Agents 中浏览并复制所需内容
4. 在设置中更换或忘记 Workspace，并切换界面语言

“忘记 Workspace”只清除本机偏好，不会删除项目目录中的任何文件。

## 技术栈

- Tauri 2
- React 与 TypeScript
- Rust stable
- Vite
- pnpm

## Windows 开发

请使用 Windows 原生 PowerShell 或命令提示符，不要用 WSL 作为 Windows Tauri 主构建环境。

所需工具：

- Node.js `24.18.0`（见 `.node-version`）
- pnpm `11.15.1`（见 `package.json`）
- Rust stable，`x86_64-pc-windows-msvc`
- Visual Studio 2022 生成工具（含 C++ 桌面开发）
- Windows SDK 与 Microsoft Edge WebView2 运行时

```powershell
pnpm install
pnpm tauri dev
```

| 命令 | 用途 |
| --- | --- |
| `pnpm dev` | 仅前端 Vite |
| `pnpm build` | 前端类型检查与构建 |
| `pnpm tauri dev` | 桌面开发模式 |
| `pnpm tauri info` | 工具链信息 |
| `pnpm tauri build` | 生产二进制与 Windows 安装包 |

## 安装包说明

待 GitHub Releases 发布 v0.1.0 后，从该页面下载 MSI 或 NSIS。在此之前请用 `pnpm tauri build` 本地生成。

当前安装包**未经商业代码签名**，首次运行可能出现 Windows SmartScreen 提示。这是 Release Candidate 的预期情况，不代表已通过安全认证。

## 当前限制

- Windows 10/11 优先；macOS 未正式验收
- 应用内不能编辑或写回 HANDOFF / Skill / Agent 文件
- 无 SQLite、无云同步、无聊天 UI、无市场
- 原生文件夹选择需要桌面应用，纯浏览器 Vite 预览不可用

## 项目结构

| 路径 | 说明 |
| --- | --- |
| `src/` | React / TypeScript 前端 |
| `src-tauri/` | Rust 后端与 Tauri 配置 |
| `docs/product/mvp-definition.md` | MVP 产品定义 |
| `docs/architecture/sqlite-evaluation.md` | Phase 5 SQLite 评估（未引入） |
| `docs/release/` | Release Candidate 清单与草稿 |
| `HANDOFF.md` | 协作交接状态 |
| `CHANGELOG.md` | 版本记录 |

## 协作

改代码前先读 `HANDOFF.md` 与 `AGENTS.md`。保持小范围变更。不要提交 API key、token、密码或真实 `.env`。

## 许可证

SkillCopilot 以 [MIT License](LICENSE) 发布。
