'use client';

import { AppProvider, Spinner, Banner, Page } from '@shopify/polaris';
import enTranslations from '@shopify/polaris/locales/en.json';
import '@shopify/polaris/build/esm/styles.css';
import { PropsWithChildren, useEffect, useState } from 'react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.pleero.app';

// Pages that require an active Pleero session.  Public pages (landing, legal,
// customer offer page) are NOT in this list and always render immediately.
const APP_ROUTES = ['/dashboard', '/settings', '/offers', '/billing', '/analytics'];

/**
 * Wraps the app in Polaris AppProvider and verifies the Pleero session cookie
 * before any protected page renders.
 *
 * Flow:
 *  1. If the current path is not an app route → render immediately (public page).
 *  2. Call GET /api/auth/me with credentials:'include'.
 *     - 200 → session valid, render children.
 *     - 401 → no/expired session.  If `shop` is in the URL (merchant clicked
 *             the app from Shopify Admin) redirect to OAuth install so they get
 *             a fresh session transparently.  Otherwise show the error UI.
 *     - Network error → show error UI with Reload button.
 */
export default function Providers({ children }: PropsWithChildren) {
  const [ready, setReady] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const pathname = window.location.pathname;
    const isAppRoute = APP_ROUTES.some(r => pathname.startsWith(r));

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

        // No valid session — if the merchant arrived from Shopify Admin the URL
        // will have a `shop` param.  Re-run OAuth (which is instant for already-
        // installed apps) to issue a fresh session cookie.
        const shop = new URLSearchParams(window.location.search).get('shop');
        if (shop) {
          window.location.href = `${API_BASE_URL}/auth/install?shop=${encodeURIComponent(shop)}`;
          return; // navigating away — don't update state
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

  if (authError) {
    const isNetworkError = authError === 'network';
    return (
      <AppProvider i18n={enTranslations}>
        <Page title={isNetworkError ? 'Connection Error' : 'App Not Installed'}>
          <Banner
            tone="critical"
            title={isNetworkError ? 'Could not reach Pleero' : 'Pleero is not installed'}
            action={{ content: isNetworkError ? 'Reload' : 'Install Pleero', onAction: () => {
              if (isNetworkError) {
                window.location.reload();
              } else {
                window.location.href = 'https://apps.shopify.com/pleero';
              }
            }}}
          >
            <p>
              {isNetworkError
                ? 'Check your internet connection and try reloading the page.'
                : 'Open this app from your Shopify Admin after installing it from the App Store.'}
            </p>
          </Banner>
        </Page>
      </AppProvider>
    );
  }

  return (
    <AppProvider i18n={enTranslations}>
      {children}
    </AppProvider>
  );
}
