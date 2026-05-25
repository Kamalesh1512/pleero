import { getSessionToken as getAppBridgeToken } from '@shopify/app-bridge/utilities';
import createApp, { type ClientApplication } from '@shopify/app-bridge';

let app: ClientApplication | null = null;

export function initAppBridge(apiKey: string, host: string) {
  if (!app) {
    app = createApp({ apiKey, host });
  }
  return app;
}

// ─── Stored initial token (from Shopify's id_token URL param) ────────────────
// Shopify passes id_token in the initial embed URL. It's a valid HS256 JWT
// (same format the backend verifies). We cache it for up to 50 s before
// falling back to window.shopify.idToken() for a fresh one.

export function storeInitialToken(token: string) {
  try {
    sessionStorage.setItem('_pleero_id_token', token);
    sessionStorage.setItem('_pleero_id_token_ts', String(Date.now()));
  } catch { /* sessionStorage unavailable */ }
}

export function invalidateStoredToken(): void {
  try {
    sessionStorage.removeItem('_pleero_id_token');
    sessionStorage.removeItem('_pleero_id_token_ts');
  } catch { /* */ }
}

// ─── Stored host (from Shopify's host URL param) ──────────────────────────────
// The host param disappears from the URL after navigation. Persist it in
// sessionStorage so the npm App Bridge fallback can init on any page.

export function storeHost(host: string): void {
  try { sessionStorage.setItem('_pleero_host', host); } catch { /* */ }
}

function getStoredHost(): string | null {
  try { return sessionStorage.getItem('_pleero_host'); } catch { return null; }
}

function getStoredInitialToken(): string | null {
  try {
    const token = sessionStorage.getItem('_pleero_id_token');
    const ts = sessionStorage.getItem('_pleero_id_token_ts');
    if (!token || !ts) return null;
    if (Date.now() - Number(ts) > 50_000) return null; // expired
    return token;
  } catch {
    return null;
  }
}

// ─── window.shopify CDN polling ───────────────────────────────────────────────

type ShopifyGlobal = { idToken: () => Promise<string> };

async function waitForShopifyGlobal(maxWaitMs = 3000): Promise<ShopifyGlobal | null> {
  if (typeof window === 'undefined') return null;
  const deadline = Date.now() + maxWaitMs;
  while (Date.now() < deadline) {
    const candidate = (window as unknown as Record<string, unknown>).shopify as Record<string, unknown> | undefined;
    if (candidate && typeof candidate.idToken === 'function') {
      return candidate as unknown as ShopifyGlobal;
    }
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  return null;
}

// ─── npm package lazy-init ────────────────────────────────────────────────────

function tryLazyInit() {
  if (app || typeof window === 'undefined') return;
  const apiKey = process.env.NEXT_PUBLIC_SHOPIFY_API_KEY;
  const host = new URLSearchParams(window.location.search).get('host') ?? getStoredHost();
  if (apiKey && host && apiKey !== 'your_shopify_api_key_here') {
    try {
      initAppBridge(apiKey, host);
    } catch (err) {
      console.warn('[Pleero] App Bridge npm lazy-init failed:', err);
    }
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error('Session token request timed out — try refreshing the page')),
        ms,
      ),
    ),
  ]);
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Poll for the stored id_token for up to `maxWaitMs`.
 *
 * React runs child useEffects before parent useEffects, so Providers.tsx
 * (parent) stores the id_token slightly after the page component (child)
 * first calls getSessionToken(). Polling bridges this timing gap without
 * ever waiting longer than a couple of React ticks in practice.
 */
async function pollForStoredToken(maxWaitMs = 1500): Promise<string | null> {
  const deadline = Date.now() + maxWaitMs;
  while (Date.now() < deadline) {
    const token = getStoredInitialToken();
    if (token) return token;
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  return null;
}

/**
 * Get a Shopify session token for authenticating backend requests.
 *
 * Strategy (in order):
 *  1. Poll for stored id_token from the initial Shopify embed URL (up to 1.5 s)
 *     – Providers.tsx captures and stores it on mount; polling handles the
 *       React child-before-parent effect ordering so we never miss it.
 *  2. window.shopify.idToken() — CDN injected by Shopify Admin (poll up to 2 s)
 *  3. @shopify/app-bridge npm package — fallback, pre-init'd by Providers.tsx
 */
export async function getSessionToken(): Promise<string> {
  // 1. Poll for stored token — handles child-before-parent timing gap
  const stored = await pollForStoredToken(1500);
  if (stored) return stored;

  // 2. CDN approach: window.shopify (injected automatically by Shopify Admin)
  const shopifyGlobal = await waitForShopifyGlobal(2000);
  if (shopifyGlobal) {
    try {
      const token = await withTimeout(shopifyGlobal.idToken(), 8_000);
      storeInitialToken(token); // cache for subsequent calls
      return token;
    } catch (err) {
      console.warn('[Pleero] window.shopify.idToken() failed, trying npm fallback:', err);
    }
  }

  // 3. Fallback: @shopify/app-bridge npm package
  tryLazyInit();
  if (!app) {
    throw new Error(
      'Unable to authenticate. Try refreshing the page.',
    );
  }
  return withTimeout(getAppBridgeToken(app), 10_000);
}

export function getApp() {
  return app;
}
