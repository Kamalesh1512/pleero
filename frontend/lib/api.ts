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

export async function getMerchantOffers(): Promise<MerchantOffer[]> {
  const res = await fetchWithAuth('/api/offers');
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
