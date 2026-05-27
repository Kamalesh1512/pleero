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
    if (!token) return null;
    return token;
    // No client-side TTL — the backend is the sole authority on token expiry.
    // Backend leeway=600 accepts tokens for ~11 minutes from issue time.
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

// ─── RPC retry helper ────────────────────────────────────────────────────────

function isRpcNotReadyError(err: unknown): boolean {
  return err instanceof Error && err.message.includes('Host did not expose RPC');
}

/**
 * Call shopify.idToken() and retry if the RPC channel isn't established yet.
 *
 * "Host did not expose RPC" is transient: it fires when the App Bridge CDN
 * script loads on a redirected page and our code calls idToken() before the
 * postMessage handshake between the iframe and Shopify Admin completes (usually
 * within a few hundred milliseconds).  Three retries with increasing back-off
 * cover the window without adding perceptible latency in the normal path.
 */
async function idTokenWithRetry(shopify: ShopifyGlobal): Promise<string> {
  const maxAttempts = 3;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await withTimeout(shopify.idToken(), 5_000);
    } catch (err) {
      if (isRpcNotReadyError(err) && attempt < maxAttempts) {
        // Back off: 400 ms, 800 ms
        await new Promise(resolve => setTimeout(resolve, attempt * 400));
        continue;
      }
      throw err;
    }
  }
  // Unreachable — TypeScript needs a return/throw after the loop
  throw new Error('idTokenWithRetry: max attempts exceeded');
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Get a Shopify session token for authenticating backend requests.
 *
 * Strategy (in order):
 *  0. id_token still present in the current URL — fastest path, no RPC needed.
 *     Shopify Admin always injects id_token into the initial embed URL.
 *  1. id_token stored in sessionStorage from a previous URL load.
 *  2. window.shopify.idToken() — RPC call to Shopify Admin, retried up to 3×
 *     to tolerate the "Host did not expose RPC" transient error that occurs
 *     when the App Bridge CDN reinitialises after a server-side redirect.
 */
export async function getSessionToken(): Promise<string> {
  // ── Path 0: id_token still in the current page URL ──────────────────────
  // This is true for every first load from Shopify Admin. Reading it here
  // (rather than waiting for Providers.tsx useEffect) eliminates the race
  // condition and means idToken() is never called on the initial render.
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get('id_token');
    if (urlToken) {
      storeInitialToken(urlToken);
      return urlToken;
    }
  }

  // ── Path 1: token already cached from a prior call ───────────────────────
  const stored = await pollForStoredToken(1500);
  if (stored) return stored;

  // ── Path 2: ask App Bridge CDN for a fresh token via RPC ─────────────────
  const shopify = await waitForShopifyGlobal(3000);
  if (!shopify) {
    throw new Error(
      'Shopify App Bridge not available. Open this app from your Shopify Admin.',
    );
  }

  try {
    const token = await idTokenWithRetry(shopify);
    storeInitialToken(token);
    return token;
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
