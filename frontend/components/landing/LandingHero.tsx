'use client';

import { useState } from 'react';

interface LandingHeroProps {
  onInstall: (domain?: string) => void;
  isInstalling: boolean;
  isDev: boolean;
}

function TrustBadge({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[15px]">{icon}</span>
      <span className="text-sm text-[#6B7280] font-medium">{text}</span>
    </div>
  );
}

function CheckItem({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[#22c55e] text-sm font-bold shrink-0">✓</span>
      <span className="text-sm text-[#4B5563]">{text}</span>
    </div>
  );
}

export default function LandingHero({ onInstall, isInstalling, isDev }: LandingHeroProps) {
  const [shopDomain, setShopDomain] = useState('');

  return (
    <section className="pt-24 sm:pt-28 pb-16 sm:pb-20 overflow-hidden">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-[72px] items-center">

          {/* Left column */}
          <div className="animate-slide-in-left">
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-black/[0.06] text-[#0B0C0E] rounded-full text-[13px] font-medium mb-6">
              <span className="text-[#22c55e]">●</span> Now live on Shopify App Store
            </span>

            <h1 className="text-[42px] sm:text-[52px] lg:text-[58px] font-bold text-[#0B0C0E] leading-[1.08] mb-5 tracking-[-0.025em]">
              <span style={{ color: 'var(--pleero-green)' }}>Refunds</span> happen.<br />
              Losing that revenue<br />
              doesn&apos;t have to.
            </h1>

            <p className="text-[17px] sm:text-[19px] text-[#4B5563] leading-[1.65] mb-4">
              Every refund is revenue that walks out the door permanently. Pleero automatically
              offers your customers <strong>bonus store credit</strong> instead — and keeps
              15–25% of that money in your store.
            </p>

            <p className="text-[15px] sm:text-[16px] text-[#6B7280] leading-[1.6] mb-9">
              Customer gets more. You keep the revenue. Everyone wins.
            </p>

            <div className="flex flex-wrap gap-4 sm:gap-6">
              <TrustBadge icon="⚡" text="Live in 5 minutes" />
              <TrustBadge icon="🔒" text="No code required" />
              <TrustBadge icon="✓" text="14-day free trial" />
            </div>
          </div>

          {/* Right column: CTA card */}
          <div className="animate-slide-in-right">
            <div className="bg-white p-7 sm:p-11 rounded-2xl border border-black/[0.08] shadow-[0_20px_60px_rgba(0,0,0,0.08)]">
              <h2 className="text-xl sm:text-[22px] font-bold text-[#0B0C0E] mb-1.5">
                Start your free trial
              </h2>
              <p className="text-sm text-[#6B7280] mb-6">
                14 days free · No credit card required · Cancel anytime
              </p>

              {isDev ? (
                <form
                  onSubmit={(e) => { e.preventDefault(); onInstall(shopDomain); }}
                  className="flex flex-col gap-3.5"
                >
                  <input
                    type="text"
                    value={shopDomain}
                    onChange={(e) => setShopDomain(e.target.value)}
                    placeholder="your-store.myshopify.com"
                    disabled={isInstalling}
                    aria-label="Your Shopify store domain"
                    className="w-full px-4 py-3.5 border-[1.5px] border-black/[0.12] rounded-[10px] text-[15px] text-[#0B0C0E] bg-white focus:outline-none focus:border-[#0B0C0E] transition-colors disabled:opacity-60"
                  />
                  <button
                    type="submit"
                    disabled={isInstalling}
                    className="w-full py-4 bg-[#0B0C0E] text-white rounded-[10px] text-base font-bold hover:bg-[#1a1b1e] hover:shadow-[0_6px_20px_rgba(11,12,14,0.5)] active:scale-[0.98] transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isInstalling ? 'Connecting...' : 'Install Free →'}
                  </button>
                </form>
              ) : (
                <button
                  onClick={() => onInstall()}
                  className="w-full py-4 sm:py-[18px] bg-[#0B0C0E] text-white rounded-[10px] text-base font-bold shadow-[0_4px_14px_rgba(11,12,14,0.35)] hover:bg-[#1a1b1e] hover:shadow-[0_6px_20px_rgba(11,12,14,0.5)] active:scale-[0.98] transition-all duration-150"
                >
                  Install from Shopify App Store →
                </button>
              )}

              <div className="mt-5 pt-5 border-t border-black/[0.07] flex flex-col gap-1.5">
                <CheckItem text="Works with all Shopify plans" />
                <CheckItem text="GDPR & CCPA compliant" />
                <CheckItem text="Email support included" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
