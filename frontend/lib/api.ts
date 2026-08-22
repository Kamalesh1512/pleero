/**
 * API client for Pleero frontend.
 * Auth is cookie-based (pleero_session HttpOnly cookie set by the backend
 * during OAuth).  Every request uses credentials:'include' so the browser
 * sends the cookie automatically — no manual token handling needed.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.pleero.app';

// ─── Typed API error ──────────────────────────────────────────────────────────

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// ─── Internal fetch helper ────────────────────────────────────────────────────

const FETCH_TIMEOUT_MS = 30_000;

async function fetchWithAuth(path: string, init: RequestInit = {}): Promise<Response> {
  const method = (init.method ?? 'GET').toUpperCase();
  const fullUrl = `${API_BASE_URL}${path}`;

  const headers = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string> | undefined),
  };

  console.debug('[pleero:api] →', method, path);

  const controller = new AbortController();
  const tid = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(fullUrl, {
      ...init,
      headers,
      credentials: 'include', // send the pleero_session cookie
      signal: controller.signal,
    });
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      console.warn('[pleero:api] ← TIMEOUT', method, path);
      throw new Error('Request timed out. Please check your connection and try again.');
    }
    console.warn('[pleero:api] ← NETWORK ERROR', method, path, err);
    throw err;
  } finally {
    clearTimeout(tid);
  }

  console.debug('[pleero:api] ←', res.status, method, path);
  return res;
}

function throwApiError(res: Response, context: string): never {
  throw new ApiError(`${context}: ${res.statusText}`, res.status);
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DashboardMetrics {
  offers_sent: number;
  offers_accepted: number;
  offers_declined: number;
  acceptance_rate: number;
  revenue_retained_cents: number;
  offers_needing_review: number;
}

// ─── Analytics types ──────────────────────────────────────────────────────────

export interface StoreCreditOverview {
  credit_issued_cents: number;
  credit_issued_attribution: string;
  credit_redeemed_cents: number;
  credit_redeemed_attribution: string;
  outstanding_credit_cents: number;
  outstanding_credit_attribution: string;
  redemption_rate: number;
  redemption_rate_attribution: string;
  avg_days_to_redemption: number | null;
  avg_days_to_redemption_attribution: string;
  customers_with_active_credit: number;
  customers_with_active_credit_attribution: string;
  revenue_influenced_cents: number;
  revenue_influenced_attribution: string;
  period_label: string;
}

export interface TimeSeriesPoint {
  date: string;
  credit_issued_cents: number;
  credit_redeemed_cents: number;
  offers_sent: number;
  offers_accepted: number;
}

export interface TimeSeriesResponse {
  points: TimeSeriesPoint[];
  period_days: number;
}

export interface CreditSourceItem {
  source: string;
  label: string;
  issued_cents: number;
  count: number;
  percentage: number;
}

export interface CreditSourceBreakdown {
  sources: CreditSourceItem[];
}

export interface RefundRecoveryFunnel {
  eligible_refund_value_cents: number;
  offers_sent: number;
  offers_viewed: number;
  offers_accepted: number;
  offers_declined: number;
  acceptance_rate: number;
  refund_value_retained_cents: number;
  bonus_credit_issued_cents: number;
  total_credit_issued_cents: number;
  credit_redeemed_cents: number;
  credit_redeemed_attribution: string;
}

export interface AutomationWorkflowPerformance {
  workflow: string;
  label: string;
  executions: number;
  executions_attribution: string;
  credit_issued_cents: number;
  credit_issued_attribution: string;
  customers_reached: number;
  redeemed_customers: number | null;
  redemption_rate: number | null;
  redemption_rate_attribution: string;
  notes: string | null;
}

export interface AutomationPerformance {
  workflows: AutomationWorkflowPerformance[];
  period_days: number;
}

export interface Merchant {
  id: string;
  shop_domain: string;
  merchant_email: string;
  bonus_percentage: number;
  bonus_cap_cents: number;
  brand_color: string;
  logo_url: string | null;
  subscription_status: string;
  subscription_id: string | null;
  trial_ends_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface MerchantUpdate {
  merchant_email?: string;
  bonus_percentage?: number;
  bonus_cap_cents?: number;
  brand_color?: string;
  logo_url?: string | null;
}

export interface MerchantOffer {
  id: string;
  order_number: string;
  customer_email: string;
  refund_amount_cents: number;
  credit_amount_cents: number;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED';
  refund_status: 'PENDING' | 'CREDIT_REFUND_CREATED' | 'MANUAL_REVIEW';
  revenue_retained_cents: number | null;
  created_at: string;
}

export interface PublicOffer {
  offer_token: string;
  customer_first_name: string;
  refund_amount_cents: number;
  credit_amount_cents: number;
  bonus_applied_cents: number;
  status: string;
  merchant_logo_url: string | null;
  merchant_brand_color: string;
}

export interface OfferActionResponse {
  status: string;
  message: string;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export async function checkSession(): Promise<{ shop: string } | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/auth/me`, {
      credentials: 'include',
    });
    if (res.ok) return res.json();
    return null;
  } catch {
    return null;
  }
}

// ─── Authenticated endpoints ──────────────────────────────────────────────────

export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  const res = await fetchWithAuth('/api/dashboard/metrics');
  if (!res.ok) throwApiError(res, 'Failed to fetch metrics');
  return res.json();
}

export async function getMerchantSettings(): Promise<Merchant> {
  const res = await fetchWithAuth('/api/merchants/me');
  if (!res.ok) throwApiError(res, 'Failed to fetch settings');
  return res.json();
}

export async function updateMerchantSettings(data: MerchantUpdate): Promise<Merchant> {
  const res = await fetchWithAuth('/api/merchants/me', {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => res.statusText);
    throw new ApiError(`Failed to save settings: ${body}`, res.status);
  }
  return res.json();
}

export async function getMerchantOffers(options?: { needsReview?: boolean }): Promise<MerchantOffer[]> {
  const query = options?.needsReview ? '?needs_review=true' : '';
  const res = await fetchWithAuth(`/api/offers${query}`);
  if (!res.ok) throwApiError(res, 'Failed to fetch offers');
  const data = await res.json();
  return data.offers ?? [];
}

export async function getShopLogo(): Promise<string | null> {
  const res = await fetchWithAuth('/api/shop/logo');
  if (!res.ok) return null;
  const data = await res.json();
  return data.logo_url ?? null;
}

// ─── Analytics API ─────────────────────────────────────────────────────────────

export async function getStoreCreditOverview(
  periodDays: number = 30
): Promise<StoreCreditOverview> {
  const res = await fetchWithAuth(`/api/analytics/overview?period_days=${periodDays}`);
  if (!res.ok) throwApiError(res, 'Failed to fetch analytics overview');
  return res.json();
}

export async function getAnalyticsTimeSeries(
  periodDays: number = 30
): Promise<TimeSeriesResponse> {
  const res = await fetchWithAuth(`/api/analytics/timeseries?period_days=${periodDays}`);
  if (!res.ok) throwApiError(res, 'Failed to fetch time series');
  return res.json();
}

export async function getCreditSources(
  periodDays: number = 30
): Promise<CreditSourceBreakdown> {
  const res = await fetchWithAuth(`/api/analytics/sources?period_days=${periodDays}`);
  if (!res.ok) throwApiError(res, 'Failed to fetch credit sources');
  return res.json();
}

export async function getRefundFunnel(
  periodDays: number = 30
): Promise<RefundRecoveryFunnel> {
  const res = await fetchWithAuth(`/api/analytics/funnel?period_days=${periodDays}`);
  if (!res.ok) throwApiError(res, 'Failed to fetch funnel');
  return res.json();
}

export async function getAutomationPerformance(
  periodDays: number = 30
): Promise<AutomationPerformance> {
  const res = await fetchWithAuth(`/api/analytics/automation?period_days=${periodDays}`);
  if (!res.ok) throwApiError(res, 'Failed to fetch automation performance');
  return res.json();
}

export async function downloadCsvExport(): Promise<string> {
  const res = await fetchWithAuth('/api/analytics/export');
  if (!res.ok) throwApiError(res, 'Failed to export CSV');
  return res.text();
}

// ─── Automation API ────────────────────────────────────────────────────────────

export interface AutomationWorkflowConfig {
  workflow: string;
  enabled: boolean;
  min_days_before_action: number;
  max_actions_per_customer: number;
}

export interface AutomationSettings {
  workflows: AutomationWorkflowConfig[];
}

export interface GoodwillRequest {
  customer_email: string;
  customer_first_name?: string;
  amount_cents: number;
  currency?: string;
  note?: string;
}

export interface GoodwillResponse {
  success: boolean;
  message: string;
}

export interface WinbackCandidate {
  customer_email: string;
  customer_first_name: string;
  customer_shopify_id: string | null;
  last_activity: string | null;
  days_since_last_activity: number | null;
}

export interface AutomationNames {
  [key: string]: string;
}
export const AUTOMATION_WORKFLOW_LABELS: AutomationNames = {
  refund_recovery: 'Refund Recovery',
  goodwill: 'Goodwill',
  winback: 'Win-back',
  redemption_reminder: 'Redemption Reminder',
};
export const AUTOMATION_WORKFLOW_DESCRIPTIONS: AutomationNames = {
  refund_recovery: 'Automatically send Store Credit offers when customers request refunds',
  goodwill: 'Manually issue Store Credit to customers',
  winback: 'Identify inactive customers for re-engagement',
  redemption_reminder: 'Send reminders about unredeemed Store Credit',
};

export async function getAutomationSettings(): Promise<AutomationSettings> {
  const res = await fetchWithAuth('/api/automation/settings');
  if (!res.ok) throwApiError(res, 'Failed to fetch automation settings');
  return res.json();
}

export async function updateAutomationWorkflow(
  workflow: string,
  data: Partial<AutomationWorkflowConfig>,
): Promise<AutomationWorkflowConfig> {
  const res = await fetchWithAuth(`/api/automation/settings/${workflow}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  if (!res.ok) throwApiError(res, 'Failed to update workflow settings');
  return res.json();
}

export async function issueGoodwillCredit(data: GoodwillRequest): Promise<GoodwillResponse> {
  const res = await fetchWithAuth('/api/automation/goodwill', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  if (!res.ok) throwApiError(res, 'Failed to issue goodwill credit');
  return res.json();
}

export async function getWinbackCandidates(): Promise<{ candidates: WinbackCandidate[]; count: number }> {
  const res = await fetchWithAuth('/api/automation/winback');
  if (!res.ok) throwApiError(res, 'Failed to fetch winback candidates');
  return res.json();
}

export interface WinbackIssueRequest {
  customer_email: string;
  customer_first_name?: string;
  customer_shopify_id?: string | null;
  amount_cents: number;
  currency?: string;
  note?: string;
}

export interface WinbackIssueResponse {
  success: boolean;
  message: string;
}

export async function issueWinbackCredit(data: WinbackIssueRequest): Promise<WinbackIssueResponse> {
  const res = await fetchWithAuth('/api/automation/winback/issue', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  if (!res.ok) throwApiError(res, 'Failed to issue win-back credit');
  return res.json();
}

export async function triggerReminderSweep(): Promise<{ reminders_sent: number }> {
  const res = await fetchWithAuth('/api/automation/reminders/trigger', { method: 'POST' });
  if (!res.ok) throwApiError(res, 'Failed to trigger reminder sweep');
  return res.json();
}

export async function activateBilling(): Promise<{ confirmation_url: string }> {
  const res = await fetchWithAuth('/api/billing/activate', { method: 'POST' });
  if (!res.ok) throwApiError(res, 'Failed to activate billing');
  return res.json();
}

export async function cancelBilling(): Promise<{ status: string }> {
  const res = await fetchWithAuth('/api/billing/cancel', { method: 'POST' });
  if (!res.ok) throwApiError(res, 'Failed to cancel billing');
  return res.json();
}

// ─── Public endpoints (no auth) ───────────────────────────────────────────────

export async function getOffer(token: string): Promise<PublicOffer> {
  const res = await fetch(`${API_BASE_URL}/offers/${token}`);
  if (!res.ok) throw new Error(`Failed to fetch offer: ${res.statusText}`);
  return res.json();
}

export async function acceptOffer(token: string): Promise<OfferActionResponse> {
  const res = await fetch(`${API_BASE_URL}/offers/${token}/accept`, { method: 'POST' });
  if (!res.ok) throw new Error(`Failed to accept offer: ${res.statusText}`);
  return res.json();
}

export async function declineOffer(token: string): Promise<OfferActionResponse> {
  const res = await fetch(`${API_BASE_URL}/offers/${token}/decline`, { method: 'POST' });
  if (!res.ok) throw new Error(`Failed to decline offer: ${res.statusText}`);
  return res.json();
}

// ─── Utilities ────────────────────────────────────────────────────────────────

export function formatCurrency(cents: number): string {
  return `$${(cents / 100).toFixed(0)}`;
}
