'use client';

/**
 * Analytics page - shows detailed metrics and trends.
 * MVP: placeholder page, full analytics in future release.
 */

import { Page, Card, Layout, Text, BlockStack, Banner } from '@shopify/polaris';
import AppFrame from '@/components/AppFrame';

export default function AnalyticsPage() {
  return (
    <AppFrame>
      <Page
        title="Analytics"
        subtitle="Detailed metrics and trends"
      >
        <Layout>
          <Layout.Section>
            <BlockStack gap="400">
              <Banner tone="info">
                <Text as="p">
                  Advanced analytics coming soon. For now, view your key metrics on the Dashboard.
                </Text>
              </Banner>

              <Card>
                <BlockStack gap="400">
                  <Text as="h2" variant="headingMd">Planned features</Text>
                  <BlockStack gap="200">
                    <Text as="p">• Acceptance rate trends over time</Text>
                    <Text as="p">• Revenue retained by product category</Text>
                    <Text as="p">• Customer lifetime value impact</Text>
                    <Text as="p">• A/B testing different bonus percentages</Text>
                    <Text as="p">• Cohort analysis (trial vs paid merchants)</Text>
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
