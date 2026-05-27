/** @type {import('next').NextConfig} */
const nextConfig = {
  // Polaris v13 uses ESM. Without this, Next.js resolves '@shopify/polaris' and
  // '@shopify/polaris/locales/en.json' through different module systems during
  // static generation, causing React.createContext to be called on an incomplete
  // React instance and crashing the SSR phase of every page.
  // Official Shopify recommendation for Next.js App Router + Polaris v12+:
  // https://polaris.shopify.com/
  transpilePackages: ['@shopify/polaris'],

  async headers() {
    return [
      {
        // Apply to every route — the embedded pages need frame-ancestors and the
        // public pages (landing, offers/[token]) benefit from the same policy.
        source: '/:path*',
        headers: [
          // Allow Shopify Admin to embed the app. CSP frame-ancestors supersedes
          // X-Frame-Options in all modern browsers; this is the only header needed.
          {
            key: 'Content-Security-Policy',
            value:
              "frame-ancestors 'self' https://admin.shopify.com https://*.myshopify.com;",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
