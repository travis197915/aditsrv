import { CheckCircle2, Clock, Flag, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { normalizeAuditStatus, type AuditStatus } from '@/lib/status';
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
