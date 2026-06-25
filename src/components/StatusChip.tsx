import { CheckCircle2, Clock, Flag, Play, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  normalizeAuditStatus,
  readReviewOutcome,
  type AuditStatus,
  type ReviewWorkflowStatus,
} from '@/lib/status';
import type { ReviewStatus } from '@/types';

type ChipStyle = {
  label: string;
  icon: LucideIcon;
  className: string;
};

const AI_STATUS: Record<AuditStatus, ChipStyle> = {
  CLEAN: {
    label: 'CLEAN',
    icon: CheckCircle2,
    className: 'bg-[#dcfce7] text-[#166534] border-[#4ade80]',
  },
  DEFECT: {
    label: 'DEFECT',
    icon: Flag,
    className: 'bg-[#fce4e4] text-[#991b1b] border-[#e57373]',
  },
  INCONCLUSIVE: {
    label: 'INCONCLUSIVE',
    icon: Flag,
    className: 'bg-[#ede4f5] text-[#581c87] border-[#b794c9]',
  },
};

const REVIEW_STATUS: Record<ReviewStatus, ChipStyle> = {
  APPROVED: {
    label: 'APPROVED',
    icon: CheckCircle2,
    className: 'bg-[#dcfce7] text-[#166534] border-[#4ade80]',
  },
  PENDING: {
    label: 'PENDING',
    icon: Clock,
    className: 'bg-[#fef3c7] text-[#92400e] border-[#fbbf24]',
  },
  REJECTED: {
    label: 'REJECTED',
    icon: Flag,
    className: 'bg-[#fce4e4] text-[#991b1b] border-[#e57373]',
  },
};

const REVIEW_WORKFLOW_STATUS: Record<ReviewWorkflowStatus, ChipStyle> = {
  pending: {
    label: 'PENDING',
    icon: Clock,
    className: 'bg-[#fef3c7] text-[#92400e] border-[#fbbf24]',
  },
  in_progress: {
    label: 'IN PROGRESS',
    icon: Play,
    className: 'bg-amber-50 text-amber-800 border-amber-200',
  },
  completed: {
    label: 'COMPLETED',
    icon: CheckCircle2,
    className: 'bg-[#dcfce7] text-[#166534] border-[#4ade80]',
  },
};

function StatusChipBase({ style }: { style: ChipStyle }) {
  const Icon = style.icon;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5',
        'text-[11px] font-semibold uppercase tracking-wide whitespace-nowrap',
        style.className,
      )}
    >
      <Icon className="h-3.5 w-3.5 shrink-0 stroke-[2.25]" aria-hidden />
      {style.label}
    </span>
  );
}

export function AiStatusChip({ status }: { status: string }) {
  return <StatusChipBase style={AI_STATUS[normalizeAuditStatus(status)]} />;
}

export function ReviewStatusChip({ status }: { status: ReviewStatus }) {
  return <StatusChipBase style={REVIEW_STATUS[status] ?? REVIEW_STATUS.PENDING} />;
}

export function ReviewWorkflowStatusChip({ status }: { status: ReviewWorkflowStatus }) {
  return <StatusChipBase style={REVIEW_WORKFLOW_STATUS[status]} />;
}

export function ReviewWorkflowStatusCell({
  status,
  rawStatus,
}: {
  status: ReviewWorkflowStatus | undefined;
  rawStatus?: string;
}) {
  const workflow = status ?? 'pending';
  const outcome = workflow === 'completed' ? readReviewOutcome(rawStatus) : undefined;
  if (outcome) return <ReviewStatusChip status={outcome} />;
  return <ReviewWorkflowStatusChip status={workflow} />;
}

function normalizeAuditorStatusKey(raw: string): string {
  return String(raw ?? '').trim().toUpperCase().replace(/[^A-Z]/g, '');
}

/** Auditor status chip — approve/reject use the same palette as platform status chips. */
export function AuditorStatusChip({ status }: { status: string }) {
  const key = normalizeAuditorStatusKey(status);

  if (key === 'APPROVED' || key === 'APPROVE') {
    return <ReviewStatusChip status="APPROVED" />;
  }
  if (key === 'REJECTED' || key === 'REJECT') {
    return <ReviewStatusChip status="REJECTED" />;
  }
  if (key === 'PENDING') {
    return <ReviewStatusChip status="PENDING" />;
  }
  if (key === 'AUDITED') {
    return (
      <StatusChipBase
        style={{
          label: 'AUDITED',
          icon: AI_STATUS.INCONCLUSIVE.icon,
          className: AI_STATUS.INCONCLUSIVE.className,
        }}
      />
    );
  }
  if (key === 'CLEAN' || key === 'DEFECT' || key === 'INCONCLUSIVE' || key === 'MET' || key === 'NOTMET') {
    return <AiStatusChip status={status} />;
  }

  if (!key) {
    return <span className="text-gray-500">—</span>;
  }

  return (
    <StatusChipBase
      style={{
        label: status.trim().toUpperCase(),
        icon: Clock,
        className: 'bg-gray-100 text-gray-600 border-gray-200',
      }}
    />
  );
}
