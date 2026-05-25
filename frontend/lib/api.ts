/**
 * API client utilities for Pleero frontend.
 * Handles communication with backend API.
 */

import { getSessionToken as getAppBridgeSessionToken, invalidateStoredToken } from './shopify-app-bridge';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

async function fetchWithAuth(
  path: string,
  sessionToken: string,
  init: RequestInit = {},
): Promise<Response> {
  const headers = {
    Authorization: `Bearer ${sessionToken}`,
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string> | undefined),
  };
  const res = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });
  if (res.status !== 401) return res;

  // Token rejected — invalidate cache, get a fresh one, retry once
  invalidateStoredToken();
  const freshToken = await getAppBridgeSessionToken();
  return fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: { ...headers, Authorization: `Bearer ${freshToken}` },
  });
}

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

export interface Offer {
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

/**
 * Get session token from App Bridge.
 * This should be called from client components with access to App Bridge.
 */
export async function getSessionToken(): Promise<string> {
  return await getAppBridgeSessionToken();
}

/**
 * Fetch dashboard metrics for current month.
 */
export async function getDashboardMetrics(sessionToken: string): Promise<DashboardMetrics> {
  const response = await fetchWithAuth('/api/dashboard/metrics', sessionToken);
  if (!response.ok) throw new Error(`Failed to fetch metrics: ${response.statusText}`);
  return response.json();
}

/**
 * Get merchant settings.
 */
export async function getMerchantSettings(sessionToken: string): Promise<Merchant> {
  const response = await fetchWithAuth('/api/merchants/me', sessionToken);
  if (!response.ok) throw new Error(`Failed to fetch settings: ${response.statusText}`);
  return response.json();
}

/**
 * Update merchant settings.
 */
export async function updateMerchantSettings(
  sessionToken: string,
  data: MerchantUpdate
): Promise<Merchant> {
  const response = await fetchWithAuth('/api/merchants/me', sessionToken, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const body = await response.text().catch(() => response.statusText);
    throw new Error(`Failed to save settings (${response.status}): ${body}`);
  }
  return response.json();
}

export async function getShopLogo(sessionToken: string): Promise<string | null> {
  const response = await fetchWithAuth('/api/shop/logo', sessionToken);
  if (!response.ok) return null;
  const data = await response.json();
  return data.logo_url ?? null;
}

/**
 * Get offer details by token (public endpoint).
 */
export async function getOffer(token: string): Promise<Offer> {
  const response = await fetch(`${API_BASE_URL}/offers/${token}`);

  if (!response.ok) {
    throw new Error(`Failed to fetch offer: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Accept an offer (public endpoint).
 */
export async function acceptOffer(token: string): Promise<OfferActionResponse> {
  const response = await fetch(`${API_BASE_URL}/offers/${token}/accept`, {
    method: 'POST',
  });

  if (!response.ok) {
    throw new Error(`Failed to accept offer: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Decline an offer (public endpoint).
 */
export async function declineOffer(token: string): Promise<OfferActionResponse> {
  const response = await fetch(`${API_BASE_URL}/offers/${token}/decline`, {
    method: 'POST',
  });

  if (!response.ok) {
    throw new Error(`Failed to decline offer: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Format cents as dollar string (e.g., 5000 -> "$50").
 */
export function formatCurrency(cents: number): string {
  return `$${(cents / 100).toFixed(0)}`;
}
