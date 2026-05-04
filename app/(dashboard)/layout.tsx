'use client';
export const dynamic = 'force-dynamic';
import { useState } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import DashboardAuthGate from '@/components/layout/DashboardAuthGate';

const PAGE_TITLES: Record<string, string> = {
  '/': 'Dashboard',
  '/links': 'Links Vault',
  '/tables': 'Data Tables',
  '/settings': 'Settings',
  '/settings/members': 'Team Members',
};

function getTitle(pathname: string) {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
  if (pathname.startsWith('/tables/')) return 'Table View';
  return 'Dev Weekends Hub';
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const pathname = usePathname();

  return (
    <DashboardAuthGate>
      <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
        {mobileNavOpen && (
          <button
            type="button"
            className="fixed inset-0 z-40 bg-black/50 md:hidden"
            aria-label="Close menu"
            onClick={() => setMobileNavOpen(false)}
          />
        )}
        <Sidebar
          collapsed={collapsed}
          onCollapse={setCollapsed}
          mobileOpen={mobileNavOpen}
          onCloseMobile={() => setMobileNavOpen(false)}
        />
        <div className="flex flex-col flex-1 overflow-hidden min-w-0">
          <Topbar
            title={getTitle(pathname)}
            onOpenMobileNav={() => setMobileNavOpen(true)}
            onNavigate={() => setMobileNavOpen(false)}
          />
          <main className="flex-1 min-h-0 overflow-y-auto page-shell">{children}</main>
        </div>
      </div>
    </DashboardAuthGate>
  );
}
