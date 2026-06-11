import type { ReactNode } from 'react';

interface AuthLayoutProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}

function IllustrationPanel() {
  return (
    <div className="hidden md:flex md:w-[48%] bg-[#FF612B] relative overflow-hidden items-center justify-center rounded-r-2xl">
      <div className="absolute -top-20 -right-20 w-[300px] h-[300px] rounded-full bg-white/5" />
      <div className="absolute -bottom-16 -left-16 w-[240px] h-[240px] rounded-full bg-white/5" />

      <div className="relative z-10 flex flex-col items-center">
        {/* Circular graphic with document / check icons */}
        <div className="w-[220px] h-[220px] rounded-full border-[6px] border-white/30 flex items-center justify-center relative">
          <div className="absolute -left-8 bottom-6">
            <DocumentIcon />
          </div>
          <div className="relative">
            <DocumentIcon />
          </div>
          <div className="absolute -right-8 bottom-6">
            <DocumentIcon />
          </div>
        </div>
        {/* Person silhouette */}
        <svg className="w-20 h-20 text-[#d14a1a] -mt-4" viewBox="0 0 80 80" fill="currentColor">
          <ellipse cx="40" cy="68" rx="18" ry="10" />
          <circle cx="40" cy="36" r="12" />
        </svg>
      </div>
    </div>
  );
}

function DocumentIcon() {
  return (
    <div className="w-14 h-[68px] bg-white rounded-md shadow-lg flex flex-col items-center justify-center gap-1 relative">
      <div className="w-8 h-1 bg-gray-300 rounded" />
      <div className="w-8 h-1 bg-gray-300 rounded" />
      <div className="w-6 h-1 bg-gray-300 rounded" />
      <div className="absolute top-1 right-1">
        <svg className="w-4 h-4 text-[#FF612B]" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
      </div>
    </div>
  );
}

export function AuthLayout({ children, footer }: AuthLayoutProps) {
  return (
    <div className="min-h-dvh bg-[#f0ebe6] flex items-center justify-center px-4 py-10 relative overflow-hidden">
      {/* Decorative background circles */}
      <div className="absolute top-0 left-0 w-[300px] h-[300px] rounded-full bg-[#e8c9b8]/40 -translate-x-1/3 -translate-y-1/3" />
      <div className="absolute bottom-0 right-0 w-[250px] h-[250px] rounded-full bg-[#e8c9b8]/40 translate-x-1/3 translate-y-1/3" />

      <div className="relative z-10 w-full max-w-[900px] bg-white rounded-2xl shadow-xl overflow-hidden flex min-h-[480px]">
        {/* Left: form area */}
        <div className="flex-1 flex flex-col justify-center px-10 py-12 md:px-14">
          <img
            src="/logo.svg"
            alt="Optum"
            className="h-10 object-contain mb-10 self-start"
          />
          {children}
          {footer}
        </div>

        {/* Right: orange illustration */}
        <IllustrationPanel />
      </div>
    </div>
  );
}
