import { NextRequest, NextResponse } from 'next/server';

/**
 * Server-side middleware: redirect Shopify Admin embed requests straight to
 * /dashboard before any page renders — eliminates the landing-page flash.
 *
 * Also rewrites /favicon.ico to /app-icon.png so the browser tab shows the
 * correct icon regardless of the favicon.ico file in the app/ directory.
 */
export function middleware(request: NextRequest) {
  const { searchParams, pathname } = request.nextUrl;

  // Serve app-icon.png as the browser-tab favicon.
  // Middleware runs before Next.js's file-based metadata routes, so this
  // intercepts the request and serves the PNG in place of the ICO file.
  if (pathname === '/favicon.ico') {
    return NextResponse.rewrite(new URL('/app-icon.png', request.url));
  }

  // Initial install: Shopify hits application_url with shop + hmac but NO host.
  // Must redirect to backend OAuth — the frontend cannot start the token exchange.
  if (pathname === '/' && searchParams.get('shop') && searchParams.get('hmac') && !searchParams.get('host')) {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.pleero.app';
    const installUrl = new URL(`${apiUrl}/auth/install`);
    searchParams.forEach((value, key) => installUrl.searchParams.set(key, value));
    return NextResponse.redirect(installUrl.toString());
  }

  // Embedded open: Shopify Admin loads the app with shop + host.
  if (pathname === '/' && searchParams.get('shop') && searchParams.get('host')) {
    const dest = request.nextUrl.clone();
    dest.pathname = '/dashboard';
    // Preserve ALL Shopify params (hmac, host, id_token, session, shop, …)
    return NextResponse.redirect(dest);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/favicon.ico'],
};
