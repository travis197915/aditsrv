import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, ChevronLeft, ChevronRight, Upload,
  ClipboardList, TrendingUp, Clock,
} from 'lucide-react';
import TopNavLayout from '@/layouts/TopNavLayout';
import { AiStatusChip, ReviewStatusChip } from '@/components/StatusChip';
import DateFilterInput from '@/components/DateFilterInput';
import { CLAIMS, CLAIM_STATS } from '@/data/dummy-claims';
import type { ClaimRecord, AiPlatformStatus } from '@/types';

// ── Stat Card ───────────────────────────────────────────────────────────────

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

// ── Main page ───────────────────────────────────────────────────────────────

const ROWS_PER_PAGE_OPTIONS = [10, 25, 50, 100];

export default function ClaimsListingPage() {
  const navigate = useNavigate();

  // Filter state
  const [searchClaimId, setSearchClaimId] = useState('');
  const [reviewStatusFilter, setReviewStatusFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [appliedFilters, setAppliedFilters] = useState({
    searchClaimId: '',
    reviewStatus: '',
    status: '',
    fromDate: '',
    toDate: '',
  });

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  const handleApply = () => {
    setAppliedFilters({
      searchClaimId,
      reviewStatus: reviewStatusFilter,
      status: statusFilter,
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

  const filtered = useMemo(() => {
    return CLAIMS.filter((c) => {
      if (appliedFilters.searchClaimId && !c.claimId.toLowerCase().includes(appliedFilters.searchClaimId.toLowerCase())) return false;
      if (appliedFilters.reviewStatus && c.reviewStatus !== appliedFilters.reviewStatus) return false;
      if (appliedFilters.status && c.aiPlatformStatus !== appliedFilters.status) return false;
      return true;
    });
  }, [appliedFilters]);

  const totalPages = Math.ceil(filtered.length / rowsPerPage);
  const startIdx = (currentPage - 1) * rowsPerPage;
  const endIdx = Math.min(startIdx + rowsPerPage, filtered.length);
  const pageRows = filtered.slice(startIdx, endIdx);

  const pageNumbers = useMemo(() => {
    const pages: (number | '...')[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');
      for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) pages.push(i);
      if (currentPage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  }, [totalPages, currentPage]);

  const handleRowClick = (claim: ClaimRecord) => {
    navigate(`/claims/${claim.claimId}`);
  };

  return (
    <TopNavLayout>
      {/* Page header */}
      <div className="mb-5">
        <h1 className="text-xl font-semibold text-gray-900">Claims Audit Review</h1>
        <p className="text-sm text-gray-500 mt-0.5">Review and Audit behavioural health claims.</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard icon={ClipboardList} label="Total Claims Audited" value={CLAIM_STATS.totalClaims} />
        <StatCard icon={TrendingUp}   label="Accuracy"             value={CLAIM_STATS.accuracy} suffix="%" />
        <StatCard icon={Clock}        label="Average Processing Time" value={CLAIM_STATS.avgProcessingTime} suffix=" min" />
      </div>

      {/* Main card */}
      <div className="bg-white border border-gray-200 rounded">
        {/* Filter bar */}
        <div className="p-4 border-b border-gray-200 flex flex-wrap items-end gap-2">
          {/* Claim ID search */}
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

          {/* Review Status dropdown */}
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

          {/* Status dropdown */}
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

          {/* From Platform Date */}
          <DateFilterInput value={fromDate} onChange={setFromDate} />

          {/* To Platform Date */}
          <DateFilterInput value={toDate} onChange={setToDate} />

          {/* Action buttons */}
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
          <button className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded transition-colors">
            <Upload className="h-3.5 w-3.5" />
            Upload
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-100 border-b border-gray-200">
                {[
                  'CLAIM ID',
                  'TOTAL BILLED AMOUNT',
                  'TOTAL PAID AMOUNT',
                  'PAID DATE',
                  'PLATFORM DATE',
                  'CLAIM AUDITED DATE',
                  'AUDITOR STATUS',
                  'AI PLATFORM STATUS',
                  'REVIEW STATUS',
                  'TRANSACTION TIME(MINS)',
                  'ACCURACY',
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
              {pageRows.map((claim, idx) => (
                <tr
                  key={`${claim.claimId}-${idx}`}
                  onClick={() => handleRowClick(claim)}
                  className="border-b border-gray-100 hover:bg-orange-50/40 cursor-pointer transition-colors"
                >
                  <td className="px-3 py-2 text-gray-800 font-medium whitespace-nowrap">{claim.claimId}</td>
                  <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{claim.totalBilledAmount ?? ''}</td>
                  <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{claim.totalPaidAmount ?? ''}</td>
                  <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{claim.paidDate ?? ''}</td>
                  <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{claim.platformDate}</td>
                  <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{claim.claimAuditedDate}</td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <AiStatusChip status={claim.auditorStatus as AiPlatformStatus} />
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <AiStatusChip status={claim.aiPlatformStatus} />
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <ReviewStatusChip status={claim.reviewStatus} />
                  </td>
                  <td className="px-3 py-2 text-gray-600 tabular-nums">{claim.transactionTime}</td>
                  <td className="px-3 py-2 text-gray-600 tabular-nums">{claim.accuracy}%</td>
                </tr>
              ))}
              {pageRows.length === 0 && (
                <tr>
                  <td colSpan={11} className="px-4 py-10 text-center text-sm text-gray-400">
                    No claims found matching your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 flex-wrap gap-2">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
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
              disabled={currentPage === totalPages || totalPages === 0}
              className="p-1 rounded hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="h-4 w-4 text-gray-600" />
            </button>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">
              Showing {filtered.length === 0 ? 0 : startIdx + 1}–{endIdx} of {filtered.length} entries
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
    </TopNavLayout>
  );
}
