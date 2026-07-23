# SkillCopilot MVP 产品定义（第一版）

状态：Phase 1–4 已实现；Phase 5 SQLite 评估待进行。
日期：2026-07-22
范围：本地桌面应用；Windows 10/11 优先；不引入 SQLite、云同步、账号体系。

---

## 1. Product Positioning

### 一句话定位

SkillCopilot 是本地桌面的「AI 项目主脑 + Skill / Agent 管理器」：帮用户在本地维护项目上下文、交接状态、可复用 Skill、子智能体提示词与多工具协作规则，并推动下一步开发计划。

### 目标用户

- 用 Cursor / Codex / Copilot 等 AI 工具长期推进同一代码仓库的个人开发者或小团队负责人。
- 已习惯用 `HANDOFF.md`、`AGENTS.md`、规则文件、Skill 提示词做跨会话/跨工具协作的人。
- 需要「打开就能知道项目卡在哪、下一步做什么、该用哪个 Agent/Skill」的人。

### 使用场景

1. 新开会话前：打开 SkillCopilot，看当前 Git 状态摘要、`HANDOFF` 下一步、可用 Skill/Agent。
2. 推进一段工作后：对照验收标准，更新交接要点，确认下一步，再切回编辑器/AI 工具继续。
3. 跨工具协作：复制某个 Agent 提示词或 Skill 说明，粘贴到 Cursor / Copilot 等工具中使用。
4. 多项目管理：切换 Workspace，分别查看各仓库的交接与资源（MVP 可先支持「当前绑定一个工作区」）。

### 与同类工具的区别

| 工具类型 | 它们擅长 | SkillCopilot 不做 / 不替代 |
| --- | --- | --- |
| 笔记应用 | 自由写作、知识库 | 不做通用笔记；只管理与 AI 项目推进相关的结构化状态与资源 |
| 代码编辑器 | 写代码、调试 | 不编辑业务代码；不替代 IDE |
| 聊天 / Agent 运行时 | 对话、执行任务 | 不做聊天窗口、不内置模型调用；管理提示词与规则，实际执行仍在外部 AI 工具 |

---

## 2. MVP Goals

### 第一版必须完成

1. 可打开的桌面壳：侧栏导航 + 四个页面（Dashboard / Skills / Agents / Settings）。
2. Dashboard 能展示（先 mock，再接真实数据）：
   - 当前 Workspace 路径与名称
   - Git 分支与工作区是否干净（摘要即可）
   - `HANDOFF` 的「当前目标 / 下一步 / 约束」摘要
   - 建议的下一步行动（来自 Handoff 或 TaskPlan）
3. Skills 页：列表 + 详情查看（名称、路径、摘要、全文只读）。
4. Agents 页：列表 + 详情查看；支持一键复制完整提示词到剪贴板。
5. Settings 页：绑定/切换本地 Workspace 路径；显示「数据来源说明」（文件路径约定，非数据库）。
6. 整条主流程可演示：「打开 → 看状态 → 选 Skill/Agent → 复制 → 确认下一步 → 理解为交接完成」。

### 第一版明确不做

- 聊天 UI、流式对话、内置 LLM 调用
- 云同步、账号登录、多端协作
- Skill / Agent 插件市场或远程安装
- SQLite 或任意本地数据库
- 自动改写仓库业务代码、自动 `git commit` / `push`
- 完整任务看板、甘特图、时间追踪
- macOS 打包与适配（可保留配置兼容，但不作为 MVP 验收项）

---

## 3. Core User Flow

目标：用户从打开应用到完成一次「项目推进交接」。

1. **启动应用**
   打开 SkillCopilot；若已配置 Workspace，进入 Dashboard；否则进入 Settings 绑定本地项目目录。

2. **核对项目状态（Dashboard）**
   阅读：分支、工作区干净与否、`HANDOFF` 当前目标、Last Known Next Step、关键约束（如「不写 SQLite」）。

3. **选择推进资源**
   - 需要可复用能力 → Skills：打开对应 Skill，阅读触发条件与步骤。
   - 需要特定角色提示词 → Agents：打开对应 Agent，复制提示词到剪贴板。

4. **在外部工具执行**
   用户切换到 Cursor / 终端 / 其他 AI 工具，粘贴提示词或按 Skill 执行实际开发；SkillCopilot 不代替执行。

5. **回到 SkillCopilot 做交接确认（Dashboard）**
   对照 TaskPlan / 验收要点勾选「本轮已完成项」（MVP 可用只读清单 + 手动备注区，或仅展示下一步文案）。
   用户明确知道：下一会话应先读什么、先做什么。

6. **结束本轮**
   真正写入 `HANDOFF.md` 可由用户在编辑器完成；MVP Phase 2+ 再考虑「从应用写回 HANDOFF」——第一版静态壳只要求流程可演示，不要求写回文件。

---

## 4. Information Architecture

### 4.1 Dashboard

