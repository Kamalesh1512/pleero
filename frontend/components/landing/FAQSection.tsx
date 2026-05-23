'use client';

import { useState } from 'react';
import AnimatedSection from '@/components/ui/AnimatedSection';

const faqs = [
  {
    q: 'How does Pleero work?',
    a: "When a refund is created in your store, Pleero automatically emails the customer a branded offer: take bonus store credit (e.g. $110 credit) or get their cash back ($100). They choose. If they accept, credit is in their account in seconds. If they decline, the refund processes normally — no friction.",
  },
  {
    q: 'Do customers have to accept the store credit?',
    a: "No. The offer always shows both options with equal prominence. Customers who prefer cash simply click 'I still want a refund' and nothing changes. Pleero never forces anyone into store credit.",
  },
  {
    q: 'What percentage of refunds convert to store credit?',
    a: 'DTC apparel and footwear brands typically see 15–25% of refund requests convert. A customer getting $110 credit instead of waiting 5–7 days for $100 back is a compelling offer — especially for your best buyers.',
  },
  {
    q: 'Does this work with all Shopify plans?',
    a: 'Yes. Pleero works on all Shopify plans (Basic through Plus) that support the Store Credit feature. It is optimised for stores doing $2M–$20M GMV with 20–30% return rates.',
  },
  {
    q: 'How long does setup take?',
    a: "Under 5 minutes. Install from the Shopify App Store, pick your bonus percentage (5–20%), set a cap, and you're live on the next refund. No developer, no code changes.",
  },
  {
    q: 'What does it cost?',
    a: '$99/month flat. 14-day free trial, no credit card required. No rev-share, no per-transaction fees. If you retain even one $200 refund per month, the app pays for itself.',
  },
];

export default function FAQSection() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <section id="faq" className="py-20 sm:py-24 lg:py-[100px] px-4 sm:px-6 lg:px-8 bg-white">
      <AnimatedSection>
        <div className="max-w-[720px] mx-auto">
          <h2 className="text-[30px] sm:text-[38px] lg:text-[42px] font-bold text-[#0B0C0E] mb-10 sm:mb-12 text-center tracking-[-0.02em] leading-[1.2]">
            Common questions
          </h2>

          <div className="border border-black/[0.08] rounded-2xl overflow-hidden">
            {faqs.map((faq, i) => (
              <div key={i} className="faq-item">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  aria-expanded={openFaq === i}
                  className="w-full px-5 sm:px-7 py-5 sm:py-[22px] flex justify-between items-center bg-transparent border-none cursor-pointer text-left"
                >
                  <span className="text-[15px] sm:text-[16px] font-semibold text-[#0B0C0E] pr-4">
                    {faq.q}
                  </span>
                  <span
                    className="text-[20px] text-[#6B7280] shrink-0 transition-transform duration-200 inline-block"
                    style={{ transform: openFaq === i ? 'rotate(45deg)' : 'none' }}
                  >
                    +
                  </span>
                </button>
                {openFaq === i && (
                  <div className="px-5 sm:px-7 pb-5 sm:pb-[22px] text-[#4B5563] text-[14px] sm:text-[15px] leading-[1.7]">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </AnimatedSection>
    </section>
  );
}
