import type { Metadata } from "next";
import { Inter, DM_Mono } from "next/font/google";
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

export const metadata: Metadata = {
  title: "Pleero - Store Credit Intelligence for Shopify",
  description:
    "Pleero is the Store Credit Intelligence Platform for Shopify, helping merchants turn Store Credit into a smarter retention, refund recovery, and repeat purchase channel.",
  keywords:
    "Shopify Store Credit, store credit intelligence, refund recovery, retention marketing, repeat purchases, Shopify merchants",
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
    title: "Pleero - Store Credit Intelligence for Shopify",
    description:
      "Join the early access waitlist and help shape a better way to use Store Credit for retention, refund recovery, and repeat purchases.",
    siteName: "Pleero",
  },
  twitter: {
    card: "summary_large_image",
    title: "Pleero - Store Credit Intelligence for Shopify",
    description:
      "Pleero is building the intelligence and automation layer for Shopify Store Credit.",
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
      {process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID && (
        <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID} />
      )}
    </html>
  );
}
