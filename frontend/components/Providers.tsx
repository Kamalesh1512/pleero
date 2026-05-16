'use client';

/**
 * Polaris and App Bridge providers for the Shopify embedded app.
 * This component wraps the entire app to provide Shopify context.
 */

import { AppProvider } from '@shopify/polaris';
import '@shopify/polaris/build/esm/styles.css';
import { PropsWithChildren, useEffect } from 'react';
import { initAppBridge } from '@/lib/shopify-app-bridge';

export default function Providers({ children }: PropsWithChildren) {
  useEffect(() => {
    // Initialize Shopify App Bridge when component mounts
    const apiKey = process.env.NEXT_PUBLIC_SHOPIFY_API_KEY;

    if (typeof window !== 'undefined' && apiKey) {
      // Get host parameter from URL (Shopify passes this when embedding the app)
      const urlParams = new URLSearchParams(window.location.search);
      const host = urlParams.get('host');

      if (host) {
        try {
          initAppBridge(apiKey, host);
        } catch {
          // App Bridge initialization failed - silent in production
        }
      }
    }
  }, []);

  return (
    <AppProvider i18n={{}}>
      {children}
    </AppProvider>
  );
}
