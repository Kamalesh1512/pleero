'use client';

import { Page, Card, Layout, Text, BlockStack, Banner } from '@shopify/polaris';
import { useEffect, useState, useCallback } from 'react';
import {
  formatCurrency,
  getDashboardMetrics,
  getMerchantSettings,
  ApiError,
  type DashboardMetrics,
  type Merchant,
} from '@/lib/api';
import AppFrame from '@/components/AppFrame';

function MetricCard({
  label,
  value,
  delta,
  deltaType,
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
      padding: '16px 20px',
    }}>
      <div style={{
        fontFamily: 'var(--font-mono)',
        fontSize: '11px',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        color: 'var(--pleero-muted)',
        marginBottom: 'var(--space-2)',
      }}>
        {label}
      </div>
      <div style={{
        fontFamily: 'var(--font-mono)',
        fontSize: '26px',
        fontWeight: 600,
        color: 'var(--pleero-green-text)',
        marginBottom: delta ? 'var(--space-1)' : 0,
      }}>
        {value}
      </div>
      {delta && (
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '11px',
          color: deltaType === 'positive' ? 'var(--pleero-green-text)' :
                 deltaType === 'negative' ? 'var(--pleero-danger)' :
                 'var(--pleero-muted)',
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

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [metricsData, merchantData] = await Promise.all([
        getDashboardMetrics(),
        getMerchantSettings(),
      ]);
      setMetrics(metricsData);
      setMerchant(merchantData);
      setError(null);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setError('App setup incomplete. Please reinstall Pleero from the Shopify App Store.');
      } else if (err instanceof ApiError && err.status === 401) {
        setError('Authentication failed. Please refresh the page to reconnect.');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to load data');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const shouldShowBillingBanner =
    merchant &&
    merchant.subscription_status !== 'ACTIVE' &&
    merchant.trial_ends_at &&
    new Date(merchant.trial_ends_at) < new Date();

  if (loading) {
    return (
      <AppFrame>
        <Page title="Dashboard"><Text as="p">Loading...</Text></Page>
      </AppFrame>
    );
  }

  if (error || !metrics) {
    return (
      <AppFrame>
        <Page title="Dashboard">
          <Banner tone="critical" title="Failed to load dashboard" action={{ content: 'Retry', onAction: loadData }}>
            <Text as="p">{error ?? 'Unknown error'}</Text>
          </Banner>
        </Page>
      </AppFrame>
    );
  }

  return (
    <AppFrame>
      <Page title="Dashboard" subtitle="This month's performance">
        <Layout>
          <Layout.Section>
            <BlockStack gap="500">
              {shouldShowBillingBanner && (
                <Banner title="Your trial has ended" tone="warning">
                  <Text as="p">
                    Activate your subscription to continue receiving store credit offers.
                  </Text>
                </Banner>
              )}

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                gap: 'var(--space-5)',
              }}>
                <MetricCard
                  label="Revenue retained"
                  value={formatCurrency(metrics.revenue_retained_cents)}
                  delta={metrics.offers_accepted > 0 ? `${metrics.offers_accepted} accepted` : undefined}
                  deltaType={metrics.offers_accepted > 0 ? 'positive' : 'neutral'}
                />
                <MetricCard label="Offers shown" value={metrics.offers_sent} />
                <MetricCard
                  label="Acceptance rate"
                  value={`${metrics.acceptance_rate.toFixed(1)}%`}
                  delta={metrics.acceptance_rate >= 15 ? 'On target' : 'Below target'}
                  deltaType={metrics.acceptance_rate >= 15 ? 'positive' : 'neutral'}
                />
                <MetricCard
                  label="Status"
                  value={merchant?.subscription_status === 'ACTIVE' ? 'Active' : 'Trial'}
                  deltaType={merchant?.subscription_status === 'ACTIVE' ? 'positive' : 'neutral'}
                />
              </div>

              <Card>
                <BlockStack gap="400">
                  <Text as="h2" variant="headingLg">How it works</Text>
                  <BlockStack gap="200">
                    <Text as="p">1. When a customer requests a refund, Pleero automatically sends them an offer</Text>
                    <Text as="p">2. They can choose to take {merchant ? `${formatCurrency(merchant.bonus_cap_cents)} bonus` : 'bonus'} as store credit instead</Text>
                    <Text as="p">3. Credits are instant and never expire</Text>
                  </BlockStack>
                </BlockStack>
              </Card>
            </BlockStack>
          </Layout.Section>
        </Layout>
      </Page>
    </AppFrame>
  );
}
