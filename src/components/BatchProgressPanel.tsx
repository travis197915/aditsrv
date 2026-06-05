import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, AlertTriangle, Loader2, RotateCcw, X } from 'lucide-react';
import { getBatch } from '@/lib/execute';
import type { BatchEvent, BatchStatus, ClaimEventPayload } from '@/types/execute';

type BatchProgressPanelProps = {
  token: string | null;
  batchId: string | null;
  events: BatchEvent[];
  status: BatchStatus;
  error: string | null;
  onCancel: () => void;
  onClose: () => void;
};

type ClaimRow = {
  claimId: string;
  runId?: string;
  status?: string;
  raw: ClaimEventPayload;
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function pickClaimRow(payload: unknown): ClaimRow | null {
  if (!isPlainObject(payload)) return null;
  const claimId = asString(payload.claim_id) ?? asString(payload.claimId);
  if (!claimId) return null;
  return {
    claimId,
    runId: asString(payload.run_id) ?? asString(payload.runId),
    status: asString(payload.status),
    raw: payload as ClaimEventPayload,
  };
}

function formatElapsed(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function statusChipClasses(status: BatchStatus): string {
  switch (status) {
    case 'RUNNING':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'DONE':
      return 'bg-green-50 text-green-700 border-green-200';
    case 'ERROR':
      return 'bg-red-50 text-red-700 border-red-200';
    default:
      return 'bg-gray-50 text-gray-600 border-gray-200';
  }
}

function eventBadgeClasses(type: string): string {
  switch (type) {
    case 'batch_start':
      return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'claim_start':
      return 'bg-sky-50 text-sky-700 border-sky-200';
    case 'shape_start':
      return 'bg-purple-50 text-purple-700 border-purple-200';
    case 'shape_complete':
      return 'bg-indigo-50 text-indigo-700 border-indigo-200';
    case 'rule_evaluated':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'tool_invoked':
      return 'bg-cyan-50 text-cyan-700 border-cyan-200';
    case 'stage':
      return 'bg-stone-50 text-stone-700 border-stone-200';
    case 'agent_log':
      return 'bg-slate-50 text-slate-700 border-slate-200';
    case 'claim':
      return 'bg-orange-50 text-[#FF612B] border-orange-200';
    case 'summary':
      return 'bg-green-50 text-green-700 border-green-200';
    case 'error':
      return 'bg-red-50 text-red-700 border-red-200';
    default:
      return 'bg-gray-50 text-gray-600 border-gray-200';
  }
}

function eventClaimId(data: unknown): string {
  if (!isPlainObject(data)) return '';
  return asString(data.claim_id) ?? asString(data.claimId) ?? '';
}

function summarizeEvent(event: BatchEvent): string {
  const { data } = event;
  if (typeof data === 'string') return data;
  if (!isPlainObject(data)) return '';

  const claim = eventClaimId(data);
  const claimPrefix = claim ? `${claim} · ` : '';

  if (event.type === 'batch_start') {
    const total = data.total_claims ?? data.total;
    const wf = asString(data.workflow_id) ?? '';
    const parts = [
      total != null ? `${total} claims` : null,
      wf ? `workflow ${wf.slice(0, 8)}` : null,
    ].filter(Boolean);
    return parts.join(' · ');
  }

  if (event.type === 'claim_start') {
    return claim || 'claim';
  }

  if (event.type === 'claim') {
    const s = asString(data.status) ?? '';
    const decision = asString(data.final_decision_type) ?? '';
    return [claim || '?', s, decision].filter(Boolean).join(' · ');
  }

  if (event.type === 'shape_start') {
    const label =
      asString(data.shape_label) ??
      asString(data.shape_name) ??
      asString(data.name) ??
      asString(data.shape_id) ??
      'shape';
    const total = data.rules_total;
    const tail = typeof total === 'number' ? ` (${total} rules)` : '';
    const skipped = data.skipped ? ' — skipped' : '';
    return `${claimPrefix}${label}${tail}${skipped}`;
  }

  if (event.type === 'shape_complete') {
    const label =
      asString(data.shape_label) ?? asString(data.shape_id) ?? 'shape';
    const evaluated = data.rules_evaluated;
    const total = data.rules_total;
    const matched = data.matched_count;
    const term = data.terminated_here ? ' → TERMINATED' : '';
    const ms = data.duration_ms;
    const counts =
      typeof evaluated === 'number' && typeof total === 'number'
        ? ` ${evaluated}/${total} rules`
        : '';
    const matchStr =
      typeof matched === 'number' ? `, ${matched} matched` : '';
    const msStr = typeof ms === 'number' ? ` (${ms} ms)` : '';
    return `${claimPrefix}${label}${counts}${matchStr}${msStr}${term}`;
  }

  if (event.type === 'rule_evaluated') {
    const rule =
      asString(data.rule_key) ??
      asString(data.rule_name) ??
      asString(data.rule) ??
      'rule';
    const matched = data.matched;
    const decision = asString(data.decision_type) ?? '';
    const verdict =
      matched === true ? 'matched' : matched === false ? 'no match' : '';
    const reason = asString(data.reasoning) ?? '';
    const head = [verdict, decision].filter(Boolean).join(' · ');
    const tail = reason ? ` — ${reason}` : '';
    return `${claimPrefix}${rule} · ${head}${tail}`;
  }

  if (event.type === 'tool_invoked') {
    const tool = asString(data.tool_name) ?? 'tool';
    const phase = asString(data.phase) ?? '';
    const ok = data.ok === true ? 'OK' : data.ok === false ? 'FAIL' : '';
    const ms = data.duration_ms;
    const err = asString(data.error) ?? '';
    const head = [tool, phase, ok].filter(Boolean).join(' · ');
    const tail =
      err ? ` · ${err}` : typeof ms === 'number' ? ` · ${ms} ms` : '';
    return `${claimPrefix}${head}${tail}`;
  }

  if (event.type === 'stage') {
    const node = asString(data.node) ?? 'stage';
    const status = asString(data.status) ?? '';
    const ms = data.ms;
    const msg = asString(data.message) ?? '';
    const head = [node, status].filter(Boolean).join(' · ');
    const tail = msg
      ? ` — ${msg}`
      : typeof ms === 'number'
        ? ` (${ms} ms)`
        : '';
    return `${claimPrefix}${head}${tail}`;
  }

  if (event.type === 'agent_log') {
    const level = asString(data.level) ?? 'INFO';
    const category = asString(data.category) ?? '';
    const msg = asString(data.message) ?? '';
    const head = [level, category].filter(Boolean).join('/');
    return `${claimPrefix}[${head}] ${msg}`;
  }

  if (event.type === 'summary') {
    // Backend sends: { id, status, total_claims, completed, failed,
    //                  error_message }. Older callers used { total, met,
    //                  not_met } — accept both.
    const total = data.total_claims ?? data.total ?? data.total_runs;
    const completed = data.completed ?? data.met ?? data.passed;
    const failed = data.failed ?? data.not_met;
    const status = asString(data.status) ?? '';
    const err = asString(data.error_message) ?? '';
    const parts = [
      status || null,
      total != null
        ? `${total} claim${Number(total) === 1 ? '' : 's'}`
        : null,
      completed != null ? `${completed} completed` : null,
      failed != null && Number(failed) > 0 ? `${failed} failed` : null,
    ].filter(Boolean);
    const head = parts.length > 0 ? parts.join(' · ') : '';
    return err ? `${head}${head ? ' — ' : ''}${err}` : head;
  }

  if (event.type === 'error') {
    return asString(data.message) ?? asString(data.error) ?? 'Engine error';
  }

  return '';
}

const VERBOSE_TYPES = new Set<string>(['agent_log']);

export default function BatchProgressPanel({
  token,
  batchId,
  events,
  status,
  error,
  onCancel,
  onClose,
}: BatchProgressPanelProps) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [startedAt] = useState(() => Date.now());
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (status !== 'RUNNING') return;
    const id = window.setInterval(() => setElapsed(Date.now() - startedAt), 1000);
    return () => window.clearInterval(id);
  }, [status, startedAt]);

  const claimRows = useMemo<ClaimRow[]>(() => {
    const rows: ClaimRow[] = [];
    for (const ev of events) {
      if (ev.type !== 'claim') continue;
      const row = pickClaimRow(ev.data);
      if (row) rows.push(row);
    }
    return rows;
  }, [events]);

  const [showVerbose, setShowVerbose] = useState(false);
  const filteredEvents = useMemo(
    () => (showVerbose ? events : events.filter((e) => !VERBOSE_TYPES.has(e.type))),
    [events, showVerbose],
  );
  const reversedEvents = useMemo(() => [...filteredEvents].reverse(), [filteredEvents]);

  const summary = useMemo(
    () => [...events].reverse().find((ev) => ev.type === 'summary'),
    [events],
  );
  const errorEvent = useMemo(
    () => [...events].reverse().find((ev) => ev.type === 'error'),
    [events],
  );

  const batchQuery = useQuery({
    queryKey: ['batch', batchId],
    queryFn: () => getBatch(token!, batchId!),
    enabled: !!token && !!batchId && (status === 'DONE' || status === 'ERROR'),
  });

  const handleRefreshBatch = () => {
    if (!batchId) return;
    queryClient.invalidateQueries({ queryKey: ['batch', batchId] });
  };

  return (
    <div className="flex flex-col">
      <div className="px-5 py-3 border-b border-gray-200 flex flex-wrap items-center gap-3">
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-semibold rounded border ${statusChipClasses(status)}`}
        >
          {status === 'RUNNING' ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
          {status === 'DONE' ? <CheckCircle2 className="h-3 w-3" /> : null}
          {status === 'ERROR' ? <AlertTriangle className="h-3 w-3" /> : null}
          {status}
        </span>
        {batchId ? (
          <span className="text-xs text-gray-500 font-mono">batch {batchId}</span>
        ) : null}
        <span className="text-xs text-gray-500 ml-auto">
          {status === 'RUNNING'
            ? `elapsed ${formatElapsed(elapsed)}`
            : `claims ${claimRows.length}`}
        </span>
      </div>

      {status === 'DONE' && summary ? (
        <div className="mx-5 mt-4 px-3 py-2 border border-green-200 bg-green-50 rounded flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm text-green-700">
            <CheckCircle2 className="h-4 w-4" />
            <span>
              Batch finished
              {summarizeEvent(summary) ? ` — ${summarizeEvent(summary)}` : ''}
            </span>
          </div>
          <button
            type="button"
            onClick={handleRefreshBatch}
            className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded border border-green-300 text-green-700 hover:bg-green-100 transition-colors"
          >
            <RotateCcw className="h-3 w-3" /> Refresh
          </button>
        </div>
      ) : null}

      {status === 'ERROR' ? (
        <div className="mx-5 mt-4 px-3 py-2 border border-red-200 bg-red-50 rounded flex items-center gap-2 text-sm text-red-700">
          <AlertTriangle className="h-4 w-4" />
          <span>
            {error
              ? error
              : errorEvent
                ? summarizeEvent(errorEvent) || 'Batch failed'
                : 'Batch failed'}
          </span>
        </div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 p-5 max-h-[60vh] overflow-y-auto">
        <section>
          <h3 className="text-sm font-semibold text-gray-900 mb-2">Claim results</h3>
          <div className="border border-gray-200 rounded overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-3 py-2 text-left text-[11px] font-semibold text-gray-600 uppercase tracking-wide">
                    Claim ID
                  </th>
                  <th className="px-3 py-2 text-left text-[11px] font-semibold text-gray-600 uppercase tracking-wide">
                    Status
                  </th>
                  <th className="px-3 py-2 text-left text-[11px] font-semibold text-gray-600 uppercase tracking-wide">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {claimRows.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-3 py-6 text-center text-xs text-gray-400">
                      Waiting for claim events...
                    </td>
                  </tr>
                ) : (
                  claimRows.map((row, idx) => (
                    <tr
                      key={`${row.claimId}-${row.runId ?? idx}`}
                      className="border-b border-gray-100 last:border-0"
                    >
                      <td className="px-3 py-1.5 text-gray-800 font-medium whitespace-nowrap">
                        {row.claimId}
                      </td>
                      <td className="px-3 py-1.5 text-gray-600 whitespace-nowrap">
                        {row.status ?? ''}
                      </td>
                      <td className="px-3 py-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            if (!batchId) return;
                            const params = new URLSearchParams({ batchId });
                            if (row.runId) params.set('runId', row.runId);
                            navigate(`/claims/${encodeURIComponent(row.claimId)}?${params.toString()}`);
                          }}
                          className="text-xs text-[#FF612B] hover:underline"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-900">
              Event log{' '}
              <span className="text-xs font-normal text-gray-500">
                ({filteredEvents.length}
                {showVerbose ? '' : ` of ${events.length}`})
              </span>
            </h3>
            <label className="inline-flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showVerbose}
                onChange={(e) => setShowVerbose(e.target.checked)}
                className="h-3.5 w-3.5 accent-[#FF612B]"
              />
              Show agent logs
            </label>
          </div>
          <div className="border border-gray-200 rounded divide-y divide-gray-100 max-h-[360px] overflow-auto bg-white">
            {reversedEvents.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-8">No events yet</p>
            ) : (
              reversedEvents.map((ev, i) => {
                const summary = summarizeEvent(ev);
                return (
                  <div
                    key={`${ev.type}-${i}`}
                    className="flex items-start gap-2 px-2 py-1.5 text-xs hover:bg-gray-50"
                  >
                    <span
                      className={`inline-flex items-center shrink-0 px-1.5 py-0.5 rounded border font-medium font-mono ${eventBadgeClasses(ev.type)}`}
                    >
                      {ev.type}
                    </span>
                    <span className="text-gray-700 wrap-break-word leading-snug min-w-0">
                      {summary || (
                        <span className="text-gray-400 italic">no payload</span>
                      )}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>

      <footer className="px-5 py-3 border-t border-gray-200 flex justify-end gap-3">
        {status === 'RUNNING' ? (
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium text-gray-700 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
          >
            <X className="h-3.5 w-3.5" />
            Cancel
          </button>
        ) : null}
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-1.5 text-sm font-medium text-white bg-[#FF612B] hover:bg-[#e5561f] rounded transition-colors"
        >
          Close
        </button>
      </footer>
    </div>
  );
}
