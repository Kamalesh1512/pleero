'use client';

/**
 * Polaris and App Bridge providers for the Shopify embedded app.
 * This component wraps the entire app to provide Shopify context.
 */

import { AppProvider } from '@shopify/polaris';
import '@shopify/polaris/build/esm/styles.css';
import { PropsWithChildren } from 'react';

export default function Providers({ children }: PropsWithChildren) {
  return (
    <AppProvider i18n={{}}>
      {children}
    </AppProvider>
  );
}
