import type { Metadata } from "next";
import LandingPage from "@/components/LandingPage";

export const metadata: Metadata = {
  title: "Pleero - Store Credit Intelligence for Shopify",
  description:
    "Pleero is the Store Credit Intelligence Platform for Shopify, helping merchants turn Store Credit into a smarter retention, refund recovery, and repeat purchase channel.",
  alternates: { canonical: "https://pleero.app" },
  openGraph: {
    title: "Pleero - Store Credit Intelligence for Shopify",
    description:
      "Join the early access waitlist and help shape a better way to use Store Credit for retention, refund recovery, and repeat purchases.",
    url: "https://pleero.app",
    siteName: "Pleero",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Pleero - Store Credit Intelligence for Shopify",
    description:
      "Pleero is building the intelligence and automation layer for Shopify Store Credit.",
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
