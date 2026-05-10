'use client';

/**
 * Settings page - merchant configuration.
 * Allows merchants to customize bonus percentage, cap, and branding.
 */

import {
  Page,
  Card,
  Layout,
  TextField,
  RangeSlider,
  BlockStack,
  Text,
  Banner,
} from '@shopify/polaris';
import { useState, useCallback } from 'react';
import { formatCurrency } from '@/lib/api';

export default function Settings() {
  const [bonusPercentage, setBonusPercentage] = useState(10);
  const [bonusCapCents, setBonusCapCents] = useState(5000);
  const [merchantEmail, setMerchantEmail] = useState('merchant@example.com');
  const [brandColor, setBrandColor] = useState('#000000');
  const [logoUrl, setLogoUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );

  const handleSave = useCallback(async () => {
    setSaving(true);
    setSaveMessage(null);

    try {
      // TODO: Get session token from App Bridge
      // const token = await getSessionToken();
      // await updateMerchantSettings(token, {
      //   bonus_percentage: bonusPercentage,
      //   bonus_cap_cents: bonusCapCents,
      //   merchant_email: merchantEmail,
      //   brand_color: brandColor,
      //   logo_url: logoUrl || null,
      // });

      // Mock success for MVP
      setSaveMessage({ type: 'success', text: 'Settings saved successfully' });
    } catch (err) {
      setSaveMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to save settings',
      });
    } finally {
      setSaving(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Page
      title="Settings"
      subtitle="Customize your store credit offers"
      backAction={{ url: '/' }}
      primaryAction={{
        content: 'Save',
        loading: saving,
        onAction: handleSave,
      }}
    >
      <Layout>
        <Layout.Section>
          <BlockStack gap="400">
            {saveMessage && (
              <Banner
                title={saveMessage.text}
                tone={saveMessage.type === 'success' ? 'success' : 'critical'}
                onDismiss={() => setSaveMessage(null)}
              />
            )}

            {/* Offer Settings */}
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">
                  Offer Settings
                </Text>

                <RangeSlider
                  label={`Bonus Percentage: ${bonusPercentage}%`}
                  value={bonusPercentage}
                  onChange={(value) => setBonusPercentage(value as number)}
                  min={5}
                  max={20}
                  output
                  helpText="Percentage bonus to offer customers"
                />

                <TextField
                  label="Bonus Cap"
                  type="number"
                  value={String(bonusCapCents / 100)}
                  onChange={(value) => setBonusCapCents(Number(value) * 100)}
                  prefix="$"
                  helpText={`Maximum bonus amount (currently ${formatCurrency(bonusCapCents)})`}
                  autoComplete="off"
                />

                <Text as="p" variant="bodyMd" tone="subdued">
                  Example: A $100 refund becomes {formatCurrency(10000 + (10000 * bonusPercentage) / 100)} credit
                  (capped at {formatCurrency(bonusCapCents)} bonus)
                </Text>
              </BlockStack>
            </Card>

            {/* Merchant Info */}
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">
                  Merchant Information
                </Text>

                <TextField
                  label="Contact Email"
                  type="email"
                  value={merchantEmail}
                  onChange={setMerchantEmail}
                  helpText="Used for customer replies"
                  autoComplete="email"
                />
              </BlockStack>
            </Card>

            {/* Branding */}
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">
                  Branding
                </Text>

                <TextField
                  label="Logo URL"
                  type="url"
                  value={logoUrl}
                  onChange={setLogoUrl}
                  placeholder="https://example.com/logo.png"
                  helpText="URL to your store logo (optional)"
                  autoComplete="off"
                />

                <TextField
                  label="Brand Color"
                  value={brandColor}
                  onChange={setBrandColor}
                  placeholder="#000000"
                  helpText="Hex color code for primary button in offer emails (e.g., #FF5733)"
                  autoComplete="off"
                />
              </BlockStack>
            </Card>
          </BlockStack>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
