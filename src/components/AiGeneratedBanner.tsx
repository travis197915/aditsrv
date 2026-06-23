import { AlertTriangle } from 'lucide-react';

export default function AiGeneratedBanner() {
  return (
    <div className="mb-4 flex gap-3 rounded-md border border-orange-200 bg-orange-50 px-4 py-3">
      <AlertTriangle className="h-5 w-5 text-orange-600 shrink-0 mt-0.5" aria-hidden />
      <p className="text-sm text-orange-950 leading-relaxed">
        <span className="font-semibold">AI-generated output:</span>{' '}
        The following analysis and recommendation are produced by AI. They may contain errors
        and must be reviewed using your independent professional judgment.
      </p>
    </div>
  );
}
