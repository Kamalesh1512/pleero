'use client';

import { Page, Card, Layout, Text, BlockStack, Badge, DataTable, Banner } from '@shopify/polaris';
import { useEffect, useState, useCallback } from 'react';
import AppFrame from '@/components/AppFrame';
import { getMerchantOffers, formatCurrency, type MerchantOffer } from '@/lib/api';

export default function OffersPage() {
  const [offers, setOffers] = useState<MerchantOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadOffers = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getMerchantOffers();
      setOffers(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load offers');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadOffers(); }, [loadOffers]);

  const getStatusBadge = (status: MerchantOffer['status']) => {
    switch (status) {
      case 'ACCEPTED': return <Badge tone="success">Accepted</Badge>;
      case 'PENDING':  return <Badge tone="attention">Pending</Badge>;
      case 'DECLINED': return <Badge tone="critical">Declined</Badge>;
      case 'EXPIRED':  return <Badge>Expired</Badge>;
      default:         return <Badge>{status}</Badge>;
    }
  };

  const rows = offers.map(offer => [
    offer.order_number,
    offer.customer_email,
    formatCurrency(offer.credit_amount_cents),
    getStatusBadge(offer.status),
    offer.revenue_retained_cents !== null ? formatCurrency(offer.revenue_retained_cents) : '—',
  ]);

  if (loading) {
    return (
      <AppFrame>
        <Page title="Offers"><Text as="p">Loading offers...</Text></Page>
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
