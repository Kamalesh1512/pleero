'use client';

/**
 * Offers page - shows list of all offers sent to customers.
 * Displays order details, customer info, offer status, and revenue retained.
 */

import { Page, Card, Layout, Text, BlockStack, Badge, DataTable, Banner } from '@shopify/polaris';
import { useEffect, useState, useRef, useCallback } from 'react';
import AppFrame from '@/components/AppFrame';
import { getSessionToken, formatCurrency } from '@/lib/api';

interface Offer {
  id: string;
  order_number: string;
  customer_email: string;
  refund_amount_cents: number;
  credit_amount_cents: number;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED';
  revenue_retained_cents: number | null;
  created_at: string;
}

export default function OffersPage() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
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
    async function loadOffers() {
      try {
        const token = tokenRef.current ?? await refreshToken();
        if (!token) throw new Error('Could not get session token — try refreshing the page');

        const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

        const response = await fetch(`${API_BASE_URL}/api/offers`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch offers: ${response.statusText}`);
        }

        const data = await response.json();
        setOffers(data.offers || []);
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load offers');
        setLoading(false);
      }
    }

    const timer = setTimeout(loadOffers, 200);
    return () => clearTimeout(timer);
  }, [refreshToken, retryCount]);

  const getStatusBadge = (status: Offer['status']) => {
    switch (status) {
      case 'ACCEPTED':
        return <Badge tone="success">Accepted</Badge>;
      case 'PENDING':
        return <Badge tone="attention">Pending</Badge>;
      case 'DECLINED':
        return <Badge tone="critical">Declined</Badge>;
      case 'EXPIRED':
        return <Badge>Expired</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const rows = offers.map(offer => [
    offer.order_number,
    offer.customer_email,
    formatCurrency(offer.credit_amount_cents),
    getStatusBadge(offer.status),
    offer.revenue_retained_cents !== null
      ? formatCurrency(offer.revenue_retained_cents)
      : '—',
  ]);

  if (loading) {
    return (
      <AppFrame>
        <Page title="Offers">
          <Text as="p">Loading offers...</Text>
        </Page>
      </AppFrame>
    );
  }

  if (error) {
    const isNetworkError = error.toLowerCase().includes('failed to fetch') || error.toLowerCase().includes('network');
    return (
      <AppFrame>
        <Page title="Offers">
          <Banner
            tone="critical"
            title={isNetworkError ? 'Connection error' : 'Could not load offers'}
            action={{ content: 'Retry', onAction: () => { setError(null); setLoading(true); setRetryCount(c => c + 1); } }}
          >
            <Text as="p">
              {isNetworkError
                ? 'Could not reach the server. Check your connection and try again.'
                : error}
            </Text>
          </Banner>
        </Page>
      </AppFrame>
    );
  }

  return (
    <AppFrame>
      <Page
        title="Offers"
        subtitle={`${offers.length} offers sent`}
      >
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
                  columnContentTypes={[
                    'text',
                    'text',
                    'numeric',
                    'text',
                    'numeric',
                  ]}
                  headings={[
                    'Order #',
                    'Customer',
                    'Amount offered',
                    'Status',
                    'Retained',
                  ]}
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
