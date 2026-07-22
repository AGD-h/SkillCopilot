# SkillCopilot

[English](README.md) | 简体中文 | [繁體中文](README.zh-TW.md)

SkillCopilot 是一款开源桌面应用,优先支持 Windows 10/11,后续将支持 macOS。

本仓库目前仅包含经过验证的应用脚手架,产品功能与 SQLite 集成尚未开始。

## 技术栈

- Tauri 2
- React 与 TypeScript
- Rust stable
- Vite
- pnpm

## Windows 前置要求

请使用 Windows 原生的 PowerShell 或命令提示符进行 Windows 桌面开发,不要在 WSL 中构建 Windows 版 Tauri 应用。

所需工具:

- Node.js `24.18.0`(见 `.node-version`)
- pnpm `11.15.1`(见 `package.json`)
- Rust stable,主机目标为 `x86_64-pc-windows-msvc`
- Visual Studio 2022 生成工具(含"使用 C++ 的桌面开发"工作负载)
- Windows SDK 与 Microsoft Edge WebView2 运行时

安装工具后请打开一个新的终端。在 Windows 上确认 Rust 使用的是 MSVC:

```powershell
rustup show active-toolchain
```

输出结果应包含 `stable-x86_64-pc-windows-msvc`。

## 快速开始

在项目根目录运行以下命令:

```powershell
pnpm install
pnpm tauri dev
```

`pnpm tauri dev` 会启动 Vite 前端、编译 Rust 后端并打开桌面窗口。

## 常用命令

| 命令 | 用途 |
| --- | --- |
| `pnpm dev` | 仅启动 Vite 前端 |
| `pnpm build` | 类型检查并构建前端 |
| `pnpm tauri dev` | 以开发模式运行桌面应用 |
| `pnpm tauri info` | 显示 Tauri 与系统工具链信息 |
| `pnpm tauri build` | 构建前端、Rust 二进制文件与桌面安装包 |

## 项目结构

| 路径 | 用途 |
| --- | --- |
| `src/` | React 与 TypeScript 前端 |
| `src-tauri/` | Rust 后端与 Tauri 配置 |
| `public/` | 前端静态资源 |
| `HANDOFF.md` | 供 Cursor、Codex 等工具使用的当前状态与后续行动 |
| `docs/superpowers/plans/` | 开发过程中使用的实施计划 |

## 协作规则

修改代码前请先阅读 `HANDOFF.md`,并在每次开发会话结束后更新它。切勿提交 API 密钥、访问令牌、密码或真实的 `.env` 文件。

## 许可证

SkillCopilot 基于 [MIT 许可证](LICENSE) 发布。
