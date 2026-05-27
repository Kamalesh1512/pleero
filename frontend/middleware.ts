import { NextRequest, NextResponse } from 'next/server';

/**
 * Handles two Shopify entry-point scenarios and the favicon rewrite.
 *
 * application_url is now "https://pleero.app/dashboard" so Shopify Admin
 * loads the embedded app directly at /dashboard — no redirect needed for
 * the normal embedded-open flow.  That eliminates the server-side 307
 * redirect that prevented the App Bridge CDN script from correctly reading
 * the `host` URL parameter and caused the "Host did not expose RPC" error.
 *
 * We still need to handle the initial install request, which Shopify fires
 * at the application_url with shop + hmac but WITHOUT host.  Because
 * application_url is now /dashboard, that install request hits /dashboard
 * (not /).  We guard both paths for safety.
 */
export function middleware(request: NextRequest) {
  const { searchParams, pathname } = request.nextUrl;

  // Rewrite /favicon.ico → /app-icon.png for the browser tab icon.
  if (pathname === '/favicon.ico') {
    return NextResponse.rewrite(new URL('/app-icon.png', request.url));
  }

  // Initial install: shop + hmac present but NO host parameter means this is
  // an OAuth initiation from the App Store / Partner Dashboard.  Redirect to
  // the backend OAuth handler.  Guard both / and /dashboard because
  // application_url was previously / and may still arrive on either path.
  const isInstall =
    searchParams.get('shop') &&
    searchParams.get('hmac') &&
    !searchParams.get('host');

  if (isInstall && (pathname === '/' || pathname === '/dashboard')) {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.pleero.app';
    const installUrl = new URL(`${apiUrl}/auth/install`);
    searchParams.forEach((value, key) => installUrl.searchParams.set(key, value));
    return NextResponse.redirect(installUrl.toString());
  }

  // Legacy: if someone still hits / with shop + host (old application_url),
  // forward them to /dashboard so the App Bridge loads on the right page.
  if (pathname === '/' && searchParams.get('shop') && searchParams.get('host')) {
    const dest = request.nextUrl.clone();
    dest.pathname = '/dashboard';
    return NextResponse.redirect(dest);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/dashboard', '/favicon.ico'],
};
