import { useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { subscribeBatchEvents } from '@/lib/execute';
import type {
  BatchEventType,
  ClaimProcessingAgent,
  ClaimStatus,
  RuleEvaluationDetail,
} from '@/types/execute';

type LiveShape = {
  shapeId: string;
  shapeLabel: string;
  rulesTotal: number;
  evaluations: RuleEvaluationDetail[];
  startedAtMs: number;
  endedAtMs: number;
  completed: boolean;
};

export type LiveClaimRunState = {
  /** True while we expect more events for this claim. */
  active: boolean;
  /** Live per-shape rollup, ordered by first-seen. */
  shapes: LiveShape[];
  /** Set once the engine emits a terminal `claim` event for this claim. */
  claimDone: boolean;
  /** Last `claim` event's status, if any (RUNNING, COMPLETED, …). */
  claimStatus: string | undefined;
  /** Last `error` event message, if any. */
  error: string | null;
  /** Count of events the hook has ingested (for debugging / UI hints). */
  eventCount: number;
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function num(v: unknown, fallback = 0): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

function str(v: unknown, fallback = ''): string {
  return typeof v === 'string' ? v : fallback;
}

function ruleFromEvent(
  raw: Record<string, unknown>,
  orderIndex: number,
): RuleEvaluationDetail {
  const codesRaw = raw.codes;
  return {
    orderIndex,
    ruleKey: str(raw.rule_key),
    ruleSource: str(raw.rule_source, 'decision'),
    condition: str(raw.condition),
    action: str(raw.action),
    matched: !!raw.matched,
    decisionType: str(raw.decision_type),
    confidence: num(raw.confidence),
    reasoning: str(raw.reasoning),
    codes: Array.isArray(codesRaw)
      ? (codesRaw.filter((c) => typeof c === 'string') as string[])
      : [],
    llmProvider: str(raw.llm_provider),
    llmMs: num(raw.llm_ms),
  };
}

/**
 * Subscribe to the batch SSE stream and accumulate ONE claim's
 * shape_start / shape_complete / rule_evaluated events into a live,
 * per-shape rollup the detail page can render.
 *
 * Idempotent: re-emitted hops (SSE retry) are deduped on (shape_id, rule_key).
 * When the engine emits the terminal `claim` event for this claim, the hook
 * invalidates the snapshot query so the page swaps to the persisted view.
 */
export function useLiveClaimRun({
  token,
  claimId,
  batchId,
  enabled,
}: {
  token: string | null;
  claimId: string;
  batchId: string | undefined;
  enabled: boolean;
}): LiveClaimRunState {
  const queryClient = useQueryClient();
  const [shapeMap, setShapeMap] = useState<Map<string, LiveShape>>(new Map());
  const [claimDone, setClaimDone] = useState(false);
  const [claimStatus, setClaimStatus] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [eventCount, setEventCount] = useState(0);
  const seenRulesRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!enabled || !token || !batchId || !claimId) return;

    const ctrl = new AbortController();
    let cancelled = false;

    const onEvent = (type: BatchEventType, payload: unknown) => {
      if (cancelled) return;
      if (!isPlainObject(payload)) return;
      setEventCount((n) => n + 1);

      const evClaim = str(payload.claim_id) || str(payload.claimId);

      if (type === 'shape_start' && evClaim === claimId) {
        const shapeId = str(payload.shape_id);
        if (!shapeId) return;
        setShapeMap((prev) => {
          if (prev.has(shapeId)) return prev;
          const next = new Map(prev);
          const now = Date.now();
          next.set(shapeId, {
            shapeId,
            shapeLabel: str(payload.shape_label),
            rulesTotal: num(payload.rules_total),
            evaluations: [],
            startedAtMs: now,
            endedAtMs: now,
            completed: false,
          });
          return next;
        });
        return;
      }

      if (type === 'shape_complete' && evClaim === claimId) {
        const shapeId = str(payload.shape_id);
        if (!shapeId) return;
        setShapeMap((prev) => {
          const next = new Map(prev);
          const existing = next.get(shapeId);
          const now = Date.now();
          if (!existing) {
            next.set(shapeId, {
              shapeId,
              shapeLabel: str(payload.shape_label),
              rulesTotal: num(payload.rules_total),
              evaluations: [],
              startedAtMs: now,
              endedAtMs: now,
              completed: true,
            });
          } else {
            next.set(shapeId, {
              ...existing,
              rulesTotal: existing.rulesTotal || num(payload.rules_total),
              endedAtMs: now,
              completed: true,
            });
          }
          return next;
        });
        return;
      }

      if (type === 'rule_evaluated' && evClaim === claimId) {
        const shapeId = str(payload.shape_id);
        const ruleKey = str(payload.rule_key);
        if (!shapeId || !ruleKey) return;
        const dedupKey = `${shapeId}::${ruleKey}`;
        if (seenRulesRef.current.has(dedupKey)) return;
        seenRulesRef.current.add(dedupKey);

        setShapeMap((prev) => {
          const next = new Map(prev);
          const now = Date.now();
          const existing = next.get(shapeId) ?? {
            shapeId,
            shapeLabel: str(payload.shape_label),
            rulesTotal: 0,
            evaluations: [],
            startedAtMs: now,
            endedAtMs: now,
            completed: false,
          };
          const orderIndex = existing.evaluations.length;
          next.set(shapeId, {
            ...existing,
            shapeLabel: existing.shapeLabel || str(payload.shape_label),
            evaluations: [
              ...existing.evaluations,
              ruleFromEvent(payload, orderIndex),
            ],
            endedAtMs: now,
          });
          return next;
        });
        return;
      }

      if (type === 'claim' && evClaim === claimId) {
        const status = str(payload.status);
        if (status) setClaimStatus(status);
        if (status && status !== 'RUNNING') {
          setClaimDone(true);
          // Snapshot is now authoritative — refetch every query keyed by
          // this claim id, regardless of batch/run params.
          queryClient.invalidateQueries({
            predicate: (q) =>
              Array.isArray(q.queryKey) &&
              ['claim-summary', 'claim-agents', 'claim-trace'].includes(
                String(q.queryKey[0]),
              ) &&
              q.queryKey[1] === claimId,
          });
        }
        return;
      }

      if (type === 'error') {
        setError(str(payload.message) || str(payload.error) || 'Engine error');
      }
    };

    subscribeBatchEvents(token, batchId, onEvent, ctrl.signal).catch(
      (err: unknown) => {
        if (cancelled) return;
        if (err instanceof DOMException && err.name === 'AbortError') return;
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg);
      },
    );

    return () => {
      cancelled = true;
      ctrl.abort();
    };
  }, [enabled, token, batchId, claimId, queryClient]);

  const shapes = useMemo(() => Array.from(shapeMap.values()), [shapeMap]);

  return {
    active: enabled && !!batchId && !claimDone,
    shapes,
    claimDone,
    claimStatus,
    error,
    eventCount,
  };
}

/** Project one live shape into the {@link ClaimProcessingAgent} contract so
 *  the existing AgentCard component can render it without a special case. */
export function liveShapeToAgent(shape: LiveShape): ClaimProcessingAgent {
  const matched = shape.evaluations.filter((e) => e.matched).length;
  const denyOrStop = shape.evaluations.some(
    (e) => e.matched && (e.decisionType === 'DENY' || e.decisionType === 'STOP'),
  );
  let status: ClaimStatus = 'INCONCLUSIVE';
  if (denyOrStop) status = 'DEFECT';
  else if (matched > 0) status = 'CLEAN';

  const durationSec = Math.max(
    0,
    Math.floor((shape.endedAtMs - shape.startedAtMs) / 1000),
  );

  const fmt = (ms: number) => new Date(ms).toLocaleTimeString();

  return {
    id: shape.shapeId,
    agentName: shape.shapeLabel || shape.shapeId,
    status,
    beginTime: fmt(shape.startedAtMs),
    endTime: fmt(shape.endedAtMs),
    durationSec,
    processSummary: shape.evaluations
      .map((e) => e.reasoning)
      .filter((r): r is string => !!r)
      .slice(0, 10),
    steps: [],
    evaluations: shape.evaluations,
  };
}
