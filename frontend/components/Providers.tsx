'use client';

import { AppProvider, Spinner } from '@shopify/polaris';
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
 */
export default function Providers({ children }: PropsWithChildren) {
  const [tokenReady, setTokenReady] = useState(false);

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

    // Pre-fetch the token so it lands in sessionStorage before any page
    // useEffect runs.  Failures are silenced here; pages surface their own
    // auth errors if they subsequently can't get a token.
    getSessionToken()
      .catch(() => {})
      .finally(() => setTokenReady(true));
  }, []);

  return (
    <AppProvider i18n={enTranslations}>
      {tokenReady ? (
        children
      ) : (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
        }}>
          <Spinner accessibilityLabel="Loading Pleero" size="large" />
        </div>
      )}
    </AppProvider>
  );
}
