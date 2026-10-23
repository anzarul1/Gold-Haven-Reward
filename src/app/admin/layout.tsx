'use client';

import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/components/auth/AuthProvider';
import Spinner from '@/components/ui/Spinner';
import {
  LayoutDashboard,
  Layers,
  QrCode,
  Sparkles,
  Users,
  CreditCard,
  Settings,
  ShieldCheck,
  ShieldAlert,
  ArrowLeft,
  LogOut,
} from 'lucide-react';

const ADMIN_NAV = [
  { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { name: 'Batches', href: '/admin/batches', icon: Layers },
  { name: 'Codes', href: '/admin/codes', icon: QrCode },
  { name: 'Redemptions', href: '/admin/redemptions', icon: Sparkles },
  { name: 'Users', href: '/admin/users', icon: Users },
  { name: 'Withdrawals', href: '/admin/withdrawals', icon: CreditCard },
  { name: 'Settings', href: '/admin/settings', icon: Settings },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, isAdmin, logout } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-base)] text-[var(--text-secondary)]">
        <Spinner />
      </div>
    );
  }

  // Admin access guard
  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen max-w-md mx-auto flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-full neu-raised flex items-center justify-center text-[var(--error)] mb-4">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h1 className="text-xl font-bold mb-2 text-[var(--text-primary)]">Admin Access Restricted</h1>
        <p className="text-sm text-[var(--text-secondary)] mb-6 max-w-sm">
          {!user
            ? 'Please sign in with your authorized Gold Haven administrator account.'
            : `Account (${user.email}) does not have admin permissions. Run the set-admin script to grant claims.`}
        </p>
        <div className="flex gap-3">
          <Link href="/redeem" className="neu-button-secondary text-xs py-2.5 px-4 flex items-center gap-1.5">
            <ArrowLeft className="w-4 h-4" /> Back to App
          </Link>
          {user && (
            <button onClick={logout} className="neu-gold-button text-xs py-2.5 px-4 flex items-center gap-1.5">
              <LogOut className="w-4 h-4" /> Sign Out
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-[var(--bg-base)] text-[var(--text-primary)] pb-12">
      {/* Admin Top Header */}
      <header className="neu-raised sticky top-0 z-40 px-4 py-3 bg-[var(--bg-surface)] border-b border-[rgba(255,255,255,0.05)]">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full neu-inset p-0.5 flex items-center justify-center">
                <Image src="/logo.png" alt="Logo" width={32} height={32} className="rounded-full" />
              </div>
              <div>
                <span className="font-bold text-sm tracking-tight font-serif text-[var(--gold)]">
                  Gold Haven
                </span>
                <span className="text-[10px] block text-[var(--text-secondary)] font-sans">
                  Operations Console
                </span>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/redeem"
              className="text-xs text-[var(--text-secondary)] hover:text-[var(--gold)] hidden sm:flex items-center gap-1 font-medium"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Customer App
            </Link>
            <div className="h-4 w-px bg-white/10 hidden sm:block" />
            <div className="flex items-center gap-2">
              <span className="text-xs text-[var(--text-muted)] hidden md:inline">
                {user.email}
              </span>
              <button
                onClick={logout}
                title="Log out"
                className="w-8 h-8 rounded-lg neu-inset flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--error)]"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Horizontal Navigation Tabs */}
        <div className="max-w-6xl mx-auto mt-3 overflow-x-auto scrollbar-none">
          <nav className="flex gap-2 min-w-max pb-1" aria-label="Admin Navigation">
            {ADMIN_NAV.map((item) => {
              const isActive =
                item.href === '/admin'
                  ? pathname === '/admin'
                  : pathname.startsWith(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
                    isActive
                      ? 'bg-[var(--gold)] text-[#1c1c1f] shadow-md shadow-[rgba(212,175,55,0.2)]'
                      : 'neu-inset text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Admin Page Content */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        {children}
      </div>
    </div>
  );
}
