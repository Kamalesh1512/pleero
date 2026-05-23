'use client';

import { useState } from 'react';
import Image from 'next/image';

interface LandingNavProps {
  onInstall: () => void;
}

export default function LandingNav({ onInstall }: LandingNavProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="animate-slide-down fixed top-0 inset-x-0 z-50 bg-[rgba(247,248,250,0.9)] backdrop-blur-md border-b border-black/[0.08]">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <a href="/" className="flex items-center gap-2.5 no-underline">
            <Image src="/app-icon.png" alt="Pleero" width={36} height={36} className="rounded-lg" />
            <span className="text-[19px] font-bold text-[#0B0C0E] tracking-[-0.01em]">Pleero</span>
          </a>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-7">
            <a
              href="#how-it-works"
              className="text-sm text-[#6B7280] hover:text-[#0B0C0E] transition-colors no-underline"
            >
              How it works
            </a>
            <a
              href="#pricing"
              className="text-sm text-[#6B7280] hover:text-[#0B0C0E] transition-colors no-underline"
            >
              Pricing
            </a>
            <a
              href="#faq"
              className="text-sm text-[#6B7280] hover:text-[#0B0C0E] transition-colors no-underline"
            >
              FAQ
            </a>
            <button
              onClick={onInstall}
              className="px-5 py-2.5 bg-[#0B0C0E] text-white text-sm font-semibold rounded-lg hover:bg-[#1a1b1e] hover:shadow-[0_6px_20px_rgba(11,12,14,0.5)] active:scale-[0.98] transition-all duration-150"
            >
              Start free trial
            </button>
          </div>

          {/* Mobile: compact CTA + hamburger */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={onInstall}
              className="px-4 py-2 bg-[#0B0C0E] text-white text-sm font-semibold rounded-lg active:scale-[0.98] transition-all duration-150"
            >
              Try free
            </button>
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
              className="p-2 text-[#0B0C0E] rounded-md"
            >
              {mobileOpen ? (
                <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile dropdown */}
      {mobileOpen && (
        <div className="md:hidden border-t border-black/[0.08] bg-[rgba(247,248,250,0.98)] px-4 pb-4 pt-2">
          <a
            href="#how-it-works"
            onClick={() => setMobileOpen(false)}
            className="block py-3 text-sm font-medium text-[#374151] no-underline border-b border-black/[0.05]"
          >
            How it works
          </a>
          <a
            href="#pricing"
            onClick={() => setMobileOpen(false)}
            className="block py-3 text-sm font-medium text-[#374151] no-underline border-b border-black/[0.05]"
          >
            Pricing
          </a>
          <a
            href="#faq"
            onClick={() => setMobileOpen(false)}
            className="block py-3 text-sm font-medium text-[#374151] no-underline"
          >
            FAQ
          </a>
        </div>
      )}
    </nav>
  );
}
