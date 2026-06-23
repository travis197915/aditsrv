import { useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, User } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import AppFooter from '@/components/AppFooter';

interface TopNavLayoutProps {
  children: ReactNode;
  showBack?: boolean;
}

function UserMenu() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const displayName = user?.name || user?.email || 'Admin';

  return (
    <div className="relative flex items-center gap-2">
      <div className="relative">
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
        >
          <div className="h-8 w-8 rounded-full bg-[#FF612B] flex items-center justify-center">
            <User className="h-4 w-4 text-white" />
          </div>
          <span className="text-sm font-medium text-gray-700 hidden sm:block">{displayName}</span>
        </button>

        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <div className="absolute right-0 top-full mt-2 z-20 w-44 rounded-md border border-gray-200 bg-white shadow-lg overflow-hidden">
              <button
                onClick={() => { navigate('/profile'); setOpen(false); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 transition-colors text-left text-gray-700"
              >
                <User className="h-4 w-4 text-gray-400" />
                Profile
              </button>
              <div className="border-t border-gray-100" />
              <button
                onClick={() => { logout(); setOpen(false); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-red-50 transition-colors text-left"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </div>
          </>
        )}
      </div>

      <button
        onClick={() => logout()}
        className="p-1.5 rounded hover:bg-gray-100 transition-colors"
        title="Sign out"
      >
        <LogOut className="h-5 w-5 text-gray-500" />
      </button>
    </div>
  );
}

export default function TopNavLayout({ children, showBack }: TopNavLayoutProps) {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#f5f5f5] flex flex-col">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="flex items-center justify-between px-6 h-14">
          <button type="button" onClick={() => navigate('/claims')} className="shrink-0">
            <img src="/logo.svg" alt="Optum" className="h-7 object-contain" />
          </button>

          <div className="flex items-center gap-3">
            {showBack && (
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="px-4 py-1.5 text-sm font-medium text-gray-700 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
              >
                Back
              </button>
            )}
            <UserMenu />
          </div>
        </div>
        <div className="h-[3px] bg-[#FF612B]" />
      </header>

      <main className="flex-1 px-6 py-6">
        {children}
      </main>

      <AppFooter />
    </div>
  );
}
