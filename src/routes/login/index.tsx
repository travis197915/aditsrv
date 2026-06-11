import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { User, Lock } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { AuthLayout } from '../../layouts/AuthLayout';
import { DEFAULT_POST_LOGIN_PATH, readRedirectFromSearch } from '@/utils/redirect';

export default function Login() {
  const { user, login, isLoading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const redirectTo = readRedirectFromSearch(location.search);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | undefined>();

  if (user) {
    return <Navigate to={redirectTo} replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(undefined);
    try {
      const trimmed = email.trim();
      if (!trimmed || !password) {
        throw new Error('Username and password are required');
      }
      await login(trimmed, password);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed. Please try again.');
    }
  };

  const registerPath =
    redirectTo === DEFAULT_POST_LOGIN_PATH
      ? '/register'
      : `/register?redirect=${encodeURIComponent(redirectTo)}`;

  return (
    <AuthLayout title="Sign in">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="relative">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[#FF612B]" />
          <input
            type="text"
            placeholder="Username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#FF612B]/40 focus:border-[#FF612B]"
            autoComplete="username"
          />
        </div>

        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[#FF612B]" />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#FF612B]/40 focus:border-[#FF612B]"
            autoComplete="current-password"
          />
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3 text-white font-semibold rounded-md bg-[#FF612B] hover:bg-[#e5551f] disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
        >
          {isLoading ? 'Signing in...' : 'Login'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-500">
        Don&apos;t have an account?{' '}
        <Link
          to={registerPath}
          className="font-medium text-[#FF612B] hover:text-[#e5551f] transition-colors"
        >
          Sign up
        </Link>
      </p>
    </AuthLayout>
  );
}
