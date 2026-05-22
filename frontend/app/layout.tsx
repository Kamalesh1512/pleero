import type { Metadata } from "next";
import { Inter, DM_Mono } from 'next/font/google';
import "./globals.css";
import Providers from "@/components/Providers";

// Using Inter as Geist alternative (similar geometric sans-serif)
// TODO: Replace with Geist font when available in next/font/google or via local font files
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
});

const dmMono = DM_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: "Pleero – Turn Refunds Into Store Credit | Shopify App",
  description: "Pleero automatically offers customers bonus store credit instead of cash refunds. Keep 15–25% of refund revenue in your store. 14-day free trial. No code required.",
  keywords: "shopify refunds, store credit app, refund retention, return to store credit, shopify returns app, revenue retention shopify",
  authors: [{ name: "Pleero" }],
  creator: "Pleero",
  metadataBase: new URL("https://pleero.app"),
  alternates: {
    canonical: "https://pleero.app",
  },
  openGraph: {
    type: "website",
    url: "https://pleero.app",
    title: "Pleero – Turn Refunds Into Store Credit",
    description: "Stop losing revenue to refunds. Pleero automatically offers customers bonus store credit and converts 15–25% of refund requests into retained revenue.",
    siteName: "Pleero",
    images: [
      {
        url: "/screenshots/02-merchant-dashboard.png",
        width: 1920,
        height: 1080,
        alt: "Pleero merchant dashboard showing revenue retained",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Pleero – Turn Refunds Into Store Credit",
    description: "Automatically convert Shopify refund requests into store credit offers. 15–25% conversion rate. $99/mo flat.",
    images: ["/screenshots/02-merchant-dashboard.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${dmMono.variable}`}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
