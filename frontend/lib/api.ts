/**
 * API client for Pleero frontend.
 * fetchWithAuth always gets a fresh token from window.shopify.idToken() — never
 * pass a pre-fetched token. Shopify session tokens expire in 60 s; calling
 * idToken() before every request is the correct pattern per Shopify docs.
 */

import { getSessionToken as getAppBridgeSessionToken, invalidateStoredToken } from './shopify-app-bridge';

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

// Hard abort after this many ms — prevents infinite "Loading..." on slow/dead backends.
const FETCH_TIMEOUT_MS = 30_000;

async function fetchWithAuth(path: string, init: RequestInit = {}): Promise<Response> {
  const token = await getAppBridgeSessionToken();
  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string> | undefined),
  };

  const controller = new AbortController();
  const tid = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, { ...init, headers, signal: controller.signal });
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('Request timed out. Please check your connection and try again.');
    }
    throw err;
  } finally {
    clearTimeout(tid);
  }

  if (res.status !== 401) return res;

  // Token was rejected — invalidate cache, get a genuinely fresh one, retry once
  invalidateStoredToken();
  const freshToken = await getAppBridgeSessionToken();

  const retryController = new AbortController();
  const retryTid = setTimeout(() => retryController.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: { ...headers, Authorization: `Bearer ${freshToken}` },
      signal: retryController.signal,
    });
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('Request timed out. Please check your connection and try again.');
    }
    throw err;
  } finally {
    clearTimeout(retryTid);
  }
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
