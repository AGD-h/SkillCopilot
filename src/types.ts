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
