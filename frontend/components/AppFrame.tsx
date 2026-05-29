'use client';

import Image from 'next/image';
import { Icon } from '@shopify/polaris';
import {
  HomeIcon,
  GiftCardIcon,
  ChartVerticalIcon,
  SettingsIcon,
  CreditCardIcon,
} from '@shopify/polaris-icons';
import { usePathname, useRouter } from 'next/navigation';
import { PropsWithChildren, useState, useCallback } from 'react';

const NAV_ITEMS = [
  { label: 'Dashboard',  url: '/dashboard',  icon: HomeIcon },
  { label: 'Offers',     url: '/offers',     icon: GiftCardIcon },
  { label: 'Analytics',  url: '/analytics',  icon: ChartVerticalIcon },
  { label: 'Settings',   url: '/settings',   icon: SettingsIcon },
  { label: 'Billing',    url: '/billing',    icon: CreditCardIcon },
];

export default function AppFrame({ children }: PropsWithChildren) {
  const pathname  = usePathname();
  const router    = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navigate = useCallback((url: string) => {
    router.push(url);
    setSidebarOpen(false);
  }, [router]);

  const isActive = (url: string) =>
    url === '/offers'
      ? pathname === '/offers' || pathname?.startsWith('/offers/')
      : pathname === url;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        /* ── App shell ───────────────────────────── */
        .app-shell { min-height: 100vh; background: #F7F8FA; }

        /* ── Header — identical to LandingNav ────── */
        .app-header {
          position: fixed; top: 0; left: 0; right: 0; z-index: 50;
          height: 64px;
          background: rgba(247,248,250,0.9);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border-bottom: 1px solid rgba(0,0,0,0.08);
          display: flex; align-items: center;
          padding: 0 24px;
          justify-content: space-between;
        }
        .app-header-logo {
          display: flex; align-items: center; gap: 10px;
          text-decoration: none; cursor: pointer;
        }
        .app-header-logo span {
          font-size: 19px; font-weight: 700;
          color: #0B0C0E; letter-spacing: -0.01em; line-height: 1;
        }
        .app-header-hamburger {
          display: none; align-items: center; justify-content: center;
          background: none; border: none; cursor: pointer;
          color: #6B7280; padding: 6px; border-radius: 6px;
        }
        .app-header-hamburger:hover { color: #0B0C0E; background: rgba(0,0,0,0.05); }

        /* ── Sidebar ─────────────────────────────── */
        .app-sidebar {
          position: fixed; top: 64px; left: 0; bottom: 0;
          width: 220px;
          background: #FFFFFF;
          border-right: 1px solid rgba(0,0,0,0.08);
          padding: 16px 0;
          overflow-y: auto;
          z-index: 40;
        }
        .app-sidebar-label {
          font-size: 10px; font-weight: 600; letter-spacing: 0.08em;
          text-transform: uppercase; color: #9CA3AF;
          padding: 8px 20px 6px;
        }
        .app-nav-item {
          display: flex; align-items: center; gap: 10px;
          padding: 9px 16px; margin: 2px 8px;
          border-radius: 8px; cursor: pointer;
          background: none; border: none; width: calc(100% - 16px);
          box-sizing: border-box;
          text-align: left; color: #6B7280;
          font-size: 14px; font-weight: 500;
          transition: background 0.15s, color 0.15s;
        }
        .app-nav-item:hover { background: rgba(0,0,0,0.04); color: #0B0C0E; }
        .app-nav-item.active { background: rgba(45,122,79,0.08); color: #2D7A4F; font-weight: 600; }
        .app-nav-item.active .nav-icon svg { fill: #2D7A4F !important; }
        .nav-icon {
          width: 20px; height: 20px; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          overflow: hidden;
        }
        .nav-icon svg { fill: currentColor; width: 20px; height: 20px; display: block; }

        /* ── Main content ────────────────────────── */
        .app-content {
          padding-top: 64px;
          margin-left: 220px;
          min-height: 100vh;
        }

        /* ── Mobile overlay sidebar ──────────────── */
        .app-sidebar-overlay {
          display: none;
          position: fixed; inset: 0; z-index: 45;
        }
        .app-sidebar-overlay.open { display: block; }
        .app-sidebar-overlay-backdrop {
          position: absolute; inset: 0; background: rgba(0,0,0,0.4);
        }
        .app-sidebar-mobile {
          position: absolute; top: 0; left: 0; bottom: 0;
          width: 240px; background: #FFFFFF;
          border-right: 1px solid rgba(0,0,0,0.08);
          padding-top: 24px; padding-bottom: 24px;
          z-index: 46;
        }
        .app-sidebar-mobile-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 0 16px 16px;
          border-bottom: 1px solid rgba(0,0,0,0.08);
          margin-bottom: 8px;
        }

        /* ── Mobile bottom nav ───────────────────── */
        .app-bottom-nav { display: none; }

        @media (max-width: 768px) {
          .app-sidebar       { display: none; }
          .app-content       { margin-left: 0; padding-bottom: 64px; }
          .app-header-hamburger { display: flex; }

          .app-bottom-nav {
            display: flex;
            position: fixed; bottom: 0; left: 0; right: 0;
            height: 60px;
            background: #FFFFFF;
            border-top: 1px solid rgba(0,0,0,0.08);
            z-index: 50;
            padding-bottom: env(safe-area-inset-bottom, 0px);
          }
          .app-bottom-nav-btn {
            flex: 1; display: flex; flex-direction: column;
            align-items: center; justify-content: center; gap: 3px;
            background: none; border: none; cursor: pointer;
            color: #9CA3AF; padding: 0;
            -webkit-tap-highlight-color: transparent;
          }
          .app-bottom-nav-btn.active { color: #2D7A4F; }
          .app-bottom-nav-btn .nav-icon { width: 22px; height: 22px; }
          .app-bottom-nav-btn.active .nav-icon svg { fill: #2D7A4F !important; }
          .app-bottom-nav-label { font-size: 10px; font-weight: 500; line-height: 1; }
        }
      `}} />

      <div className="app-shell">

        {/* ── Header ───────────────────────────────────────── */}
        <header className="app-header">
          <div className="app-header-logo" onClick={() => navigate('/dashboard')}>
            <Image src="/app-icon.png" alt="Pleero" width={34} height={34} style={{ borderRadius: '8px' }} />
            <span>Pleero</span>
          </div>

          {/* Mobile hamburger */}
          <button
            className="app-header-hamburger"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open navigation"
          >
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </header>

        {/* ── Desktop sidebar ───────────────────────────────── */}
        <aside className="app-sidebar">
          <div className="app-sidebar-label">Menu</div>
          {NAV_ITEMS.map(item => (
            <button
              key={item.url}
              className={`app-nav-item${isActive(item.url) ? ' active' : ''}`}
              onClick={() => navigate(item.url)}
            >
              <span className="nav-icon"><Icon source={item.icon} /></span>
              {item.label}
            </button>
          ))}
        </aside>

        {/* ── Main content ─────────────────────────────────── */}
        <main className="app-content">
          {children}
        </main>

        {/* ── Mobile sidebar overlay ────────────────────────── */}
        <div className={`app-sidebar-overlay${sidebarOpen ? ' open' : ''}`}>
          <div className="app-sidebar-overlay-backdrop" onClick={() => setSidebarOpen(false)} />
          <div className="app-sidebar-mobile">
            <div className="app-sidebar-mobile-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Image src="/app-icon.png" alt="Pleero" width={28} height={28} style={{ borderRadius: '6px' }} />
                <span style={{ color: '#0B0C0E', fontWeight: 700, fontSize: '16px' }}>Pleero</span>
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8A9099', padding: '4px' }}
                aria-label="Close navigation"
              >
                <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {NAV_ITEMS.map(item => (
              <button
                key={item.url}
                className={`app-nav-item${isActive(item.url) ? ' active' : ''}`}
                onClick={() => navigate(item.url)}
              >
                <span className="nav-icon"><Icon source={item.icon} /></span>
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Mobile bottom nav (Dashboard / Offers / Analytics) ── */}
        <nav className="app-bottom-nav" aria-label="Mobile navigation">
          {NAV_ITEMS.slice(0, 3).map(item => (
            <button
              key={item.url}
              className={`app-bottom-nav-btn${isActive(item.url) ? ' active' : ''}`}
              onClick={() => navigate(item.url)}
              aria-label={item.label}
            >
              <span className="nav-icon"><Icon source={item.icon} /></span>
              <span className="app-bottom-nav-label">{item.label}</span>
            </button>
          ))}
        </nav>

      </div>
    </>
  );
}
