import { API_BASE, ApiError } from '@/lib/api';
import type {
  AsyncBatchResponse,
  BatchDetail,
  BatchEventType,
  ClaimProcessingSnapshot,
  RunDetail,
  RunNodesPayload,
  Workflow,
} from '@/types/execute';

type BatchUploadOptions = {
  claimIdColumn?: string;
  sheetName?: string;
};

function jsonMessage(payload: unknown, fallback: string): string {
  if (payload && typeof payload === 'object') {
    const obj = payload as Record<string, unknown>;
    if (typeof obj.error === 'string') return obj.error;
    if (typeof obj.detail === 'string') return obj.detail;
  }
  return fallback;
}

async function parseJson(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function buildUploadForm(file: File, options?: BatchUploadOptions): FormData {
  const body = new FormData();
  body.append('file', file);
  if (options?.claimIdColumn) body.append('claim_id_column', options.claimIdColumn);
  if (options?.sheetName) body.append('sheet_name', options.sheetName);
  return body;
}

async function checkResponse<T>(res: Response, fallback: string): Promise<T> {
  const payload = await parseJson(res);
  if (!res.ok) {
    throw new ApiError(res.status, jsonMessage(payload, fallback), payload);
  }
  return payload as T;
}

export async function listWorkflows(token: string): Promise<Workflow[]> {
  const res = await fetch(`${API_BASE}/api/builder/workflows/`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  });
  const payload = await checkResponse<unknown>(res, `workflows failed (${res.status})`);
  if (Array.isArray(payload)) return payload as Workflow[];
  if (payload && typeof payload === 'object') {
    const values = payload as Record<string, unknown>;
    if (Array.isArray(values.results)) return values.results as Workflow[];
  }
  return [];
}

export async function runBatchSync(
  token: string,
  workflowId: string,
  file: File,
  options?: BatchUploadOptions,
): Promise<Record<string, unknown>> {
  const res = await fetch(`${API_BASE}/api/execute/workflows/${workflowId}/run-batch/`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: buildUploadForm(file, options),
  });
  return checkResponse<Record<string, unknown>>(res, `run-batch failed (${res.status})`);
}

export async function runBatchAsync(
  token: string,
  workflowId: string,
  file: File,
  options?: BatchUploadOptions,
): Promise<AsyncBatchResponse> {
  const res = await fetch(`${API_BASE}/api/execute/workflows/${workflowId}/run-batch-async/`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: buildUploadForm(file, options),
  });
  return checkResponse<AsyncBatchResponse>(res, `run-batch-async failed (${res.status})`);
}

export async function getBatch(token: string, batchId: string): Promise<BatchDetail | null> {
  const res = await fetch(`${API_BASE}/api/execute/batches/${batchId}/`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 404) return null;
  return checkResponse<BatchDetail>(res, `get-batch failed (${res.status})`);
}

export async function getRun(token: string, runId: string): Promise<RunDetail | null> {
  const res = await fetch(`${API_BASE}/api/execute/runs/${runId}/`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 404) return null;
  return checkResponse<RunDetail>(res, `get-run failed (${res.status})`);
}

export async function getRunNodes(token: string, runId: string): Promise<RunNodesPayload | null> {
  const res = await fetch(`${API_BASE}/api/execute/runs/${runId}/nodes/`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 404) return null;
  return checkResponse<RunNodesPayload>(res, `get-run-nodes failed (${res.status})`);
}

export async function getClaimProcessing(
  token: string,
  claimId: string,
  options?: { runId?: string; batchId?: string },
): Promise<ClaimProcessingSnapshot | null> {
  const params = new URLSearchParams();
  if (options?.runId) params.set('run_id', options.runId);
  if (options?.batchId) params.set('batch_id', options.batchId);
  const qs = params.toString();
  const url = `${API_BASE}/api/claims/${encodeURIComponent(claimId)}/processing/${qs ? `?${qs}` : ''}`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 404) return null;
  return checkResponse<ClaimProcessingSnapshot>(res, `claim processing failed (${res.status})`);
}

export async function subscribeBatchEvents(
  token: string,
  batchId: string,
  onEvent: (type: BatchEventType, data: unknown) => void,
  signal?: AbortSignal,
): Promise<void> {
  const url = `${API_BASE}/api/execute/batches/${batchId}/events/`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'text/event-stream',
    },
    signal,
  });

  if (!res.ok || !res.body) {
    const payload = await parseJson(res);
    throw new ApiError(res.status, jsonMessage(payload, `SSE failed (${res.status})`), payload);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const chunks = buffer.split('\n\n');
    buffer = chunks.pop() ?? '';

    for (const chunk of chunks) {
      if (!chunk || chunk.startsWith(':')) continue;

      let eventType: BatchEventType = 'message';
      const dataLines: string[] = [];

      for (const line of chunk.split('\n')) {
        if (line.startsWith(':')) continue;
        if (line.startsWith('event:')) {
          const raw = line.slice(6).trim() as BatchEventType;
          eventType = raw || 'message';
        } else if (line.startsWith('data:')) {
          dataLines.push(line.slice(5).trim());
        }
      }

      if (dataLines.length === 0) continue;

      const rawPayload = dataLines.join('\n');
      let parsed: unknown = rawPayload;
      try {
        parsed = JSON.parse(rawPayload);
      } catch {
        // plain-text payloads are valid SSE data.
      }

      onEvent(eventType, parsed);

      if (eventType === 'summary' || eventType === 'error') return;
    }
  }
}
