'use client';

import { Page, Card, Layout, Text, BlockStack, Banner, Spinner } from '@shopify/polaris';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import {
  formatCurrency,
  getDashboardMetrics,
  getStoreCreditOverview,
  getMerchantSettings,
  ApiError,
  type DashboardMetrics,
  type StoreCreditOverview,
  type Merchant,
} from '@/lib/api';
import AppFrame from '@/components/AppFrame';

/**
 * Metric Card - dark surface with mono numbers.
 */
function MetricCard({
  label,
  value,
  delta,
  deltaType,
  attribution,
}: {
  label: string;
  value: string | number;
  delta?: string;
  deltaType?: 'positive' | 'negative' | 'neutral';
  attribution?: string;
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
        {attribution && (
          <span style={{
            marginLeft: '6px',
            fontSize: '9px',
            textTransform: 'none',
            letterSpacing: 'normal',
            color: 'var(--pleero-muted)',
            opacity: 0.6,
          }}>
            ({attribution})
          </span>
        )}
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
  const router = useRouter();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [overview, setOverview] = useState<StoreCreditOverview | null>(null);
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [metricsData, overviewData, merchantData] = await Promise.all([
        getDashboardMetrics(),
        getStoreCreditOverview(30),
        getMerchantSettings(),
      ]);
      setMetrics(metricsData);
      setOverview(overviewData);
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
        <Page title="Dashboard">
          <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
            <Spinner accessibilityLabel="Loading dashboard" size="large" />
          </div>
        </Page>
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
              {/* Billing Banner */}
              {shouldShowBillingBanner && (
                <Banner title="Your trial has ended" tone="warning">
                  <Text as="p">
                    Activate your subscription to continue receiving store credit offers.
                  </Text>
                </Banner>
              )}

              {/* Manual review banner */}
              {metrics.offers_needing_review > 0 && (
                <Banner
                  title={`${metrics.offers_needing_review} offer${metrics.offers_needing_review === 1 ? '' : 's'} need${metrics.offers_needing_review === 1 ? 's' : ''} manual review`}
                  tone="critical"
                  action={{ content: 'Review offers', onAction: () => router.push('/offers?needs_review=true') }}
                >
                  <Text as="p">
                    Pleero couldn&apos;t automatically issue store credit for these — resolve them
                    directly in Shopify admin.
                  </Text>
                </Banner>
              )}

              {/* Pillar: Refund Recovery - metrics from current month */}
              <Text as="h2" variant="headingMd">Refund Recovery</Text>
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

              {/* Pillar: Store Credit Intelligence */}
              {overview && (
                <>
                  <Text as="h2" variant="headingMd">
                    Store Credit Intelligence
                    <span style={{
                      fontSize: '11px',
                      color: 'var(--pleero-muted)',
                      marginLeft: '8px',
                      fontWeight: 400,
                    }}>
                      {overview.period_label}
                    </span>
                  </Text>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                    gap: 'var(--space-5)',
                  }}>
                    <MetricCard
                      label="Credit issued"
                      value={formatCurrency(overview.credit_issued_cents)}
                      delta={`${overview.credit_issued_attribution}`}
                      deltaType="positive"
                    />
                    <MetricCard
                      label="Credit redeemed"
                      value={formatCurrency(overview.credit_redeemed_cents)}
                      delta={`${overview.credit_redeemed_attribution}`}
                      deltaType={overview.credit_redeemed_cents > 0 ? 'positive' : 'neutral'}
                    />
                    <MetricCard
                      label="Outstanding"
                      value={formatCurrency(overview.outstanding_credit_cents)}
                      delta={`${overview.outstanding_credit_attribution}`}
                    />
                    <MetricCard
                      label="Redemption rate"
                      value={`${overview.redemption_rate.toFixed(0)}%`}
                      delta={overview.redemption_rate > 0 ? `${overview.redemption_rate_attribution}` : undefined}
                      deltaType={overview.redemption_rate > 0 ? 'positive' : 'neutral'}
                    />
                    <MetricCard
                      label="Avg days to redeem"
                      value={overview.avg_days_to_redemption != null ? `${overview.avg_days_to_redemption.toFixed(1)}d` : '—'}
                      attribution={overview.avg_days_to_redemption_attribution}
                    />
                    <MetricCard
                      label="Active customers"
                      value={overview.customers_with_active_credit}
                      delta={`${overview.customers_with_active_credit_attribution}`}
                    />
                    <MetricCard
                      label="Revenue influenced"
                      value={formatCurrency(overview.revenue_influenced_cents)}
                      delta={`${overview.revenue_influenced_attribution}`}
                      deltaType={overview.revenue_influenced_cents > 0 ? 'positive' : 'neutral'}
                    />
                  </div>
                </>
              )}

              {/* How it works */}
              <Card>
                <BlockStack gap="400">
                  <Text as="h2" variant="headingLg">How it works</Text>
                  <BlockStack gap="200">
                    <Text as="p">1. When a customer requests a refund, Pleero automatically sends them an offer</Text>
                    <Text as="p">2. They can choose to take {merchant ? `${formatCurrency(merchant.bonus_cap_cents)} bonus` : 'bonus'} as store credit instead</Text>
                    <Text as="p">3. Credits are instant and never expire</Text>
                    <Text as="p">4. Pleero tracks issuance, redemption, and revenue influenced across the Store Credit lifecycle</Text>
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