import { useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown, ChevronUp, Clock, Check, X, Loader2 } from 'lucide-react';
import TopNavLayout from '@/layouts/TopNavLayout';
import { AiStatusChip } from '@/components/StatusChip';
import { getClaimProcessing, getClaimTrace } from '@/lib/execute';
import { useLiveClaimRun, liveShapeToAgent } from '@/lib/useLiveClaimRun';
import type { ClaimProcessingAgent, ClaimTraceStep } from '@/types/execute';
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
          <span className="text-xs text-gray-500">SOP: {ts.sop_name}</span>
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
          <span className="text-xs text-gray-500">Begin: {agent.beginTime}</span>
          <span className="text-xs text-gray-500">End: {agent.endTime}</span>
          <span className="inline-flex items-center gap-1 text-xs text-gray-500">
            <Clock className="h-3.5 w-3.5" />
            {agent.durationSec} Sec
          </span>
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
];

export default function ClaimDetailsPage() {
  const { id: claimId } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const { canWrite } = useAuth();
  const token = getToken();
  const batchId = searchParams.get('batchId') ?? undefined;
  const runId = searchParams.get('runId') ?? undefined;

  const detailQuery = useQuery({
    queryKey: ['claim-processing', claimId, batchId, runId],
    queryFn: () =>
      getClaimProcessing(token!, claimId!, { batchId, runId }),
    enabled: !!token && !!claimId,
    // While the snapshot reports a still-running claim (or no snapshot yet
    // exists), poll briefly as a backstop so the persisted view catches up
    // even if a terminal SSE event is missed.
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!batchId) return false;
      if (!data) return 4000;
      if (!data.finishedAt) return 4000;
      return false;
    },
  });

  // Explainability / trace log (additive). Persisted once the run finishes;
  // poll briefly while the snapshot is still running so it catches up.
  const traceQuery = useQuery({
    queryKey: ['claim-trace', claimId, batchId, runId],
    queryFn: () => getClaimTrace(token!, claimId!, { batchId, runId }),
    enabled: !!token && !!claimId,
    refetchInterval: (query) => {
      const finished = detailQuery.data?.finishedAt;
      if (!batchId) return false;
      if (finished && (query.state.data?.length ?? 0) > 0) return false;
      return 4000;
    },
  });

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

  // "Live mode" engages when we have a batch context AND the snapshot
  // isn't finalized for this claim. Subscribe to the batch SSE, accumulate
  // this claim's events, and merge them into the rendered agents list.
  const liveEnabled =
    !!token &&
    !!claimId &&
    !!batchId &&
    (!detailQuery.data || !detailQuery.data.finishedAt);

  const live = useLiveClaimRun({
    token,
    claimId: claimId ?? '',
    batchId,
    enabled: liveEnabled,
  });

  const [activeNav, setActiveNav] = useState('agents');
  const [feedback, setFeedback] = useState('');

  // Merge: snapshot agents are authoritative; shapes the live stream has
  // seen but the snapshot doesn't yet include get appended.
  const mergedAgents: ClaimProcessingAgent[] = useMemo(() => {
    const fromSnapshot = detailQuery.data?.agents ?? [];
    const snapshotIds = new Set(fromSnapshot.map((a) => a.id));
    const liveOnly = live.shapes
      .filter((s) => !snapshotIds.has(s.shapeId))
      .map(liveShapeToAgent);
    return [...fromSnapshot, ...liveOnly];
  }, [detailQuery.data, live.shapes]);

  // Initial spinner: only while the snapshot is loading AND no live event
  // has arrived. Once SSE starts streaming we have something to render.
  if (detailQuery.isLoading && live.shapes.length === 0) {
    return (
      <TopNavLayout showBack>
        <div className="p-6 bg-white border border-gray-200 rounded text-sm text-gray-500 flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin text-[#FF612B]" />
          Loading claim details…
        </div>
      </TopNavLayout>
    );
  }

  if (detailQuery.error && live.shapes.length === 0) {
    return (
      <TopNavLayout showBack>
        <div className="p-6 bg-red-50 border border-red-200 rounded text-sm text-red-700">
          {(detailQuery.error as Error).message}
        </div>
      </TopNavLayout>
    );
  }

  // No snapshot yet (run hasn't persisted) and SSE hasn't surfaced
  // anything — show a wait/empty state.
  if (!detailQuery.data && live.shapes.length === 0) {
    return (
      <TopNavLayout showBack>
        <div className="p-6 bg-white border border-gray-200 rounded text-sm text-gray-700 flex items-center gap-2">
          {batchId ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin text-[#FF612B]" />
              Waiting for the engine to start evaluating this claim…
            </>
          ) : (
            'No execution found for this claim.'
          )}
        </div>
      </TopNavLayout>
    );
  }

  // Synthesize a minimal detail shell when the snapshot isn't ready yet
  // but we DO have live shapes; this keeps every downstream `detail.*` ref
  // valid without conditional rendering churn.
  const detail =
    detailQuery.data ??
    ({
      claimId: claimId ?? '',
      runId: runId ?? '',
      batchId: batchId ?? '',
      workflowId: '',
      claimStatus: 'INCONCLUSIVE',
      processingTimeMin: 0,
      startedAt: '',
      finishedAt: '',
      agents: [],
      outerToolInvocations: [],
      reviewStatus: null,
      feedback: null,
    } as NonNullable<typeof detailQuery.data>);

  return (
    <TopNavLayout showBack>
      <div className="mb-4 flex items-start justify-between gap-4">
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

      <div className="flex flex-wrap items-start gap-x-10 gap-y-3 mb-5">
        <div>
          <div className="text-sm text-gray-600 mb-1">Claim ID :</div>
          <div className="text-sm font-semibold text-gray-900">{detail.claimId}</div>
        </div>
        <div>
          <div className="text-sm text-gray-600 mb-1">Execution ID :</div>
          <div className="text-sm text-gray-800">{detail.runId}</div>
        </div>
        <div>
          <div className="text-sm text-gray-600 mb-1">Batch ID :</div>
          <div className="text-xs text-gray-800 font-mono">{detail.batchId}</div>
        </div>
        <div>
          <div className="text-sm text-gray-600 mb-1">Claim Status :</div>
          <AiStatusChip status={detail.claimStatus} />
        </div>
        <div>
          <div className="text-sm text-gray-600 mb-1">Processing Time :</div>
          <div className="inline-flex items-center gap-1.5 text-sm text-gray-800">
            <Clock className="h-4 w-4 text-gray-400" />
            {detail.processingTimeMin} min
          </div>
        </div>
        <div>
          <div className="text-sm text-gray-600 mb-1">Finished At :</div>
          <div className="text-sm text-gray-800">{detail.finishedAt}</div>
        </div>
      </div>

      <div className="border border-[#FF612B]/60 rounded-sm bg-white overflow-hidden">
        <div className="flex min-h-[420px]">
          <div className="w-[220px] shrink-0 flex flex-col border-r border-[#e8ddd4]">
            {LEFT_NAV_ITEMS.map((item) => {
              const isActive = activeNav === item.id;
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
                  {item.label}
                </button>
              );
            })}
          </div>

          <div className="flex-1 min-w-0 flex flex-col">
            <div className="flex-1 p-4">
              {activeNav === 'agents' ? (
                <div className="space-y-0 divide-y divide-[#e8ddd4] border border-[#e8ddd4]">
                  {mergedAgents.length === 0 ? (
                    <div className="p-6 text-sm text-gray-500 flex items-center gap-2">
                      {live.active ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin text-[#FF612B]" />
                          Waiting for the first rule evaluation…
                        </>
                      ) : (
                        'No agent activity recorded.'
                      )}
                    </div>
                  ) : (
                    mergedAgents.map((agent, index) => (
                      <AgentCard
                        key={agent.id}
                        agent={agent}
                        defaultExpanded={index === mergedAgents.length - 1}
                        traceSteps={traceFor(agent)}
                      />
                    ))
                  )}
                </div>
              ) : activeNav === 'trace' ? (
                (traceQuery.data?.length ?? 0) === 0 ? (
                  <div className="p-6 text-sm text-gray-500 flex items-center gap-2">
                    {traceQuery.isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin text-[#FF612B]" />
                        Loading explainability trace…
                      </>
                    ) : (
                      'No explainability trace recorded for this claim yet.'
                    )}
                  </div>
                ) : (
                  <div className="space-y-6">
                    {Array.from(
                      (traceQuery.data ?? []).reduce((m, ts) => {
                        const key = ts.agent_name || ts.shape_id || 'Agent';
                        (m.get(key) ?? m.set(key, []).get(key)!).push(ts);
                        return m;
                      }, new Map<string, ClaimTraceStep[]>()),
                    ).map(([agentName, steps]) => (
                      <div key={agentName}>
                        <div className="text-sm font-semibold text-gray-900 mb-2">{agentName}</div>
                        <div className="space-y-4">
                          {steps.map((ts, i) => (
                            <TraceStepCard key={`${ts.sop_rule_id || ts.sop_step_name || i}`} ts={ts} index={i} />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )
              ) : (
                <div className="space-y-6">
                  {detail.outerToolInvocations.length > 0 ? (
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
                            {detail.outerToolInvocations.map((inv, i) => (
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
                  {mergedAgents.map((agent) => (
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
                  ))}
                </div>
              )}
            </div>

            {canWrite && (
              <div className="border-t border-[#e8ddd4] px-4 py-4 bg-[#fafafa]">
                <label className="block text-sm font-medium text-gray-800 mb-2">
                  Feedback: <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded bg-white resize-none focus:outline-none focus:ring-1 focus:ring-[#FF612B] focus:border-[#FF612B]"
                />
                <p className="text-xs text-gray-500 mt-2">Review submission not wired yet.</p>
                <div className="flex justify-end gap-3 mt-3">
                  <button
                    type="button"
                    disabled
                    className="inline-flex items-center gap-2 px-6 py-2 text-sm font-medium text-white bg-[#4caf7a] hover:bg-[#43a06d] disabled:opacity-50 disabled:cursor-not-allowed rounded-full transition-colors"
                  >
                    <Check className="h-4 w-4" />
                    Approve
                  </button>
                  <button
                    type="button"
                    disabled
                    className="inline-flex items-center gap-2 px-6 py-2 text-sm font-medium text-white bg-[#e57373] hover:bg-[#ef5350] disabled:opacity-50 disabled:cursor-not-allowed rounded-full transition-colors"
                  >
                    <X className="h-4 w-4" />
                    Reject
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </TopNavLayout>
  );
}
