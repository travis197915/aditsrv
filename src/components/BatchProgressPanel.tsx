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
    case 'shape_start':
      return 'bg-purple-50 text-purple-700 border-purple-200';
    case 'rule_evaluated':
      return 'bg-amber-50 text-amber-700 border-amber-200';
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

function summarizeEvent(event: BatchEvent): string {
  const { data } = event;
  if (typeof data === 'string') return data;
  if (!isPlainObject(data)) return '';

  if (event.type === 'claim') {
    const id = asString(data.claim_id) ?? asString(data.claimId) ?? '?';
    const s = asString(data.status) ?? '';
    return `${id}${s ? ` · ${s}` : ''}`;
  }

  if (event.type === 'shape_start') {
    return asString(data.shape_name) ?? asString(data.name) ?? '';
  }

  if (event.type === 'rule_evaluated') {
    const rule = asString(data.rule_name) ?? asString(data.rule) ?? 'rule';
    const result = asString(data.result) ?? '';
    return `${rule}${result ? ` · ${result}` : ''}`;
  }

  if (event.type === 'summary') {
    const total = data.total ?? data.total_runs;
    const ok = data.met ?? data.passed;
    const fail = data.not_met ?? data.failed;
    const parts = [
      total != null ? `total ${total}` : null,
      ok != null ? `met ${ok}` : null,
      fail != null ? `not_met ${fail}` : null,
    ].filter(Boolean);
    if (parts.length > 0) return parts.join(' · ');
  }

  if (event.type === 'error') {
    return asString(data.message) ?? asString(data.error) ?? 'Engine error';
  }

  return '';
}

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

  const reversedEvents = useMemo(() => [...events].reverse(), [events]);

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
            <span>Batch finished. {summarizeEvent(summary)}</span>
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
          <h3 className="text-sm font-semibold text-gray-900 mb-2">Event log</h3>
          <div className="border border-gray-200 rounded p-2 space-y-1 max-h-[320px] overflow-auto">
            {reversedEvents.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-6">No events yet</p>
            ) : (
              reversedEvents.map((ev, i) => (
                <div key={`${ev.type}-${i}`} className="flex items-start gap-2 text-xs">
                  <span
                    className={`inline-flex items-center px-1.5 py-0.5 rounded border font-medium ${eventBadgeClasses(ev.type)}`}
                  >
                    {ev.type}
                  </span>
                  <span className="text-gray-600 break-all">{summarizeEvent(ev)}</span>
                </div>
              ))
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
