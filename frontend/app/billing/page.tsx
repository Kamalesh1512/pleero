'use client';

import { Page, Card, Layout, Text, BlockStack, Banner, Button, Spinner } from '@shopify/polaris';
import { useEffect, useState, useCallback } from 'react';
import AppFrame from '@/components/AppFrame';
import { getMerchantSettings, activateBilling, ApiError, type Merchant } from '@/lib/api';

export default function BillingPage() {
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activating, setActivating] = useState(false);

  const loadMerchant = useCallback(async () => {
    try {
      setLoading(true);
      const merchantData = await getMerchantSettings();
      setMerchant(merchantData);
      setError(null);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setError('App setup incomplete. Please reinstall Pleero from the Shopify App Store.');
      } else if (err instanceof ApiError && err.status === 401) {
        setError('Authentication failed. Please refresh the page to reconnect.');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to load billing info');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadMerchant(); }, [loadMerchant]);

  const handleActivateBilling = async () => {
    setActivating(true);
    setError(null);
    try {
      const { confirmation_url } = await activateBilling();
      // Standalone app: navigate directly to Shopify's billing confirmation page.
      // After approval Shopify redirects to /api/billing/callback → /dashboard.
      window.location.href = confirmation_url;
      // Don't reset activating — the page navigates away.
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to activate billing');
      setActivating(false);
    }
  };

  if (loading) {
    return (
      <AppFrame>
        <Page title="Billing">
          <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
            <Spinner accessibilityLabel="Loading billing" size="large" />
          </div>
        </Page>
      </AppFrame>
    );
  }

  if (error || !merchant) {
    return (
      <AppFrame>
        <Page title="Billing">
          <Banner tone="critical" title="Failed to load billing info" action={{ content: 'Retry', onAction: loadMerchant }}>
            <Text as="p">{error ?? 'Unknown error'}</Text>
          </Banner>
        </Page>
      </AppFrame>
    );
  }

  const isActive = merchant.subscription_status === 'ACTIVE';
  const isTrial = merchant.trial_ends_at && new Date(merchant.trial_ends_at) > new Date();
  const trialEnded = merchant.trial_ends_at && new Date(merchant.trial_ends_at) < new Date();

  return (
    <AppFrame>
      <Page title="Billing" subtitle="Manage your subscription">
        <Layout>
          <Layout.Section>
            <BlockStack gap="400">
              {isTrial && !isActive && (
                <Banner tone="info">
                  <Text as="p">
                    Your 14-day trial ends on {merchant.trial_ends_at ? new Date(merchant.trial_ends_at).toLocaleDateString() : ''}.
                    Activate your subscription to continue after the trial.
                  </Text>
                </Banner>
              )}

              {trialEnded && !isActive && (
                <Banner
                  tone="warning"
                  action={{
                    content: 'Activate $99/month plan',
                    onAction: handleActivateBilling,
                    loading: activating,
                  }}
                >
                  <Text as="p">
                    Your trial has ended. Activate your subscription to continue receiving store credit offers.
                  </Text>
                </Banner>
              )}

              {isActive && (
                <Banner tone="success">
                  <Text as="p">Your subscription is active.</Text>
                </Banner>
              )}

              <Card>
                <BlockStack gap="400">
                  <Text as="h2" variant="headingMd">Plan details</Text>
                  <BlockStack gap="200">
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Text as="p">Plan:</Text>
                      <Text as="p" fontWeight="semibold">Pleero Growth</Text>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Text as="p">Price:</Text>
                      <Text as="p" fontWeight="semibold">$99/month</Text>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Text as="p">Status:</Text>
                      <Text as="p" fontWeight="semibold">
                        {isActive ? 'Active' : isTrial ? 'Trial' : 'Inactive'}
                      </Text>
                    </div>
                    {merchant.trial_ends_at && (
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Text as="p">{isTrial ? 'Trial ends:' : 'Trial ended:'}</Text>
                        <Text as="p" fontWeight="semibold">
                          {new Date(merchant.trial_ends_at).toLocaleDateString()}
                        </Text>
                      </div>
                    )}
                  </BlockStack>

                  {!isActive && !trialEnded && (
                    <Button onClick={handleActivateBilling} loading={activating} variant="primary">
                      Activate $99/month plan
                    </Button>
                  )}
                </BlockStack>
              </Card>

              <Card>
                <BlockStack gap="400">
                  <Text as="h2" variant="headingMd">What's included</Text>
                  <BlockStack gap="200">
                    <Text as="p">✓ Unlimited store credit offers</Text>
                    <Text as="p">✓ Automatic refund interception</Text>
                    <Text as="p">✓ Custom bonus percentage (5-20%)</Text>
                    <Text as="p">✓ Branded customer emails</Text>
                    <Text as="p">✓ Analytics dashboard</Text>
                    <Text as="p">✓ Email support</Text>
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
