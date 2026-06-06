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

export type ClaimStatus = 'CLEAN' | 'DEFECT' | 'INCONCLUSIVE';

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

export interface TraceCondition {
  condition: string;
  evaluated: boolean;
  using_fields?: string[];
  values?: Record<string, unknown>;
}

export interface TraceSubruleResult {
  subrule_id: string;
  status: string;
  conditions: TraceCondition[];
}

export interface ClaimTraceStep {
  timestamp?: string;
  claim_id?: string;
  execution_id?: string;
  agent_name: string;
  shape_id?: string;
  sop_name?: string;
  sop_step_number?: number | string | null;
  sop_step_name?: string;
  sop_rule_id?: string;
  sop_step_description?: string;
  sop_action?: string;
  status: string;
  rationale?: string;
  evidence_refs?: string[];
  started_at?: string;
  ended_at?: string;
  transaction_time_sec?: number;
  tools_used?: string[];
  tools_succeeded?: string[];
  tools_failed?: string[];
  tools_skipped?: string[];
  decision_type?: string;
  codes?: string[];
  subrule_results?: TraceSubruleResult[];
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
