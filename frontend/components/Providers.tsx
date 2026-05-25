'use client';

import { AppProvider } from '@shopify/polaris';
import '@shopify/polaris/build/esm/styles.css';
import { PropsWithChildren, useEffect } from 'react';
import { storeInitialToken, storeHost } from '@/lib/shopify-app-bridge';

export default function Providers({ children }: PropsWithChildren) {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);

    // Cache Shopify's id_token from the initial embed URL (valid ~60 s)
    const idToken = params.get('id_token');
    if (idToken) storeInitialToken(idToken);

    // Persist host so navigation fallback can init after URL params are gone
    const host = params.get('host');
    if (host) storeHost(host);
  }, []);

  return (
    <AppProvider i18n={{}}>
      {children}
    </AppProvider>
  );
}
