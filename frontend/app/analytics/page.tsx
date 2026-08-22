'use client';

/**
 * Analytics page — Store Credit Intelligence.
 *
 * Shows time-series trends, credit source breakdown, Refund Recovery funnel,
 * and provides CSV export.
 */

import { Page, Card, Layout, Text, BlockStack, Banner, Spinner, Button, Select, Badge } from '@shopify/polaris';
import { useEffect, useState, useCallback } from 'react';
import {
  formatCurrency,
  getStoreCreditOverview,
  getAnalyticsTimeSeries,
  getCreditSources,
  getRefundFunnel,
  getAutomationPerformance,
  downloadCsvExport,
  ApiError,
  type StoreCreditOverview,
  type TimeSeriesResponse,
  type TimeSeriesPoint,
  type CreditSourceBreakdown,
  type RefundRecoveryFunnel,
  type AutomationPerformance,
} from '@/lib/api';
import AppFrame from '@/components/AppFrame';


// ─── Mini helpers ─────────────────────────────────────────────────────────────


function MetricCard({ label, value, small }: { label: string; value: string | number; small?: boolean }) {
  return (
    <div style={{
      background: 'var(--pleero-ink-surface)',
      border: '0.5px solid var(--pleero-ink-border)',
      borderRadius: 'var(--radius-md)',
      padding: small ? '12px 16px' : '16px 20px',
    }}>
      <div style={{
        fontFamily: 'var(--font-mono)',
        fontSize: '11px',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        color: 'var(--pleero-muted)',
        marginBottom: 'var(--space-2)',
      }}>
        {label}
      </div>
      <div style={{
        fontFamily: 'var(--font-mono)',
        fontSize: small ? '20px' : '26px',
        fontWeight: 600,
        color: 'var(--pleero-green-text)',
      }}>
        {value}
      </div>
    </div>
  );
}


// ─── Tiny bar chart (pure CSS) ──────────────────────────────────────────────


function MiniBarChart({ points, valueKey, color }: {
  points: TimeSeriesPoint[];
  valueKey: 'credit_issued_cents' | 'credit_redeemed_cents' | 'offers_sent' | 'offers_accepted';
  color: string;
}) {
  const values = points.map(p => p[valueKey]);
  const max = Math.max(...values, 1);

  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '2px', height: '60px' }}>
      {values.map((v, i) => (
        <div
          key={i}
          title={`${points[i].date}: ${v}`}
          style={{
            flex: 1,
            background: color,
            height: `${(v / max) * 100}%`,
            borderRadius: '2px 2px 0 0',
            minHeight: v > 0 ? '2px' : 0,
            opacity: 0.85,
          }}
        />
      ))}
    </div>
  );
}


// ─── Funnel row ──────────────────────────────────────────────────────────────


function FunnelRow({ label, value, pct, color }: { label: string; value: number; pct: number; color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '4px 0' }}>
      <div style={{
        width: '140px',
        fontFamily: 'var(--font-mono)',
        fontSize: '12px',
        color: 'var(--pleero-white)',
      }}>
        {label}
      </div>
      <div style={{
        flex: 1,
        height: '20px',
        background: 'var(--pleero-ink)',
        borderRadius: '4px',
        overflow: 'hidden',
        position: 'relative',
      }}>
        <div style={{
          width: `${Math.max(pct, 2)}%`,
          height: '100%',
          background: color,
          borderRadius: '4px',
          transition: 'width 0.3s',
        }} />
      </div>
      <div style={{
        width: '80px',
        textAlign: 'right',
        fontFamily: 'var(--font-mono)',
        fontSize: '13px',
        fontWeight: 600,
        color: 'var(--pleero-green-text)',
      }}>
        {value.toLocaleString()}
      </div>
    </div>
  );
}


// ─── Period selector ──────────────────────────────────────────────────────────


const PERIOD_OPTIONS = [
  { label: 'Last 7 days', value: '7' },
  { label: 'Last 30 days', value: '30' },
  { label: 'Last 90 days', value: '90' },
];


// ─── Page ─────────────────────────────────────────────────────────────────────


