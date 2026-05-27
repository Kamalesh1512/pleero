import { Card, Text, BlockStack } from '@shopify/polaris';
import Link from 'next/link';

export default function NotFound() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: '24px',
        background: '#f6f6f7',
      }}
    >
      <div style={{ maxWidth: '480px', width: '100%' }}>
        <Card>
          <BlockStack gap="400">
            <Text as="h1" variant="headingXl">
              Page not found
            </Text>
            <Text as="p" tone="subdued">
              The page you&apos;re looking for doesn&apos;t exist. If you arrived here
              via a link, please contact support.
            </Text>
            <Link href="/dashboard" style={{ textDecoration: 'none' }}>
              <span style={{
                display: 'inline-block',
                padding: '8px 16px',
                background: '#008060',
                color: '#fff',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
              }}>
                Go to Dashboard
              </span>
            </Link>
          </BlockStack>
        </Card>
      </div>
    </div>
  );
}
