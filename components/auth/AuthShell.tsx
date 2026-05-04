'use client';
import Link from 'next/link';

interface AuthShellProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}

export function AuthShell({ title, subtitle, children, footer }: AuthShellProps) {
  return (
    <div className="auth-shell">
      <aside className="auth-brand">
        <div className="auth-brand__glow" />
        <div className="auth-brand__grid" />
        <div className="auth-brand__content">
          <div className="auth-brand__mark">DW</div>
          <p className="auth-brand__name">Dev Weekends</p>
          <p className="auth-brand__tagline">Operations hub for sessions, links, and community data.</p>
        </div>
      </aside>

      <div className="auth-main">
        <div className="auth-main__inner">
          <div className="auth-main__header md:hidden">
            <div className="auth-brand__mark auth-brand__mark--sm">DW</div>
            <span className="auth-main__header-text">Dev Weekends Hub</span>
          </div>

          <header className="auth-page-header">
            <h1 className="auth-page-title">{title}</h1>
            <p className="auth-page-subtitle">{subtitle}</p>
          </header>

          <div className="auth-card">{children}</div>

          <div className="auth-footer">{footer}</div>
        </div>
      </div>
    </div>
  );
}

export function AuthFooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="auth-link">
      {children}
    </Link>
  );
}
