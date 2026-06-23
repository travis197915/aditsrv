import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Info } from 'lucide-react';

type InfoTooltipTriggerProps = {
  text: string;
  ariaLabel: string;
  /** Use on orange / dark backgrounds */
  variant?: 'default' | 'onAccent';
};

const VIEWPORT_PAD = 16;
const GAP = 8;
const MAX_WIDTH = 288;

export default function InfoTooltipTrigger({
  text,
  ariaLabel,
  variant = 'default',
}: InfoTooltipTriggerProps) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number; width: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const reposition = useCallback(() => {
    const btn = btnRef.current;
    if (!btn) return;

    const rect = btn.getBoundingClientRect();
    const width = Math.min(MAX_WIDTH, window.innerWidth - VIEWPORT_PAD * 2);
    let left = rect.left + rect.width / 2 - width / 2;
    left = Math.max(VIEWPORT_PAD, Math.min(left, window.innerWidth - width - VIEWPORT_PAD));

    let top = rect.bottom + GAP;
    const tooltipHeight = tooltipRef.current?.offsetHeight ?? 0;
    if (tooltipHeight > 0 && top + tooltipHeight > window.innerHeight - VIEWPORT_PAD) {
      top = Math.max(VIEWPORT_PAD, rect.top - tooltipHeight - GAP);
    }

    setCoords({ top, left, width });
  }, []);

  useEffect(() => {
    if (!open) {
      setCoords(null);
      return;
    }
    reposition();
    window.addEventListener('scroll', reposition, true);
    window.addEventListener('resize', reposition);
    return () => {
      window.removeEventListener('scroll', reposition, true);
      window.removeEventListener('resize', reposition);
    };
  }, [open, reposition]);

  useLayoutEffect(() => {
    if (!open) return;
    reposition();
  }, [open, reposition, text]);

  const tooltip =
    open && coords
      ? createPortal(
          <>
            <div
              className="fixed inset-0 z-[100] md:hidden"
              onClick={() => setOpen(false)}
              aria-hidden
            />
            <div
              ref={tooltipRef}
              role="tooltip"
              className="fixed z-[101] rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-lg text-sm text-gray-700 leading-snug"
              style={{ top: coords.top, left: coords.left, width: coords.width }}
            >
              {text}
            </div>
          </>,
          document.body,
        )
      : null;

  const btnClass =
    variant === 'onAccent'
      ? 'inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-white hover:bg-white/20 transition-colors'
      : 'inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[#FF612B] hover:bg-[#FF612B]/10 transition-colors';

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        aria-label={ariaLabel}
        className={btnClass}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
      >
        <Info className="h-3.5 w-3.5" strokeWidth={2.25} />
      </button>
      {tooltip}
    </>
  );
}

export function TableColumnHeaderLabel({
  label,
  tooltip,
}: {
  label: ReactNode;
  tooltip?: string;
}) {
  if (!tooltip) return <>{label}</>;

  return (
    <span className="inline-flex items-center gap-1.5">
      {label}
      <InfoTooltipTrigger text={tooltip} ariaLabel={`About ${label}`} />
    </span>
  );
}
