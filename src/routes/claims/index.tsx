import { useEffect, useMemo, useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Search, ChevronLeft, ChevronRight, Upload, XCircle,
  Newspaper, TrendingUp, Clock, FileText, Eye,
} from 'lucide-react';
import TopNavLayout from '@/layouts/TopNavLayout';
import { AiStatusChip, ReviewWorkflowStatusCell } from '@/components/StatusChip';
import DateFilterInput from '@/components/DateFilterInput';
import RunBatchModal from '@/components/RunBatchModal';
import { useAuth } from '@/contexts/AuthContext';
import { listProcessedRuns } from '@/lib/execute';
import { getToken } from '@/utils/auth';
import { normalizeAuditStatus, decisionToAuditStatus, readFeedbackFromRecord, reviewWorkflowStatusFromRun } from '@/lib/status';
import type { ClaimStatus, ReviewWorkflowStatus, RunSummary } from '@/types/execute';

type BatchTableRow = {
  claimId: string;
  runId: string;
  batchId: string;
  claimStatus: ClaimStatus;
  reviewStatus: ReviewWorkflowStatus;
  feedback: string;
  runStatus: string;
  processingTimeMin: number;
  startedAt: string;
  finishedAt: string;
  finishedAtDate: string;
  auditorStatus: string;
  auditedErrorCategory: string;
  auditedErrorDescription: string;
};

