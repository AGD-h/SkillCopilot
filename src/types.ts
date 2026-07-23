export type PageId = "dashboard" | "skills" | "agents" | "settings";

export type PhaseStatus = "pending" | "in_progress" | "done";

export type SkillTag = "process" | "recon" | "verification" | "docs";

export interface WorkspaceInfo {
  name: string;
  path: string;
  branch: string;
  gitSummary: string;
  workingTree: string;
  phaseLabel: string;
  phaseFocus: string;
  currentGoal: string;
  nextStep: string;
  nextStepSource: string;
  constraints: string[];
  lastUpdatedLabel: string;
}

export interface TaskPhase {
  id: string;
  name: string;
  status: PhaseStatus;
  summary: string;
}

export interface SkillItem {
  id: string;
  name: string;
  description: string;
  path: string;
  tag: SkillTag;
  trigger: string;
  body: string;
}

export interface AgentItem {
  id: string;
  name: string;
  role: string;
  color: string;
  source: string;
  recommendedUse: string;
  prompt: string;
}

export interface DataSourceItem {
  path: string;
  note: string;
}

export interface ToastState {
  message: string;
  kind: "ok" | "fail";
}

export interface GitStatus {
  branchLine: string;
  branchName: string;
  isClean: boolean;
  aheadBehind: string;
  rawStatus: string;
}

export interface HandoffSummary {
  exists: boolean;
  path: string;
  currentGoal: string[];
  lastKnownNextStep: string[];
  importantConstraints: string[];
  rawExcerpt: string;
  error?: string | null;
}

export interface AgentsSummary {
  exists: boolean;
  path: string;
  excerpt: string;
  error?: string | null;
}

export interface WorkspaceStatus {
  workspaceName: string;
  rootPath: string;
  git: GitStatus;
  handoff: HandoffSummary;
  agents: AgentsSummary;
  fetchedAt: string;
}
