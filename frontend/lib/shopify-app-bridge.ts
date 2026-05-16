import { getSessionToken as getAppBridgeToken } from '@shopify/app-bridge/utilities';
import createApp, { type ClientApplication } from '@shopify/app-bridge';

let app: ClientApplication | null = null;

/**
 * Initialize Shopify App Bridge
 * Call this once when your app loads, typically in a root component or layout
 *
 * @param apiKey - Your Shopify API key from environment
 * @param host - The host parameter from URL query string
 */
export function initAppBridge(apiKey: string, host: string) {
  if (!app) {
    app = createApp({
      apiKey,
      host,
    });
  }
  return app;
}

/**
 * Get a session token from Shopify App Bridge
 * This token is used to authenticate requests to your backend
 *
 * @returns A session token string
 * @throws Error if App Bridge is not initialized
 */
export async function getSessionToken(): Promise<string> {
  if (!app) {
    throw new Error('App Bridge not initialized. Ensure initAppBridge is called first.');
  }
  return await getAppBridgeToken(app);
}

/**
 * Get the current App Bridge instance
 * Useful for accessing other App Bridge features
 */
export function getApp() {
  return app;
}
