'use client';

import { Page, Card, Layout, Text, BlockStack, Badge, DataTable, Banner, Spinner } from '@shopify/polaris';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState, useCallback } from 'react';
import AppFrame from '@/components/AppFrame';
import { getMerchantOffers, formatCurrency, ApiError, type MerchantOffer } from '@/lib/api';

export default function OffersPage() {
  return (
    <Suspense fallback={
      <AppFrame>
        <Page title="Offers">
          <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
            <Spinner accessibilityLabel="Loading offers" size="large" />
          </div>
        </Page>
      </AppFrame>
    }>
      <OffersPageContent />
    </Suspense>
  );
}

function OffersPageContent() {
  const searchParams = useSearchParams();
  const filterNeedsReview = searchParams.get('needs_review') === 'true';

  const [offers, setOffers] = useState<MerchantOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadOffers = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getMerchantOffers({ needsReview: filterNeedsReview });
      setOffers(data);
      setError(null);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setError('App setup incomplete. Please reinstall Pleero from the Shopify App Store.');
      } else if (err instanceof ApiError && err.status === 401) {
        setError('Authentication failed. Please refresh the page to reconnect.');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to load offers');
      }
    } finally {
      setLoading(false);
    }
  }, [filterNeedsReview]);

  useEffect(() => { loadOffers(); }, [loadOffers]);

  const getStatusBadge = (offer: MerchantOffer) => {
    if (offer.refund_status === 'MANUAL_REVIEW') {
      return <Badge tone="critical">Needs review</Badge>;
    }
    switch (offer.status) {
      case 'ACCEPTED': return <Badge tone="success">Accepted</Badge>;
      case 'PENDING':  return <Badge tone="attention">Pending</Badge>;
      case 'DECLINED': return <Badge tone="critical">Declined</Badge>;
      case 'EXPIRED':  return <Badge>Expired</Badge>;
      default:         return <Badge>{offer.status}</Badge>;
    }
  };

  const needsReviewCount = offers.filter(o => o.refund_status === 'MANUAL_REVIEW').length;

  const rows = offers.map(offer => [
    offer.order_number,
    offer.customer_email,
    formatCurrency(offer.credit_amount_cents),
    getStatusBadge(offer),
    offer.revenue_retained_cents !== null ? formatCurrency(offer.revenue_retained_cents) : '—',
  ]);

  if (loading) {
    return (
      <AppFrame>
        <Page title="Offers">
          <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
            <Spinner accessibilityLabel="Loading offers" size="large" />
          </div>
        </Page>
      </AppFrame>
    );
  }

  if (error) {
    return (
      <AppFrame>
        <Page title="Offers">
          <Banner
            tone="critical"
            title="Could not load offers"
            action={{ content: 'Retry', onAction: loadOffers }}
          >
            <Text as="p">{error}</Text>
          </Banner>
        </Page>
      </AppFrame>
    );
  }

  return (
    <AppFrame>
      <Page title="Offers" subtitle={`${offers.length} offers sent`}>
        <Layout>
          {needsReviewCount > 0 && (
            <Layout.Section>
              <Banner tone="critical" title={`${needsReviewCount} offer${needsReviewCount === 1 ? '' : 's'} need${needsReviewCount === 1 ? 's' : ''} manual review`}>
                <Text as="p">
                  Pleero could not automatically issue store credit for these customers — most
                  likely because the original cash refund had already been paid out. Resolve
                  these directly in Shopify admin.
                </Text>
              </Banner>
            </Layout.Section>
          )}
          <Layout.Section>
            <Card>
              {offers.length === 0 ? (
                <BlockStack gap="400">
                  <Text as="h2" variant="headingMd">No offers yet</Text>
                  <Text as="p" tone="subdued">
                    When customers request refunds, they'll automatically receive store credit offers.
                    Those offers will appear here.
                  </Text>
                </BlockStack>
              ) : (
                <DataTable
                  columnContentTypes={['text', 'text', 'numeric', 'text', 'numeric']}
                  headings={['Order #', 'Customer', 'Amount offered', 'Status', 'Retained']}
                  rows={rows}
                />
              )}
            </Card>
          </Layout.Section>
        </Layout>
      </Page>
    </AppFrame>
  );
}