- **目的**：一眼看清「这个项目现在怎样、下一步做什么」。
- **主要信息**：
  - Workspace 名称与路径
  - Git：分支、ahead/behind 简要、是否有未提交改动
  - Handoff 摘要：Current Goal、Last Known Next Step、Important Constraints（截取）
  - TaskPlan：当前阶段与未完成条目（可 mock）
- **主要操作**：刷新状态（Phase 2+）；跳转到 Skills / Agents；复制「下一步」文案。
- **暂不做**：在 Dashboard 内直接编辑 HANDOFF；复杂 diff 视图；提交/推送按钮。

### 4.2 Skills

- **目的**：浏览与阅读可复用 AI Skill（本地文件）。
- **主要信息**：Skill 名称、相对路径、简短描述、触发场景、正文（Markdown 只读）。
- **主要操作**：搜索/过滤列表；打开详情；复制 Skill 路径或正文。
- **暂不做**：在线安装、版本市场、可视化 Skill 编辑器、运行 Skill 工作流引擎。

### 4.3 Agents

- **目的**：管理子智能体角色提示词与协作规则入口。
- **主要信息**：Agent 名称、职责一句话、来源文件路径、完整提示词正文。
- **主要操作**：列表筛选；打开详情；一键复制提示词。
- **暂不做**：自动派发多 Agent、并行编排、Agent 运行日志、远程共享。

### 4.4 Settings

- **目的**：绑定 Workspace，说明本地文件约定；切换界面语言。
- **主要信息**：当前 Workspace 路径；约定扫描路径（如 `HANDOFF.md`、`AGENTS.md`、`.cursor/rules/`、skills 目录）；界面语言（zh-CN / en / zh-TW）；应用版本/平台信息（可选）。
- **主要操作**：选择文件夹；保存绑定；切换界面语言（立即生效、记住选择）；打开资源管理器定位到 Workspace（可选）。
- **暂不做**：主题商店、账号、云配置、全局加密密钥管理；本地文件/提示词的自动翻译。

### 4.5 界面语言（Phase 3.5）

- **支持 Locale**：`zh-CN`（简体中文）、`en`（English）、`zh-TW`（繁體中文）。
- **首次启动**：跟随系统语言（`navigator.languages` / `navigator.language`）；`zh-TW` / `zh-HK` / `zh-MO` / `zh-Hant` → 繁体；其他 `zh*` → 简体；其余 → English；API 不可用时默认 `zh-CN`。
- **持久化**：用户主动选择后写入 `localStorage` key `skillcopilot.locale`；之后优先使用已保存值。
- **翻译边界**：仅翻译 SkillCopilot 界面框架与应用自有状态文案；`HANDOFF.md`、`AGENTS.md`、Git 输出、Skill/Agent 源文件正文与路径保持原文，不做自动翻译。
- **行为约束**：切换语言不重置当前页面、搜索词、选中项，不重新触发 Tauri 读取/扫描；`document.documentElement.lang` 与当前 Locale 同步；品牌名 `SkillCopilot` 不翻译。

---

## 5. Data Model Draft

仅概念模型。MVP 前几阶段用 TypeScript 类型 + mock JSON / 读本地文件表示；**不引入 SQLite**。

### Workspace

- `id`：本地稳定标识（可用路径 hash，实现时再定）
- `name`：显示名（默认可取目录名）
- `rootPath`：绝对路径
- `handoffPath`：相对路径，默认 `HANDOFF.md`
- `agentsPath`：相对路径，默认 `AGENTS.md`
- `skillRoots`：相对路径列表（例如用户 Cursor skills、仓库内 `docs/` 下约定目录——具体列表在 Open Questions 收口）
- `agentRoots`：相对路径列表（例如 `.cursor/rules/`、`.github/copilot-instructions.md`）

### Skill

- `id`
- `workspaceId`
- `name`
- `sourcePath`：相对 Workspace 的路径
- `summary`：短描述（可从 frontmatter 或首段提取）
- `body`：全文 Markdown
- `updatedAt`：文件 mtime（Phase 3）

### Agent

- `id`
- `workspaceId`
- `name`
- `role`：一句话职责
- `sourcePath`
- `promptBody`：可复制的完整提示词
- `updatedAt`

### Handoff

- `workspaceId`
- `rawMarkdown`：原文（或分段缓存）
- `currentGoal`：解析或截取
- `lastKnownNextStep`
- `constraints`：要点列表
- `sourcePath`
- `fetchedAt`

### TaskPlan

- `id`
- `workspaceId`
- `title`：例如「MVP Phase 1」
- `phases`：有序阶段列表
- 每个 phase：`name`、`status`（pending / in_progress / done）、`items[]`（文本验收项）
- 来源：MVP 早期可为应用内 mock 或 `docs/product/` 下静态文档解析；**不强制**单独数据库表

关系（概念）：

```
Workspace 1—* Skill
Workspace 1—* Agent
Workspace 1—1 Handoff（当前以单文件为主）
Workspace 1—* TaskPlan
```

