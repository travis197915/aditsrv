export type BatchEventType =
  | 'batch_start'
  | 'claim_start'
  | 'shape_start'
  | 'shape_complete'
  | 'rule_evaluated'
  | 'tool_invoked'
  | 'stage'
  | 'agent_log'
  | 'claim'
  | 'summary'
  | 'error'
  | 'message';

export type BatchStatus = 'IDLE' | 'RUNNING' | 'DONE' | 'ERROR';

export type ClaimStatus = 'MET' | 'NOT_MET' | 'INCONCLUSIVE' | 'DEFECT';

export interface Workflow {
  id: string;
  name: string;
  [key: string]: unknown;
}

export interface RunSummary {
  id?: string;
  run_id?: string;
  runId?: string;
  claim_id?: string;
  claimId?: string;
  status?: string;
  claim_status?: string;
  run_status?: string;
  processing_time_min?: number;
  transaction_time_min?: number;
  finished_at?: string;
  [key: string]: unknown;
}

export interface AsyncBatchResponse {
  batch_id: string;
  status: 'RUNNING';
  stream_url: string;
}

export interface BatchDetail extends AsyncBatchResponse {
  runs?: RunSummary[];
  [key: string]: unknown;
}

export interface RunDetail {
  id?: string;
  run_id?: string;
  claim_id?: string;
  status?: string;
  evaluations?: unknown[];
  tool_invocations?: unknown[];
  [key: string]: unknown;
}

export interface RunNodesPayload {
  run_id?: string;
  nodes?: unknown[];
  outer_tool_invocations?: unknown[];
  [key: string]: unknown;
}

export interface BatchEvent {
  type: BatchEventType;
  data: unknown;
}

export interface ClaimEventPayload {
  claim_id?: string;
  run_id?: string;
  status?: string;
  [key: string]: unknown;
}

export interface ClaimProcessingAgentStep {
  id: string;
  name: string;
  status: string;
  duration: string;
  details: string;
}

export interface RuleEvaluationDetail {
  orderIndex: number;
  ruleKey: string;
  ruleSource: string;
  condition: string;
  action: string;
  matched: boolean;
  decisionType: string;
  confidence: number;
  reasoning: string;
  codes: string[];
  llmProvider: string;
  llmMs: number;
}

export interface ClaimProcessingAgent {
  id: string;
  agentName: string;
  status: ClaimStatus;
  beginTime: string;
  endTime: string;
  durationSec: number;
  processSummary: string[];
  steps: ClaimProcessingAgentStep[];
  evaluations?: RuleEvaluationDetail[];
}

export interface OuterToolInvocation {
  phase: string;
  tool: string;
  status: string;
  durationMs: number;
}

export interface ClaimProcessingSnapshot {
  claimId: string;
  runId: string;
  batchId: string;
  workflowId: string;
  claimStatus: ClaimStatus;
  processingTimeMin: number;
  startedAt: string;
  finishedAt: string;
  agents: ClaimProcessingAgent[];
  outerToolInvocations: OuterToolInvocation[];
  reviewStatus: null;
  feedback: null;
}
