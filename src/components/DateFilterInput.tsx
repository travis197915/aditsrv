import { useRef } from 'react';
import { Calendar } from 'lucide-react';

function toIso(mmDdYyyy: string): string {
  const match = /^(\d{2})-(\d{2})-(\d{4})$/.exec(mmDdYyyy.trim());
  if (!match) return '';
  const [, month, day, year] = match;
  return `${year}-${month}-${day}`;
}

function fromIso(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return '';
  const [, year, month, day] = match;
  return `${month}-${day}-${year}`;
}

type DateFilterInputProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

export default function DateFilterInput({
  value,
  onChange,
  placeholder = 'mm-dd-yyyy',
}: DateFilterInputProps) {
  const dateRef = useRef<HTMLInputElement>(null);

  const openPicker = () => {
    const input = dateRef.current;
    if (!input) return;
    input.showPicker?.();
    input.focus();
  };

  return (
    <div className="relative flex items-center">
      <input
        type="text"
        readOnly
        placeholder={placeholder}
        value={value}
        onClick={openPicker}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openPicker();
          }
        }}
        className="w-32 cursor-pointer px-3 py-1.5 pr-8 text-sm text-gray-600 border border-gray-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-[#FF612B] focus:border-[#FF612B]"
        aria-label={placeholder}
      />
      <input
        ref={dateRef}
        type="date"
        value={toIso(value)}
        onChange={(e) => onChange(fromIso(e.target.value))}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
      />
      <button
        type="button"
        onClick={openPicker}
        className="absolute right-2 flex items-center text-gray-400 hover:text-gray-600"
        aria-label="Open calendar"
      >
        <Calendar className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
