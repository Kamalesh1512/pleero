'use client';

import { useState } from 'react';
import LandingNav from './landing/LandingNav';
import LandingHero from './landing/LandingHero';
import SocialProofBar from './landing/SocialProofBar';
import ProblemSolution from './landing/ProblemSolution';
import HowItWorks from './landing/HowItWorks';
import ROICalculator from './ROICalculator';
import PricingSection from './landing/PricingSection';
import FAQSection from './landing/FAQSection';
import LandingFooter from './landing/LandingFooter';
import AnimatedSection from './ui/AnimatedSection';

export default function LandingPage() {
  const [isInstalling, setIsInstalling] = useState(false);

  const isDev =
    process.env.NEXT_PUBLIC_APP_ENV === 'development' ||
    process.env.NODE_ENV === 'development';

  const SHOPIFY_APP_STORE_URL = 'https://apps.shopify.com/pleero';

  const handleInstall = (domain?: string) => {
    if (!isDev) {
      window.open(SHOPIFY_APP_STORE_URL, '_blank');
      return;
    }
    if (!domain?.trim()) {
      alert('Please enter your Shopify store domain');
      return;
    }
    setIsInstalling(true);
    const cleanDomain = domain.replace('.myshopify.com', '');
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    window.location.href = `${apiUrl}/auth/install?shop=${cleanDomain}.myshopify.com`;
  };

  return (
    <div className="bg-[#F7F8FA] min-h-screen">
      <LandingNav onInstall={() => handleInstall()} />
      <LandingHero onInstall={handleInstall} isInstalling={isInstalling} isDev={isDev} />
      <SocialProofBar />
      <ProblemSolution />
      <HowItWorks />

      {/* ROI Calculator */}
      <AnimatedSection>
        <section className="py-20 sm:py-24 lg:py-[100px] px-4 sm:px-6 lg:px-8 bg-white">
          <div className="max-w-[860px] mx-auto">
            <div className="text-center mb-10 sm:mb-12">
              <h2 className="text-[30px] sm:text-[38px] lg:text-[42px] font-bold text-[#0B0C0E] mb-3.5 tracking-[-0.02em]">
                What could you keep?
              </h2>
              <p className="text-[15px] sm:text-[17px] text-[#6B7280]">
                Enter your numbers. See your Pleero revenue in seconds.
              </p>
            </div>
            <div className="bg-white rounded-2xl p-6 sm:p-10 lg:p-12 border-2 border-[#0B0C0E] shadow-[0_20px_60px_rgba(0,0,0,0.08)]">
              <ROICalculator />
            </div>
          </div>
        </section>
      </AnimatedSection>

      <PricingSection onInstall={() => handleInstall()} />
      <FAQSection />
      <LandingFooter onInstall={() => handleInstall()} />
    </div>
  );
}
