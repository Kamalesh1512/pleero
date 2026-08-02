import type { Metadata } from "next";
import { Inter, DM_Mono, Caveat } from "next/font/google";
import { GoogleAnalytics } from "@next/third-parties/google";
import "./globals.css";
import Providers from "@/components/Providers";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const dmMono = DM_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
  display: "swap",
});

const caveat = Caveat({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-handwritten",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Pleero - Store Credit Analytics for Shopify",
  description:
    "The missing analytics layer for Shopify Store Credit: redemption rate, revenue retained, and what's about to expire - across every tool you use.",
  keywords:
    "Shopify Store Credit, store credit analytics, Store Credit Intelligence, expired store credit, store credit redemption rate, refund recovery, loop returns, aftership, rise.ai, Shopify merchants",
  authors: [{ name: "Pleero" }],
  creator: "Pleero",
  metadataBase: new URL("https://pleero.app"),
  alternates: {
    canonical: "https://pleero.app",
  },
  icons: {
    icon: [{ url: "/favicon.ico" }, { url: "/app-icon.png", type: "image/png", sizes: "32x32" }],
    apple: [{ url: "/app-icon.png", type: "image/png", sizes: "180x180" }],
    shortcut: "/favicon.ico",
  },
  openGraph: {
    type: "website",
    url: "https://pleero.app",
    title: "Pleero - Store Credit Analytics for Shopify",
    description:
      "The missing analytics layer for Shopify Store Credit: redemption rate, revenue retained, and what's about to expire - across every tool you use.",
    siteName: "Pleero",
  },
  twitter: {
    card: "summary_large_image",
    title: "Pleero - Store Credit Analytics for Shopify",
    description:
      "See how much Store Credit gets redeemed, the revenue it brings back, and what's about to expire - across Shopify native, Loop, AfterShip, ReturnGO, Rise.ai, and manual gift cards.",
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
    <html lang="en" className={`${inter.variable} ${dmMono.variable} ${caveat.variable}`}>
      <body>
        <Providers>{children}</Providers>
      </body>
      {process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID && (
        <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID} />
      )}
    </html>
  );
}
