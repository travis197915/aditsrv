const LAST_BATCH_KEY = 'last_batch_id';

export function setLastBatchId(batchId: string): void {
  try {
    window.localStorage.setItem(LAST_BATCH_KEY, batchId);
  } catch {
    /* ignore */
  }
}

export function getLastBatchId(): string | null {
  try {
    return window.localStorage.getItem(LAST_BATCH_KEY);
  } catch {
    return null;
  }
}

export function clearLastBatchId(): void {
  try {
    window.localStorage.removeItem(LAST_BATCH_KEY);
  } catch {
    /* ignore */
  }
}
