/** @type {import('next').NextConfig} */
const nextConfig = {
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
