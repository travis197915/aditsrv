import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { FormPanel, FormInput } from '@/components/FormPanel';
import { AuthLayout } from '@/layouts/AuthLayout';
import { DEFAULT_POST_LOGIN_PATH, readRedirectFromSearch } from '@/utils/redirect';

export default function Register() {
  const { user, register, isLoading } = useAuth();
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
      const name = String(data.name ?? '').trim();
      if (!email || !password) {
        throw new Error('Email and password are required');
      }
      await register(email, password, name || undefined);
      navigate(redirectTo, { replace: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Registration failed. Please try again.');
    }
  };

  const loginPath =
    redirectTo === DEFAULT_POST_LOGIN_PATH
      ? '/login'
      : `/login?redirect=${encodeURIComponent(redirectTo)}`;

  return (
    <AuthLayout
      title="Create account"
      footer={
        <p className="mt-6 text-center text-sm text-gray-500">
          Already have an account?{' '}
          <Link
            to={loginPath}
            className="font-medium text-[#FF612B] hover:text-[#e5551f] transition-colors"
          >
            Sign in
          </Link>
        </p>
      }
    >
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900">Create account</h2>
        <p className="mt-1 text-sm text-gray-500">New accounts receive auditor access by default</p>
      </div>
      <FormPanel
        onSubmit={handleSubmit}
        loading={isLoading}
        error={error}
        submitButtonLabel="Sign up"
      >
        <FormInput
          fieldName="name"
          label="Full name"
          type="text"
          defaultValue=""
          placeholder="Jane Doe"
        />
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
