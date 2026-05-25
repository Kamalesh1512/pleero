'use client';

import { AppProvider } from '@shopify/polaris';
import '@shopify/polaris/build/esm/styles.css';
import { PropsWithChildren, useEffect } from 'react';
import { initAppBridge, storeInitialToken, storeHost } from '@/lib/shopify-app-bridge';

export default function Providers({ children }: PropsWithChildren) {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const params = new URLSearchParams(window.location.search);

    // Capture the id_token Shopify passes in the initial embed URL.
    // It's a valid HS256 JWT (same format the backend verifies) and
    // stays fresh for ~60 s — enough to handle the first API calls
    // before window.shopify.idToken() kicks in for subsequent refreshes.
    const idToken = params.get('id_token');
    if (idToken) storeInitialToken(idToken);

    // Initialize the npm App Bridge package as a fallback for when
    // the stored id_token expires and window.shopify.idToken() is needed.
    const apiKey = process.env.NEXT_PUBLIC_SHOPIFY_API_KEY;
    if (!apiKey || apiKey === 'your_shopify_api_key_here') return;

    const host = params.get('host');
    if (!host) return;

    storeHost(host);

    try {
      initAppBridge(apiKey, host);
    } catch (err) {
      console.warn('[Pleero] App Bridge npm init failed:', err);
    }
  }, []);

  return (
    <AppProvider i18n={{}}>
      {children}
    </AppProvider>
  );
}
