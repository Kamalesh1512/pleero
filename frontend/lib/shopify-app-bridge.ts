/**
 * Shopify session token utilities.
 * Uses window.shopify (CDN injected by Shopify Admin) — no npm App Bridge init.
 *
 * Token lifecycle:
 *   Shopify issues JWTs with 60 s exp.  Our backend leeway=600 s means the
 *   backend accepts them for ≈11 minutes.  We proactively refresh after
 *   9 minutes so no request ever hits an expired token.
 */

// ─── How long to trust a cached token before proactively refreshing ──────────
// 9 minutes: gives a 2-minute buffer before the backend's 11-minute cutoff.
const TOKEN_PROACTIVE_REFRESH_MS = 9 * 60 * 1000;

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

/**
 * Return the cached token only if it is still within the proactive-refresh
 * window.  Returns null if absent OR if older than TOKEN_PROACTIVE_REFRESH_MS,
 * so the caller falls through to a live idToken() call instead.
 */
function getStoredTokenIfFresh(): string | null {
  try {
    const token = sessionStorage.getItem('_pleero_id_token');
    if (!token) return null;
    const ts = parseInt(sessionStorage.getItem('_pleero_id_token_ts') ?? '0', 10);
    if (Date.now() - ts > TOKEN_PROACTIVE_REFRESH_MS) return null;
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

async function waitForShopifyGlobal(maxWaitMs = 10_000): Promise<ShopifyGlobal | null> {
  if (typeof window === 'undefined') return null;
  const deadline = Date.now() + maxWaitMs;
  while (Date.now() < deadline) {
    const s = (window as unknown as Record<string, unknown>).shopify as
      | Record<string, unknown>
      | undefined;
    if (s && typeof s.idToken === 'function') return s as unknown as ShopifyGlobal;
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  return null;
}

// ─── Stored-token polling ─────────────────────────────────────────────────────

/**
 * Poll sessionStorage for up to maxWaitMs.
 * 100 ms is enough: Path 0 (URL read) already handles the initial race
 * between Providers.tsx and the first API call, so if the token isn't in
 * storage within one tick it isn't coming via that route.
 */
async function pollForStoredToken(maxWaitMs = 100): Promise<string | null> {
  const deadline = Date.now() + maxWaitMs;
  while (Date.now() < deadline) {
    const token = getStoredTokenIfFresh();
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

// ─── RPC deduplification & retry ─────────────────────────────────────────────

/**
 * Shared promise for in-flight idToken() calls.
 *
 * When multiple API calls fire simultaneously and all need a fresh token
 * (e.g. dashboard Promise.all after expiry), they share a single RPC call
 * instead of each racing into idToken() independently.
 */
let _inflightTokenFetch: Promise<string> | null = null;

function isRpcNotReadyError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const msg = err.message.toLowerCase();
  // Match: Shopify's own RPC errors AND our withTimeout fallback.
  // "timed out" means idToken() was still waiting for the handshake when we
  // cut it — we should keep retrying, not give up.
  return (
    msg.includes('host did not expose rpc') ||
    msg.includes('host does not support') ||
    msg.includes('rpc') ||
    msg.includes('timed out')
  );
}

/**
 * Retry idToken() until the Shopify Admin RPC channel is ready.
 *
 * On first page load the embedded-app iframe and its parent frame need a
 * moment to exchange a handshake via postMessage. Until the handshake
 * completes, idToken() rejects immediately with "Host did not expose RPC".
 * The channel typically becomes ready within 1–3 s, so we poll every 500 ms
 * for up to 15 s before giving up.  All concurrent callers share the same
 * in-flight promise via _inflightTokenFetch so only one RPC call is in
 * flight at a time.
 */
async function idTokenWithRetry(shopify: ShopifyGlobal): Promise<string> {
  if (_inflightTokenFetch) return _inflightTokenFetch;

  _inflightTokenFetch = (async () => {
    const RPC_BUDGET_MS = 30_000;
    const startTime = Date.now();

    while (true) {
      try {
        const token = await withTimeout(shopify.idToken(), 10_000);
        storeInitialToken(token);
        return token;
      } catch (err) {
        if (isRpcNotReadyError(err) && Date.now() - startTime < RPC_BUDGET_MS) {
          await new Promise(resolve => setTimeout(resolve, 500));
          continue;
        }
        throw err;
      }
    }
  })().finally(() => {
    _inflightTokenFetch = null;
  });

  return _inflightTokenFetch;
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Get a Shopify session token for authenticating backend requests.
 *
 * Strategy (in order):
 *
 *  0. id_token still in the current URL (first load from Shopify Admin).
 *     No RPC needed; eliminates the Providers.tsx useEffect race condition.
 *
 *  1. Cached token in sessionStorage, issued < 9 minutes ago.
 *     Fast path for all navigations within a session.
 *
 *  2. Proactive refresh via window.shopify.idToken() (RPC).
 *     Runs automatically when the cached token is ≥9 min old — well before
 *     the backend's ≈11-minute cutoff.  Also runs after a 401 forces
 *     invalidateStoredToken().  Multiple concurrent callers share one RPC
 *     call via the _inflightTokenFetch deduplication above.
 *
 * Result: zero "please refresh" errors in normal embedded-app usage.
 */
export async function getSessionToken(): Promise<string> {
  // ── Path 0: id_token in the current page URL ─────────────────────────────
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get('id_token');
    if (urlToken) {
      storeInitialToken(urlToken);
      return urlToken;
    }
  }

  // ── Path 1: fresh cached token ────────────────────────────────────────────
  const stored = await pollForStoredToken(100);
  if (stored) return stored;

  // ── Path 2: live RPC call (proactive refresh or post-invalidation) ────────
  const shopify = await waitForShopifyGlobal(3000);
  if (!shopify) {
    throw new Error(
      'Shopify App Bridge not available. Open this app from your Shopify Admin.',
    );
  }

  try {
    return await idTokenWithRetry(shopify);
  } catch (err) {
    if (isRpcNotReadyError(err)) {
      throw new Error(
        'Shopify Admin RPC channel not ready. Please refresh the page inside Shopify Admin.',
      );
    }
    console.warn('[Pleero] window.shopify.idToken() failed:', err);
    throw new Error(
      'Unable to authenticate with Shopify. Please refresh the page inside Shopify Admin.',
    );
  }
}
