import { Navigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { FormPanel, FormInput } from '@/components/FormPanel';

export default function Login() {
  const { user, login } = useAuth();

  const { mutate, isPending, error } = useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      login(email, password),
  });

  if (user) {
    return <Navigate to="/claims" replace />;
  }

  const handleSubmit = (data: Record<string, unknown>) => {
    const email = String(data.email ?? '').trim();
    const password = String(data.password ?? '');
    if (!email || !password) return;
    mutate({ email, password });
  };

  const errorMessage = error instanceof Error ? error.message : error ? 'Login failed. Please try again.' : undefined;

  return (
    <div className="min-h-dvh bg-[#fafafa] text-foreground flex flex-col lg:flex-row">
      {/* Left panel — Optum brand */}
      <div className="hidden lg:flex lg:w-[52%] xl:w-[55%] flex-col bg-[#FF612B] relative overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute -top-32 -right-32 w-[420px] h-[420px] rounded-full bg-white/5" />
        <div className="absolute top-1/3 -right-16 w-[260px] h-[260px] rounded-full bg-white/4" />
        <div className="absolute -bottom-24 -left-24 w-[360px] h-[360px] rounded-full bg-white/5" />

        <div className="relative z-10 flex flex-col h-full px-14 xl:px-20 py-14">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-auto">
            <img
              src="/logo.svg"
              alt="Optum"
              className="h-10 object-contain brightness-0 invert"
            />
          </div>

          {/* Hero copy */}
          <div className="mb-auto">
            <h1 className="text-4xl xl:text-5xl font-bold text-white leading-[1.15] mb-5">
              Claims Audit
              <br />
              Review
              <br />
              Dashboard
            </h1>
            <p className="text-[17px] text-white/70 leading-relaxed max-w-sm">
              AI-powered audit review platform for behavioural health claims — streamline review, ensure accuracy.
            </p>
          </div>

          {/* Feature list */}
          <div className="space-y-5 mb-14">
            {[
              { title: 'AI-Powered Analysis', desc: 'Intelligent agents audit claims against coverage criteria automatically' },
              { title: 'Real-Time Review Status', desc: 'Track audit progress across all claims with live status updates' },
              { title: 'Compliance & Accuracy', desc: 'Built-in approval workflows with full audit trail for compliance' },
            ].map((item) => (
              <div key={item.title} className="flex items-start gap-3.5">
                <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                  <svg className="h-3.5 w-3.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">{item.title}</h3>
                  <p className="text-sm text-white/60">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Bottom attribution */}
          <p className="text-xs text-white/40 font-medium tracking-wide uppercase">
            Optum · UHC Claims Audit Platform
          </p>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex flex-1 items-center justify-center px-6 py-14 sm:px-10 lg:px-12 xl:px-20">
        <div className="w-full max-w-[400px]">
          {/* Mobile logo */}
          <div className="flex lg:hidden flex-col items-center gap-3 mb-10">
            <img src="/logo.svg" alt="Optum" className="h-8 object-contain" />
            <p className="text-sm text-muted-foreground text-center max-w-xs">
              Claims Audit Review Dashboard
            </p>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold tracking-tight">Sign in</h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Access your Claims Audit Review dashboard
            </p>
          </div>

          <div className="rounded-xl border border-border bg-card p-6 sm:p-8 shadow-sm">
            <FormPanel
              onSubmit={handleSubmit}
              loading={isPending}
              error={errorMessage}
              submitButtonLabel={isPending ? 'Signing in…' : 'Sign in'}
            >
              <FormInput
                fieldName="email"
                label="Work email"
                type="email"
                defaultValue=""
                placeholder="you@optum.com"
                validators={{ required: true, isEmail: true }}
              />
              <FormInput
                fieldName="password"
                label="Password"
                type="password"
                defaultValue=""
                placeholder="••••••••"
                validators={{ required: true }}
              />
            </FormPanel>
          </div>

          <p className="mt-8 text-center text-xs text-muted-foreground">
            HIPAA Compliant · SOC 2 Type II · ISO 27001
          </p>
        </div>
      </div>
    </div>
  );
}
