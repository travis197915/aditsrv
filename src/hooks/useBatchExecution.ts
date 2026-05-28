import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { runBatchAsync, subscribeBatchEvents } from '@/lib/execute';
import { setLastBatchId } from '@/lib/lastBatch';
import type { BatchEvent, BatchStatus } from '@/types/execute';

type StartBatchInput = {
  workflowId: string;
  file: File;
  options?: {
    claimIdColumn?: string;
    sheetName?: string;
  };
};

export function useBatchExecution(token: string | null) {
  const [batchId, setBatchId] = useState<string | null>(null);
  const [events, setEvents] = useState<BatchEvent[]>([]);
  const [status, setStatus] = useState<BatchStatus>('IDLE');
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setStatus((prev) => (prev === 'RUNNING' ? 'IDLE' : prev));
  }, []);

  const start = useCallback(
    async ({ workflowId, file, options }: StartBatchInput) => {
      if (!token) throw new Error('Not authenticated');

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setEvents([]);
      setError(null);
      setStatus('RUNNING');

      try {
        const batch = await runBatchAsync(token, workflowId, file, options);
        setBatchId(batch.batch_id);
        setLastBatchId(batch.batch_id);
        setEvents((prev) => [...prev, { type: 'message', data: { phase: 'start', ...batch } }]);

        await subscribeBatchEvents(
          token,
          batch.batch_id,
          (type, data) => {
            setEvents((prev) => [...prev, { type, data }]);
            if (type === 'summary') setStatus('DONE');
            if (type === 'error') setStatus('ERROR');
          },
          controller.signal,
        );
      } catch (err) {
        const isAbort = err instanceof DOMException && err.name === 'AbortError';
        if (!isAbort) {
          setStatus('ERROR');
          setError(err instanceof Error ? err.message : 'Batch subscription failed');
          throw err;
        }
      } finally {
        if (abortRef.current === controller) {
          abortRef.current = null;
        }
      }
    },
    [token],
  );

  useEffect(() => () => abortRef.current?.abort(), []);

  return useMemo(
    () => ({
      batchId,
      events,
      status,
      error,
      start,
      cancel,
    }),
    [batchId, events, status, error, start, cancel],
  );
}
