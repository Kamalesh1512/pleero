'use client';

/**
 * Dashboard page - shows merchant metrics and recent activity.
 * Embedded in Shopify admin via App Bridge.
 */

import { Page, Card, Layout, Text, BlockStack, InlineStack, Banner } from '@shopify/polaris';
import { useEffect, useState, useCallback } from 'react';
import {
  formatCurrency,
  getSessionToken,
  getDashboardMetrics,
  getMerchantSettings,
  type DashboardMetrics,
  type Merchant
} from '@/lib/api';

export default function Dashboard() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activatingBilling, setActivatingBilling] = useState(false);

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
      <Page title="Dashboard">
        <Text as="p">Loading...</Text>
      </Page>
    );
  }

  if (error || !metrics) {
    return (
      <Page title="Dashboard">
        <Text as="p" tone="critical">
          {error || 'Failed to load metrics'}
        </Text>
      </Page>
    );
  }

  return (
    <Page
      title="Dashboard"
      subtitle="This month's performance"
      primaryAction={{
        content: 'Settings',
        url: '/settings',
      }}
    >
      <Layout>
        <Layout.Section>
          <BlockStack gap="400">
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

            {/* Metrics Cards */}
            <InlineStack gap="400">
              <Card>
                <BlockStack gap="200">
                  <Text as="h2" variant="headingMd">
                    Offers Sent
                  </Text>
                  <Text as="p" variant="heading2xl">
                    {metrics.offers_sent}
                  </Text>
                </BlockStack>
              </Card>

              <Card>
                <BlockStack gap="200">
                  <Text as="h2" variant="headingMd">
                    Accepted
                  </Text>
                  <Text as="p" variant="heading2xl" tone="success">
                    {metrics.offers_accepted}
                  </Text>
                  <Text as="p" variant="bodyMd" tone="subdued">
                    {metrics.acceptance_rate.toFixed(1)}% acceptance rate
                  </Text>
                </BlockStack>
              </Card>

              <Card>
                <BlockStack gap="200">
                  <Text as="h2" variant="headingMd">
                    Revenue Retained
                  </Text>
                  <Text as="p" variant="heading2xl" tone="success">
                    {formatCurrency(metrics.revenue_retained_cents)}
                  </Text>
                  <Text as="p" variant="bodyMd" tone="subdued">
                    Store credit issued
                  </Text>
                </BlockStack>
              </Card>
            </InlineStack>

            {/* Getting Started */}
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
  );
}
