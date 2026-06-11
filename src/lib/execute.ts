import { API_BASE, ApiError } from '@/lib/api';
import { clearAuth } from '@/utils/auth';
import { buildLoginPath } from '@/utils/redirect';
import type {
  AsyncBatchResponse,
  BatchDetail,
  BatchEventType,
  ClaimAgentsSnapshot,
  ClaimProcessingSnapshot,
  ClaimSummarySnapshot,
  ClaimTraceStep,
  ProcessedRunsPage,
  ProcessedRunsQuery,
  RunDetail,
  RunNodesPayload,
  RunSummary,
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

function handleUnauthorized(res: Response): void {
  if (res.status !== 401 || typeof window === 'undefined') return;
  clearAuth();
  const path = window.location.pathname;
  if (path !== '/login' && path !== '/register') {
    const returnTo = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    window.location.replace(buildLoginPath(returnTo));
  }
}

async function checkResponse<T>(res: Response, fallback: string): Promise<T> {
  const payload = await parseJson(res);
  if (!res.ok) {
    handleUnauthorized(res);
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

export async function listProcessedRuns(
  token: string,
  options?: ProcessedRunsQuery,
): Promise<ProcessedRunsPage> {
  const params = new URLSearchParams();
  if (options?.limit != null) params.set('limit', String(options.limit));
  if (options?.offset != null) params.set('offset', String(options.offset));
  if (options?.claimId) params.set('claim_id', options.claimId);
  if (options?.claimStatus) params.set('claim_status', options.claimStatus);
  if (options?.fromDate) params.set('from_date', options.fromDate);
  if (options?.toDate) params.set('to_date', options.toDate);
  const qs = params.toString();
  const url = `${API_BASE}/api/execute/runs/${qs ? `?${qs}` : ''}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 401) {
    handleUnauthorized(res);
    return { count: 0, limit: 0, offset: 0, results: [] };
  }
  return checkResponse<ProcessedRunsPage>(res, `list-runs failed (${res.status})`);
}

/** Fetch every processed claim run (pages through the API automatically). */
export async function listAllProcessedRuns(token: string): Promise<RunSummary[]> {
  const pageSize = 500;
  let offset = 0;
  const all: RunSummary[] = [];
  while (true) {
    const page = await listProcessedRuns(token, { limit: pageSize, offset });
    all.push(...page.results);
    if (all.length >= page.count || page.results.length === 0) break;
    offset += pageSize;
  }
  return all;
}

export async function getLatestBatch(token: string): Promise<BatchDetail | null> {
  const res = await fetch(`${API_BASE}/api/execute/batches/latest/`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 404) return null;
  if (res.status === 401) {
    handleUnauthorized(res);
    return null;
  }
  return checkResponse<BatchDetail>(res, `get-latest-batch failed (${res.status})`);
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

function claimDetailUrl(
  claimId: string,
  section: 'summary' | 'agents' | 'processing',
  options?: { runId?: string; batchId?: string },
): string {
  const params = new URLSearchParams();
  if (options?.runId) params.set('run_id', options.runId);
  if (options?.batchId) params.set('batch_id', options.batchId);
  const qs = params.toString();
  return `${API_BASE}/api/claims/${encodeURIComponent(claimId)}/${section}/${qs ? `?${qs}` : ''}`;
}

export async function getClaimSummary(
  token: string,
  claimId: string,
  options?: { runId?: string; batchId?: string },
): Promise<ClaimSummarySnapshot | null> {
  const res = await fetch(claimDetailUrl(claimId, 'summary', options), {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 404) return null;
  if (res.status === 401) {
    handleUnauthorized(res);
    return null;
  }
  return checkResponse<ClaimSummarySnapshot>(res, `claim summary failed (${res.status})`);
}

export async function getClaimAgents(
  token: string,
  claimId: string,
  options?: { runId?: string; batchId?: string },
): Promise<ClaimAgentsSnapshot | null> {
  const res = await fetch(claimDetailUrl(claimId, 'agents', options), {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 404) return null;
  if (res.status === 401) {
    handleUnauthorized(res);
    return null;
  }
  return checkResponse<ClaimAgentsSnapshot>(res, `claim agents failed (${res.status})`);
}

export async function getClaimProcessing(
  token: string,
  claimId: string,
  options?: { runId?: string; batchId?: string },
): Promise<ClaimProcessingSnapshot | null> {
  const res = await fetch(claimDetailUrl(claimId, 'processing', options), {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 404) return null;
  return checkResponse<ClaimProcessingSnapshot>(res, `claim processing failed (${res.status})`);
}

function claimTraceUrl(
  claimId: string,
  kind: 'trace' | 'explainability',
  options?: { runId?: string; batchId?: string; download?: boolean },
): string {
  const params = new URLSearchParams();
  if (options?.runId) params.set('run_id', options.runId);
  if (options?.batchId) params.set('batch_id', options.batchId);
  if (options?.download) params.set('download', '1');
  const qs = params.toString();
  return `${API_BASE}/api/claims/${encodeURIComponent(claimId)}/${kind}/${qs ? `?${qs}` : ''}`;
}

export async function getClaimTrace(
  token: string,
  claimId: string,
  options?: { runId?: string; batchId?: string },
): Promise<ClaimTraceStep[]> {
  const res = await fetch(claimTraceUrl(claimId, 'trace', options), {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 404) return [];
  const payload = await checkResponse<unknown>(res, `claim trace failed (${res.status})`);
  return Array.isArray(payload) ? (payload as ClaimTraceStep[]) : [];
}

export async function getClaimExplainability(
  token: string,
  claimId: string,
  options?: { runId?: string; batchId?: string },
): Promise<unknown[]> {
  const res = await fetch(claimTraceUrl(claimId, 'explainability', options), {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 404) return [];
  const payload = await checkResponse<unknown>(res, `claim explainability failed (${res.status})`);
  return Array.isArray(payload) ? (payload as unknown[]) : [];
}

/** Trigger a browser download of the trace/explainability JSON (auth header
 *  required, so fetch the blob rather than navigating). */
export async function downloadClaimTraceJson(
  token: string,
  claimId: string,
  kind: 'trace' | 'explainability',
  options?: { runId?: string; batchId?: string },
): Promise<void> {
  const res = await fetch(claimTraceUrl(claimId, kind, { ...options, download: true }), {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const payload = await parseJson(res);
    throw new ApiError(res.status, jsonMessage(payload, `download failed (${res.status})`), payload);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${kind}_${claimId}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
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
