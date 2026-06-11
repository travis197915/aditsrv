import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { FormPanel, FormInput } from '@/components/FormPanel';
import { AuthLayout } from '../../layouts/AuthLayout';
import { DEFAULT_POST_LOGIN_PATH, readRedirectFromSearch } from '@/utils/redirect';

export default function Login() {
  const { user, login, isLoading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const redirectTo = readRedirectFromSearch(location.search);
  const [error, setError] = useState<string | undefined>();

  if (user) {
    return <Navigate to={redirectTo} replace />;
  }

  const handleSubmit = async (data: Record<string, unknown>) => {
    setError(undefined);
    try {
      const email = String(data.email ?? '').trim();
      const password = String(data.password ?? '');
      if (!email || !password) {
        throw new Error('Email and password are required');
      }
      await login(email, password);
      navigate(redirectTo, { replace: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Login failed. Please try again.');
    }
  };

  const registerPath =
    redirectTo === DEFAULT_POST_LOGIN_PATH
      ? '/register'
      : `/register?redirect=${encodeURIComponent(redirectTo)}`;

  return (
    <AuthLayout
      title="Sign in"
      subtitle="Access your Claims Audit Review dashboard"
      footer={
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{' '}
          <Link
            to={registerPath}
            className="font-medium text-[#FF612B] hover:text-[#e5551f] transition-colors"
          >
            Sign up
          </Link>
        </p>
      }
    >
      <FormPanel
        onSubmit={handleSubmit}
        loading={isLoading}
        error={error}
        submitButtonLabel="Sign in"
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
    </AuthLayout>
  );
}
