'use client';

/**
 * AppFrame - Polaris Frame wrapper for merchant dashboard.
 * Provides navigation sidebar that follows Shopify Admin theme.
 * Replaces custom dark sidebar to comply with design system rules.
 */

import { Frame, Navigation } from '@shopify/polaris';
import { usePathname, useRouter } from 'next/navigation';
import { PropsWithChildren } from 'react';

export default function AppFrame({ children }: PropsWithChildren) {
  const pathname = usePathname();
  const router = useRouter();

  const navigationItems = [
    {
      label: 'Dashboard',
      url: '/dashboard',
      selected: pathname === '/dashboard',
    },
    {
      label: 'Offers',
      url: '/offers',
      selected: pathname === '/offers' || pathname?.startsWith('/offers/'),
    },
    {
      label: 'Analytics',
      url: '/analytics',
      selected: pathname === '/analytics',
    },
    {
      label: 'Settings',
      url: '/settings',
      selected: pathname === '/settings',
    },
    {
      label: 'Billing',
      url: '/billing',
      selected: pathname === '/billing',
    },
  ];

  const handleNavigation = (url: string) => {
    // Get current URL params to preserve shop and host
    const searchParams = new URLSearchParams(window.location.search);
    const shop = searchParams.get('shop');
    const host = searchParams.get('host');

    // Build new URL with params
    const params = new URLSearchParams();
    if (shop) params.append('shop', shop);
    if (host) params.append('host', host);

    const fullUrl = params.toString() ? `${url}?${params.toString()}` : url;
    router.push(fullUrl);
  };

  const navigation = (
    <Navigation location="">
      <Navigation.Section
        items={navigationItems.map(item => ({
          ...item,
          onClick: () => handleNavigation(item.url),
        }))}
      />
    </Navigation>
  );

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        /* Make active navigation item green */
        .Polaris-Navigation__Item--selected .Polaris-Navigation__Text {
          color: var(--pleero-green) !important;
          font-weight: 600 !important;
        }

        .Polaris-Navigation__Item--selected {
          background-color: rgba(45, 122, 79, 0.08) !important;
        }

        .Polaris-Navigation__Item--selected::before {
          background-color: var(--pleero-green) !important;
        }
      `}} />
      <Frame navigation={navigation}>
        {children}
      </Frame>
    </>
  );
}
