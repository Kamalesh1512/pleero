import type { Metadata } from 'next';
import LandingPage from '@/components/LandingPage';

export const metadata: Metadata = {
  title: "Pleero – Turn Refunds Into Store Credit | Shopify App",
  description: "Pleero automatically offers customers bonus store credit instead of cash refunds. Keep 15–25% of refund revenue in your store. 14-day free trial.",
  alternates: { canonical: "https://pleero.app" },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "SoftwareApplication",
      "name": "Pleero",
      "applicationCategory": "BusinessApplication",
      "operatingSystem": "Shopify",
      "url": "https://pleero.app",
      "description": "Pleero automatically converts Shopify refund requests into bonus store credit offers, retaining 15–25% of refund revenue for DTC brands.",
      "offers": {
        "@type": "Offer",
        "price": "99",
        "priceCurrency": "USD",
        "priceSpecification": {
          "@type": "UnitPriceSpecification",
          "billingDuration": "P1M"
        }
      },
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": "5",
        "reviewCount": "1"
      }
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "How does Pleero work with Shopify refunds?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "When a refund is created in your Shopify store, Pleero automatically sends the customer a branded email offering them bonus store credit instead of a cash refund. The customer can accept with one click or decline for a normal refund. No manual work required."
          }
        },
        {
          "@type": "Question",
          "name": "Do customers have to accept the store credit?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "No. Customers always have the choice. The offer email shows the store credit option and the cash refund option with equal prominence. Customers who prefer cash simply click decline and their refund processes normally."
          }
        },
        {
          "@type": "Question",
          "name": "What percentage of refunds does Pleero convert to store credit?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "DTC apparel and footwear brands typically see 15–25% of refund requests converted to store credit when using Pleero. Actual results depend on your bonus percentage, AOV, and customer base."
          }
        },
        {
          "@type": "Question",
          "name": "How much does Pleero cost?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Pleero is $99/month USD, flat rate. There is a 14-day free trial with no credit card required. No rev-share, no per-transaction fees, no setup fees."
          }
        },
        {
          "@type": "Question",
          "name": "Does Pleero work with all Shopify plans?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Yes. Pleero works with all Shopify plans that support the Store Credit API. It is best suited for stores doing $2M–$20M GMV with 20–30% return rates."
          }
        },
        {
          "@type": "Question",
          "name": "How long does setup take?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Install from the Shopify App Store in under 5 minutes. No code changes, no developer needed. Configure your bonus percentage and brand color, and Pleero starts working on the next refund."
          }
        }
      ]
    },
    {
      "@type": "Organization",
      "name": "Pleero",
      "url": "https://pleero.app",
      "email": "support@pleero.app",
      "sameAs": ["https://apps.shopify.com/pleero"]
    }
  ]
};

/**
 * Public landing page — shown to visitors who access pleero.app directly.
 * Shopify Admin users are redirected to /dashboard by middleware.ts before
 * this component ever renders.
 */
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
