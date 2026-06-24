import { normalizeAuditStatus } from '@/lib/status';
import type {
  ClaimAgentsSnapshot,
  ClaimProcessingAgent,
  ClaimProcessingAgentStep,
  ClaimStatus,
  ClaimSummaryAgent,
  ClaimSummarySnapshot,
  OuterToolInvocation,
  RuleEvaluationDetail,
} from '@/types/execute';

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function normalizeStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((item) => {
      if (typeof item === 'string') {
        const trimmed = item.trim();
        return trimmed ? [trimmed] : [];
      }
      if (item && typeof item === 'object') {
        const obj = item as Record<string, unknown>;
        const text = obj.text ?? obj.summary ?? obj.point ?? obj.description;
        if (typeof text === 'string' && text.trim()) return [text.trim()];
      }
      const str = String(item ?? '').trim();
      return str ? [str] : [];
    });
  }
  if (typeof value === 'string' && value.trim()) {
    return value
      .split(/\n+/)
      .map((line) => line.trim())
      .filter(Boolean);
  }
  return [];
}

function normalizeRunHeader(obj: Record<string, unknown>) {
  return {
    claimId: String(obj.claimId ?? obj.claim_id ?? ''),
    runId: String(obj.runId ?? obj.run_id ?? ''),
    batchId: String(obj.batchId ?? obj.batch_id ?? ''),
    workflowId: String(obj.workflowId ?? obj.workflow_id ?? ''),
    claimStatus: normalizeAuditStatus(String(obj.claimStatus ?? obj.claim_status ?? '')) as ClaimStatus,
    processingTimeMin: Number(obj.processingTimeMin ?? obj.processing_time_min ?? 0),
    startedAt: String(obj.startedAt ?? obj.started_at ?? ''),
    finishedAt: String(obj.finishedAt ?? obj.finished_at ?? ''),
  };
}

export function normalizeSummaryAgent(raw: unknown, index: number): ClaimSummaryAgent {
  const r = asRecord(raw);
  return {
    id: String(r.id ?? r.agent_id ?? r.shape_id ?? `summary-agent-${index}`),
    agentName: String(r.agentName ?? r.agent_name ?? r.name ?? `Agent ${index + 1}`),
    status: normalizeAuditStatus(String(r.status ?? r.claim_status ?? '')) as ClaimStatus,
    processSummary: normalizeStringArray(
      r.processSummary ?? r.process_summary ?? r.summary_points ?? r.summary ?? r.points,
    ),
  };
}

export function normalizeOuterToolInvocation(raw: unknown): OuterToolInvocation {
  const r = asRecord(raw);
  return {
    phase: String(r.phase ?? ''),
    tool: String(r.tool ?? r.tool_name ?? ''),
    status: String(r.status ?? ''),
    durationMs: Number(r.durationMs ?? r.duration_ms ?? 0),
  };
}

export function normalizeClaimSummarySnapshot(payload: unknown): ClaimSummarySnapshot | null {
  if (!payload || typeof payload !== 'object') return null;
  const obj = asRecord(payload);
  const header = normalizeRunHeader(obj);
  const agentsRaw = obj.agents ?? obj.summary_agents;
  const agents = Array.isArray(agentsRaw)
    ? agentsRaw.map((agent, index) => normalizeSummaryAgent(agent, index))
    : [];
  const outerRaw = obj.outerToolInvocations ?? obj.outer_tool_invocations;
  const outerToolInvocations = Array.isArray(outerRaw)
    ? outerRaw.map((row) => normalizeOuterToolInvocation(row))
    : [];

  return {
    ...header,
    agents,
    outerToolInvocations,
    reviewStatus: (obj.reviewStatus ?? obj.review_status) as ClaimSummarySnapshot['reviewStatus'],
    feedback: (obj.feedback ?? null) as string | null,
  };
}

function normalizeAgentStep(raw: unknown, index: number): ClaimProcessingAgentStep {
  const r = asRecord(raw);
  return {
    id: String(r.id ?? r.step_id ?? `step-${index}`),
    name: String(r.name ?? r.step_name ?? `Step ${index + 1}`),
    status: String(r.status ?? ''),
    details: String(r.details ?? r.description ?? ''),
    duration: String(r.duration ?? r.duration_sec ?? r.durationSec ?? ''),
  };
}

function normalizeRuleEvaluation(raw: unknown, index: number): RuleEvaluationDetail {
  const r = asRecord(raw);
  const codesRaw = r.codes;
  return {
    orderIndex: Number(r.orderIndex ?? r.order_index ?? index),
    ruleKey: String(r.ruleKey ?? r.rule_key ?? ''),
    ruleSource: String(r.ruleSource ?? r.rule_source ?? 'decision'),
    condition: String(r.condition ?? ''),
    action: String(r.action ?? ''),
    matched: !!r.matched,
    decisionType: String(r.decisionType ?? r.decision_type ?? ''),
    confidence: Number(r.confidence ?? 0),
    reasoning: String(r.reasoning ?? ''),
    codes: Array.isArray(codesRaw)
      ? (codesRaw.filter((c) => typeof c === 'string') as string[])
      : [],
    llmProvider: String(r.llmProvider ?? r.llm_provider ?? ''),
    llmMs: Number(r.llmMs ?? r.llm_ms ?? 0),
  };
}

export function normalizeProcessingAgent(raw: unknown, index: number): ClaimProcessingAgent {
  const r = asRecord(raw);
  const stepsRaw = r.steps ?? r.step_execution ?? r.stepExecution;
  const evalsRaw = r.evaluations ?? r.rule_evaluations ?? r.ruleEvaluations;
  return {
    id: String(r.id ?? r.agent_id ?? r.shape_id ?? `agent-${index}`),
    agentName: String(r.agentName ?? r.agent_name ?? r.name ?? `Agent ${index + 1}`),
    status: normalizeAuditStatus(String(r.status ?? r.claim_status ?? '')) as ClaimStatus,
    beginTime: String(r.beginTime ?? r.begin_time ?? r.started_at ?? ''),
    endTime: String(r.endTime ?? r.end_time ?? r.ended_at ?? ''),
    durationSec: Number(r.durationSec ?? r.duration_sec ?? 0),
    processSummary: normalizeStringArray(
      r.processSummary ?? r.process_summary ?? r.summary_points ?? r.summary,
    ),
    steps: Array.isArray(stepsRaw)
      ? stepsRaw.map((step, stepIndex) => normalizeAgentStep(step, stepIndex))
      : [],
    evaluations: Array.isArray(evalsRaw)
      ? evalsRaw.map((ev, evIndex) => normalizeRuleEvaluation(ev, evIndex))
      : undefined,
  };
}

export function normalizeClaimAgentsSnapshot(payload: unknown): ClaimAgentsSnapshot | null {
  if (!payload || typeof payload !== 'object') return null;
  const obj = asRecord(payload);
  const header = normalizeRunHeader(obj);
  const agentsRaw = obj.agents;
  const agents = Array.isArray(agentsRaw)
    ? agentsRaw.map((agent, index) => normalizeProcessingAgent(agent, index))
    : [];
  return {
    ...header,
    agents,
    reviewStatus: (obj.reviewStatus ?? obj.review_status) as ClaimAgentsSnapshot['reviewStatus'],
    feedback: (obj.feedback ?? null) as string | null,
  };
}
