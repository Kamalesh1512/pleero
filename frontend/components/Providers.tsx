'use client';

import { AppProvider, Spinner } from '@shopify/polaris';
import enTranslations from '@shopify/polaris/locales/en.json';
import '@shopify/polaris/build/esm/styles.css';
import { PropsWithChildren, useEffect, useState } from 'react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.pleero.app';

const APP_ROUTES = ['/dashboard', '/settings', '/offers', '/billing', '/analytics'];

// /offers/{token} is the public customer offer page — no merchant auth needed.
// APP_ROUTES includes '/offers' for the merchant offers list, but that must not
// catch the customer sub-path.
const PUBLIC_PREFIXES = ['/offers/'];

export default function Providers({ children }: PropsWithChildren) {
  const [ready, setReady] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const pathname = window.location.pathname;
    const isPublic = PUBLIC_PREFIXES.some(r => pathname.startsWith(r));
    const isAppRoute = !isPublic && APP_ROUTES.some(r => pathname.startsWith(r));

    if (!isAppRoute) {
      setReady(true);
      return;
    }

    fetch(`${API_BASE_URL}/api/auth/me`, { credentials: 'include' })
      .then(async res => {
        if (res.ok) {
          setReady(true);
          return;
        }

        // Re-run OAuth silently if the merchant arrived from Shopify Admin
        const shop = new URLSearchParams(window.location.search).get('shop');
        if (shop) {
          window.location.href = `${API_BASE_URL}/auth/install?shop=${encodeURIComponent(shop)}`;
          return;
        }

        setAuthError('not_installed');
        setReady(true);
      })
      .catch(() => {
        setAuthError('network');
        setReady(true);
      });
  }, []);

  if (!ready) {
    return (
      <AppProvider i18n={enTranslations}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
          <Spinner accessibilityLabel="Loading Pleero" size="large" />
        </div>
      </AppProvider>
    );
  }

  if (authError === 'network') {
    return (
      <AppProvider i18n={enTranslations}>
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0B0C0E', padding: '24px' }}>
          <div style={{ textAlign: 'center', maxWidth: '360px' }}>
            <div style={{ fontSize: '40px', marginBottom: '16px' }}>⚡</div>
            <h1 style={{ color: '#F2F4F7', fontSize: '22px', fontWeight: 700, marginBottom: '8px' }}>Connection error</h1>
            <p style={{ color: '#8A9099', fontSize: '14px', marginBottom: '24px', lineHeight: '1.5' }}>
              Could not reach Pleero. Check your internet connection and try again.
            </p>
            <button
              onClick={() => window.location.reload()}
              style={{
                background: '#2D7A4F', color: '#fff', border: 'none', borderRadius: '8px',
                padding: '10px 24px', fontSize: '14px', fontWeight: 600, cursor: 'pointer',
              }}
            >
              Reload
            </button>
          </div>
        </div>
      </AppProvider>
    );
  }

  if (authError === 'not_installed') {
    return <ConnectStorePage />;
  }

  return (
    <AppProvider i18n={enTranslations}>
      {children}
    </AppProvider>
  );
}

function ConnectStorePage() {
  const [shop, setShop] = useState('');
  const [error, setError] = useState('');

  const handleConnect = () => {
    let domain = shop.trim().toLowerCase();
    // Accept "mybrand" or "mybrand.myshopify.com"
    if (!domain) {
      setError('Enter your store domain.');
      return;
    }
    if (!domain.includes('.')) {
      domain = `${domain}.myshopify.com`;
    }
    if (!domain.endsWith('.myshopify.com')) {
      setError('Must be a .myshopify.com domain (e.g. mybrand.myshopify.com).');
      return;
    }
    window.location.href = `${API_BASE_URL}/auth/install?shop=${encodeURIComponent(domain)}`;
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleConnect();
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#0B0C0E', padding: '24px',
    }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '40px', justifyContent: 'center' }}>
          <img src="/app-icon.png" alt="Pleero" width={36} height={36} style={{ borderRadius: '8px', display: 'block' }} />
          <span style={{ color: '#F2F4F7', fontWeight: 700, fontSize: '22px', letterSpacing: '-0.4px' }}>Pleero</span>
        </div>

        {/* Card */}
        <div style={{
          background: '#141618', border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: '14px', padding: '32px',
        }}>
          <h1 style={{ color: '#F2F4F7', fontSize: '20px', fontWeight: 700, marginBottom: '8px', marginTop: 0 }}>
            Connect your store
          </h1>
          <p style={{ color: '#8A9099', fontSize: '14px', marginBottom: '24px', lineHeight: '1.5', marginTop: 0 }}>
            Enter your Shopify store domain to open Pleero.
          </p>

          <label style={{ display: 'block', color: '#8A9099', fontSize: '12px', fontWeight: 500, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Store domain
          </label>
          <input
            type="text"
            value={shop}
            onChange={e => { setShop(e.target.value); setError(''); }}
            onKeyDown={handleKey}
            placeholder="mybrand.myshopify.com"
            autoFocus
            style={{
              width: '100%', boxSizing: 'border-box',
              background: '#1D2023', border: `1px solid ${error ? '#E57373' : 'rgba(255,255,255,0.1)'}`,
              borderRadius: '8px', padding: '10px 14px', color: '#F2F4F7',
              fontSize: '14px', outline: 'none', marginBottom: error ? '6px' : '20px',
            }}
          />
          {error && (
            <p style={{ color: '#E57373', fontSize: '12px', marginBottom: '16px', marginTop: 0 }}>{error}</p>
          )}

          <button
            onClick={handleConnect}
            style={{
              width: '100%', background: '#2D7A4F', color: '#fff', border: 'none',
              borderRadius: '8px', padding: '11px', fontSize: '14px', fontWeight: 600,
              cursor: 'pointer', letterSpacing: '0.1px',
            }}
          >
            Connect Store
          </button>

          <p style={{ color: '#4A5058', fontSize: '12px', textAlign: 'center', marginBottom: 0, marginTop: '20px', lineHeight: '1.5' }}>
            Don&apos;t have Pleero yet?{' '}
            <a
              href="https://apps.shopify.com/pleero"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#6FCF97', textDecoration: 'none' }}
            >
              Install from the App Store
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
