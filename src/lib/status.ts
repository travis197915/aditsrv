/**
 * Single source of truth for the audit status model.
 *
 * The platform reports exactly three audit outcomes:
 *   CLEAN        — the claim passed (engine ALLOW / all checks Met)
 *   DEFECT       — a problem was found (DENY/STOP/REFER/PEND, early stop, or any Not-Met check)
 *   INCONCLUSIVE — could not be determined (still running, fetch/exec failure, no decision)
 *
 * Legacy MET / NOT_MET labels and raw engine decision types are normalized
 * onto these three everywhere they surface in the UI.
 */
export type AuditStatus = 'CLEAN' | 'DEFECT' | 'INCONCLUSIVE';

const _CLEAN = new Set(['MET', 'CLEAN', 'ALLOW', 'PASS', 'PASSED', 'OK']);
const _DEFECT = new Set([
  'NOTMET', 'DEFECT', 'DENY', 'DENIED', 'STOP', 'REFER', 'PEND', 'PENDING',
  'FAIL', 'FAILED', 'REJECT', 'REJECTED',
]);

/** Normalize any legacy status / decision-type string to one of the three. */
export function normalizeAuditStatus(raw: string | null | undefined): AuditStatus {
  const s = String(raw ?? '').toUpperCase().replace(/[^A-Z]/g, '');
  if (_CLEAN.has(s)) return 'CLEAN';
  if (_DEFECT.has(s)) return 'DEFECT';
  return 'INCONCLUSIVE';
}

/**
 * Derive an audit status from the engine's authoritative run signals.
 * Used at the claim level when no per-step trace is available.
 */
export function decisionToAuditStatus(opts: {
  finalDecisionType?: string | null;
  runStatus?: string | null;
}): AuditStatus {
  const d = String(opts.finalDecisionType ?? '').toUpperCase();
  const r = String(opts.runStatus ?? '').toUpperCase();
  if (r === 'RUNNING') return 'INCONCLUSIVE';
  if (r === 'FAILED' || r === 'FETCH_FAILED') return 'INCONCLUSIVE';
  if (r === 'TERMINATED_EARLY') return 'DEFECT';
  if (d === 'DENY' || d === 'STOP' || d === 'REFER' || d === 'PEND') return 'DEFECT';
  if (d === 'ALLOW') return 'CLEAN';
  return 'INCONCLUSIVE';
}

/**
 * Roll a set of per-step/per-rule statuses up to a single audit status:
 * any DEFECT → DEFECT; all CLEAN → CLEAN; otherwise INCONCLUSIVE.
 * Returns null when there is nothing to aggregate.
 */
export function aggregateTraceAudit(
  statuses: (string | null | undefined)[],
): AuditStatus | null {
  if (!statuses.length) return null;
  const mapped = statuses.map(normalizeAuditStatus);
  if (mapped.some((s) => s === 'DEFECT')) return 'DEFECT';
  if (mapped.every((s) => s === 'CLEAN')) return 'CLEAN';
  return 'INCONCLUSIVE';
}

export type ReviewWorkflowStatus = 'pending' | 'in_progress' | 'completed';

/** Normalize auditor review workflow status from API payloads. */
export function normalizeReviewWorkflowStatus(
  raw: string | null | undefined,
): ReviewWorkflowStatus | undefined {
  const s = String(raw ?? '').trim().toLowerCase().replace(/-/g, '_');
  if (s === 'pending') return 'pending';
  if (s === 'in_progress' || s === 'inprogress') return 'in_progress';
  if (
    s === 'completed'
    || s === 'complete'
    || s === 'done'
    || s === 'approved'
    || s === 'approve'
    || s === 'rejected'
    || s === 'reject'
  ) {
    return 'completed';
  }
  return undefined;
}

/** Missing or unknown API values are treated as pending (waiting for auditor). */
export function reviewWorkflowStatusOrDefault(
  raw: string | null | undefined,
): ReviewWorkflowStatus {
  return normalizeReviewWorkflowStatus(raw) ?? 'pending';
}

/** Raw review status string from a run/list row, if present and mappable. */
export function readReviewStatusRaw(
  record: Record<string, unknown> | null | undefined,
): string | undefined {
  if (!record) return undefined;

  const nested =
    record.claim && typeof record.claim === 'object'
      ? (record.claim as Record<string, unknown>)
      : undefined;

  const candidates: unknown[] = [
    record.review_status,
    record.reviewStatus,
    record.auditor_review_status,
    record.auditorReviewStatus,
    nested?.review_status,
    nested?.reviewStatus,
    record.auditorStatus,
    nested?.auditorStatus,
    record.auditor_status,
    nested?.auditor_status,
  ];

  for (const value of candidates) {
    if (typeof value !== 'string' || !value.trim()) continue;
    const trimmed = value.trim();
    if (normalizeReviewWorkflowStatus(trimmed)) return trimmed;
  }

  return undefined;
}

