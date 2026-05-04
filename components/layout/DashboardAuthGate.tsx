'use client';
import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

/**
 * Client-side guard: if the session disappears (cookie cleared, sign-out elsewhere),
 * bounce to login even when middleware did not run (e.g. client navigations).
 */
export default function DashboardAuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      const safe =
        pathname &&
        pathname.startsWith('/') &&
        !pathname.startsWith('//') &&
        !pathname.includes(':');
      const next = safe ? `?next=${encodeURIComponent(pathname)}` : '';
      router.replace(`/login${next}`);
    }
  }, [loading, user, router, pathname]);

  if (loading) {
    return (
      <div className="dashboard-gate dashboard-gate--blocking" aria-busy="true" aria-label="Loading">
        <div className="dashboard-gate__card">
          <div className="sidebar-logo-mark dashboard-gate__logo">DW</div>
          <p className="dashboard-gate__title">Dev Weekends Hub</p>
          <div className="dashboard-gate__bar" />
          <p className="dashboard-gate__hint">Checking your session…</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
}
