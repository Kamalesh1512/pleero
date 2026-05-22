'use client';

/**
 * Dashboard page - shows merchant metrics and recent activity.
 * Embedded in Shopify admin via App Bridge.
 * Follows dark-first design system with Geist/DM Mono typography.
 */

import { Page, Card, Layout, Text, BlockStack, Banner } from '@shopify/polaris';
import { useEffect, useState, useCallback } from 'react';
import {
  formatCurrency,
  getSessionToken,
  getDashboardMetrics,
  getMerchantSettings,
  type DashboardMetrics,
  type Merchant
} from '@/lib/api';

/**
 * Sidebar Navigation Component
 */
function Sidebar({ activeSection }: { activeSection: string }) {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'offers', label: 'Offers' },
    { id: 'analytics', label: 'Analytics' },
    { id: 'settings', label: 'Settings' },
    { id: 'billing', label: 'Billing' }
  ];

  return (
    <div style={{
      width: '160px',
      background: 'var(--pleero-ink-surface)',
      borderRight: '0.5px solid var(--pleero-ink-border)',
      padding: '16px 12px',
      flexShrink: 0,
      minHeight: '100vh'
    }}>
      {/* Logo */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '20px'
      }}>
        <div style={{
          width: '24px',
          height: '24px',
          background: 'var(--pleero-ink)',
          borderRadius: '6px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '12px',
          fontWeight: 700,
          color: 'var(--pleero-white)',
          position: 'relative'
        }}>
          P
          <div style={{
            width: '6px',
            height: '6px',
            background: 'var(--pleero-green)',
            borderRadius: '50%',
            position: 'absolute',
            top: '-2px',
            right: '-2px'
          }} />
        </div>
        <div style={{
          fontSize: '13px',
          fontWeight: 600,
          color: 'var(--pleero-white)'
        }}>
          Pleero
        </div>
      </div>

      {/* Navigation Items */}
      {navItems.map((item) => (
        <div
          key={item.id}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '7px 8px',
            borderRadius: 'var(--radius-sm)',
            fontSize: '12px',
            marginBottom: '2px',
            cursor: 'pointer',
            background: activeSection === item.id ? 'var(--pleero-green-faint)' : 'transparent',
            color: activeSection === item.id ? 'var(--pleero-green-text)' : 'var(--pleero-muted)'
          }}
        >
          {item.label}
        </div>
      ))}
    </div>
  );
}

/**
 * Metric Card Component - Dark surface with DM Mono numbers
 */
