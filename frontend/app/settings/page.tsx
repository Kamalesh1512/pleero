'use client';

import {
  Page,
  Card,
  Layout,
  TextField,
  RangeSlider,
  BlockStack,
  Text,
  Banner,
  Thumbnail,
  InlineStack,
  Button,
} from '@shopify/polaris';
import { useState, useCallback, useEffect, useRef } from 'react';
import { getSessionToken, getMerchantSettings, updateMerchantSettings, getShopLogo } from '@/lib/api';
import AppFrame from '@/components/AppFrame';

export default function Settings() {
  const [bonusPercentage, setBonusPercentage] = useState(10);
  const [bonusCapCents, setBonusCapCents] = useState(5000);
  const [merchantEmail, setMerchantEmail] = useState('');
  const [brandColor, setBrandColor] = useState('#000000');
  const [logoUrl, setLogoUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Cache the session token and keep it fresh so Save never hangs
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

  // Fetch a fresh token on mount and every 55 s (tokens expire in ~1 min)
  useEffect(() => {
    refreshToken();
    const interval = setInterval(refreshToken, 45_000);
    return () => clearInterval(interval);
  }, [refreshToken]);

  // Load merchant settings on mount
  useEffect(() => {
    async function loadSettings() {
      try {
        const token = tokenRef.current ?? await refreshToken();
        if (!token) throw new Error('Could not get session token — try refreshing the page');

        const merchant = await getMerchantSettings(token);
        setBonusPercentage(merchant.bonus_percentage);
        setBonusCapCents(merchant.bonus_cap_cents);
        setMerchantEmail(merchant.merchant_email);
        setBrandColor(merchant.brand_color);
        setLogoUrl(merchant.logo_url || '');
        setLoading(false);
      } catch (err) {
        setSaveMessage({
          type: 'error',
          text: err instanceof Error ? err.message : 'Failed to load settings',
        });
        setLoading(false);
      }
    }

    // Small delay to let the first refreshToken() populate tokenRef
    const timer = setTimeout(loadSettings, 200);
    return () => clearTimeout(timer);
  }, [refreshToken]);

  const handleFetchLogo = useCallback(async () => {
    try {
      const token = tokenRef.current ?? await refreshToken();
      if (!token) return;
      const url = await getShopLogo(token);
      if (url) setLogoUrl(url);
    } catch {
      // best-effort
    }
  }, [refreshToken]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setSaveMessage(null);

    try {
      // Use cached token; fall back to fresh fetch if needed
      let token = tokenRef.current;
      if (!token) {
        token = await refreshToken();
      }
      if (!token) {
        throw new Error('Could not get session token — try refreshing the page');
      }

      const updated = await updateMerchantSettings(token, {
        bonus_percentage: bonusPercentage,
        bonus_cap_cents: bonusCapCents,
        merchant_email: merchantEmail,
        brand_color: brandColor,
        logo_url: logoUrl || null,
      });

      // Sync state from server response to avoid stale data
      setBonusPercentage(updated.bonus_percentage);
      setBonusCapCents(updated.bonus_cap_cents);
      setMerchantEmail(updated.merchant_email);
      setBrandColor(updated.brand_color);
      setLogoUrl(updated.logo_url || '');

      setSaveMessage({ type: 'success', text: 'Settings saved successfully' });
    } catch (err) {
      setSaveMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to save settings',
      });
    } finally {
      setSaving(false);
    }
  }, [bonusPercentage, bonusCapCents, merchantEmail, brandColor, logoUrl, refreshToken]);

  if (loading) {
    return (
      <AppFrame>
        <Page title="Settings">
          <Text as="p">Loading settings...</Text>
        </Page>
      </AppFrame>
    );
  }

  return (
    <AppFrame>
      <Page
        title="Settings"
        subtitle="Customize your store credit offers"
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
                    onChange={(value) => setBonusCapCents(Math.round(Number(value) * 100))}
                    helpText={`Maximum bonus amount in your store's currency (currently ${bonusCapCents / 100})`}
                    autoComplete="off"
                  />

                  <Text as="p" variant="bodyMd" tone="subdued">
                    Example: A 100 refund becomes{' '}
                    {((10000 + (10000 * bonusPercentage) / 100) / 100).toFixed(0)} credit
                    (capped at {bonusCapCents / 100} bonus)
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

                  <BlockStack gap="200">
                    <InlineStack gap="300" align="start" blockAlign="end">
                      <div style={{ flex: 1 }}>
                        <TextField
                          label="Logo URL"
                          type="url"
                          value={logoUrl}
                          onChange={setLogoUrl}
                          placeholder="https://example.com/logo.png"
                          helpText="URL to your store logo shown on the offer page"
                          autoComplete="off"
                        />
                      </div>
                      <Button onClick={handleFetchLogo} size="slim">
                        Fetch from Shopify
                      </Button>
                    </InlineStack>

                    {logoUrl && (
                      <InlineStack gap="300" blockAlign="center">
                        <Thumbnail
                          source={logoUrl}
                          alt="Store logo preview"
                          size="large"
                        />
                        <Text as="p" variant="bodySm" tone="subdued">
                          Preview
                        </Text>
                      </InlineStack>
                    )}
                  </BlockStack>

                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '12px',
                      fontWeight: 500,
                      color: '#202223',
                      marginBottom: '8px',
                    }}>
                      Brand Color
                    </label>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                      <input
                        type="color"
                        value={brandColor}
                        onChange={(e) => setBrandColor(e.target.value)}
                        style={{
                          width: '60px',
                          height: '60px',
                          border: '2px solid #E1E3E5',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          padding: '4px',
                        }}
                      />
                      <TextField
                        label=""
                        value={brandColor}
                        onChange={setBrandColor}
                        placeholder="#000000"
                        autoComplete="off"
                      />
                    </div>
                    <p style={{ fontSize: '12px', color: '#6D7175', marginTop: '8px' }}>
                      Used as the button color on your customer offer page
                    </p>
                  </div>
                </BlockStack>
              </Card>
            </BlockStack>
          </Layout.Section>
        </Layout>
      </Page>
    </AppFrame>
  );
}
