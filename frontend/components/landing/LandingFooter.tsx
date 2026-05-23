import Image from 'next/image';

interface LandingFooterProps {
  onInstall: () => void;
}

function FooterLink({ href, text }: { href: string; text: string }) {
  return (
    <div className="mb-2">
      <a
        href={href}
        className="text-[13px] text-[#6B7280] hover:text-[#9CA3AF] no-underline transition-colors"
      >
        {text}
      </a>
    </div>
  );
}

export default function LandingFooter({ onInstall }: LandingFooterProps) {
  return (
    <>
      {/* ── Footer CTA ── */}
      <section className="py-16 sm:py-20 px-6 sm:px-8 bg-[#0B0C0E] text-center">
        <div className="max-w-[600px] mx-auto">
          <h2 className="text-[26px] sm:text-[32px] lg:text-[36px] font-semibold text-white mb-4 tracking-[-0.02em] text-balance leading-tight">
            Ready to stop losing refund revenue?
          </h2>
          <p className="text-[15px] sm:text-[17px] text-[#9CA3AF] mb-8 sm:mb-9">
            14 days free. Live in 5 minutes. No code required.
          </p>
          <button
            onClick={onInstall}
            className="inline-block px-8 sm:px-12 py-4 sm:py-[18px] bg-white text-[#0B0C0E] rounded-xl text-[15px] sm:text-[17px] font-bold hover:bg-[#F0F0F0] active:scale-[0.98] transition-all duration-150"
          >
            Start free trial →
          </button>
        </div>
      </section>

      {/* ── Footer links ── */}
      <footer className="bg-[#0B0C0E] border-t border-white/[0.07] py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-[1280px] mx-auto">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 sm:gap-10 mb-10">

            {/* Brand column — spans full width on smallest screens */}
            <div className="col-span-2 sm:col-span-1">
              <div className="flex items-center gap-2.5 mb-3">
                <Image
                  src="/app-icon.png"
                  alt="Pleero"
                  width={32}
                  height={32}
                  className="rounded-[6px]"
                />
                <span className="text-[18px] font-bold text-white">Pleero</span>
              </div>
              <p className="text-[13px] text-[#6B7280] leading-[1.6] max-w-[220px]">
                Turn Shopify refunds into store credit. Keep revenue that would otherwise leave
                permanently.
              </p>
            </div>

            {/* Product */}
            <div>
              <h3 className="text-[12px] sm:text-[13px] font-semibold text-[#F2F4F7] mb-3.5 uppercase tracking-[0.05em]">
                Product
              </h3>
              <FooterLink href="#how-it-works" text="How it works" />
              <FooterLink href="#pricing" text="Pricing" />
              <FooterLink href="#faq" text="FAQ" />
              <FooterLink href="mailto:hello@pleero.app" text="Contact" />
            </div>

            {/* Legal */}
            <div>
              <h3 className="text-[12px] sm:text-[13px] font-semibold text-[#F2F4F7] mb-3.5 uppercase tracking-[0.05em]">
                Legal
              </h3>
              <FooterLink href="/legal/privacy" text="Privacy Policy" />
              <FooterLink href="/legal/terms" text="Terms of Service" />
            </div>

            {/* Support */}
            <div>
              <h3 className="text-[12px] sm:text-[13px] font-semibold text-[#F2F4F7] mb-3.5 uppercase tracking-[0.05em]">
                Support
              </h3>
              <FooterLink href="mailto:support@pleero.app" text="support@pleero.app" />
              <FooterLink href="https://apps.shopify.com/pleero" text="Shopify App Store" />
            </div>
          </div>

          <div className="pt-6 border-t border-white/[0.06] text-center text-[13px] text-[#4A5058]">
            © {new Date().getFullYear()} Pleero. All rights reserved.
          </div>
        </div>
      </footer>
    </>
  );
}