---

## 6. Implementation Phases

### Phase 1：前端静态壳和 mock 数据

- 替换官方模板示例 UI。
- 实现四页导航与布局。
- 用本地 mock 填充 Dashboard / Skills / Agents / Settings。
- 验收：`pnpm build` 通过；`pnpm tauri dev` 可打开并浏览四页。
- **不**加 SQLite；**不**接真实文件读取。

### Phase 2：Tauri 读取本地 HANDOFF / AGENTS / Git 状态

- Rust 命令：读指定 Workspace 下 `HANDOFF.md`、`AGENTS.md` 文本。
- 调用或封装 `git status --short --branch`（及必要的只读 git 信息）。
- Dashboard 展示真实摘要；失败时给出可读错误（路径不存在、非 git 仓库等）。
- 验收：绑定本仓库后，Dashboard 与磁盘/`git status` 一致。

### Phase 3：本地 Skill 文件扫描与查看

- 按 Settings 中的 `skillRoots` 扫描 `SKILL.md` 或约定命名。
- Skills 列表与只读详情；显示路径与 mtime。
- 验收：本机已有 Cursor skills 或仓库内示例可被列出并打开。

### Phase 3.5：三语言界面（zh-CN / en / zh-TW）

- 无新依赖的轻量 i18n：本地词典 + React Context Provider。
- Settings 提供三段式语言切换；首次跟随系统，之后记住用户选择。
- 界面文案三语言齐全；本地项目文件与提示词保持原文。
- 验收：三种语言可即时切换；刷新后记住选择；切换不重置 Skills/Agents 状态；`pnpm build` 通过；缺 key 时 TypeScript 编译失败。

### Phase 4：Agent 配置管理与复制

- 扫描 `agentRoots`（规则文件、copilot-instructions 等）映射为 Agent 条目。
- 详情页 + 剪贴板复制。
- 一份源文件对应一个 Agent 条目；本阶段只读，不提供本地覆盖配置。
- 验收：复制后粘贴到外部编辑器内容完整正确。

### Phase 5：再评估是否引入 SQLite

- 仅当出现以下真实需求再引入：跨文件索引性能不足、需要复杂查询/历史版本、本地覆盖配置膨胀难维护。
- 评估产出：书面结论（继续纯文件 vs 引入 SQLite）+ 若引入则最小 schema。
- 在此之前禁止「为了以后方便」提前加数据库。

---

## 7. Acceptance Criteria

MVP（完成 Phase 1–4，Phase 5 仅需评估结论）应能验证：

1. **壳可用**：Windows 上 `pnpm tauri dev` 打开应用，四页可导航，无官方模板「Hello」示例残留。
2. **状态可信**：对 `E:\SkillCopilot`（或用户绑定的仓库），Dashboard 显示的分支/脏状态与终端 `git status --short --branch` 一致；Handoff 摘要来自真实 `HANDOFF.md`。
3. **Skill 可读**：至少一个本地 Skill 可在列表中打开并阅读全文。
4. **Agent 可复制**：至少一个 Agent 提示词可一键复制，粘贴内容与源文件一致。
5. **无越界**：依赖中无 SQLite；无云同步/登录相关功能；应用不自动提交或推送 Git。
6. **交接可演示**：按第 3 节流程走完一轮后，用户能说出「当前下一步」且与 Handoff 一致。
7. **文档同步**：`HANDOFF.md` 的 Last Known Next Step 反映真实进度；本文件路径保持有效。
8. **三语言界面**：Settings 可在 zh-CN / en / zh-TW 间切换；刷新后记住选择；本地文件与提示词仍显示原文；切换语言不重置页面状态或重新扫描。

Phase 1 单独可提前验收：仅 mock 数据下四页可浏览 + `pnpm build` 通过。

---

## 8. Open Questions

以下问题会直接影响实现，需在 Phase 1–2 开工前或开工早期拍板：

1. **Skill 扫描根目录默认值是什么？**
   仅仓库内路径，还是同时包含用户级 Cursor skills 目录（如 `%USERPROFILE%\.cursor\skills-cursor`）？

2. **Agent 的权威来源如何映射？**
   **已决策（Phase 4）**：一个源文件对应一个 Agent 条目；`AGENTS.md` = `project`，Cursor `.mdc` 每文件一条 = `cursor`，`copilot-instructions.md` = `copilot`；各文件原文互不合并。

3. **Handoff 是否解析结构化字段？**
   MVP 用标题截取（`## Last Known Next Step`）是否足够，还是需要 frontmatter / 固定章节协议？

4. **TaskPlan 的权威文件在哪？**
   继续用 `docs/product/mvp-definition.md` 的阶段列表 mock，还是单独 `docs/product/task-plan.md`？

5. **应用是否要在 MVP 内写回 `HANDOFF.md`？**
   当前定义倾向「MVP 只读 + 用户在编辑器更新」；若需要应用内写回，权限与冲突策略要另开一小阶段。
