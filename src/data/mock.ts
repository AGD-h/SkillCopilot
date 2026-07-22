import type {
  AgentItem,
  DataSourceItem,
  SkillItem,
  TaskPhase,
  WorkspaceInfo,
} from "../types";

export const mockWorkspace: WorkspaceInfo = {
  name: "SkillCopilot",
  path: "E:\\SkillCopilot",
  branch: "main",
  gitSummary: "main · synced",
  workingTree: "Working tree clean",
  phaseLabel: "MVP Phase 1 complete",
  phaseFocus: "UI polish · mock data",
  currentGoal: "本地桌面 AI 项目主脑 + Skill / Agent 管理器",
  nextStep:
    "Phase 2：实现 Tauri 只读读取 HANDOFF.md / AGENTS.md / git status，并让 Dashboard 使用真实数据。",
  nextStepSource: "HANDOFF.md / docs/product/mvp-definition.md（mock）",
  constraints: [
    "不添加 SQLite",
    "不实现聊天 UI",
    "不接云同步",
    "不自动 commit / push 业务代码",
  ],
  lastUpdatedLabel: "2026-07-22 20:13（mock）",
};

export const mockPhases: TaskPhase[] = [
  {
    id: "p1",
    name: "Phase 1",
    status: "done",
    summary: "前端静态壳与 mock 数据",
  },
  {
    id: "p2",
    name: "Phase 2",
    status: "pending",
    summary: "只读 HANDOFF / AGENTS / git status",
  },
  {
    id: "p3",
    name: "Phase 3",
    status: "pending",
    summary: "扫描本地 Skills",
  },
  {
    id: "p4",
    name: "Phase 4",
    status: "pending",
    summary: "管理 Agents 与复制提示词",
  },
  {
    id: "p5",
    name: "Phase 5",
    status: "pending",
    summary: "再评估是否引入 SQLite",
  },
];

export const mockSkills: SkillItem[] = [
  {
    id: "codebase-recon",
    name: "codebase-recon",
    description: "快速理解代码库结构和入口",
    path: "C:\\Users\\asus\\.codex\\skills\\codebase-recon\\SKILL.md",
    tag: "recon",
    trigger: "需要快速摸清仓库布局、入口文件或模块边界时。",
    body: `# codebase-recon

用针对性脚本与定向阅读理解代码库，避免盲目通读。

## 步骤
1. 先定位包管理与入口（package.json、src/main、src-tauri）。
2. 用搜索找出关键符号与路由。
3. 输出结构摘要与下一步建议。
`,
  },
  {
    id: "brainstorming",
    name: "superpowers:brainstorming",
    description: "在实现前澄清需求并形成设计",
    path: "C:\\Users\\asus\\.codex\\plugins\\cache\\openai-curated-remote\\superpowers\\6.1.1\\skills\\brainstorming\\SKILL.md",
    tag: "process",
    trigger: "开始新功能、改行为或做创意设计之前。",
    body: `# brainstorming

在写代码前先澄清意图、约束与成功标准，再给出 2–3 种方案与推荐设计。

## 原则
- 一次只问一个关键问题
- 用户批准设计后再实现
- 避免过度工程
`,
  },
  {
    id: "verification-before-completion",
    name: "superpowers:verification-before-completion",
    description: "完成前进行验证，避免未验证就宣称完成",
    path: "C:\\Users\\asus\\.codex\\plugins\\cache\\openai-curated-remote\\superpowers\\6.1.1\\skills\\verification-before-completion\\SKILL.md",
    tag: "verification",
    trigger: "准备宣称完成、提交或创建 PR 之前。",
    body: `# verification-before-completion

在宣称完成前运行约定验证命令，并明确写出哪些未验证。

## 对本项目
- 前端：pnpm build
- Tauri/Rust：视情况 pnpm tauri info / build
`,
  },
  {
    id: "docs-handoff-keeper",
    name: "docs-handoff-keeper",
    description: "维护项目交接文档和跨工具规则",
    path: "AGENTS.md / HANDOFF.md",
    tag: "docs",
    trigger: "会话结束、阶段切换或跨 AI 工具交接时。",
    body: `# docs-handoff-keeper

维护 HANDOFF.md 与跨工具规则文件，保证下一会话能接上。

## 检查清单
1. git status --short --branch
2. 更新 Last Known Next Step
3. 记录验证证据与未验证项
`,
  },
];

