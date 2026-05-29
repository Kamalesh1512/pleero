'use client';

import { Frame, Navigation, TopBar } from '@shopify/polaris';
import {
  HomeIcon,
  GiftCardIcon,
  ChartVerticalIcon,
  SettingsIcon,
  CreditCardIcon,
} from '@shopify/polaris-icons';
import { usePathname, useRouter } from 'next/navigation';
import { PropsWithChildren, useState, useCallback } from 'react';

export default function AppFrame({ children }: PropsWithChildren) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileNavActive, setMobileNavActive] = useState(false);

  const toggleMobileNav = useCallback(() => setMobileNavActive(v => !v), []);

  const handleNavigation = useCallback(
    (url: string) => {
      router.push(url);
      setMobileNavActive(false);
    },
    [router],
  );

  const navItems = [
    {
      label: 'Dashboard',
      url: '/dashboard',
      icon: HomeIcon,
      selected: pathname === '/dashboard',
    },
    {
      label: 'Offers',
      url: '/offers',
      icon: GiftCardIcon,
      selected: pathname === '/offers' || pathname?.startsWith('/offers/'),
    },
    {
      label: 'Analytics',
      url: '/analytics',
      icon: ChartVerticalIcon,
      selected: pathname === '/analytics',
    },
    {
      label: 'Settings',
      url: '/settings',
      icon: SettingsIcon,
      selected: pathname === '/settings',
    },
    {
      label: 'Billing',
      url: '/billing',
      icon: CreditCardIcon,
      selected: pathname === '/billing',
    },
  ];

  const topBar = (
    <TopBar showNavigationToggle onNavigationToggle={toggleMobileNav} />
  );

  const navigation = (
    <Navigation location="">
      <Navigation.Section
        title="Pleero"
        items={navItems.map(item => ({
          ...item,
          onClick: () => handleNavigation(item.url),
        }))}
      />
    </Navigation>
  );

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
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
        .Polaris-Navigation__Item--selected .Polaris-Icon svg {
          fill: var(--pleero-green) !important;
        }
      `}} />
      <Frame
        topBar={topBar}
        navigation={navigation}
        showMobileNavigation={mobileNavActive}
        onNavigationDismiss={toggleMobileNav}
      >
        {children}
      </Frame>
    </>
  );
}
