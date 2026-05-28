import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Search, ChevronLeft, ChevronRight, Upload,
  ClipboardList, TrendingUp, Clock,
} from 'lucide-react';
import TopNavLayout from '@/layouts/TopNavLayout';
import { AiStatusChip, ReviewStatusChip } from '@/components/StatusChip';
import DateFilterInput from '@/components/DateFilterInput';
import RunBatchModal from '@/components/RunBatchModal';
import { useAuth } from '@/contexts/AuthContext';
import { getBatch } from '@/lib/execute';
import { getLastBatchId } from '@/lib/lastBatch';
import { getToken } from '@/utils/auth';
import type { ClaimStatus, RunSummary } from '@/types/execute';
import type { AiPlatformStatus, ReviewStatus } from '@/types';

type BatchTableRow = {
  claimId: string;
  runId: string;
  batchId: string;
  claimStatus: ClaimStatus;
  runStatus: string;
  processingTimeMin: number;
  finishedAt: string;
};

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
    <div className="bg-white border border-gray-200 rounded p-4 flex items-center gap-4">
      <div className="p-3 bg-orange-50 rounded border border-orange-200 shrink-0">
        <Icon className="h-6 w-6 text-[#FF612B]" />
      </div>
      <div>
        <div className="text-2xl font-bold text-[#FF612B]">
          {value}{suffix}
        </div>
        <div className="text-sm text-gray-500 mt-0.5">{label}</div>
      </div>
    </div>
  );
}

function isClaimStatus(value: string): value is ClaimStatus {
  return value === 'MET' || value === 'NOT_MET' || value === 'INCONCLUSIVE' || value === 'DEFECT';
}

function mapRunToRow(run: RunSummary, batchId: string, idx: number): BatchTableRow {
  const claimId = String(run.claim_id ?? run.claimId ?? `claim-${idx + 1}`);
  const runId = String(run.run_id ?? run.runId ?? run.id ?? '');
  const statusRaw = String(run.claim_status ?? run.status ?? 'INCONCLUSIVE');
  return {
    claimId,
    runId,
    batchId,
    claimStatus: isClaimStatus(statusRaw) ? statusRaw : 'INCONCLUSIVE',
    runStatus: String(run.run_status ?? run.status ?? ''),
    processingTimeMin: Number(run.processing_time_min ?? run.transaction_time_min ?? 0),
    finishedAt: String(run.finished_at ?? ''),
  };
}

function reviewStatusDisplay(): ReviewStatus {
  return 'PENDING';
}

const ROWS_PER_PAGE_OPTIONS = [10, 25, 50, 100];

