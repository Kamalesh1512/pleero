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

// Track URL id_token already seen so Path 0 doesn't reuse it after a 401.
// A module-level variable survives client-side navigation without a page reload.
let _burnedUrlToken: string | null = null;

export function invalidateStoredToken(): void {
  // Mark the current URL's id_token as burned so Path 0 won't reuse it.
  if (typeof window !== 'undefined') {
    const urlToken = new URLSearchParams(window.location.search).get('id_token');
    if (urlToken) _burnedUrlToken = urlToken;
  }
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
 * When multiple API calls fire simultaneously (e.g. dashboard Promise.all),
 * they share a single RPC call instead of each racing independently.
 */
let _inflightTokenFetch: Promise<string> | null = null;

function isRpcNotReadyError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const msg = err.message.toLowerCase();
  // Match Shopify's own RPC errors AND our withTimeout fallback.
  // "timed out" means idToken() was still waiting for the handshake when we
  // cut it — keep retrying, don't give up.
  return (
    msg.includes('host did not expose rpc') ||
    msg.includes('host does not support') ||
    msg.includes('rpc') ||
    msg.includes('timed out')
  );
}

/**
 * Retry idToken() until the Shopify Admin RPC channel is ready.
 * Retries every 500 ms for up to 30 s.  All concurrent callers share the
 * same in-flight promise so only one RPC call is in flight at a time.
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
 *     Skipped if the token was already used and led to a 401 (burned).
 *
 *  1. Cached token in sessionStorage, issued < 9 minutes ago.
 *     Fast path for all navigations within a session.
 *
 *  2. Live RPC call via window.shopify.idToken().
 *     Runs on first load (no cached token) or after a 401 invalidation.
 *     Retries for up to 30 s while the iframe handshake establishes.
 *     All concurrent callers share one RPC call (_inflightTokenFetch).
 */
export async function getSessionToken(): Promise<string> {
  // ── Path 0: id_token in URL (first load from Shopify Admin) ──────────────
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get('id_token');
    if (urlToken && urlToken !== _burnedUrlToken) {
      storeInitialToken(urlToken);
      return urlToken;
    }
  }

  // ── Path 1: fresh cached token ────────────────────────────────────────────
  const stored = await pollForStoredToken(100);
  if (stored) return stored;

  // ── Path 2: live RPC call ─────────────────────────────────────────────────
  const shopify = await waitForShopifyGlobal();
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

// ─── Module-level pre-warm ────────────────────────────────────────────────────
// Kick off the RPC handshake at module evaluation time — before React renders
// any component. By the time the first page's useEffect fires, the token is
// either already cached or the handshake is further along, cutting perceived
// first-load delay on every page.
if (typeof window !== 'undefined') {
  getSessionToken().catch(() => { /* pre-warm failures are silent; pages handle their own errors */ });
}