/** Read review workflow status from a run/list row (defaults to pending). */
export function reviewWorkflowStatusFromRun(
  run: Record<string, unknown> | null | undefined,
): ReviewWorkflowStatus {
  return reviewWorkflowStatusOrDefault(readReviewStatusRaw(run));
}

/** Read auditor feedback from a claim/run snapshot. */
export function readFeedbackFromRecord(
  record: Record<string, unknown> | null | undefined,
): string | undefined {
  if (!record) return undefined;

  const nested =
    record.claim && typeof record.claim === 'object'
      ? (record.claim as Record<string, unknown>)
      : undefined;

  for (const value of [
    record.feedback,
    record.auditor_feedback,
    record.auditorFeedback,
    record.review_feedback,
    record.reviewFeedback,
    record.review_comment,
    record.reviewComment,
    record.auditor_comment,
    record.auditorComment,
    nested?.feedback,
    nested?.auditor_feedback,
    nested?.auditorFeedback,
    nested?.review_feedback,
    nested?.reviewFeedback,
  ]) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }

  return undefined;
}

function firstNonEmptyString(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}

/** Claim audited date from a processed run / list row (date portion for table display). */
export function readClaimAuditedDateFromRecord(
  record: Record<string, unknown> | null | undefined,
): string {
  if (!record) return '';

  const nested =
    record.claim && typeof record.claim === 'object'
      ? (record.claim as Record<string, unknown>)
      : undefined;

  const candidates: unknown[] = [
    record.reviewed_at_date,
    record.reviewedAtDate,
    record.claim_audited_date,
    record.claimAuditedDate,
    record.audited_date,
    record.auditedDate,
    record.auditor_review_date,
    record.auditorReviewDate,
    record.review_completed_date,
    record.reviewCompletedDate,
    record.review_completed_at_date,
    record.reviewCompletedAtDate,
    record.audited_at_date,
    record.auditedAtDate,
    nested?.reviewed_at_date,
    nested?.reviewedAtDate,
    nested?.claim_audited_date,
    nested?.claimAuditedDate,
    nested?.audited_date,
    nested?.auditedDate,
    nested?.review_completed_date,
    nested?.reviewCompletedDate,
  ];

  const dateOnly = firstNonEmptyString(...candidates);
  if (dateOnly) return dateOnly;

  const datePart = firstNonEmptyString(
    record.claim_audited_at_date,
    record.claimAuditedAtDate,
    nested?.claim_audited_at_date,
    nested?.claimAuditedAtDate,
  );
  const timePart = firstNonEmptyString(
    record.reviewed_at,
    record.reviewedAt,
    record.claim_audited_at,
    record.claimAuditedAt,
    record.audited_at,
    record.auditedAt,
    record.review_completed_at,
    record.reviewCompletedAt,
    record.auditor_reviewed_at,
    record.auditorReviewedAt,
    nested?.reviewed_at,
    nested?.reviewedAt,
    nested?.claim_audited_at,
    nested?.claimAuditedAt,
    nested?.audited_at,
    nested?.review_completed_at,
  );

  if (datePart && timePart) return `${datePart} ${timePart}`;
  return timePart || datePart;
}

export function reviewWorkflowStatusLabel(status: ReviewWorkflowStatus): string {
  switch (status) {
    case 'pending': return 'Pending';
    case 'in_progress': return 'In Progress';
    case 'completed': return 'Completed';
  }
}

export type ReviewOutcome = 'APPROVED' | 'REJECTED';

/** Approve/reject outcome when review workflow is completed. */
export function readReviewOutcome(
  raw: string | null | undefined,
): ReviewOutcome | undefined {
  const s = String(raw ?? '').trim().toLowerCase().replace(/-/g, '_');
  if (s === 'approved' || s === 'approve') return 'APPROVED';
  if (s === 'rejected' || s === 'reject') return 'REJECTED';
  return undefined;
}

export function readReviewOutcomeFromRecord(
  record: Record<string, unknown> | null | undefined,
): ReviewOutcome | undefined {
  if (!record) return undefined;

  const nested =
    record.claim && typeof record.claim === 'object'
      ? (record.claim as Record<string, unknown>)
      : undefined;

  for (const value of [
    record.review_status,
    record.reviewStatus,
    record.auditor_review_status,
    record.auditorReviewStatus,
    record.auditor_status,
    record.auditorStatus,
    nested?.review_status,
    nested?.reviewStatus,
    nested?.auditor_status,
    nested?.auditorStatus,
  ]) {
    const outcome = readReviewOutcome(
      typeof value === 'string' ? value : undefined,
    );
    if (outcome) return outcome;
  }

  return undefined;
}
