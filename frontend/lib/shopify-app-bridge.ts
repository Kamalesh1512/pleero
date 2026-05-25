/**
 * Shopify session token utilities.
 * Uses window.shopify (CDN injected by Shopify Admin) — no npm App Bridge init.
 * The npm createApp() call throws INVALID_ORIGIN in some embed contexts; the
 * CDN global is always available and does not have this issue.
 */

// ─── Token storage ────────────────────────────────────────────────────────────

export function storeInitialToken(token: string): void {
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

function getStoredInitialToken(): string | null {
  try {
    const token = sessionStorage.getItem('_pleero_id_token');
    const ts = sessionStorage.getItem('_pleero_id_token_ts');
    if (!token || !ts) return null;
    if (Date.now() - Number(ts) > 50_000) return null; // 50 s < 60 s token TTL
    return token;
  } catch {
    return null;
  }
}

// ─── Host storage ─────────────────────────────────────────────────────────────
// Shopify's host param disappears after navigation — persist it so the fallback
// can still init if window.shopify is unexpectedly unavailable.

export function storeHost(host: string): void {
  try { sessionStorage.setItem('_pleero_host', host); } catch { /* */ }
}

// ─── window.shopify CDN polling ───────────────────────────────────────────────

type ShopifyGlobal = { idToken: () => Promise<string> };

async function waitForShopifyGlobal(maxWaitMs = 3000): Promise<ShopifyGlobal | null> {
  if (typeof window === 'undefined') return null;
  const deadline = Date.now() + maxWaitMs;
  while (Date.now() < deadline) {
    const s = (window as unknown as Record<string, unknown>).shopify as Record<string, unknown> | undefined;
    if (s && typeof s.idToken === 'function') return s as unknown as ShopifyGlobal;
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  return null;
}

// ─── Stored-token polling ─────────────────────────────────────────────────────
// React runs child useEffects before parent, so Providers.tsx stores the
// id_token slightly after a child page calls getSessionToken(). Polling bridges
// the gap without ever waiting more than a couple of React ticks.

async function pollForStoredToken(maxWaitMs = 1500): Promise<string | null> {
  const deadline = Date.now() + maxWaitMs;
  while (Date.now() < deadline) {
    const token = getStoredInitialToken();
    if (token) return token;
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  return null;
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Session token request timed out — try refreshing')), ms),
    ),
  ]);
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Get a fresh Shopify session token for authenticating backend requests.
 *
 * Strategy:
 *  1. Stored id_token from initial embed URL (valid ≤50 s)
 *  2. window.shopify.idToken() — CDN injected by Shopify Admin
 */
export async function getSessionToken(): Promise<string> {
  const stored = await pollForStoredToken(1500);
  if (stored) return stored;

  const shopify = await waitForShopifyGlobal(3000);
  if (shopify) {
    try {
      const token = await withTimeout(shopify.idToken(), 8_000);
      storeInitialToken(token);
      return token;
    } catch (err) {
      console.warn('[Pleero] window.shopify.idToken() failed:', err);
    }
  }

  throw new Error('Unable to authenticate. Try refreshing the page.');
}
