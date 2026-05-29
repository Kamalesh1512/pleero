/** @type {import('next').NextConfig} */
const nextConfig = {
  // Polaris v13 uses ESM. Without this, Next.js resolves '@shopify/polaris' and
  // '@shopify/polaris/locales/en.json' through different module systems during
  // static generation, causing React.createContext to be called on an incomplete
  // React instance and crashing the SSR phase of every page.
  transpilePackages: ['@shopify/polaris'],

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // Prevent the app from being embedded in any external iframe.
          // Pleero is now a standalone web app (not embedded in Shopify Admin).
          {
            key: 'Content-Security-Policy',
            value: "frame-ancestors 'self';",
          },
          // Prevents MIME-type sniffing
          { key: 'X-Content-Type-Options', value: 'nosniff' },
        ],
      },
    ];
  },
};

export default nextConfig;
