/**
 * Shopify session token utilities.
 * Uses window.shopify (CDN injected by Shopify Admin) — no npm App Bridge init.
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
    // Backend has leeway=30, so tokens up to 90s old are accepted.
    // Use 85s here to stay safely within that window.
    if (Date.now() - Number(ts) > 85_000) return null;
    return token;
  } catch {
    return null;
  }
}

// ─── Host storage ─────────────────────────────────────────────────────────────

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
      setTimeout(() => reject(new Error('Session token request timed out')), ms),
    ),
  ]);
}

// ─── Silent reload (inside Shopify Admin iframe only) ────────────────────────
// When idToken() fails due to "Host did not expose RPC", Shopify Admin will
// inject a fresh id_token on reload. Guard prevents infinite loops when the
// app is accessed directly (no parent frame).

function reloadForFreshToken(): Promise<never> {
  if (typeof window !== 'undefined' && window.parent !== window) {
    window.location.reload();
  }
  return new Promise(() => {}); // never resolves — page is reloading
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Get a fresh Shopify session token for authenticating backend requests.
 *
 * Strategy:
 *  1. Stored id_token from initial embed URL (valid ≤85 s per backend leeway)
 *  2. window.shopify.idToken() — CDN injected by Shopify Admin
 *  3. Silent reload inside iframe so Shopify Admin injects a fresh token
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
      console.warn('[Pleero] window.shopify.idToken() failed, reloading for fresh token:', err);
      return reloadForFreshToken();
    }
  }

  // Only reached when accessed directly outside Shopify Admin
  throw new Error('Unable to authenticate. Try refreshing the page.');
}
