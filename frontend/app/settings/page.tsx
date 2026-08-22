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
  Spinner,
  Badge,
} from '@shopify/polaris';
import { useState, useCallback, useEffect } from 'react';
import {
  getMerchantSettings,
  updateMerchantSettings,
  getShopLogo,
  getAutomationSettings,
  updateAutomationWorkflow,
  issueGoodwillCredit,
  getWinbackCandidates,
  issueWinbackCredit,
  triggerReminderSweep,
  ApiError,
  AUTOMATION_WORKFLOW_LABELS,
  AUTOMATION_WORKFLOW_DESCRIPTIONS,
  type AutomationWorkflowConfig,
  type WinbackCandidate,
} from '@/lib/api';
import AppFrame from '@/components/AppFrame';

export default function Settings() {
  // ── Merchant settings ─────────────────────────────────────────────────────
  const [bonusPercentage, setBonusPercentage] = useState(10);
  const [bonusCapCents, setBonusCapCents] = useState(5000);
  const [merchantEmail, setMerchantEmail] = useState('');
  const [brandColor, setBrandColor] = useState('#000000');
  const [logoUrl, setLogoUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [logoFetchMessage, setLogoFetchMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // ── Automation settings ───────────────────────────────────────────────────
  const [workflows, setWorkflows] = useState<AutomationWorkflowConfig[]>([]);
  const [automationLoading, setAutomationLoading] = useState(true);
  const [savingWorkflow, setSavingWorkflow] = useState<string | null>(null);

  // ── Goodwill ──────────────────────────────────────────────────────────────
  const [goodwillEmail, setGoodwillEmail] = useState('');
  const [goodwillName, setGoodwillName] = useState('');
  const [goodwillAmount, setGoodwillAmount] = useState('50');
  const [goodwillNote, setGoodwillNote] = useState('');
  const [goodwillSending, setGoodwillSending] = useState(false);
  const [goodwillMessage, setGoodwillMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // ── Win-back ──────────────────────────────────────────────────────────────
  const [winbackCandidates, setWinbackCandidates] = useState<WinbackCandidate[]>([]);
  const [winbackLoading, setWinbackLoading] = useState(false);
  const [winbackCount, setWinbackCount] = useState<number | null>(null);
  const [winbackAmount, setWinbackAmount] = useState('25');
  const [winbackIssuing, setWinbackIssuing] = useState<string | null>(null);
  const [winbackIssued, setWinbackIssued] = useState<Record<string, { success: boolean; message: string }>>({});

  // ── Reminder sweep ────────────────────────────────────────────────────────
  const [reminderTriggering, setReminderTriggering] = useState(false);
  const [reminderMessage, setReminderMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // ── Load data ─────────────────────────────────────────────────────────────
  const loadSettings = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const merchant = await getMerchantSettings();
      setBonusPercentage(merchant.bonus_percentage);
      setBonusCapCents(merchant.bonus_cap_cents);
      setMerchantEmail(merchant.merchant_email);
      setBrandColor(merchant.brand_color);
      setLogoUrl(merchant.logo_url || '');
    } catch (err) {
      setLoadError(
        err instanceof ApiError && err.status === 404
          ? 'App setup incomplete. Please reinstall Pleero from the Shopify App Store.'
          : err instanceof ApiError && err.status === 401
            ? 'Authentication failed. Please refresh the page to reconnect.'
            : err instanceof Error
              ? err.message
              : 'Failed to load settings',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const loadAutomation = useCallback(async () => {
    setAutomationLoading(true);
    try {
      const data = await getAutomationSettings();
      setWorkflows(data.workflows);
    } catch {
      // Settings may not be fully available yet — that's fine
    } finally {
      setAutomationLoading(false);
    }
  }, []);

  useEffect(() => { loadSettings(); }, [loadSettings]);
  useEffect(() => { loadAutomation(); }, [loadAutomation]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleFetchLogo = useCallback(async () => {
    setLogoFetchMessage(null);
    try {
      const url = await getShopLogo();
      if (url) {
        setLogoUrl(url);
        setLogoFetchMessage({ type: 'success', text: 'Logo fetched from Shopify' });
      } else {
        setLogoFetchMessage({ type: 'error', text: 'No logo found. Upload a favicon in your Shopify store settings, or enter a URL manually.' });
      }
    } catch {
      setLogoFetchMessage({ type: 'error', text: 'Failed to fetch logo. Please enter the URL manually.' });
    }
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setSaveMessage(null);
    try {
      const updated = await updateMerchantSettings({
        bonus_percentage: bonusPercentage,
        bonus_cap_cents: bonusCapCents,
        merchant_email: merchantEmail,
        brand_color: brandColor,
        logo_url: logoUrl || null,
      });
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
  }, [bonusPercentage, bonusCapCents, merchantEmail, brandColor, logoUrl]);

  const handleToggleWorkflow = useCallback(async (wf: AutomationWorkflowConfig) => {
    setSavingWorkflow(wf.workflow);
    try {
      const updated = await updateAutomationWorkflow(wf.workflow, { enabled: !wf.enabled });
      setWorkflows((prev) =>
        prev.map((w) => (w.workflow === updated.workflow ? updated : w))
      );
    } catch {
      // revert on error
    } finally {
      setSavingWorkflow(null);
    }
  }, []);

  const handleGoodwill = useCallback(async () => {
    setGoodwillSending(true);
    setGoodwillMessage(null);
    try {
      const amountCents = Math.round(parseFloat(goodwillAmount) * 100);
      const result = await issueGoodwillCredit({
        customer_email: goodwillEmail,
        customer_first_name: goodwillName,
        amount_cents: amountCents,
        note: goodwillNote,
      });
      setGoodwillMessage({ type: result.success ? 'success' : 'error', text: result.message });
      if (result.success) {
        setGoodwillEmail('');
        setGoodwillName('');
        setGoodwillAmount('50');
        setGoodwillNote('');
      }
    } catch (err) {
      setGoodwillMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to issue credit' });
    } finally {
      setGoodwillSending(false);
    }
  }, [goodwillEmail, goodwillName, goodwillAmount, goodwillNote]);

  const handleLoadWinback = useCallback(async () => {
    setWinbackLoading(true);
    try {
      const data = await getWinbackCandidates();
      setWinbackCandidates(data.candidates);
      setWinbackCount(data.count);
      setWinbackIssued({});
    } catch {
      // silent
    } finally {
      setWinbackLoading(false);
    }
  }, []);

  const handleIssueWinback = useCallback(async (candidate: WinbackCandidate) => {
    setWinbackIssuing(candidate.customer_email);
    try {
      const amountCents = Math.round(parseFloat(winbackAmount) * 100);
      const result = await issueWinbackCredit({
        customer_email: candidate.customer_email,
        customer_first_name: candidate.customer_first_name,
        customer_shopify_id: candidate.customer_shopify_id,
        amount_cents: amountCents,
      });
      setWinbackIssued((prev) => ({ ...prev, [candidate.customer_email]: result }));
    } catch (err) {
      setWinbackIssued((prev) => ({
        ...prev,
        [candidate.customer_email]: {
          success: false,
          message: err instanceof Error ? err.message : 'Failed to issue credit',
        },
      }));
    } finally {
      setWinbackIssuing(null);
    }
  }, [winbackAmount]);

  const handleTriggerReminders = useCallback(async () => {
    setReminderTriggering(true);
    setReminderMessage(null);
    try {
      const data = await triggerReminderSweep();
      setReminderMessage({
        type: 'success',
        text: `${data.reminders_sent} reminder(s) sent`,
      });
    } catch (err) {
      setReminderMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to trigger reminders' });
    } finally {
      setReminderTriggering(false);
    }
  }, []);

  // ── Loading / error states ────────────────────────────────────────────────

  if (loading) {
    return (
      <AppFrame>
        <Page title="Settings">
          <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
            <Spinner accessibilityLabel="Loading settings" size="large" />
          </div>
        </Page>
      </AppFrame>
    );
  }

  if (loadError) {
    return (
      <AppFrame>
        <Page title="Settings">
          <Banner
            tone="critical"
            title="Failed to load settings"
            action={{ content: 'Retry', onAction: loadSettings }}
          >
            <Text as="p">{loadError}</Text>
          </Banner>
        </Page>
      </AppFrame>
    );
  }

  const reminderWorkflow = workflows.find((w) => w.workflow === 'redemption_reminder');

  return (
    <AppFrame>
      <Page
        title="Settings"
        subtitle="Customize your store credit offers and automation"
        primaryAction={{
          content: 'Save',
          loading: saving,
          onAction: handleSave,
        }}
      >
        <Layout>
          <Layout.Section>
            <BlockStack gap="500">
              {saveMessage && (
                <Banner
                  title={saveMessage.text}
                  tone={saveMessage.type === 'success' ? 'success' : 'critical'}
                  onDismiss={() => setSaveMessage(null)}
                />
              )}

              {/* ── Offer Settings ───────────────────────────────────── */}
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
                    Example: A $100 refund becomes{' '}
                    ${((10000 + (10000 * bonusPercentage) / 100) / 100).toFixed(0)} credit
                    (capped at ${bonusCapCents / 100} bonus)
                  </Text>
                </BlockStack>
              </Card>

              {/* ── Automation Workflows ──────────────────────────────── */}
              <Card>
                <BlockStack gap="400">
                  <Text as="h2" variant="headingMd">
                    Automation Workflows
                  </Text>
                  <Text as="p" variant="bodySm" tone="subdued">
                    Manage which Store Credit automation workflows are active.
                    Each workflow runs independently based on its configuration.
                  </Text>

                  {automationLoading ? (
                    <Spinner accessibilityLabel="Loading workflows" size="small" />
                  ) : (
                    <BlockStack gap="300">
                      {workflows.map((wf) => (
                        <div
                          key={wf.workflow}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            padding: '12px',
                            background: 'var(--pleero-ink-surface)',
                            borderRadius: 'var(--radius-md)',
                            border: '0.5px solid var(--pleero-ink-border)',
                          }}
                        >
                          <div style={{ flex: 1 }}>
                            <Text as="h3" variant="headingSm">
                              {AUTOMATION_WORKFLOW_LABELS[wf.workflow] || wf.workflow}
                            </Text>
                            <Text as="p" variant="bodySm" tone="subdued">
                              {AUTOMATION_WORKFLOW_DESCRIPTIONS[wf.workflow]}
                            </Text>
                            <div style={{ display: 'flex', gap: '12px', marginTop: '4px' }}>
                              <Text as="p" variant="bodySm" tone="subdued">
                                Wait: {wf.min_days_before_action}d
                              </Text>
                              <Text as="p" variant="bodySm" tone="subdued">
                                Max: {wf.max_actions_per_customer} per customer
                              </Text>
                            </div>
                          </div>
                          <Button
                            size="slim"
                            tone={wf.enabled ? 'critical' : 'success'}
                            loading={savingWorkflow === wf.workflow}
                            onClick={() => handleToggleWorkflow(wf)}
                          >
                            {wf.enabled ? 'Disable' : 'Enable'}
                          </Button>
                          <Badge tone={wf.enabled ? 'success' : 'critical'}>
                            {wf.enabled ? 'Active' : 'Paused'}
                          </Badge>
                        </div>
                      ))}
                    </BlockStack>
                  )}
                </BlockStack>
              </Card>

              {/* ── Goodwill ──────────────────────────────────────────── */}
              <Card>
                <BlockStack gap="400">
                  <Text as="h2" variant="headingMd">
                    Issue Goodwill Credit
                  </Text>
                  <Text as="p" variant="bodySm" tone="subdued">
                    Manually issue Store Credit to a customer as a goodwill gesture.
                    The credit is issued directly to their Shopify Store Credit account.
                  </Text>

                  {goodwillMessage && (
                    <Banner
                      title={goodwillMessage.text}
                      tone={goodwillMessage.type === 'success' ? 'success' : 'critical'}
                      onDismiss={() => setGoodwillMessage(null)}
                    />
                  )}

                  <TextField
                    label="Customer Email"
                    type="email"
                    value={goodwillEmail}
                    onChange={setGoodwillEmail}
                    autoComplete="off"
                    placeholder="customer@example.com"
                  />

                  <TextField
                    label="Customer Name (optional)"
                    value={goodwillName}
                    onChange={setGoodwillName}
                    autoComplete="off"
                    placeholder="Jane Smith"
                  />

                  <TextField
                    label="Credit Amount ($)"
                    type="number"
                    value={goodwillAmount}
                    onChange={setGoodwillAmount}
                    autoComplete="off"
                    helpText="Enter the full dollar amount to issue"
                  />

                  <TextField
                    label="Note (optional)"
                    value={goodwillNote}
                    onChange={setGoodwillNote}
                    autoComplete="off"
                    placeholder="e.g. Late delivery apology"
                    multiline={2}
                  />

                  <Button
                    variant="primary"
                    onClick={handleGoodwill}
                    loading={goodwillSending}
                  >
                    Issue Goodwill Credit
                  </Button>
                </BlockStack>
              </Card>

              {/* ── Win-back ──────────────────────────────────────────── */}
              <Card>
                <BlockStack gap="400">
                  <Text as="h2" variant="headingMd">
                    Win-back Candidates
                  </Text>
                  <Text as="p" variant="bodySm" tone="subdued">
                    Customers who have not made a purchase in 90+ days.
                    These could be re-engaged with a Store Credit offer.
                  </Text>

                  {winbackCount !== null && (
                    <Text as="h3" variant="headingSm">
                      {winbackCount} candidate(s) identified
                    </Text>
                  )}

                  {winbackCandidates.length > 0 && (
                    <>
                      <TextField
                        label="Credit amount per candidate"
                        type="number"
                        prefix="$"
                        value={winbackAmount}
                        onChange={setWinbackAmount}
                        autoComplete="off"
                      />
                      <BlockStack gap="200">
                        {winbackCandidates.slice(0, 10).map((c, i) => {
                          const issued = winbackIssued[c.customer_email];
                          return (
                            <div
                              key={i}
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '8px 0',
                                borderBottom: '0.5px solid var(--pleero-ink-border)',
                                fontSize: '13px',
                                gap: '12px',
                              }}
                            >
                              <div style={{ flex: 1 }}>
                                <div style={{ color: 'var(--pleero-white)' }}>
                                  {c.customer_first_name || c.customer_email}
                                </div>
                                <div style={{ color: 'var(--pleero-muted)', fontFamily: 'var(--font-mono)', fontSize: '11px' }}>
                                  {c.days_since_last_activity}d inactive
                                </div>
                              </div>
                              {issued ? (
                                <Badge tone={issued.success ? 'success' : 'critical'}>
                                  {issued.success ? 'Issued' : 'Failed'}
                                </Badge>
                              ) : (
                                <Button
                                  size="slim"
                                  onClick={() => handleIssueWinback(c)}
                                  loading={winbackIssuing === c.customer_email}
                                >
                                  Issue credit
                                </Button>
                              )}
                            </div>
                          );
                        })}
                      </BlockStack>
                    </>
                  )}

                  <Button
                    onClick={handleLoadWinback}
                    loading={winbackLoading}
                  >
                    {winbackCount !== null ? 'Refresh' : 'Find Candidates'}
                  </Button>
                </BlockStack>
              </Card>

              {/* ── Redemption Reminders ───────────────────────────────── */}
              <Card>
                <BlockStack gap="400">
                  <Text as="h2" variant="headingMd">
                    Redemption Reminders
                  </Text>
                  <Text as="p" variant="bodySm" tone="subdued">
                    Automatically remind customers about unredeemed Store Credit.
                    Runs daily based on your workflow settings above.
                  </Text>

                  {reminderMessage && (
                    <Banner
                      title={reminderMessage.text}
                      tone={reminderMessage.type === 'success' ? 'success' : 'critical'}
                      onDismiss={() => setReminderMessage(null)}
                    />
                  )}

                  {reminderWorkflow && (
                    <BlockStack gap="100">
                      <Text as="p" variant="bodySm">
                        Status: <Badge tone={reminderWorkflow.enabled ? 'success' : 'critical'}>
                          {reminderWorkflow.enabled ? 'Running daily' : 'Paused'}
                        </Badge>
                      </Text>
                      <Text as="p" variant="bodySm" tone="subdued">
                        Waits {reminderWorkflow.min_days_before_action} days after credit issuance,
                        max {reminderWorkflow.max_actions_per_customer} reminder(s) per customer.
                      </Text>
                    </BlockStack>
                  )}

                  <Button
                    onClick={handleTriggerReminders}
                    loading={reminderTriggering}
                  >
                    Run Reminders Now
                  </Button>
                </BlockStack>
              </Card>

              {/* ── Merchant Information ──────────────────────────────── */}
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

              {/* ── Branding ──────────────────────────────────────────── */}
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

                    {logoFetchMessage && (
                      <Banner
                        title={logoFetchMessage.text}
                        tone={logoFetchMessage.type === 'success' ? 'success' : 'critical'}
                        onDismiss={() => setLogoFetchMessage(null)}
                      />
                    )}

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