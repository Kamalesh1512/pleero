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
