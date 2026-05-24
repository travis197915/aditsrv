import { CheckCircle2, Clock, Flag, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AiPlatformStatus, ReviewStatus } from '@/types';

type ChipStyle = {
  label: string;
  icon: LucideIcon;
  className: string;
};

const AI_STATUS: Record<AiPlatformStatus, ChipStyle> = {
  NOT_MET: {
    label: 'NOT MET',
    icon: Flag,
    className: 'bg-[#fce4e4] text-[#991b1b] border-[#e57373]',
  },
  MET: {
    label: 'MET',
    icon: CheckCircle2,
    className: 'bg-[#dcfce7] text-[#166534] border-[#4ade80]',
  },
  INCONCLUSIVE: {
    label: 'INCONCLUSIVE',
    icon: Flag,
    className: 'bg-[#ede4f5] text-[#581c87] border-[#b794c9]',
  },
  DEFECT: {
    label: 'DEFECT',
    icon: Flag,
    className: 'bg-[#ffedd5] text-[#c2410c] border-[#fb923c]',
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

export function AiStatusChip({ status }: { status: AiPlatformStatus }) {
  return <StatusChipBase style={AI_STATUS[status] ?? AI_STATUS.NOT_MET} />;
}

export function ReviewStatusChip({ status }: { status: ReviewStatus }) {
  return <StatusChipBase style={REVIEW_STATUS[status] ?? REVIEW_STATUS.PENDING} />;
}
