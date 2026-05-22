'use client';

/**
 * Billing page - shows subscription status and billing controls.
 * MVP: displays trial/active status, future: handles subscription changes.
 */

import { Page, Card, Layout, Text, BlockStack, Banner, Button } from '@shopify/polaris';
import { useEffect, useState, useRef, useCallback } from 'react';
import AppFrame from '@/components/AppFrame';
import { getSessionToken, getMerchantSettings, type Merchant } from '@/lib/api';

export default function BillingPage() {
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activating, setActivating] = useState(false);
  const tokenRef = useRef<string | null>(null);

  const refreshToken = useCallback(async () => {
    try {
      const t = await getSessionToken();
      tokenRef.current = t;
      return t;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    refreshToken();
    const interval = setInterval(refreshToken, 55_000);
    return () => clearInterval(interval);
  }, [refreshToken]);

  useEffect(() => {
    async function loadMerchant() {
      try {
        const token = tokenRef.current ?? await refreshToken();
        if (!token) throw new Error('Could not get session token — try refreshing the page');

        const merchantData = await getMerchantSettings(token);
        setMerchant(merchantData);
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load billing info');
        setLoading(false);
      }
    }

    const timer = setTimeout(loadMerchant, 200);
    return () => clearTimeout(timer);
  }, [refreshToken]);

  const handleActivateBilling = async () => {
    setActivating(true);
    try {
      // TODO: Implement billing activation API call
      alert('Billing activation would redirect to Shopify charge approval page');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to activate billing');
    } finally {
      setActivating(false);
    }
  };

  if (loading) {
    return (
      <AppFrame>
        <Page title="Billing">
          <Text as="p">Loading billing information...</Text>
        </Page>
      </AppFrame>
    );
  }

  if (error || !merchant) {
    return (
      <AppFrame>
        <Page title="Billing">
          <Text as="p" tone="critical">{error || 'Failed to load billing info'}</Text>
        </Page>
      </AppFrame>
    );
  }

  const isActive = merchant.subscription_status === 'ACTIVE';
  const isTrial = merchant.trial_ends_at && new Date(merchant.trial_ends_at) > new Date();
  const trialEnded = merchant.trial_ends_at && new Date(merchant.trial_ends_at) < new Date();

  return (
    <AppFrame>
      <Page
        title="Billing"
        subtitle="Manage your subscription"
      >
        <Layout>
          <Layout.Section>
            <BlockStack gap="400">
              {/* Trial Banner */}
              {isTrial && !isActive && (
                <Banner tone="info">
                  <Text as="p">
                    Your 14-day trial ends on {merchant.trial_ends_at ? new Date(merchant.trial_ends_at).toLocaleDateString() : ''}.
                    Activate your subscription to continue after the trial.
                  </Text>
                </Banner>
              )}

              {/* Trial Ended Banner */}
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

              {/* Active Subscription */}
              {isActive && (
                <Banner tone="success">
                  <Text as="p">Your subscription is active.</Text>
                </Banner>
              )}

              {/* Plan Details */}
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
                    <Button
                      onClick={handleActivateBilling}
                      loading={activating}
                      variant="primary"
                    >
                      Activate $99/month plan
                    </Button>
                  )}
                </BlockStack>
              </Card>

              {/* What's Included */}
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