function firstString(...values: unknown[]): string {
  for (const v of values) {
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return '';
}

function mmDdYyyyToIso(value: string): string {
  const match = /^(\d{2})-(\d{2})-(\d{4})$/.exec(value.trim());
  if (!match) return '';
  const [, month, day, year] = match;
  return `${year}-${month}-${day}`;
}

function deriveReviewWorkflowStatus(run: RunSummary): ReviewWorkflowStatus {
  return reviewWorkflowStatusFromRun(run as Record<string, unknown>);
}

function StatCard({
  icon: Icon,
  label,
  value,
  suffix,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  suffix?: string;
}) {
  return (
    <div className="bg-[#fce8db] border border-[#e8a07a] rounded-xl px-6 py-5 flex items-center gap-4">
      <Icon className="h-10 w-10 text-[#FF612B] shrink-0" strokeWidth={1.5} />
      <div className="ml-auto text-right">
        <div className="text-2xl font-bold text-[#4a4a4a]">
          {value}{suffix}
        </div>
        <div className="text-sm font-semibold text-[#FF612B] mt-0.5">{label}</div>
      </div>
    </div>
  );
}

/**
 * AUDITOR STATUS cell. When the run carries audited-error data (category /
 * description from the ERA report), the cell becomes a clickable chip that
 * toggles a tooltip popover, matching section 6.6 of the training guide.
 * Falls back to a plain `—` when no auditor data is present.
 */
function AuditorStatusCell({ row }: { row: BatchTableRow }) {
  const [open, setOpen] = useState(false);
  const hasDetails = !!(row.auditedErrorCategory || row.auditedErrorDescription);
  const label = row.auditorStatus || (hasDetails ? 'AUDITED' : '');

  if (!label && !hasDetails) {
    return <span className="text-gray-500">—</span>;
  }

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          if (hasDetails) setOpen((o) => !o);
        }}
        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide whitespace-nowrap ${
          hasDetails
            ? 'bg-[#ede4f5] text-[#581c87] border-[#b794c9] cursor-pointer hover:brightness-95'
            : 'bg-gray-100 text-gray-600 border-gray-200'
        }`}
      >
        {label || 'AUDITED'}
      </button>

      {open && hasDetails && (
        <>
          <div className="fixed inset-0 z-10" onClick={(e) => { e.stopPropagation(); setOpen(false); }} />
          <div
            className="absolute left-0 top-full mt-1.5 z-20 w-72 rounded-md border border-gray-200 bg-white shadow-lg p-3 text-left normal-case"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="grid grid-cols-[110px_1fr] gap-x-3 gap-y-2">
              <div className="text-xs text-gray-500">Audited Error Category</div>
              <div className="text-xs font-semibold text-gray-900">
                {row.auditedErrorCategory || '—'}
              </div>
              <div className="text-xs text-gray-500">Audited Error Description</div>
              <div className="text-xs text-gray-700 leading-relaxed">
                {row.auditedErrorDescription || '—'}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function deriveClaimStatus(run: RunSummary): ClaimStatus {
  if (run.claim_status) {
    return normalizeAuditStatus(run.claim_status);
  }
  return decisionToAuditStatus({
    finalDecisionType: (run as { final_decision_type?: string }).final_decision_type,
    runStatus: String(run.run_status ?? run.status ?? ''),
  });
}

function mapRunToRow(run: RunSummary, idx: number): BatchTableRow {
  const claimId = String(run.claim_id ?? run.claimId ?? `claim-${idx + 1}`);
  const runId = String(run.run_id ?? run.runId ?? run.id ?? '');
  const batchId = String(run.batch_id ?? '');
  return {
    claimId,
    runId,
    batchId,
    claimStatus: deriveClaimStatus(run),
    reviewStatus: deriveReviewWorkflowStatus(run),
    feedback: readFeedbackFromRecord(run as Record<string, unknown>) ?? '',
    runStatus: String(run.run_status ?? run.status ?? ''),
    processingTimeMin: Number(run.processing_time_min ?? run.transaction_time_min ?? 0),
    startedAt: run.started_at_date && run.started_at
      ? `${run.started_at_date} ${run.started_at}`
      : String(run.started_at_date ?? run.started_at ?? ''),
    finishedAt: run.finished_at_date && run.finished_at
      ? `${run.finished_at_date} ${run.finished_at}`
      : String(run.finished_at_date ?? run.finished_at ?? ''),
    finishedAtDate: String(run.finished_at_date ?? ''),
    auditorStatus: firstString(run.auditor_status, run.audited_status),
    auditedErrorCategory: firstString(
      run.audited_error_category,
      run.auditor_error_category,
      run.error_category,
    ),
    auditedErrorDescription: firstString(
      run.audited_error_description,
      run.auditor_error_description,
      run.error_description,
    ),
  };
}

const ROWS_PER_PAGE_OPTIONS = [25, 50, 75, 100];

const TABLE_COLUMNS = [
  'CLAIM ID',
  'TOTAL BILLED AMOUNT',
  'TOTAL PAID AMOUNT',
  'LOB',
  'PAID DATE',
  'PLATFORM DATE',
  'CLAIM AUDITED DATE',
  'AUDITOR STATUS',
  'AI PLATFORM STATUS',
  'REVIEW STATUS',
  'TRANSACTION TIME(MINS)',
  'ACCURACY',
  'ACTION',
] as const;

const COL_COUNT = TABLE_COLUMNS.length;

// Pending state: what the user has typed/selected but not yet applied
type FilterState = {
  claimId: string;
  reviewStatus: string;
  status: string;
  fromDate: string;
  toDate: string;
};

const EMPTY_FILTER: FilterState = {
  claimId: '',
  reviewStatus: '',
  status: '',
  fromDate: '',
  toDate: '',
};

function hasAnyValue(f: FilterState) {
  return !!(f.claimId || f.reviewStatus || f.status || f.fromDate || f.toDate);
}

export default function ClaimsListingPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { canWrite } = useAuth();
  const token = getToken();

  // Pending = what's currently in the inputs (not yet committed)
  const [pending, setPending] = useState<FilterState>(EMPTY_FILTER);
  // Applied = what the query actually uses (committed on Apply)
  const [applied, setApplied] = useState<FilterState>(EMPTY_FILTER);

  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [runBatchOpen, setRunBatchOpen] = useState(false);
  const [runBatchOpenId, setRunBatchOpenId] = useState(0);

  // Buttons enabled only when the pending inputs have at least one value
  const filtersActive = hasAnyValue(pending);

  const openRunBatchModal = () => {
    setRunBatchOpenId((n) => n + 1);
    setRunBatchOpen(true);
  };

  const handleModalClose = () => {
    setRunBatchOpen(false);
    void queryClient.invalidateQueries({ queryKey: ['runs'] });
  };

  const handleApply = useCallback(() => {
    setApplied(pending);
    setCurrentPage(1);
  }, [pending]);

  const handleClear = useCallback(() => {
    setPending(EMPTY_FILTER);
    setApplied(EMPTY_FILTER);
    setCurrentPage(1);
  }, []);

  const fromIso = mmDdYyyyToIso(applied.fromDate);
  const toIso = mmDdYyyyToIso(applied.toDate);
  const offset = (currentPage - 1) * rowsPerPage;

  const runsQuery = useQuery({
    queryKey: [
      'runs',
      'processed',
      currentPage,
      rowsPerPage,
      applied.claimId,
      applied.status,
      applied.reviewStatus,
      fromIso,
      toIso,
    ],
    queryFn: () =>
      listProcessedRuns(token!, {
        limit: rowsPerPage,
        offset,
        claimId: applied.claimId || undefined,
        claimStatus: applied.status || undefined,
        reviewStatus: applied.reviewStatus || undefined,
        fromDate: fromIso || undefined,
        toDate: toIso || undefined,
      }),
    enabled: !!token,
    placeholderData: (prev) => prev,
  });

  const pageRows = useMemo(() => {
    return (runsQuery.data?.results ?? []).map((run, idx) =>
      mapRunToRow(run, offset + idx),
    );
  }, [runsQuery.data?.results, offset]);

  // Reset to page 1 when rows-per-page changes
  useEffect(() => {
    setCurrentPage(1);
  }, [rowsPerPage]);

  const total = runsQuery.data?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / rowsPerPage));
  const startIdx = total === 0 ? 0 : offset + 1;
  const endIdx = Math.min(offset + pageRows.length, total);

  const pageNumbers = (() => {
    const pages: (number | '...')[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');
      for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
        pages.push(i);
      }
      if (currentPage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  })();

  const avgProcessingTime = runsQuery.data?.avg_processing_time_min ?? 0;

  const handleRowClick = (row: BatchTableRow) => {
    const params = new URLSearchParams({ batchId: row.batchId });
    if (row.runId) params.set('runId', row.runId);
    navigate(`/claims/${encodeURIComponent(row.claimId)}?${params.toString()}`, {
      state: { listPreview: row },
    });
  };

  return (
    <TopNavLayout>
      <div className="mb-5">
        <h1 className="text-xl font-semibold text-gray-900">Claims Audit Review</h1>
        <p className="text-sm text-gray-500 mt-0.5">Review and Audit behavioural health claims.</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard icon={Newspaper} label="Total Claims Audited" value={total} />
        <StatCard icon={TrendingUp} label="Accuracy" value="—" suffix="%" />
        <StatCard icon={Clock} label="Average Processing Time" value={avgProcessingTime ? `${avgProcessingTime} min` : '—'} />
      </div>

      {!runsQuery.isLoading && total === 0 && !runsQuery.error && (
        <div className="mb-4 p-3 border border-gray-200 bg-white rounded text-sm text-gray-600">
          {canWrite ? 'No claims processed yet — click Upload to run a workflow batch.' : 'No claims processed yet.'}
        </div>
      )}

      {runsQuery.error && (
        <div className="mb-4 p-3 border border-red-200 bg-red-50 rounded text-sm text-red-700">
          {(runsQuery.error as Error).message}
        </div>
      )}

      {/* Filter bar */}
      <div className="flex flex-wrap items-end gap-x-4 gap-y-3 mb-4">
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Claim ID</label>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search Claim ID"
              value={pending.claimId}
              onChange={(e) => setPending((p) => ({ ...p, claimId: e.target.value }))}
              className="pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-[#FF612B] focus:border-[#FF612B] w-40"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Review Status</label>
          <select
            value={pending.reviewStatus}
            onChange={(e) => setPending((p) => ({ ...p, reviewStatus: e.target.value }))}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-[#FF612B] focus:border-[#FF612B] text-gray-600"
          >
            <option value="">Select Review Status</option>
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Status</label>
          <select
            value={pending.status}
            onChange={(e) => setPending((p) => ({ ...p, status: e.target.value }))}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-[#FF612B] focus:border-[#FF612B] text-gray-600"
          >
            <option value="">All</option>
            <option value="CLEAN">Clean</option>
            <option value="DEFECT">Defect</option>
            <option value="INCONCLUSIVE">Inconclusive</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">From Platform Date</label>
          <DateFilterInput
            value={pending.fromDate}
            onChange={(v) => setPending((p) => ({ ...p, fromDate: v }))}
            placeholder="mm-dd-yyyy"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">To Platform Date</label>
          <DateFilterInput
            value={pending.toDate}
            onChange={(v) => setPending((p) => ({ ...p, toDate: v }))}
            placeholder="mm-dd-yyyy"
          />
        </div>

        <button
          onClick={handleApply}
          disabled={!filtersActive}
          className="px-5 py-1.5 text-sm font-medium text-white bg-[#FF612B] hover:bg-[#e5551f] rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Apply
        </button>

        <button
          onClick={handleClear}
          disabled={!filtersActive}
          className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium text-[#FF612B] border border-[#FF612B] hover:bg-orange-50 rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <XCircle className="h-3.5 w-3.5" />
          Clear
        </button>

        {canWrite && (
          <button
            type="button"
            onClick={openRunBatchModal}
            className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium text-white bg-[#FF612B] hover:bg-[#e5551f] rounded transition-colors"
          >
            <Upload className="h-3.5 w-3.5" />
            Upload
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#fff3eb] border-b border-[#ffd6c4]">
                {TABLE_COLUMNS.map((col) => (
                  <th
                    key={col}
                    className="px-3 py-2.5 text-left text-[11px] font-semibold text-gray-700 uppercase tracking-wide whitespace-nowrap"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {runsQuery.isLoading ? (
                <tr>
                  <td colSpan={COL_COUNT} className="px-4 py-10 text-center text-sm text-gray-400">
                    Loading processed claims...
                  </td>
                </tr>
              ) : pageRows.length === 0 ? (
                <tr>
                  <td colSpan={COL_COUNT} className="px-4 py-10 text-center text-sm text-gray-400">
                    {hasAnyValue(applied)
                      ? 'No claims found matching your filters.'
                      : 'No processed claims yet. Run a batch to populate the audit review table.'}
                  </td>
                </tr>
              ) : (
                pageRows.map((row) => {
                  const needsReview = row.reviewStatus === 'pending';
                  return (
                    <tr
                      key={`${row.claimId}-${row.runId}`}
                      className="border-b border-gray-100 hover:bg-orange-50/40 transition-colors"
                    >
                      <td className="px-3 py-2 text-gray-800 font-medium whitespace-nowrap">{row.claimId}</td>
                      <td className="px-3 py-2 text-gray-500 whitespace-nowrap">—</td>
                      <td className="px-3 py-2 text-gray-500 whitespace-nowrap">—</td>
                      <td className="px-3 py-2 text-gray-500 whitespace-nowrap">—</td>
                      <td className="px-3 py-2 text-gray-500 whitespace-nowrap">—</td>
                      <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{row.finishedAtDate || '—'}</td>
                      <td className="px-3 py-2 text-gray-500 whitespace-nowrap">—</td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <AuditorStatusCell row={row} />
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <AiStatusChip status={row.claimStatus} />
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <ReviewWorkflowStatusCell status={row.reviewStatus} />
                      </td>
                      <td className="px-3 py-2 text-gray-600 tabular-nums">{row.processingTimeMin}</td>
                      <td className="px-3 py-2 text-gray-500">%</td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleRowClick(row)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded ${
                            needsReview
                              ? 'bg-[#FF612B] text-white hover:bg-[#e5551f]'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          } transition-colors`}
                        >
                          {needsReview ? (
                            <>
                              <FileText className="h-3 w-3" />
                              Pending
                            </>
                          ) : (
                            <>
                              <Eye className="h-3 w-3" />
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 flex-wrap gap-2">
          <div className="flex items-center gap-0.5">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1 || runsQuery.isLoading}
              className="h-8 w-8 flex items-center justify-center rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="h-4 w-4 text-gray-600" />
            </button>

            {pageNumbers.map((p, i) =>
              p === '...' ? (
                <span key={`ellipsis-${i}`} className="px-2 text-gray-400 text-sm">…</span>
              ) : (
                <button
                  key={p}
                  onClick={() => setCurrentPage(p as number)}
                  className={`h-8 min-w-[32px] px-2 text-sm border transition-colors ${
                    currentPage === p
                      ? 'bg-[#FF612B] text-white font-semibold border-[#FF612B]'
                      : 'border-gray-300 hover:bg-gray-50 text-gray-600'
                  }`}
                >
                  {p}
                </button>
              ),
            )}

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages || runsQuery.isLoading || total === 0}
              className="h-8 w-8 flex items-center justify-center rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="h-4 w-4 text-gray-600" />
            </button>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">
              Showing <strong>{startIdx}–{endIdx}</strong> of {total} entries
            </span>
            <div className="flex items-center gap-2">
              <select
                value={rowsPerPage}
                onChange={(e) => { setRowsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                className="px-2 py-1 text-sm border border-gray-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-[#FF612B]"
              >
                {ROWS_PER_PAGE_OPTIONS.map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
              <span className="text-sm text-gray-500">Rows per page</span>
            </div>
          </div>
        </div>
      </div>

      {canWrite && (
        <RunBatchModal
          key={runBatchOpenId}
          open={runBatchOpen}
          onClose={handleModalClose}
        />
      )}
    </TopNavLayout>
  );
}