export default function AnalyticsPage() {
  const [period, setPeriod] = useState('30');
  const [overview, setOverview] = useState<StoreCreditOverview | null>(null);
  const [timeSeries, setTimeSeries] = useState<TimeSeriesResponse | null>(null);
  const [sources, setSources] = useState<CreditSourceBreakdown | null>(null);
  const [funnel, setFunnel] = useState<RefundRecoveryFunnel | null>(null);
  const [automation, setAutomation] = useState<AutomationPerformance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const periodDays = parseInt(period, 10);
      const [ov, ts, src, fn, auto] = await Promise.all([
        getStoreCreditOverview(periodDays),
        getAnalyticsTimeSeries(periodDays),
        getCreditSources(periodDays),
        getRefundFunnel(periodDays),
        getAutomationPerformance(periodDays),
      ]);
      setOverview(ov);
      setTimeSeries(ts);
      setSources(src);
      setFunnel(fn);
      setAutomation(auto);
      setError(null);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError(err instanceof Error ? err.message : 'Failed to load analytics');
      }
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      const csv = await downloadCsvExport();
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pleero-offers-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setExporting(false);
    }
  }, []);

  if (loading) {
    return (
      <AppFrame>
        <Page title="Analytics">
          <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
            <Spinner accessibilityLabel="Loading analytics" size="large" />
          </div>
        </Page>
      </AppFrame>
    );
  }

  if (error) {
    return (
      <AppFrame>
        <Page title="Analytics">
          <Banner tone="critical" title="Failed to load analytics" action={{ content: 'Retry', onAction: loadData }}>
            <Text as="p">{error}</Text>
          </Banner>
        </Page>
      </AppFrame>
    );
  }

  return (
    <AppFrame>
      <Page
        title="Store Credit Intelligence"
        subtitle="Observe the full Store Credit lifecycle — issuance, redemption, and outcomes"
      >
        <Layout>
          <Layout.Section>
            <BlockStack gap="500">
              {/* Period selector + export */}
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <div style={{ minWidth: '180px' }}>
                  <Select
                    label="Time period"
                    labelHidden
                    options={PERIOD_OPTIONS}
                    value={period}
                    onChange={(v) => setPeriod(v)}
                  />
                </div>
                <Button onClick={handleExport} loading={exporting}>
                  Export CSV
                </Button>
              </div>

              {/* Store Credit Overview */}
              {overview && (
                <>
                  <Text as="h2" variant="headingMd">
                    Store Credit Overview
                    <span style={{ fontSize: '12px', color: 'var(--pleero-muted)', marginLeft: '8px', fontWeight: 400 }}>
                      {overview.period_label}
                    </span>
                  </Text>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                    gap: 'var(--space-4)',
                  }}>
                    <MetricCard label="Credit issued" value={formatCurrency(overview.credit_issued_cents)} />
                    <MetricCard label="Credit redeemed" value={formatCurrency(overview.credit_redeemed_cents)} />
                    <MetricCard label="Outstanding" value={formatCurrency(overview.outstanding_credit_cents)} />
                    <MetricCard label="Redemption rate" value={`${overview.redemption_rate.toFixed(1)}%`} />
                    <MetricCard
                      label="Avg time to redeem"
                      value={overview.avg_days_to_redemption != null ? `${overview.avg_days_to_redemption.toFixed(1)}d` : '—'}
                      small
                    />
                    <MetricCard label="Active customers" value={overview.customers_with_active_credit} small />
                    <MetricCard label="Revenue influenced" value={formatCurrency(overview.revenue_influenced_cents)} />
                  </div>
                </>
              )}

              {/* Time series */}
              {timeSeries && timeSeries.points.length > 0 && (
                <Card>
                  <BlockStack gap="400">
                    <Text as="h2" variant="headingMd">Trends (daily)</Text>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                      <div>
                        <Text as="p" variant="bodySm" tone="subdued">Credit issued</Text>
                        <MiniBarChart points={timeSeries.points} valueKey="credit_issued_cents" color="var(--pleero-green)" />
                      </div>
                      <div>
                        <Text as="p" variant="bodySm" tone="subdued">Credit redeemed</Text>
                        <MiniBarChart points={timeSeries.points} valueKey="credit_redeemed_cents" color="var(--pleero-blue, #4a9eff)" />
                      </div>
                    </div>
                  </BlockStack>
                </Card>
              )}

              {/* Credit source breakdown */}
              {sources && sources.sources.length > 0 && (
                <Card>
                  <BlockStack gap="300">
                    <Text as="h2" variant="headingMd">Credit Sources</Text>
                    {sources.sources.map((src) => (
                      <div key={src.source} style={{ display: 'flex', gap: '12px', alignItems: 'center', padding: '4px 0' }}>
                        <div style={{
                          width: '12px',
                          height: '12px',
                          borderRadius: '50%',
                          background: 'var(--pleero-green)',
                        }} />
                        <div style={{ flex: 1, color: 'var(--pleero-white)', fontSize: '13px' }}>{src.label}</div>
                        <div style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: '13px',
                          color: 'var(--pleero-muted)',
                        }}>
                          {formatCurrency(src.issued_cents)}
                        </div>
                        <div style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: '13px',
                          fontWeight: 600,
                          color: 'var(--pleero-green-text)',
                          width: '40px',
                          textAlign: 'right',
                        }}>
                          {src.percentage.toFixed(0)}%
                        </div>
                      </div>
                    ))}
                  </BlockStack>
                </Card>
              )}

              {/* Refund Recovery funnel */}
              {funnel && (
                <Card>
                  <BlockStack gap="300">
                    <Text as="h2" variant="headingMd">Refund Recovery Funnel</Text>
                    <Text as="p" variant="bodySm" tone="subdued">
                      Tracks customers from eligible refund through to credit redemption
                    </Text>

                    {(() => {
                      const maxVal = Math.max(
                        funnel.offers_sent,
                        funnel.offers_viewed,
                        funnel.offers_accepted,
                        1
                      );
                      return (
                        <BlockStack gap="100">
                          <FunnelRow
                            label="Eligible refunds"
                            value={funnel.offers_sent}
                            pct={(funnel.offers_sent / maxVal) * 100}
                            color="var(--pleero-green)"
                          />
                          <FunnelRow
                            label="Offers viewed"
                            value={funnel.offers_viewed}
                            pct={(funnel.offers_viewed / maxVal) * 100}
                            color="#4a9eff"
                          />
                          <FunnelRow
                            label="Accepted"
                            value={funnel.offers_accepted}
                            pct={(funnel.offers_accepted / maxVal) * 100}
                            color="#f0b429"
                          />
                          <FunnelRow
                            label="Declined"
                            value={funnel.offers_declined}
                            pct={(funnel.offers_declined / maxVal) * 100}
                            color="#e74c3c"
                          />
                        </BlockStack>
                      );
                    })()}

                    <div style={{ marginTop: '16px' }} />

                    <Text as="h3" variant="headingSm">Outcomes</Text>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                      gap: 'var(--space-3)',
                    }}>
                      <MetricCard
                        label="Acceptance rate"
                        value={`${funnel.acceptance_rate.toFixed(1)}%`}
                        small
                      />
                      <MetricCard
                        label="Refund value retained"
                        value={formatCurrency(funnel.refund_value_retained_cents)}
                        small
                      />
                      <MetricCard
                        label="Bonus issued"
                        value={formatCurrency(funnel.bonus_credit_issued_cents)}
                        small
                      />
                      <MetricCard
                        label="Total credit issued"
                        value={formatCurrency(funnel.total_credit_issued_cents)}
                        small
                      />
                      <MetricCard
                        label="Credit redeemed"
                        value={formatCurrency(funnel.credit_redeemed_cents)}
                        small
                      />
                    </div>

                    {funnel.credit_redeemed_cents === 0 && (
                      <Text as="p" variant="bodySm" tone="subdued">
                        Redemption data appears once the store_credit_accounts/debit webhook delivers activity.
                      </Text>
                    )}
                  </BlockStack>
                </Card>
              )}

              {/* Automation performance */}
              {automation && (
                <Card>
                  <BlockStack gap="300">
                    <Text as="h2" variant="headingMd">Automation Performance</Text>
                    <Text as="p" variant="bodySm" tone="subdued">
                      Executions and credit issued are observed directly. Redemption is an
                      estimate — Shopify Store Credit balances are fungible, so a later
                      redemption can&apos;t be tied to one workflow with certainty.
                    </Text>
                    <BlockStack gap="400">
                      {automation.workflows.map((wf) => (
                        <div
                          key={wf.workflow}
                          style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                            gap: 'var(--space-3)',
                            paddingBottom: '12px',
                            borderBottom: '0.5px solid var(--pleero-ink-border)',
                          }}
                        >
                          <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Text as="h3" variant="headingSm">{wf.label}</Text>
                            {wf.executions === 0 && <Badge>No activity</Badge>}
                          </div>
                          <MetricCard label="Executions" value={wf.executions} small />
                          <MetricCard label="Credit issued" value={formatCurrency(wf.credit_issued_cents)} small />
                          <MetricCard label="Customers reached" value={wf.customers_reached} small />
                          <MetricCard
                            label="Redemption rate"
                            value={wf.redemption_rate != null ? `${wf.redemption_rate.toFixed(0)}%` : '—'}
                            small
                          />
                          {wf.notes && (
                            <div style={{ gridColumn: '1 / -1' }}>
                              <Text as="p" variant="bodySm" tone="subdued">{wf.notes}</Text>
                            </div>
                          )}
                        </div>
                      ))}
                    </BlockStack>
                  </BlockStack>
                </Card>
              )}

              {/* Attribution methodology note */}
              <Card>
                <BlockStack gap="200">
                  <Text as="h2" variant="headingSm">How these metrics are measured</Text>
                  <Text as="p" variant="bodySm" tone="subdued">
                    Metrics tagged <Badge>observed</Badge> come directly from Shopify events we receive.
                    Metrics tagged <Badge>attributed</Badge> are derived using documented rules.
                    Revenue influenced equals Store Credit redemptions — this is an attribution proxy,
                    not causal revenue attribution.
                  </Text>
                </BlockStack>
              </Card>
            </BlockStack>
          </Layout.Section>
        </Layout>
      </Page>
    </AppFrame>
  );
}