export default function ClaimsListingPage() {
  const navigate = useNavigate();
  const { canWrite } = useAuth();
  const token = getToken();

  const [lastBatchId, setLastBatchId] = useState<string | null>(() => getLastBatchId());
  const [searchClaimId, setSearchClaimId] = useState('');
  const [reviewStatusFilter, setReviewStatusFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [appliedFilters, setAppliedFilters] = useState({
    searchClaimId: '',
    reviewStatus: '',
    status: '' as ClaimStatus | '',
    fromDate: '',
    toDate: '',
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [runBatchOpen, setRunBatchOpen] = useState(false);
  const [runBatchOpenId, setRunBatchOpenId] = useState(0);

  const openRunBatchModal = () => {
    setRunBatchOpenId((n) => n + 1);
    setRunBatchOpen(true);
  };

  const handleModalClose = () => {
    setRunBatchOpen(false);
    setLastBatchId(getLastBatchId());
  };

  const batchQuery = useQuery({
    queryKey: ['batch', lastBatchId],
    queryFn: () => getBatch(token!, lastBatchId!),
    enabled: !!token && !!lastBatchId,
  });

  const allRows = useMemo(() => {
    if (!lastBatchId) return [];
    return (batchQuery.data?.runs ?? []).map((run, idx) => mapRunToRow(run, lastBatchId, idx));
  }, [batchQuery.data?.runs, lastBatchId]);

  const filteredRows = useMemo(() => {
    return allRows.filter((row) => {
      if (appliedFilters.searchClaimId &&
          !row.claimId.toLowerCase().includes(appliedFilters.searchClaimId.toLowerCase())) {
        return false;
      }
      if (appliedFilters.status && row.claimStatus !== appliedFilters.status) return false;
      if (appliedFilters.reviewStatus && reviewStatusDisplay() !== appliedFilters.reviewStatus) {
        return false;
      }
      return true;
    });
  }, [allRows, appliedFilters]);

  const total = filteredRows.length;
  const totalPages = Math.max(1, Math.ceil(total / rowsPerPage));
  const startIdx = (currentPage - 1) * rowsPerPage;
  const pageRows = filteredRows.slice(startIdx, startIdx + rowsPerPage);
  const endIdx = Math.min(startIdx + rowsPerPage, total);

  const handleApply = () => {
    setAppliedFilters({
      searchClaimId,
      reviewStatus: reviewStatusFilter,
      status: statusFilter as ClaimStatus | '',
      fromDate,
      toDate,
    });
    setCurrentPage(1);
  };

  const handleClear = () => {
    setSearchClaimId('');
    setReviewStatusFilter('');
    setStatusFilter('');
    setFromDate('');
    setToDate('');
    setAppliedFilters({ searchClaimId: '', reviewStatus: '', status: '', fromDate: '', toDate: '' });
    setCurrentPage(1);
  };

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

  const avgProcessingTime = allRows.length
    ? Math.round((allRows.reduce((sum, row) => sum + row.processingTimeMin, 0) / allRows.length) * 10) / 10
    : 0;

  const handleRowClick = (row: BatchTableRow) => {
    const params = new URLSearchParams({ batchId: row.batchId });
    if (row.runId) params.set('runId', row.runId);
    navigate(`/claims/${encodeURIComponent(row.claimId)}?${params.toString()}`);
  };

  return (
    <TopNavLayout>
      <div className="mb-5">
        <h1 className="text-xl font-semibold text-gray-900">Claims Audit Review</h1>
        <p className="text-sm text-gray-500 mt-0.5">Review and Audit behavioural health claims.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard icon={ClipboardList} label="Claims in Last Batch" value={allRows.length} />
        <StatCard icon={TrendingUp} label="Accuracy" value="—" />
        <StatCard icon={Clock} label="Avg Processing Time" value={avgProcessingTime} suffix=" min" />
      </div>

      {!lastBatchId && (
        <div className="mb-4 p-3 border border-gray-200 bg-white rounded text-sm text-gray-600">
          {canWrite ? 'No batch loaded — click Upload to run a workflow batch.' : 'No batch loaded yet.'}
        </div>
      )}

      {batchQuery.error && (
        <div className="mb-4 p-3 border border-red-200 bg-red-50 rounded text-sm text-red-700">
          {(batchQuery.error as Error).message}
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded">
        <div className="p-4 border-b border-gray-200 flex flex-wrap items-end gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search Claim ID"
              value={searchClaimId}
              onChange={(e) => setSearchClaimId(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-[#FF612B] focus:border-[#FF612B] w-40"
            />
          </div>

          <select
            value={reviewStatusFilter}
            onChange={(e) => setReviewStatusFilter(e.target.value)}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-[#FF612B] focus:border-[#FF612B] text-gray-600"
          >
            <option value="">Select Review Status</option>
            <option value="APPROVED">Approved</option>
            <option value="PENDING">Pending</option>
            <option value="REJECTED">Rejected</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-[#FF612B] focus:border-[#FF612B] text-gray-600"
          >
            <option value="">All</option>
            <option value="MET">Met</option>
            <option value="NOT_MET">Not Met</option>
            <option value="INCONCLUSIVE">Inconclusive</option>
            <option value="DEFECT">Defect</option>
          </select>

          <DateFilterInput value={fromDate} onChange={setFromDate} />
          <DateFilterInput value={toDate} onChange={setToDate} />

          <button
            onClick={handleApply}
            className="px-4 py-1.5 text-sm font-medium text-white bg-[#FF612B] hover:bg-[#e5561f] rounded transition-colors"
          >
            Apply
          </button>
          <button
            onClick={handleClear}
            className="px-4 py-1.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded transition-colors"
          >
            Clear
          </button>
          {canWrite && (
            <button
              type="button"
              onClick={openRunBatchModal}
              className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded transition-colors"
            >
              <Upload className="h-3.5 w-3.5" />
              Upload
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-100 border-b border-gray-200">
                {[
                  'CLAIM ID',
                  'RUN STATUS',
                  'CLAIM STATUS',
                  'REVIEW STATUS',
                  'PROCESSING TIME (MIN)',
                  'FINISHED AT',
                ].map((col) => (
                  <th
                    key={col}
                    className="px-3 py-2.5 text-left text-[11px] font-semibold text-gray-600 uppercase tracking-wide whitespace-nowrap"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {!lastBatchId ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-gray-400">
                    Run a batch to populate the audit review table.
                  </td>
                </tr>
              ) : batchQuery.isLoading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-gray-400">
                    Loading batch runs...
                  </td>
                </tr>
              ) : pageRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-gray-400">
                    No claims found matching your filters.
                  </td>
                </tr>
              ) : (
                pageRows.map((row) => (
                  <tr
                    key={`${row.claimId}-${row.runId}`}
                    onClick={() => handleRowClick(row)}
                    className="border-b border-gray-100 hover:bg-orange-50/40 cursor-pointer transition-colors"
                  >
                    <td className="px-3 py-2 text-gray-800 font-medium whitespace-nowrap">{row.claimId}</td>
                    <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{row.runStatus}</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <AiStatusChip status={row.claimStatus as AiPlatformStatus} />
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <ReviewStatusChip status={reviewStatusDisplay()} />
                    </td>
                    <td className="px-3 py-2 text-gray-600 tabular-nums">{row.processingTimeMin}</td>
                    <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{row.finishedAt}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 flex-wrap gap-2">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1 || batchQuery.isLoading}
              className="p-1 rounded hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="h-4 w-4 text-gray-600" />
            </button>

            {pageNumbers.map((p, i) =>
              p === '...' ? (
                <span key={`ellipsis-${i}`} className="px-1.5 text-gray-400 text-sm">…</span>
              ) : (
                <button
                  key={p}
                  onClick={() => setCurrentPage(p as number)}
                  className={`min-w-[28px] h-7 px-1.5 text-sm rounded transition-colors ${
                    currentPage === p
                      ? 'bg-[#FF612B] text-white font-semibold'
                      : 'hover:bg-gray-100 text-gray-600'
                  }`}
                >
                  {p}
                </button>
              )
            )}

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages || batchQuery.isLoading || total === 0}
              className="p-1 rounded hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="h-4 w-4 text-gray-600" />
            </button>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">
              Showing {total === 0 ? 0 : startIdx + 1}–{endIdx} of {total} entries
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
