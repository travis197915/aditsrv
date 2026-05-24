import { useState } from 'react';
import { User, Mail, Shield, Calendar } from 'lucide-react';
import TopNavLayout from '@/layouts/TopNavLayout';
import { useAuth } from '@/contexts/AuthContext';
import { authApi } from '@/lib/api';
import { getRoleLabel } from '@/types';

export default function ProfilePage() {
  const { user } = useAuth();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError('');
    setPwSuccess(false);
    if (newPassword !== confirmPassword) {
      setPwError('New passwords do not match.');
      return;
    }
    if (newPassword.length < 8) {
      setPwError('New password must be at least 8 characters.');
      return;
    }
    setPwLoading(true);
    try {
      await authApi.post('/auth/change-password', { currentPassword, newPassword });
      setPwSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (e) {
      setPwError(e instanceof Error ? e.message : 'Failed to change password.');
    } finally {
      setPwLoading(false);
    }
  };

  const initials = user
    ? (user.name?.charAt(0).toUpperCase() ?? user.email?.charAt(0).toUpperCase() ?? '?')
    : '?';

  return (
    <TopNavLayout showBack>
      <div className="max-w-2xl">
        <div className="mb-5">
          <h1 className="text-xl font-semibold text-gray-900">Profile</h1>
          <p className="text-sm text-gray-500 mt-0.5">Your account information.</p>
        </div>

        {/* User info card */}
        <div className="bg-white border border-gray-200 rounded p-6 mb-4">
          <div className="flex items-center gap-4 mb-6">
            <div className="h-14 w-14 rounded-full bg-[#FF612B]/10 flex items-center justify-center text-xl font-bold text-[#FF612B] border border-[#FF612B]/20">
              {initials}
            </div>
            <div>
              <div className="text-base font-semibold text-gray-900">{user?.name || '—'}</div>
              <div className="text-sm text-gray-500">{getRoleLabel(user?.role ?? 'USER')}</div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <User className="h-4 w-4 text-gray-400 shrink-0" />
              <div>
                <div className="text-xs font-medium text-gray-500 mb-0.5">Full Name</div>
                <div className="text-sm text-gray-800">{user?.name || '—'}</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-gray-400 shrink-0" />
              <div>
                <div className="text-xs font-medium text-gray-500 mb-0.5">Email Address</div>
                <div className="text-sm text-gray-800">{user?.email || '—'}</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Shield className="h-4 w-4 text-gray-400 shrink-0" />
              <div>
                <div className="text-xs font-medium text-gray-500 mb-0.5">Role</div>
                <div className="text-sm text-gray-800">{getRoleLabel(user?.role ?? 'USER')}</div>
              </div>
            </div>
            {user?.createdAt && (
              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-gray-400 shrink-0" />
                <div>
                  <div className="text-xs font-medium text-gray-500 mb-0.5">Member Since</div>
                  <div className="text-sm text-gray-800">
                    {new Date(user.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Change password card */}
        <div className="bg-white border border-gray-200 rounded p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Change Password</h2>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#FF612B] focus:border-[#FF612B]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#FF612B] focus:border-[#FF612B]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#FF612B] focus:border-[#FF612B]"
              />
            </div>

            {pwError && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
                {pwError}
              </p>
            )}
            {pwSuccess && (
              <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded px-3 py-2">
                Password changed successfully.
              </p>
            )}

            <button
              type="submit"
              disabled={pwLoading}
              className="px-5 py-2 text-sm font-medium text-white bg-[#FF612B] hover:bg-[#e5561f] disabled:opacity-50 disabled:cursor-not-allowed rounded transition-colors"
            >
              {pwLoading ? 'Updating…' : 'Update Password'}
            </button>
          </form>
        </div>
      </div>
    </TopNavLayout>
  );
}
