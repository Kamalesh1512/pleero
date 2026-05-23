import AnimatedSection from '@/components/ui/AnimatedSection';

interface PricingSectionProps {
  onInstall: () => void;
}

function PricingFeature({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2.5 mb-2.5">
      <span className="text-[#22c55e] text-sm font-bold shrink-0">✓</span>
      <span className="text-sm text-[#4B5563]">{text}</span>
    </div>
  );
}

const features = [
  'Unlimited store credit offers',
  'Automatic refund detection',
  'Custom bonus % and cap',
  'Fully branded customer emails',
  'Revenue retention dashboard',
  'Email support',
  'GDPR & CCPA compliant',
];

export default function PricingSection({ onInstall }: PricingSectionProps) {
  return (
    <section id="pricing" className="py-20 sm:py-24 lg:py-[100px] px-4 sm:px-6 lg:px-8 bg-[#F7F8FA]">
      <AnimatedSection>
        <div className="max-w-[1280px] mx-auto text-center">
          <h2 className="text-[30px] sm:text-[38px] lg:text-[42px] font-bold text-[#0B0C0E] mb-3.5 tracking-[-0.02em] leading-[1.2]">
            One plan. No surprises.
          </h2>
          <p className="text-[15px] sm:text-[17px] text-[#6B7280] mb-12 sm:mb-16">
            If you retain just two refunds a month, Pleero pays for itself.
          </p>

          <div className="hover-lift max-w-[480px] mx-auto bg-white border-2 border-[#0B0C0E] rounded-2xl p-8 sm:p-12 shadow-[0_20px_60px_rgba(0,0,0,0.07)] relative">
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-[#0B0C0E] text-white px-4 py-1 rounded-full text-[11px] font-bold tracking-[0.05em] uppercase whitespace-nowrap">
              EARLY ADOPTER RATE
            </div>

            <div className="mb-7">
              <div className="flex items-baseline justify-center gap-1.5 mb-1.5">
                <span className="font-mono-brand text-[56px] sm:text-[60px] font-bold text-[#0B0C0E]">$99</span>
                <span className="text-[17px] sm:text-[18px] text-[#6B7280]">/month</span>
              </div>
              <p className="text-sm text-[#6B7280]">14-day free trial · No credit card · Cancel anytime</p>
            </div>

            <div className="text-left mb-7">
              {features.map((f) => (
                <PricingFeature key={f} text={f} />
              ))}
            </div>

            <button
              onClick={onInstall}
              className="w-full py-4 bg-[#0B0C0E] text-white rounded-[10px] text-base font-bold hover:bg-[#1a1b1e] hover:shadow-[0_6px_20px_rgba(11,12,14,0.5)] active:scale-[0.98] transition-all duration-150"
            >
              Start 14-day free trial
            </button>

            <p className="text-[12px] text-[#9CA3AF] mt-3 text-center">
              No rev-share. No per-transaction fees. No hidden anything.
            </p>
          </div>
        </div>
      </AnimatedSection>
    </section>
  );
}
