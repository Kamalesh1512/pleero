'use client';

import { useInView } from '@/components/ui/AnimatedSection';

const steps = [
  {
    number: '01',
    title: 'Customer requests a refund',
    description:
      'The moment a refund is created in your Shopify store, Pleero picks it up automatically. No monitoring, no notifications needed on your end.',
    screenshotSrc: '/screenshots/04-offer-email.png',
    screenshotAlt: 'Pleero offer email sent to customer',
    caption: 'Branded offer email — sent in seconds',
    isMobile: false,
  },
  {
    number: '02',
    title: 'Customer gets a branded offer — your logo, your colors',
    description:
      'The customer opens a clean, mobile-first offer page showing two options: take bonus store credit now, or wait 5–7 days for their cash back. About 1 in 5 choose the credit.',
    screenshotSrc: '/screenshots/01-customer-offer-mobile.png',
    screenshotAlt: 'Mobile offer page shown to customer',
    caption: 'One-tap acceptance on mobile',
    isMobile: true,
  },
  {
    number: '03',
    title: 'Revenue retained. Dashboard updated.',
    description:
      'If the customer accepts, store credit is issued in their Shopify account within 60 seconds. Your dashboard shows offers sent, conversion rate, and total revenue retained this month.',
    screenshotSrc: '/screenshots/02-merchant-dashboard.png',
    screenshotAlt: 'Pleero merchant dashboard showing revenue retained',
    caption: 'Track every dollar retained',
    isMobile: false,
  },
];

type Step = (typeof steps)[0];

function StepText({ step }: { step: Step }) {
  return (
    <div>
      <div className="font-mono-brand text-[48px] sm:text-[56px] font-bold text-[#0B0C0E]/[0.07] leading-none mb-3">
        {step.number}
      </div>
      <h3 className="text-2xl sm:text-[28px] font-bold text-[#0B0C0E] mb-3.5 tracking-[-0.015em] leading-[1.25]">
        {step.title}
      </h3>
      <p className="text-[15px] sm:text-[17px] text-[#4B5563] leading-[1.7]">
        {step.description}
      </p>
    </div>
  );
}

function BrowserFrame({ step }: { step: Step }) {
  return (
    <div>
      <div className="rounded-xl overflow-hidden shadow-[0_24px_64px_rgba(0,0,0,0.16)] border border-black/[0.08] bg-[#e8e8e8]">
        {/* macOS browser chrome */}
        <div className="bg-[#e0e0e0] px-3.5 py-2.5 flex items-center gap-1.5 border-b border-black/[0.09]">
          <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f56] shrink-0" />
          <div className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e] shrink-0" />
          <div className="w-2.5 h-2.5 rounded-full bg-[#27c93f] shrink-0" />
          <div className="flex-1 ml-2.5 bg-white rounded px-3 py-1 text-[12px] text-[#999]">
            pleero.app/dashboard
          </div>
        </div>
        <img src={step.screenshotSrc} alt={step.screenshotAlt} className="w-full block h-auto" />
      </div>
      <p className="text-[12px] text-[#9CA3AF] mt-2.5 text-center">{step.caption}</p>
    </div>
  );
}

function PhoneFrame({ step }: { step: Step }) {
  return (
    <div className="flex flex-col items-center">
      <div className="bg-[#1a1a1a] rounded-[36px] p-3 shadow-[0_32px_80px_rgba(0,0,0,0.25),inset_0_0_0_1px_rgba(255,255,255,0.1)] w-full max-w-[240px] sm:max-w-[280px] lg:max-w-[300px]">
        <div className="bg-[#1a1a1a] rounded-t-3xl pt-2 pb-1 text-center">
          <div className="inline-block w-20 h-1.5 bg-[#333] rounded-full" />
        </div>
        <div className="rounded-[18px] overflow-hidden bg-white">
          <img src={step.screenshotSrc} alt={step.screenshotAlt} className="w-full block h-auto" />
        </div>
        <div className="bg-[#1a1a1a] rounded-b-3xl py-2 flex justify-center">
          <div className="w-[120px] h-[5px] bg-[#444] rounded-full" />
        </div>
      </div>
      <p className="text-[12px] text-[#9CA3AF] mt-3.5 text-center">{step.caption}</p>
    </div>
  );
}

function StepRow({ step }: { step: Step }) {
  const { ref, isInView } = useInView();

  if (!step.isMobile) {
    return (
      <div
        ref={ref}
        className={`${isInView ? 'in-view' : 'before-view'} mb-16 sm:mb-20 lg:mb-24`}
      >
        <div className="mb-6 sm:mb-8">
          <StepText step={step} />
        </div>
        <BrowserFrame step={step} />
      </div>
    );
  }

  return (
    <div
      ref={ref}
      className={`${isInView ? 'in-view' : 'before-view'} flex flex-col lg:grid lg:grid-cols-2 gap-10 lg:gap-16 items-center mb-16 sm:mb-20`}
    >
      <StepText step={step} />
      <PhoneFrame step={step} />
    </div>
  );
}

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="py-20 sm:py-24 lg:py-[100px] px-4 sm:px-6 lg:px-8 bg-[#F7F8FA]">
      <div className="max-w-[1280px] mx-auto">
        <div className="text-center mb-14 sm:mb-16 lg:mb-[72px]">
          <h2 className="text-[30px] sm:text-[38px] lg:text-[42px] font-bold text-[#0B0C0E] mb-3.5 tracking-[-0.02em] leading-[1.2]">
            Three steps. Zero manual work.
          </h2>
          <p className="text-[15px] sm:text-[17px] text-[#6B7280]">
            Pleero runs in the background. You just watch the dashboard.
          </p>
        </div>

        {steps.map((step) => (
          <StepRow key={step.number} step={step} />
        ))}
      </div>
    </section>
  );
}
