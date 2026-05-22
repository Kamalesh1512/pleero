import { NextRequest, NextResponse } from 'next/server';

/**
 * Server-side middleware: redirect Shopify Admin embed requests straight to
 * /dashboard before any page renders — eliminates the landing-page flash.
 *
 * Shopify always passes `shop` + `host` (+ `embedded`, `hmac`, `id_token`, …)
 * in the query string when opening an embedded app. Public visitors never have
 * both params present, so this redirect is safe.
 */
export function middleware(request: NextRequest) {
  const { searchParams, pathname } = request.nextUrl;

  if (pathname === '/' && searchParams.get('shop') && searchParams.get('host')) {
    const dest = request.nextUrl.clone();
    dest.pathname = '/dashboard';
    // Preserve ALL Shopify params (hmac, host, id_token, session, shop, …)
    return NextResponse.redirect(dest);
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/',
};
