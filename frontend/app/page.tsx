import type { Metadata } from "next";
import LandingPage from "@/components/LandingPage";

export const metadata: Metadata = {
  title: "Pleero - Store Credit Analytics for Shopify",
  description:
    "The missing analytics layer for Shopify Store Credit: redemption rate, revenue retained, and what's about to expire - across every tool you use.",
  alternates: { canonical: "https://pleero.app" },
  openGraph: {
    title: "Pleero - Store Credit Analytics for Shopify",
    description:
      "Get your free Store Credit report: how much gets redeemed, how much revenue it brings back, and what's about to expire - across every tool you use.",
    url: "https://pleero.app",
    siteName: "Pleero",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Pleero - Store Credit Analytics for Shopify",
    description:
      "See how much Store Credit gets redeemed, the revenue it brings back, and what's about to expire - across Shopify native, Loop, AfterShip, ReturnGO, Rise.ai, and manual gift cards.",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Pleero",
  url: "https://pleero.app",
  email: "hello@pleero.app",
};

export default function Page() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <LandingPage />
    </>
  );
}
