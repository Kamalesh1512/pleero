import { NextRequest, NextResponse } from 'next/server';

/**
 * Handles two entry-point scenarios:
 *
 * 1. Initial install — Shopify fires the application_url with shop + hmac but
 *    without a host parameter.  Redirect to the backend OAuth handler.
 *
 * 2. Favicon rewrite — serve /app-icon.png for browser tab icons.
 *
 * Session authentication is handled entirely by the backend (pleero_session
 * cookie + /api/auth/me).  The middleware no longer needs to inspect host or
 * id_token parameters.
 */
export function middleware(request: NextRequest) {
  const { searchParams, pathname } = request.nextUrl;

  if (pathname === '/favicon.ico') {
    return NextResponse.rewrite(new URL('/app-icon.png', request.url));
  }

  // Initial install: shop + hmac present but NO host → OAuth initiation.
  const isInstall =
    searchParams.get('shop') &&
    searchParams.get('hmac') &&
    !searchParams.get('host');

  if (isInstall) {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.pleero.app';
    const installUrl = new URL(`${apiUrl}/auth/install`);
    searchParams.forEach((value, key) => installUrl.searchParams.set(key, value));
    return NextResponse.redirect(installUrl.toString());
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|.*\\.png$).*)'],
};
