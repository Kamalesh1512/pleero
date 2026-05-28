'use client';

import { AppProvider, Spinner, Banner, Page } from '@shopify/polaris';
import enTranslations from '@shopify/polaris/locales/en.json';
import '@shopify/polaris/build/esm/styles.css';
import { PropsWithChildren, useEffect, useState } from 'react';
import { getSessionToken, storeHost } from '@/lib/shopify-app-bridge';

/**
 * Wraps the app in Polaris AppProvider and pre-fetches the Shopify session
 * token before any child page mounts.
 *
 * Why: React fires useEffect bottom-up (children before parents). Without
 * this gate, every page's useEffect fires before the token is cached and
 * has to wait 1–3 s for the Shopify Admin RPC channel to establish.  By
 * blocking child rendering here, by the time any page's useEffect fires the
 * token is already in sessionStorage (Path 1 — instant lookup).
 *
 * Embedded-app detection: Shopify Admin always includes `host` or `id_token`
 * in the URL when opening an embedded app.  Public pages (landing, legal)
 * have neither, so they are never blocked.
 *
 * Race condition guard: if getSessionToken() fails (e.g. RPC handshake not
 * ready, budget exhausted) we show an explicit error rather than silently
 * rendering pages without a cached token.  Without this guard every child
 * page falls through to Path 2 (live RPC) on its own, producing a 1-30 s
 * "Loading…" freeze because App Bridge strips id_token from the URL before
 * React hydrates — Path 0 is never available on a hard refresh.
 */
export default function Providers({ children }: PropsWithChildren) {
  const [tokenReady, setTokenReady] = useState(false);
  const [authError, setAuthError] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);

    const host = params.get('host');
    if (host) storeHost(host);

    // Not inside Shopify Admin — no session token needed, render immediately.
    if (!host && !params.get('id_token')) {
      setTokenReady(true);
      return;
    }

    // Guard: if the API key meta is missing or empty, window.shopify never
    // initializes and idToken() hangs indefinitely — fail fast instead.
    const apiKeyMeta = document.querySelector('meta[name="shopify-api-key"]');
    if (!apiKeyMeta?.getAttribute('content')) {
      console.error('[pleero:auth] shopify-api-key meta tag missing or empty');
      setAuthError(true);
      setTokenReady(true);
      return;
    }

    // Pre-fetch the token so it lands in sessionStorage before any child
    // page useEffect runs.  On failure, surface an error UI with a reload
    // option instead of silently rendering pages that will also fail and
    // show their own prolonged "Loading…" state.
    getSessionToken()
      .then(() => setTokenReady(true))
      .catch(() => {
        setAuthError(true);
        setTokenReady(true);
      });
  }, []);

  if (!tokenReady) {
    return (
      <AppProvider i18n={enTranslations}>
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
        }}>
          <Spinner accessibilityLabel="Loading Pleero" size="large" />
        </div>
      </AppProvider>
    );
  }

  if (authError) {
    return (
      <AppProvider i18n={enTranslations}>
        <Page title="Authentication Error">
          <Banner
            tone="critical"
            title="Unable to connect to Shopify"
            action={{ content: 'Reload', onAction: () => window.location.reload() }}
          >
            <p>
              Pleero must be opened from within your Shopify Admin. If you are
              already in Shopify Admin, try reloading the page.
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
