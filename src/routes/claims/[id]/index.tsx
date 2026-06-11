import { useEffect, useMemo, useState } from 'react';
import { useLocation, useParams, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, ChevronUp, Clock, Check, X, Loader2 } from 'lucide-react';
import TopNavLayout from '@/layouts/TopNavLayout';
import { AiStatusChip } from '@/components/StatusChip';
import { getClaimAgents, getClaimSummary, getClaimTrace } from '@/lib/execute';
import { processFor } from '@/lib/process';
import { aggregateTraceAudit } from '@/lib/status';
import { useLiveClaimRun, liveShapeToAgent } from '@/lib/useLiveClaimRun';
import type {
  ClaimProcessingAgent,
  ClaimStatus,
  ClaimSummaryAgent,
  ClaimTraceStep,
} from '@/types/execute';
import { useAuth } from '@/contexts/AuthContext';
import { getToken } from '@/utils/auth';

const ORANGE = '#FF612B';

/** Rule-level verdict chip: shows the SOP rule outcome in the auditor's native
 *  vocabulary (Met / Not-Met / Inconclusive), distinct from the rolled-up
 *  CLEAN/DEFECT/INCONCLUSIVE audit chip used on agents and the claim header. */
function TraceStatusChip({ status }: { status: string }) {
  const s = (status || '').trim().toLowerCase().replace(/[\s_]+/g, '-');
  const isMet = ['met', 'clean', 'pass', 'passed', 'allow'].includes(s);
  const isNotMet = [
    'not-met', 'notmet', 'defect', 'fail', 'failed', 'deny', 'stop', 'refer', 'pend',
  ].includes(s);
  const cls = isMet
    ? 'bg-emerald-100 text-emerald-800'
    : isNotMet
      ? 'bg-red-100 text-red-700'
      : 'bg-amber-100 text-amber-800';
  const label = isMet ? 'Met' : isNotMet ? 'Not-Met' : 'Inconclusive';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded ${cls}`}>
      {label}
    </span>
  );
}

function TraceStepCard({ ts, index }: { ts: ClaimTraceStep; index: number }) {
  return (
    <div className="border border-[#e8ddd4] bg-[#fafafa] rounded p-3">
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <span className="text-xs font-mono text-gray-500">
          {ts.sop_rule_id || ts.sop_step_name || `Step ${ts.sop_step_number ?? index + 1}`}
        </span>
        <TraceStatusChip status={ts.status} />
        {ts.sop_name ? (
          <span className="text-xs text-gray-500">Process: {processFor(ts.sop_name).label}</span>
        ) : null}
        {typeof ts.transaction_time_sec === 'number' ? (
          <span className="inline-flex items-center gap-1 text-xs text-gray-400 ml-auto">
            <Clock className="h-3 w-3" />
            {ts.transaction_time_sec}s
          </span>
        ) : null}
      </div>
      {ts.sop_step_description ? (
        <p className="text-xs text-gray-700 mb-2">{ts.sop_step_description}</p>
      ) : null}
      {ts.sop_action ? (
        <div className="mb-2">
          <span className="text-xs font-semibold text-gray-600">Action: </span>
          <span className="text-xs text-gray-800">{ts.sop_action}</span>
        </div>
      ) : null}
      {(ts.tools_used?.length ?? 0) > 0 || (ts.tools_skipped?.length ?? 0) > 0 ? (
        <div className="mb-2">
          <div className="text-xs font-semibold text-gray-700 mb-1">Tool calls</div>
          <div className="flex flex-wrap gap-1">
            {(ts.tools_used ?? []).map((name) => {
              const ok = (ts.tools_succeeded ?? []).includes(name);
              const failed = (ts.tools_failed ?? []).includes(name);
              const cls = failed
                ? 'bg-red-100 text-red-700 border-red-200'
                : ok
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                  : 'bg-gray-100 text-gray-700 border-gray-200';
              return (
                <span key={name} className={`px-1.5 py-0.5 text-[10px] font-mono rounded border ${cls}`}>
                  {name} {failed ? '✕' : ok ? '✓' : ''}
                </span>
              );
            })}
            {(ts.tools_skipped ?? []).map((name) => (
              <span key={`skip-${name}`} className="px-1.5 py-0.5 text-[10px] font-mono rounded border bg-gray-50 text-gray-400 border-gray-200">
                {name} (skipped)
              </span>
            ))}
          </div>
        </div>
      ) : null}
      {ts.rationale ? (
        <div className="mb-2 pt-2 border-t border-[#e8ddd4]">
          <div className="text-xs font-semibold text-gray-700 mb-1">Rationale</div>
          <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{ts.rationale}</p>
        </div>
      ) : null}
      {ts.subrule_results && ts.subrule_results.length > 0 ? (
        <div className="mb-2">
          <div className="text-xs font-semibold text-gray-700 mb-1">Subrules</div>
          <div className="border border-gray-200 rounded overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-2 py-1.5 text-left font-semibold text-gray-600">Subrule</th>
                  <th className="px-2 py-1.5 text-left font-semibold text-gray-600">Status</th>
                  <th className="px-2 py-1.5 text-left font-semibold text-gray-600">Condition / Fields</th>
                </tr>
              </thead>
              <tbody>
                {ts.subrule_results.map((sr) => (
                  <tr key={sr.subrule_id} className="border-b border-gray-100 last:border-0 align-top">
                    <td className="px-2 py-1.5 font-mono text-gray-700">{sr.subrule_id}</td>
                    <td className="px-2 py-1.5"><TraceStatusChip status={sr.status} /></td>
                    <td className="px-2 py-1.5 text-gray-700">
                      {sr.conditions.map((c, ci) => (
                        <div key={ci} className="mb-1 last:mb-0">
                          <div>{c.condition}</div>
                          {c.using_fields && c.using_fields.length > 0 ? (
                            <div className="text-[10px] font-mono text-gray-500 mt-0.5">
                              {c.using_fields.join(', ')}
                            </div>
                          ) : null}
                          {c.values && Object.keys(c.values).length > 0 ? (
                            <div className="text-[10px] font-mono text-gray-500 mt-0.5 whitespace-pre-wrap">
                              {JSON.stringify(c.values)}
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
      {ts.evidence_refs && ts.evidence_refs.length > 0 ? (
        <div>
          <div className="text-xs font-semibold text-gray-700 mb-1">Evidence</div>
          <div className="flex flex-wrap gap-1">
            {ts.evidence_refs.map((ref, ri) => (
              <span key={ri} className="px-1.5 py-0.5 text-[10px] font-mono bg-white border border-gray-200 rounded text-gray-700 break-all">
                {ref}
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ProcessSection({
  label,
  rollup,
  count,
  defaultExpanded,
  children,
}: {
  label: string;
  rollup: string | null;
  count: number;
  defaultExpanded: boolean;
  children: React.ReactNode;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  return (
    <div className="border border-[#e8ddd4] rounded overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex flex-wrap items-center gap-3 bg-[#f5efe9] px-4 py-2.5 text-left hover:bg-[#efe7df] transition-colors"
      >
        <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
          Process
        </span>
        <span className="text-sm font-semibold text-gray-900">{label}</span>
        {rollup ? <AiStatusChip status={rollup} /> : null}
        <span className="ml-auto text-xs text-gray-500">
          {count} step{count === 1 ? '' : 's'}
        </span>
        {expanded
          ? <ChevronUp className="h-4 w-4 text-gray-500 shrink-0" />
          : <ChevronDown className="h-4 w-4 text-gray-500 shrink-0" />}
      </button>
      {expanded ? <div className="border-t border-[#e8ddd4]">{children}</div> : null}
    </div>
  );
}

function AgentCard({
  agent,
  defaultExpanded,
  traceSteps,
}: {
  agent: ClaimProcessingAgent;
  defaultExpanded: boolean;
  traceSteps: ClaimTraceStep[];
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const evaluations = agent.evaluations ?? [];
  // Open to the tab that actually has content: live runs populate rule
  // evaluations; persisted runs surface their detail under Explainability.
  const [activeTab, setActiveTab] = useState<'execution' | 'rules' | 'step' | 'trace'>(
    evaluations.length === 0 && traceSteps.length > 0 ? 'trace' : 'rules',
  );

  return (
    <div className="border border-[#e8ddd4] bg-white">
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-center justify-between gap-4 px-4 py-3 text-left hover:bg-[#fafafa] transition-colors"
      >
        <div className="flex items-center gap-3 flex-wrap min-w-0">
          <span className="text-sm font-semibold text-gray-900">{agent.agentName}</span>
          <AiStatusChip status={agent.status} />
        </div>
        {expanded
          ? <ChevronUp className="h-4 w-4 text-gray-500 shrink-0" />
          : <ChevronDown className="h-4 w-4 text-gray-500 shrink-0" />
        }
      </button>

      {expanded && (
        <div className="border-t border-[#e8ddd4]">
          <div className="flex px-4 pt-3 gap-0">
            <button
              type="button"
              onClick={() => setActiveTab('rules')}
              className={`px-4 py-2 text-sm font-medium rounded-t transition-colors ${
                activeTab === 'rules' ? 'text-white' : 'text-[#FF612B] bg-transparent'
              }`}
              style={activeTab === 'rules' ? { backgroundColor: ORANGE } : undefined}
            >
              Rule Evaluations ({evaluations.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('execution')}
              className={`px-4 py-2 text-sm font-medium rounded-t transition-colors ${
                activeTab === 'execution' ? 'text-white' : 'text-[#FF612B] bg-transparent'
              }`}
              style={activeTab === 'execution' ? { backgroundColor: ORANGE } : undefined}
            >
              Process Summary
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('step')}
              className={`px-4 py-2 text-sm font-medium rounded-t transition-colors ${
                activeTab === 'step' ? 'text-white' : 'text-[#FF612B] bg-transparent'
              }`}
              style={activeTab === 'step' ? { backgroundColor: ORANGE } : undefined}
            >
              Step Execution
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('trace')}
              className={`px-4 py-2 text-sm font-medium rounded-t transition-colors ${
                activeTab === 'trace' ? 'text-white' : 'text-[#FF612B] bg-transparent'
              }`}
              style={activeTab === 'trace' ? { backgroundColor: ORANGE } : undefined}
            >
              Explainability ({traceSteps.length})
            </button>
          </div>

          <div className="px-4 pb-4 pt-3">
            {activeTab === 'rules' ? (
              evaluations.length === 0 ? (
                <div className="text-sm text-gray-500 py-4">
                  No rule evaluations recorded for this node.
                </div>
              ) : (
                <ol className="space-y-3">
                  {evaluations.map((ev) => (
                    <li
                      key={`${ev.orderIndex}:${ev.ruleKey}`}
                      className="border border-[#e8ddd4] bg-[#fafafa] rounded p-3"
                    >
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className="text-xs font-mono text-gray-500">
                          #{ev.orderIndex + 1}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded ${
                            ev.matched
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {ev.matched ? (
                            <>
                              <Check className="h-3 w-3" /> matched
                            </>
                          ) : (
                            <>
                              <X className="h-3 w-3" /> not matched
                            </>
                          )}
                        </span>
                        {ev.matched && ev.decisionType ? (
                          <span className="px-2 py-0.5 text-xs font-medium rounded bg-orange-100 text-[#FF612B]">
                            {ev.decisionType}
                          </span>
                        ) : null}
                        <span className="text-xs text-gray-500">
                          source: {ev.ruleSource || '—'}
                        </span>
                        <span className="text-xs text-gray-500">
                          confidence: {(ev.confidence * 100).toFixed(0)}%
                        </span>
                        <span className="text-xs text-gray-400 ml-auto font-mono">
                          {ev.llmProvider || '—'} · {ev.llmMs} ms
                        </span>
                      </div>
                      {ev.condition ? (
                        <div className="mb-1">
                          <span className="text-xs font-semibold text-gray-600">IF: </span>
                          <span className="text-xs text-gray-800">{ev.condition}</span>
                        </div>
                      ) : null}
                      {ev.action ? (
                        <div className="mb-2">
                          <span className="text-xs font-semibold text-gray-600">THEN: </span>
                          <span className="text-xs text-gray-800">{ev.action}</span>
                        </div>
                      ) : null}
                      {ev.reasoning ? (
                        <div className="mt-2 pt-2 border-t border-[#e8ddd4]">
                          <div className="text-xs font-semibold text-gray-700 mb-1">
                            Agent reasoning
                          </div>
                          <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
                            {ev.reasoning}
                          </p>
                        </div>
                      ) : null}
                      {ev.codes.length > 0 ? (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {ev.codes.map((c) => (
                            <span
                              key={c}
                              className="px-1.5 py-0.5 text-[10px] font-mono bg-white border border-gray-200 rounded text-gray-700"
                            >
                              {c}
                            </span>
                          ))}
                        </div>
                      ) : null}
                      <div className="mt-2 text-[10px] font-mono text-gray-400 truncate">
                        {ev.ruleKey}
                      </div>
                    </li>
                  ))}
                </ol>
              )
            ) : activeTab === 'execution' ? (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-sm text-gray-700">Execution Status:</span>
                  <AiStatusChip status={agent.status} />
                </div>
                <h4 className="text-sm font-semibold text-gray-900 mb-3">Process Summary</h4>
                <ul className="space-y-2 list-disc pl-5">
                  {agent.processSummary.map((point, i) => (
                    <li key={i} className="text-sm text-gray-700 leading-relaxed">
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
            ) : activeTab === 'step' ? (
              <div className="space-y-2">
                {agent.steps.map((step) => (
                  <div key={step.id} className="flex items-start gap-3 py-2 border-b border-gray-100 last:border-0">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-800">{step.name}</div>
                      <p className="text-xs text-gray-500 mt-0.5">{step.details}</p>
                    </div>
                    <span className="text-xs text-gray-400 shrink-0">{step.duration}</span>
                  </div>
                ))}
              </div>
            ) : (
              traceSteps.length === 0 ? (
                <div className="text-sm text-gray-500 py-4">
                  No explainability trace recorded for this node.
                </div>
              ) : (
                <div className="space-y-4">
                  {traceSteps.map((ts, i) => (
                    <TraceStepCard key={`${ts.sop_rule_id || ts.sop_step_name || i}`} ts={ts} index={i} />
                  ))}
                </div>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const LEFT_NAV_ITEMS = [
  { id: 'summary', label: 'Overall Claim Process Summarization' },
  { id: 'agents', label: 'Agents Execution Selection' },
  { id: 'trace', label: 'Explainability Trace' },
] as const;

type ClaimNavId = (typeof LEFT_NAV_ITEMS)[number]['id'];

type ClaimListPreview = {
  claimId: string;
  runId: string;
  batchId: string;
  claimStatus: ClaimStatus;
  runStatus: string;
  processingTimeMin: number;
  startedAt: string;
  finishedAt: string;
};

function SummarySkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {[1, 2, 3].map((n) => (
        <div key={n} className="space-y-2">
          <div className="h-4 w-48 bg-gray-200 rounded" />
          <div className="h-3 w-full bg-gray-100 rounded" />
          <div className="h-3 w-5/6 bg-gray-100 rounded" />
        </div>
      ))}
    </div>
  );
}

function AgentsSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {[1, 2].map((n) => (
        <div key={n} className="border border-[#e8ddd4] rounded overflow-hidden">
          <div className="h-12 bg-[#f5efe9]" />
          <div className="p-4 space-y-3">
            <div className="h-4 w-40 bg-gray-200 rounded" />
            <div className="h-3 w-full bg-gray-100 rounded" />
            <div className="h-3 w-4/5 bg-gray-100 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

function TraceSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {[1, 2].map((n) => (
        <div key={n} className="border border-[#e8ddd4] rounded overflow-hidden">
          <div className="h-10 bg-[#f5efe9]" />
          <div className="p-4 space-y-3">
            {[1, 2, 3].map((m) => (
              <div key={m} className="h-16 bg-gray-100 rounded" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

const TERMINAL_RUN_STATUSES = new Set([
  'COMPLETED',
  'FAILED',
  'FETCH_FAILED',
  'TERMINATED_EARLY',
]);

/** Stop polling / background refetch once the engine has a terminal outcome. */
function isTerminalRun(
  data?: { finishedAt?: string | null; runStatus?: string } | null,
): boolean {
  if (!data) return false;
  if (data.finishedAt) return true;
  return TERMINAL_RUN_STATUSES.has(String(data.runStatus ?? '').toUpperCase());
}

export default function ClaimDetailsPage() {
  const queryClient = useQueryClient();
  const { id: claimId } = useParams<{ id: string }>();
  const location = useLocation();
  const listPreview = (location.state as { listPreview?: ClaimListPreview } | null)
    ?.listPreview;
  const [searchParams] = useSearchParams();
  const { canWrite } = useAuth();
  const token = getToken();
  const batchId = searchParams.get('batchId') ?? undefined;
  const runId = searchParams.get('runId') ?? undefined;

  const [activeNav, setActiveNav] = useState<ClaimNavId>('summary');
  const [feedback, setFeedback] = useState('');

  const claimOpts = { batchId, runId };

  const summaryQuery = useQuery({
    queryKey: ['claim-summary', claimId, batchId, runId],
    queryFn: () => getClaimSummary(token!, claimId!, claimOpts),
    enabled: !!token && !!claimId && activeNav === 'summary',
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000,
    refetchInterval: (query) => {
      if (activeNav !== 'summary' || !batchId) return false;
      if (isTerminalRun(query.state.data) || isTerminalRun(listPreview)) return false;
      return 4000;
    },
  });

  const agentsQuery = useQuery({
    queryKey: ['claim-agents', claimId, batchId, runId],
    queryFn: () => getClaimAgents(token!, claimId!, claimOpts),
    enabled: !!token && !!claimId && activeNav === 'agents',
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000,
    refetchInterval: (query) => {
      if (activeNav !== 'agents' || !batchId) return false;
      if (isTerminalRun(query.state.data) || isTerminalRun(listPreview)) return false;
      return 4000;
    },
  });

  const traceQuery = useQuery({
    queryKey: ['claim-trace', claimId, batchId, runId],
    queryFn: () => getClaimTrace(token!, claimId!, claimOpts),
    enabled:
      !!token
      && !!claimId
      && (activeNav === 'trace' || activeNav === 'agents'),
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000,
    refetchInterval: (query) => {
      if (!batchId || (activeNav !== 'trace' && activeNav !== 'agents')) return false;
      const headerDone =
        isTerminalRun(summaryQuery.data)
        || isTerminalRun(agentsQuery.data)
        || isTerminalRun(listPreview);
      if (headerDone && (query.state.data?.length ?? 0) > 0) return false;
      return 4000;
    },
  });

  // Warm agents + trace in the background once summary confirms a finished run.
  useEffect(() => {
    if (!token || !claimId) return;
    const done =
      isTerminalRun(summaryQuery.data)
      || isTerminalRun(listPreview);
    if (!done) return;

    const opts = { batchId, runId };
    void queryClient.prefetchQuery({
      queryKey: ['claim-agents', claimId, batchId, runId],
      queryFn: () => getClaimAgents(token, claimId, opts),
      staleTime: 5 * 60 * 1000,
    });
    void queryClient.prefetchQuery({
      queryKey: ['claim-trace', claimId, batchId, runId],
      queryFn: () => getClaimTrace(token, claimId, opts),
      staleTime: 5 * 60 * 1000,
    });
  }, [token, claimId, batchId, runId, summaryQuery.data, listPreview, queryClient]);

  const traceByAgent = useMemo(() => {
    const map = new Map<string, ClaimTraceStep[]>();
    for (const step of traceQuery.data ?? []) {
      for (const key of [step.shape_id, step.agent_name]) {
        if (!key) continue;
        const list = map.get(key) ?? [];
        if (!list.includes(step)) list.push(step);
        map.set(key, list);
      }
    }
    return map;
  }, [traceQuery.data]);

  const traceFor = (agent: ClaimProcessingAgent): ClaimTraceStep[] =>
    traceByAgent.get(agent.id) ?? traceByAgent.get(agent.agentName) ?? [];

  const liveEnabled =
    activeNav === 'agents' &&
    !!token &&
    !!claimId &&
    !!batchId &&
    !isTerminalRun(agentsQuery.data)
    && !isTerminalRun(listPreview);

  const live = useLiveClaimRun({
    token,
    claimId: claimId ?? '',
    batchId,
    enabled: liveEnabled,
  });

  // Merge: snapshot agents are authoritative; shapes the live stream has
  // seen but the snapshot doesn't yet include get appended.
  const mergedAgents: ClaimProcessingAgent[] = useMemo(() => {
    const fromSnapshot = agentsQuery.data?.agents ?? [];
    const snapshotIds = new Set(fromSnapshot.map((a) => a.id));
    const liveOnly = live.shapes
      .filter((s) => !snapshotIds.has(s.shapeId))
      .map(liveShapeToAgent);
    return [...fromSnapshot, ...liveOnly];
  }, [agentsQuery.data, live.shapes]);

  const header =
    summaryQuery.data
    ?? agentsQuery.data
    ?? (listPreview
      ? {
          claimId: listPreview.claimId,
          runId: listPreview.runId,
          batchId: listPreview.batchId,
          claimStatus: listPreview.claimStatus,
          runStatus: listPreview.runStatus,
          processingTimeMin: listPreview.processingTimeMin,
          finishedAt: listPreview.finishedAt,
          startedAt: listPreview.startedAt,
        }
      : undefined);
  const headerClaimStatus = header?.claimStatus ?? 'INCONCLUSIVE';

  const renderNavContent = () => {
    if (activeNav === 'agents') {
      if (agentsQuery.isLoading && !agentsQuery.data && live.shapes.length === 0) {
        return <AgentsSkeleton />;
      }

      if (agentsQuery.error && live.shapes.length === 0) {
        return (
          <div className="p-6 m-4 bg-red-50 border border-red-200 rounded text-sm text-red-700">
            {(agentsQuery.error as Error).message}
          </div>
        );
      }

      if (!agentsQuery.data && live.shapes.length === 0) {
        return (
          <div className="p-8 text-sm text-gray-500 flex items-center justify-center gap-2">
            {batchId ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-[#FF612B]" />
                Waiting for the engine to start evaluating this claim…
              </>
            ) : (
              'No execution found for this claim.'
            )}
          </div>
        );
      }

      if (mergedAgents.length === 0) {
        return (
          <div className="border border-[#e8ddd4] m-4 p-6 text-sm text-gray-500 flex items-center gap-2">
            {live.active ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-[#FF612B]" />
                Waiting for the first rule evaluation…
              </>
            ) : (
              'No agent activity recorded.'
            )}
          </div>
        );
      }

      const lastId = mergedAgents[mergedAgents.length - 1]?.id;
      const groups = mergedAgents.reduce((m, agent) => {
        const proc = processFor(traceFor(agent)[0]?.sop_name);
        const entry = m.get(proc.label) ?? { order: proc.order, agents: [] };
        entry.agents.push(agent);
        m.set(proc.label, entry);
        return m;
      }, new Map<string, { order: number; agents: ClaimProcessingAgent[] }>());

      return (
        <div className="space-y-6">
          {Array.from(groups)
            .sort((a, b) => a[1].order - b[1].order)
            .map(([label, { agents }]) => (
              <ProcessSection
                key={label}
                label={label}
                rollup={aggregateTraceAudit(agents.map((a) => a.status))}
                count={agents.length}
                defaultExpanded={agents.some((a) => a.id === lastId)}
              >
                <div className="divide-y divide-[#e8ddd4]">
                  {agents.map((agent) => (
                    <AgentCard
                      key={agent.id}
                      agent={agent}
                      defaultExpanded={agent.id === lastId}
                      traceSteps={traceFor(agent)}
                    />
                  ))}
                </div>
              </ProcessSection>
            ))}
        </div>
      );
    }

    if (activeNav === 'trace') {
      if (traceQuery.isLoading && !traceQuery.data) {
        return <TraceSkeleton />;
      }

      if (traceQuery.error) {
        return (
          <div className="p-6 m-4 bg-red-50 border border-red-200 rounded text-sm text-red-700">
            {(traceQuery.error as Error).message}
          </div>
        );
      }

      if ((traceQuery.data?.length ?? 0) === 0) {
        return (
          <div className="p-8 text-sm text-gray-500 text-center">
            No explainability trace recorded for this claim yet.
          </div>
        );
      }

      return (
        <div className="space-y-6">
          {Array.from(
            (traceQuery.data ?? []).reduce((m, ts) => {
              const proc = processFor(ts.sop_name);
              const entry = m.get(proc.label) ?? { order: proc.order, steps: [] };
              entry.steps.push(ts);
              m.set(proc.label, entry);
              return m;
            }, new Map<string, { order: number; steps: ClaimTraceStep[] }>()),
          )
            .sort((a, b) => a[1].order - b[1].order)
            .map(([label, { steps }]) => (
              <ProcessSection
                key={label}
                label={label}
                rollup={aggregateTraceAudit(steps.map((s) => s.status))}
                count={steps.length}
                defaultExpanded
              >
                <div className="space-y-4 p-4">
                  {steps.map((ts, i) => (
                    <TraceStepCard key={`${ts.sop_rule_id || ts.sop_step_name || i}`} ts={ts} index={i} />
                  ))}
                </div>
              </ProcessSection>
            ))}
        </div>
      );
    }

    if (summaryQuery.isLoading && !summaryQuery.data) {
      return <SummarySkeleton />;
    }

    if (summaryQuery.error) {
      return (
        <div className="p-6 m-4 bg-red-50 border border-red-200 rounded text-sm text-red-700">
          {(summaryQuery.error as Error).message}
        </div>
      );
    }

    if (!summaryQuery.data) {
      return (
        <div className="p-8 text-sm text-gray-500 text-center">
          No summary available for this claim.
        </div>
      );
    }

    const summaryAgents: ClaimSummaryAgent[] = summaryQuery.data.agents;

    return (
      <div className="space-y-6">
        {summaryQuery.data.outerToolInvocations.length > 0 ? (
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-2">Outer Tool Invocations</h4>
            <div className="border border-gray-200 rounded overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">Phase</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">Tool</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">Status</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">Duration (ms)</th>
                  </tr>
                </thead>
                <tbody>
                  {summaryQuery.data.outerToolInvocations.map((inv, i) => (
                    <tr key={i} className="border-b border-gray-100 last:border-0">
                      <td className="px-3 py-1.5 text-gray-800">{inv.phase}</td>
                      <td className="px-3 py-1.5 text-gray-600">{inv.tool}</td>
                      <td className="px-3 py-1.5 text-gray-600">{inv.status}</td>
                      <td className="px-3 py-1.5 text-gray-600 tabular-nums">{inv.durationMs}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
        {summaryAgents.length === 0 ? (
          <div className="text-sm text-gray-500 py-4">No process summary available yet.</div>
        ) : (
          summaryAgents.map((agent) => (
            <div key={agent.id}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-semibold text-gray-900">{agent.agentName}</span>
                <AiStatusChip status={agent.status} />
              </div>
              <ul className="space-y-2 list-disc pl-5">
                {agent.processSummary.map((point, i) => (
                  <li key={i} className="text-sm text-gray-700 leading-relaxed">
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
      </div>
    );
  };

  return (
    <TopNavLayout showBack>
      <div className="flex flex-col">
      <div className="mb-4 shrink-0 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Claim Details</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Review the AI agent execution details for this claim.
          </p>
        </div>
        {live.active ? (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded border bg-amber-50 text-amber-700 border-amber-200">
            <Loader2 className="h-3 w-3 animate-spin" />
            LIVE · streaming{' '}
            {live.eventCount > 0 ? `${live.eventCount} events` : '…'}
          </span>
        ) : null}
        {live.error && !live.active ? (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded border bg-red-50 text-red-700 border-red-200">
            <X className="h-3 w-3" />
            SSE error: {live.error}
          </span>
        ) : null}
      </div>

      <div className="shrink-0 flex flex-wrap items-start gap-x-10 gap-y-3 mb-5">
        <div>
          <div className="text-sm text-gray-600 mb-1">Claim ID :</div>
          <div className="text-sm font-semibold text-gray-900">{claimId ?? '—'}</div>
        </div>
        <div>
          <div className="text-sm text-gray-600 mb-1">Execution ID :</div>
          <div className="text-sm text-gray-800">{header?.runId || runId || '—'}</div>
        </div>
        <div>
          <div className="text-sm text-gray-600 mb-1">Batch ID :</div>
          <div className="text-sm text-gray-800">{header?.batchId || batchId || '—'}</div>
        </div>
        <div>
          <div className="text-sm text-gray-600 mb-1">Lob :</div>
          <div className="text-sm text-gray-800">—</div>
        </div>
        <div>
          <div className="text-sm text-gray-600 mb-1">Claim Status :</div>
          {header ? (
            <AiStatusChip status={headerClaimStatus} />
          ) : (
            <span className="text-sm text-gray-400">—</span>
          )}
        </div>
        <div>
          <div className="text-sm text-gray-600 mb-1">Processing Time :</div>
          <div className="inline-flex items-center gap-1.5 text-sm text-gray-800">
            <Clock className="h-4 w-4 text-gray-400" />
            {header ? `${header.processingTimeMin} min` : '—'}
          </div>
        </div>
      </div>

      <div className="h-[calc(100vh-6.5rem)] min-h-0 border border-[#FF612B]/60 rounded-sm bg-white overflow-hidden flex flex-col">
        <div className="flex flex-1 min-h-0">
          <div className="w-[220px] shrink-0 flex flex-col border-r border-[#e8ddd4] bg-white self-stretch">
            {LEFT_NAV_ITEMS.map((item) => {
              const isActive = activeNav === item.id;
              const isLoading =
                activeNav === item.id &&
                (item.id === 'trace'
                  ? traceQuery.isLoading
                  : item.id === 'agents'
                    ? agentsQuery.isLoading
                    : summaryQuery.isLoading);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveNav(item.id)}
                  className={`text-left px-4 py-4 text-sm leading-snug border-b border-[#e8ddd4] last:border-b-0 transition-colors ${
                    isActive
                      ? 'text-white font-medium'
                      : 'text-[#FF612B] bg-[#fff8f4] hover:bg-[#fff3eb]'
                  }`}
                  style={isActive ? { backgroundColor: ORANGE } : undefined}
                >
                  <span className="flex items-center gap-2">
                    {item.label}
                    {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" /> : null}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex-1 min-w-0 h-full flex flex-col overflow-hidden">
            <div className="flex-1 h-0 overflow-y-auto overscroll-y-contain p-4">
              {renderNavContent()}
            </div>
          </div>
        </div>
      </div>

      {canWrite && (
        <div className="mt-5 shrink-0 border border-[#e8ddd4] rounded-sm px-4 py-4 bg-[#fafafa]">
          <label className="block text-sm font-medium text-gray-800 mb-2">
            Feedback: <span className="text-red-500">*</span>
          </label>
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded bg-white resize-none focus:outline-none focus:ring-1 focus:ring-[#FF612B] focus:border-[#FF612B]"
          />
          <div className="flex justify-end gap-3 mt-3">
            <button
              type="button"
              disabled
              className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-[#2e9e5e] hover:bg-[#27854f] disabled:opacity-50 disabled:cursor-not-allowed rounded transition-colors"
            >
              <Check className="h-4 w-4" />
              Approve
            </button>
            <button
              type="button"
              disabled
              className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-[#d32f2f] hover:bg-[#b71c1c] disabled:opacity-50 disabled:cursor-not-allowed rounded transition-colors"
            >
              <X className="h-4 w-4" />
              Reject
            </button>
          </div>
        </div>
      )}
      </div>
    </TopNavLayout>
  );
}