function MetricCard({
  label,
  value,
  delta,
  deltaType
}: {
  label: string;
  value: string | number;
  delta?: string;
  deltaType?: 'positive' | 'negative' | 'neutral';
}) {
  return (
    <div style={{
      background: 'var(--pleero-ink-surface)',
      border: '0.5px solid var(--pleero-ink-border)',
      borderRadius: 'var(--radius-md)',
      padding: '16px 20px'
    }}>
      {/* Label - FIXED: Changed from --pleero-dimmed to --pleero-muted per reference HTML line 135 */}
      <div style={{
        fontFamily: 'var(--font-mono)',
        fontSize: '11px',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        color: 'var(--pleero-muted)',
        marginBottom: 'var(--space-2)'
      }}>
        {label}
      </div>

      {/* Value */}
      <div style={{
        fontFamily: 'var(--font-mono)',
        fontSize: '26px',
        fontWeight: 600,
        color: 'var(--pleero-white)',
        marginBottom: delta ? 'var(--space-1)' : 0
      }}>
        {value}
      </div>

      {/* Delta */}
      {delta && (
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '11px',
          color: deltaType === 'positive' ? 'var(--pleero-green-text)' :
                 deltaType === 'negative' ? 'var(--pleero-danger)' :
                 'var(--pleero-muted)'
        }}>
          {deltaType === 'positive' && '↑ '}
          {deltaType === 'negative' && '↓ '}
          {delta}
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activatingBilling, setActivatingBilling] = useState(false);
  const activeSection = 'dashboard';

  useEffect(() => {
    async function loadData() {
      try {
        const token = await getSessionToken();
        const [metricsData, merchantData] = await Promise.all([
          getDashboardMetrics(token),
          getMerchantSettings(token)
        ]);

        setMetrics(metricsData);
        setMerchant(merchantData);
        setLoading(false);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load data';

        // Provide helpful message if App Bridge isn't initialized
        if (errorMessage.includes('App Bridge not initialized')) {
          setError(
            'This app must be accessed from Shopify Admin. ' +
            'Open your app from the Shopify Partner Dashboard or install it on a test store.'
          );
        } else if (errorMessage.includes('fetch')) {
          setError(
            `Cannot connect to backend at ${process.env.NEXT_PUBLIC_API_URL}. ` +
            'Make sure your backend is running and accessible. ' +
            'Check browser console for details.'
          );
        } else {
          setError(errorMessage);
        }
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const handleActivateBilling = useCallback(async () => {
    setActivatingBilling(true);
    try {
      // TODO: Get session token and call billing API
      // const token = await getSessionToken();
      // const response = await fetch(`${API_BASE_URL}/api/billing/activate`, {
      //   method: 'POST',
      //   headers: {
      //     'Authorization': `Bearer ${token}`,
      //     'Content-Type': 'application/json',
      //   },
      // });
      // const data = await response.json();
      // window.location.href = data.confirmation_url;

      // Mock for MVP
      alert('Billing activation would redirect to Shopify charge approval page');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to activate billing');
    } finally {
      setActivatingBilling(false);
    }
  }, []);

  // Check if trial has ended
  const shouldShowBillingBanner =
    merchant &&
    merchant.subscription_status !== 'ACTIVE' &&
    merchant.trial_ends_at &&
    new Date(merchant.trial_ends_at) < new Date();

  if (loading) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh' }}>
        <Sidebar activeSection={activeSection} />
        <div style={{ flex: 1, padding: '20px' }}>
          <Text as="p">Loading...</Text>
        </div>
      </div>
    );
  }

  if (error || !metrics) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh' }}>
        <Sidebar activeSection={activeSection} />
        <div style={{ flex: 1, padding: '20px' }}>
          <Text as="p" tone="critical">
            {error || 'Failed to load metrics'}
          </Text>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar activeSection={activeSection} />
      <div style={{ flex: 1, background: 'var(--pleero-ink)' }}>
        <Page
          title="Dashboard"
          subtitle="This month's performance"
        >
          <Layout>
            <Layout.Section>
              <BlockStack gap="500">
                {/* Billing Banner */}
                {shouldShowBillingBanner && (
                  <Banner
                    title="Your trial has ended"
                    tone="warning"
                    action={{
                      content: 'Activate $99/month plan',
                      onAction: handleActivateBilling,
                      loading: activatingBilling,
                    }}
                  >
                    <Text as="p">
                      Activate your subscription to continue receiving store credit offers
                    </Text>
                  </Banner>
                )}

                {/* Metrics Cards Row - Custom styled */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: 'var(--space-5)'
                }}>
                  <MetricCard
                    label="Revenue retained"
                    value={formatCurrency(metrics.revenue_retained_cents)}
                    delta={metrics.offers_accepted > 0 ? `${metrics.offers_accepted} accepted` : undefined}
                    deltaType={metrics.offers_accepted > 0 ? 'positive' : 'neutral'}
                  />

                  <MetricCard
                    label="Offers shown"
                    value={metrics.offers_sent}
                  />

                  <MetricCard
                    label="Acceptance rate"
                    value={`${metrics.acceptance_rate.toFixed(1)}%`}
                    delta={metrics.acceptance_rate >= 15 ? 'On target' : 'Below target'}
                    deltaType={metrics.acceptance_rate >= 15 ? 'positive' : 'neutral'}
                  />

                  <MetricCard
                    label="Trial → paid"
                    value={merchant?.subscription_status === 'ACTIVE' ? 'Active' : 'Trial'}
                    deltaType={merchant?.subscription_status === 'ACTIVE' ? 'positive' : 'neutral'}
                  />
                </div>

                {/* Getting Started Guide */}
                <Card>
                  <BlockStack gap="400">
                    <Text as="h2" variant="headingLg">
                      How it works
                    </Text>
                    <BlockStack gap="200">
                      <Text as="p">
                        1. When a customer requests a refund, Pleero automatically sends them an offer
                      </Text>
                      <Text as="p">
                        2. They can choose to take {merchant ? `${formatCurrency(merchant.bonus_cap_cents)} bonus` : 'bonus'} as store credit instead
                      </Text>
                      <Text as="p">
                        3. Credits are instant and never expire
                      </Text>
                    </BlockStack>
                  </BlockStack>
                </Card>
              </BlockStack>
            </Layout.Section>
          </Layout>
        </Page>
      </div>
    </div>
  );
}
