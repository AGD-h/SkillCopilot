import type { TranslateFn } from "../i18n/I18nProvider";
import type {
  AgentItem,
  DataSourceItem,
  SkillItem,
  TaskPhase,
  WorkspaceInfo,
} from "../types";

export function createMockWorkspace(t: TranslateFn): WorkspaceInfo {
  return {
    name: "SkillCopilot",
    path: "E:\\SkillCopilot",
    branch: "main",
    gitSummary: t("dashboard.mockGitSummary"),
    workingTree: t("dashboard.mockWorkingTree"),
    phaseLabel: t("dashboard.mockPhaseLabel"),
    phaseFocus: t("dashboard.mockPhaseFocus"),
    currentGoal: t("dashboard.mockCurrentGoal"),
    nextStep: t("dashboard.mockNextStep"),
    nextStepSource: t("dashboard.mockNextStepSource"),
    constraints: [
      t("dashboard.mockConstraint.1"),
      t("dashboard.mockConstraint.2"),
      t("dashboard.mockConstraint.3"),
      t("dashboard.mockConstraint.4"),
    ],
    lastUpdatedLabel: t("dashboard.mockUpdated"),
  };
}

export function createMockPhases(t: TranslateFn): TaskPhase[] {
  return [
    {
      id: "p1",
      name: t("phase.name.1"),
      status: "done",
      summary: t("phase.summary.1"),
    },
    {
      id: "p2",
      name: t("phase.name.2"),
      status: "done",
      summary: t("phase.summary.2"),
    },
    {
      id: "p3",
      name: t("phase.name.3"),
      status: "done",
      summary: t("phase.summary.3"),
    },
    {
      id: "p4",
      name: t("phase.name.4"),
      status: "done",
      summary: t("phase.summary.4"),
    },
    {
      id: "p5",
      name: t("phase.name.5"),
      status: "pending",
      summary: t("phase.summary.5"),
    },
  ];
}

/** Source-file-like mock Skills — keep original content language. */
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

/** Source-file-like mock Agents — keep original content language. */
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
约束：不加 UI 框架；通过现有 Tauri API 读取本地数据；不加 SQLite。
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

export function createMockDataSources(t: TranslateFn): DataSourceItem[] {
  return [
    {
      path: "HANDOFF.md",
      note: t("settings.source.handoff"),
      status: "real",
    },
    {
      path: "AGENTS.md",
      note: t("settings.source.agents"),
      status: "real",
    },
    {
      path: "git status --short --branch",
      note: t("settings.source.git"),
      status: "real",
    },
    {
      path: "<workspace>\\.agents\\skills",
      note: t("settings.source.agentsSkills"),
      status: "real",
    },
    {
      path: "<workspace>\\.cursor\\skills",
      note: t("settings.source.cursorSkills"),
      status: "real",
    },
    {
      path: "%USERPROFILE%\\.codex\\skills",
      note: t("settings.source.codexUser"),
      status: "real",
    },
    {
      path: "%USERPROFILE%\\.cursor\\skills",
      note: t("settings.source.cursorUser"),
      status: "real",
    },
    {
      path: ".cursor/rules/",
      note: t("settings.source.cursorRules"),
      status: "real",
    },
    {
      path: ".github/copilot-instructions.md",
      note: t("settings.source.copilot"),
      status: "real",
    },
    {
      path: "docs/product/mvp-definition.md",
      note: t("settings.source.mvp"),
      status: "planned",
    },
  ];
}

export function createMockPhaseGates(t: TranslateFn): string[] {
  return [
    t("settings.gate.1"),
    t("settings.gate.2"),
    t("settings.gate.3"),
    t("settings.gate.4"),
    t("settings.gate.5"),
  ];
}

export function createMockSafetyBoundaries(t: TranslateFn): string[] {
  return [
    t("settings.safety.1"),
    t("settings.safety.2"),
    t("settings.safety.3"),
    t("settings.safety.4"),
  ];
}

/** Stable workspace path/name for wiring that must not depend on locale. */
export const WORKSPACE_ROOT_PATH = "E:\\SkillCopilot";
export const WORKSPACE_NAME = "SkillCopilot";
export const WORKSPACE_BRANCH = "main";