export const mockAgents: AgentItem[] = [
  {
    id: "project-planner",
    name: "project-planner",
    role: "把目标拆成可执行阶段与验收标准",
    color: "#D97706",
    source: "generated / AGENTS.md",
    recommendedUse: "开新阶段、写产品定义或实施计划时。",
    prompt: `你是 SkillCopilot 的 project-planner 子智能体。

职责：在实现前澄清范围，产出具体、可验证的阶段与验收标准。
约束：遵守 HANDOFF.md；不添加 SQLite；不做云同步/账号；改动保持小而可验证。
输出：定位、目标、非目标、阶段、验收、开放问题。`,
  },
  {
    id: "frontend-builder",
    name: "frontend-builder",
    role: "实现桌面前端壳、页面与交互",
    color: "#0891B2",
    source: "generated / mvp-definition.md",
    recommendedUse: "替换模板 UI、做 Dashboard/Skills/Agents/Settings。",
    prompt: `你是 SkillCopilot 的 frontend-builder 子智能体。

职责：用 React + TypeScript + CSS 实现清晰的桌面工作台界面。
约束：不加 UI 框架；不接真实文件系统；不改 Rust；不加 SQLite。
验证：pnpm build 必须通过。`,
  },
  {
    id: "tauri-rust-engineer",
    name: "tauri-rust-engineer",
    role: "实现安全的本地只读 Tauri/Rust 能力",
    color: "#2563EB",
    source: "generated / Phase 2 plan",
    recommendedUse: "Phase 2+ 读取本地文件与 git 状态时。",
    prompt: `你是 SkillCopilot 的 tauri-rust-engineer 子智能体。

职责：用 Tauri 2 + Rust 提供最小、安全的本地只读命令。
约束：Windows 原生构建；不写密钥；不自动 git write；SQLite 延后到 Phase 5 评估。`,
  },
  {
    id: "code-reviewer",
    name: "code-reviewer",
    role: "审查正确性、边界与可维护性",
    color: "#DB2777",
    source: "generated",
    recommendedUse: "提交或合并前做缺陷优先审查。",
    prompt: `你是 SkillCopilot 的 code-reviewer 子智能体。

职责：缺陷优先审查，关注回归、边界、安全与范围蔓延。
约束：不重写无关代码；不引入新依赖除非必要。`,
  },
  {
    id: "docs-handoff-keeper",
    name: "docs-handoff-keeper",
    role: "维护 HANDOFF 与跨工具协作规则",
    color: "#16A34A",
    source: "AGENTS.md / HANDOFF.md",
    recommendedUse: "有意义工作结束后更新交接状态。",
    prompt: `你是 SkillCopilot 的 docs-handoff-keeper 子智能体。

职责：保持 HANDOFF.md、AGENTS.md 与跨工具规则一致。
约束：不暴露密钥；不覆盖用户改动；记录验证与未验证项。`,
  },
  {
    id: "verification-runner",
    name: "verification-runner",
    role: "运行约定验证并报告结果",
    color: "#7C3AED",
    source: "generated / AGENTS.md",
    recommendedUse: "构建、diff check、推送前后核对。",
    prompt: `你是 SkillCopilot 的 verification-runner 子智能体。

职责：按 AGENTS.md 运行验证命令并报告通过/失败与未跑项。
对本项目：pnpm build；需要时 git diff --check、git status；不擅自 push Phase 提交除非用户要求。`,
  },
];

export const mockDataSources: DataSourceItem[] = [
  { path: "HANDOFF.md", note: "项目交接状态与下一步" },
  { path: "AGENTS.md", note: "跨工具会话启动规则" },
  { path: "docs/product/mvp-definition.md", note: "MVP 产品定义" },
  { path: ".cursor/rules/", note: "Cursor 主脑规则" },
  { path: ".github/copilot-instructions.md", note: "GitHub Copilot 说明" },
];

export const mockPhaseGates: string[] = [
  "Phase 1：使用 mock 数据",
  "Phase 2：读取本地 HANDOFF / AGENTS / Git 状态",
  "Phase 3：扫描 Skills",
  "Phase 4：管理 Agents",
  "Phase 5：再评估 SQLite",
];

export const mockSafetyBoundaries: string[] = [
  "No cloud sync",
  "No account",
  "No database",
  "No automatic git writes",
];
