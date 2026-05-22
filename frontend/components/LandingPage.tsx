'use client';

import { useState, useEffect, useRef } from 'react';
import ROICalculator from './ROICalculator';

function useInView(options = {}) {
  const [isInView, setIsInView] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) setIsInView(true);
    }, { threshold: 0.1, ...options });

    if (ref.current) observer.observe(ref.current);
    return () => { if (ref.current) observer.unobserve(ref.current); };
  }, []);

  return { ref, isInView };
}

export default function LandingPage() {
  const [shopDomain, setShopDomain] = useState('');
  const [isInstalling, setIsInstalling] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const isDev = process.env.NEXT_PUBLIC_APP_ENV === 'development' ||
    process.env.NODE_ENV === 'development';
  const SHOPIFY_APP_STORE_URL = 'https://apps.shopify.com/pleero';

  const handleInstall = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!isDev) { window.open(SHOPIFY_APP_STORE_URL, '_blank'); return; }
    if (!shopDomain.trim()) { alert('Please enter your Shopify store domain'); return; }
    setIsInstalling(true);
    const cleanDomain = shopDomain.replace('.myshopify.com', '');
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    window.location.href = `${apiUrl}/auth/install?shop=${cleanDomain}.myshopify.com`;
  };

  const faqs = [
    {
      q: "How does Pleero work?",
      a: "When a refund is created in your store, Pleero automatically emails the customer a branded offer: take bonus store credit (e.g. $110 credit) or get their cash back ($100). They choose. If they accept, credit is in their account in seconds. If they decline, the refund processes normally — no friction."
    },
    {
      q: "Do customers have to accept the store credit?",
      a: "No. The offer always shows both options with equal prominence. Customers who prefer cash simply click 'I still want a refund' and nothing changes. Pleero never forces anyone into store credit."
    },
    {
      q: "What percentage of refunds convert to store credit?",
      a: "DTC apparel and footwear brands typically see 15–25% of refund requests convert. A customer getting $110 credit instead of waiting 5–7 days for $100 back is a compelling offer — especially for your best buyers."
    },
    {
      q: "Does this work with all Shopify plans?",
      a: "Yes. Pleero works on all Shopify plans (Basic through Plus) that support the Store Credit feature. It is optimised for stores doing $2M–$20M GMV with 20–30% return rates."
    },
    {
      q: "How long does setup take?",
      a: "Under 5 minutes. Install from the Shopify App Store, pick your bonus percentage (5–20%), set a cap, and you're live on the next refund. No developer, no code changes."
    },
    {
      q: "What does it cost?",
      a: "$99/month flat. 14-day free trial, no credit card required. No rev-share, no per-transaction fees. If you retain even one $200 refund per month, the app pays for itself."
    }
  ];

  return (
    <>
      <style jsx global>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-100%); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideInLeft {
          from { opacity: 0; transform: translateX(-40px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(40px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .animate-slide-in-left { animation: slideInLeft 0.8s ease-out forwards; }
        .animate-slide-in-right { animation: slideInRight 0.8s ease-out forwards; }
        .animate-slide-down { animation: slideDown 0.6s ease-out forwards; }
        .in-view { opacity: 1; transform: translateY(0); }
        .before-view {
          opacity: 0;
          transform: translateY(30px);
          transition: opacity 0.6s ease-out, transform 0.6s ease-out;
        }
        .hover-lift { transition: transform 0.3s ease, box-shadow 0.3s ease; }
        .hover-lift:hover {
          transform: translateY(-6px);
          box-shadow: 0 12px 28px rgba(0, 0, 0, 0.12) !important;
        }
        .btn-primary { transition: all 0.15s ease; }
        .btn-primary:hover {
          background: #1a1b1e !important;
          box-shadow: 0 6px 20px 0 rgba(11, 12, 14, 0.5) !important;
        }
        .btn-primary:active { transform: scale(0.98); }
        .screenshot-card {
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 24px 64px rgba(0,0,0,0.14);
          border: 1px solid rgba(0,0,0,0.08);
        }
        .faq-item { border-bottom: 1px solid rgba(0,0,0,0.08); }
        .faq-item:last-child { border-bottom: none; }
        @media (max-width: 768px) {
          .hero-grid { grid-template-columns: 1fr !important; gap: 48px !important; }
          .step-grid { grid-template-columns: 1fr !important; gap: 32px !important; }
          .proof-grid { grid-template-columns: 1fr 1fr !important; }
          .hero-h1 { font-size: 40px !important; }
          .section-h2 { font-size: 32px !important; }
          .hide-mobile { display: none !important; }
        }
      `}</style>

      <div style={{ background: '#F7F8FA', fontFamily: 'var(--font-display)', minHeight: '100vh' }}>

        {/* ── Nav ── */}
        <nav className="animate-slide-down" style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
          background: 'rgba(247,248,250,0.88)',
          backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(0,0,0,0.08)'
        }}>
          <div style={{
            maxWidth: '1280px', margin: '0 auto', padding: '16px 32px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <img src="/app-icon.png" alt="Pleero logo" width={36} height={36}
                style={{ borderRadius: '8px' }} />
              <span style={{ fontSize: '19px', fontWeight: 700, color: '#0B0C0E', letterSpacing: '-0.01em' }}>
                Pleero
              </span>
            </div>
            <div style={{ display: 'flex', gap: '28px', alignItems: 'center' }}>
              <a href="#how-it-works" style={{ fontSize: '14px', color: '#6B7280', textDecoration: 'none' }}>
                How it works
              </a>
              <a href="#pricing" style={{ fontSize: '14px', color: '#6B7280', textDecoration: 'none' }}>
                Pricing
              </a>
              <a href="#faq" style={{ fontSize: '14px', color: '#6B7280', textDecoration: 'none' }}>
                FAQ
              </a>
              <button onClick={handleInstall} className="btn-primary" style={{
                padding: '9px 20px', background: '#0B0C0E', color: '#fff',
                border: 'none', borderRadius: '8px', fontSize: '14px',
                fontWeight: 600, cursor: 'pointer'
              }}>
                Start free trial
              </button>
            </div>
          </div>
        </nav>

        {/* ── Hero ── */}
        <section style={{ paddingTop: '120px', paddingBottom: '80px', overflow: 'hidden' }}>
          <div className="hero-grid" style={{
            maxWidth: '1280px', margin: '0 auto', padding: '0 32px',
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '72px', alignItems: 'center'
          }}>
            {/* Left */}
            <div className="animate-slide-in-left" style={{ opacity: 0 }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                padding: '6px 14px',
                background: 'rgba(11,12,14,0.06)', color: '#0B0C0E',
                borderRadius: '20px', fontSize: '13px', fontWeight: 500, marginBottom: '24px'
              }}>
                <span style={{ color: '#22c55e' }}>●</span> Now live on Shopify App Store
              </span>

              <h1 className="hero-h1" style={{
                fontSize: '58px', fontWeight: 700, color: '#0B0C0E',
                lineHeight: 1.08, marginBottom: '20px', letterSpacing: '-0.025em'
              }}>
                <span style={{ color: 'var(--pleero-green)' }}>Refunds</span> happen.<br />
                Losing that revenue<br />doesn't have to.
              </h1>

              <p style={{
                fontSize: '19px', color: '#4B5563', lineHeight: 1.65, marginBottom: '16px'
              }}>
                Every refund is revenue that walks out the door permanently. Pleero automatically
                offers your customers <strong>bonus store credit</strong> instead — and keeps
                15–25% of that money in your store.
              </p>

              <p style={{ fontSize: '16px', color: '#6B7280', lineHeight: 1.6, marginBottom: '36px' }}>
                Customer gets more. You keep the revenue. Everyone wins.
              </p>

              <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginBottom: '12px' }}>
                <TrustBadge icon="⚡" text="Live in 5 minutes" />
                <TrustBadge icon="🔒" text="No code required" />
                <TrustBadge icon="✓" text="14-day free trial" />
              </div>
            </div>

            {/* Right: CTA card */}
            <div className="animate-slide-in-right" style={{ opacity: 0 }}>
              <div style={{
                background: '#fff', padding: '44px', borderRadius: '20px',
                border: '1px solid rgba(0,0,0,0.08)',
                boxShadow: '0 20px 60px rgba(0,0,0,0.08)'
              }}>
                <h2 style={{
                  fontSize: '22px', fontWeight: 700, color: '#0B0C0E', marginBottom: '6px'
                }}>
                  Start your free trial
                </h2>
                <p style={{ fontSize: '14px', color: '#6B7280', marginBottom: '24px' }}>
                  14 days free · No credit card required · Cancel anytime
                </p>

                {isDev ? (
                  <form onSubmit={handleInstall} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <input
                      type="text" value={shopDomain}
                      onChange={(e) => setShopDomain(e.target.value)}
                      placeholder="your-store.myshopify.com"
                      disabled={isInstalling}
                      aria-label="Your Shopify store domain"
                      style={{
                        width: '100%', padding: '15px 18px',
                        border: '1.5px solid rgba(0,0,0,0.12)', borderRadius: '10px',
                        fontSize: '15px', color: '#0B0C0E', background: '#fff',
                        fontFamily: 'var(--font-display)', boxSizing: 'border-box'
                      }}
                    />
                    <button type="submit" disabled={isInstalling} className="btn-primary" style={{
                      width: '100%', padding: '17px', background: '#0B0C0E', color: '#fff',
                      border: 'none', borderRadius: '10px', fontSize: '16px',
                      fontWeight: 700, cursor: isInstalling ? 'not-allowed' : 'pointer',
                      opacity: isInstalling ? 0.6 : 1
                    }}>
                      {isInstalling ? 'Connecting...' : 'Install Free →'}
                    </button>
                  </form>
                ) : (
                  <button onClick={handleInstall} className="btn-primary" style={{
                    width: '100%', padding: '18px', background: '#0B0C0E', color: '#fff',
                    border: 'none', borderRadius: '10px', fontSize: '16px',
                    fontWeight: 700, cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(11,12,14,0.35)'
                  }}>
                    Install from Shopify App Store →
                  </button>
                )}

                <div style={{
                  marginTop: '20px', paddingTop: '20px',
                  borderTop: '1px solid rgba(0,0,0,0.07)',
                  display: 'flex', flexDirection: 'column', gap: '7px'
                }}>
                  <CheckItem text="Works with all Shopify plans" />
                  <CheckItem text="GDPR & CCPA compliant" />
                  <CheckItem text="Email support included" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Social Proof Bar ── */}
        <section style={{ background: '#0B0C0E', padding: '32px 32px' }}>
          <div className="proof-grid" style={{
            maxWidth: '1280px', margin: '0 auto',
            display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '32px', textAlign: 'center'
          }}>
            <ProofStat number="15–25%" label="of refunds converted to credit" />
            <ProofStat number="60 sec" label="for credit to appear in customer account" />
            <ProofStat number="5 min" label="to install and go live" />
            <ProofStat number="$99/mo" label="flat — no rev-share, no surprises" />
          </div>
        </section>

        {/* ── Problem / Before & After ── */}
        <AnimatedSection>
          <section style={{ padding: '100px 32px', background: '#fff' }}>
            <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
              <div style={{ textAlign: 'center', marginBottom: '64px' }}>
                <h2 className="section-h2" style={{
                  fontSize: '42px', fontWeight: 700, color: '#0B0C0E',
                  marginBottom: '14px', letterSpacing: '-0.02em'
                }}>
                  Right now, every refund costs you twice
                </h2>
                <p style={{ fontSize: '17px', color: '#6B7280', maxWidth: '580px', margin: '0 auto' }}>
                  You lose the revenue <em>and</em> you lose the customer. Pleero breaks that cycle.
                </p>
              </div>

              <div style={{
                display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '24px',
                alignItems: 'center', maxWidth: '900px', margin: '0 auto'
              }}>
                {/* Without Pleero */}
                <div style={{
                  padding: '32px', borderRadius: '16px',
                  background: '#FFF5F5', border: '1.5px solid #FCA5A5'
                }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#DC2626', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Without Pleero
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <ProblemItem text="Customer emails asking for refund" />
                    <ProblemItem text="You process $100 cash refund" />
                    <ProblemItem text="$100 leaves your account permanently" />
                    <ProblemItem text="Customer may never return" />
                  </div>
                </div>

                <div style={{ fontSize: '28px', textAlign: 'center', color: '#9CA3AF' }}>→</div>

                {/* With Pleero */}
                <div style={{
                  padding: '32px', borderRadius: '16px',
                  background: '#F0FDF4', border: '1.5px solid #86EFAC'
                }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#16A34A', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    With Pleero
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <SolutionItem text="Customer emails asking for refund" />
                    <SolutionItem text="Pleero emails: 'Take $110 credit instantly'" />
                    <SolutionItem text="Customer accepts — $100 stays in your store" />
                    <SolutionItem text="Customer shops again with $110 credit" />
                  </div>
                </div>
              </div>
            </div>
          </section>
        </AnimatedSection>

        {/* ── How It Works ── */}
        <section id="how-it-works" style={{ padding: '100px 32px', background: '#F7F8FA' }}>
          <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
            <AnimatedSection>
              <div style={{ textAlign: 'center', marginBottom: '72px' }}>
                <h2 className="section-h2" style={{
                  fontSize: '42px', fontWeight: 700, color: '#0B0C0E',
                  marginBottom: '14px', letterSpacing: '-0.02em'
                }}>
                  Three steps. Zero manual work.
                </h2>
                <p style={{ fontSize: '17px', color: '#6B7280' }}>
                  Pleero runs in the background. You just watch the dashboard.
                </p>
              </div>
            </AnimatedSection>

            <StepRow
              number="01"
              title="Customer requests a refund"
              description="The moment a refund is created in your Shopify store, Pleero picks it up automatically. No monitoring, no notifications needed on your end."
              screenshotSrc="/screenshots/04-offer-email.png"
              screenshotAlt="Pleero offer email sent to customer"
              screenshotCaption="Branded offer email — sent in seconds"
              imageRight={false}
              isMobile={false}
            />

            <StepRow
              number="02"
              title="Customer gets a branded offer — your logo, your colors"
              description="The customer opens a clean, mobile-first offer page showing two options: take bonus store credit now, or wait 5–7 days for their cash back. About 1 in 5 choose the credit."
              screenshotSrc="/screenshots/01-customer-offer-mobile.png"
              screenshotAlt="Mobile offer page shown to customer"
              screenshotCaption="One-tap acceptance on mobile"
              imageRight={true}
              isMobile={true}
            />

            <StepRow
              number="03"
              title="Revenue retained. Dashboard updated."
              description="If the customer accepts, store credit is issued in their Shopify account within 60 seconds. Your dashboard shows offers sent, conversion rate, and total revenue retained this month."
              screenshotSrc="/screenshots/02-merchant-dashboard.png"
              screenshotAlt="Pleero merchant dashboard showing revenue retained"
              screenshotCaption="Track every dollar retained"
              imageRight={false}
              isMobile={false}
            />
          </div>
        </section>

        {/* ── ROI Calculator ── */}
        <AnimatedSection>
          <section style={{ padding: '100px 32px', background: '#fff' }}>
            <div style={{ maxWidth: '860px', margin: '0 auto' }}>
              <div style={{ textAlign: 'center', marginBottom: '48px' }}>
                <h2 className="section-h2" style={{
                  fontSize: '42px', fontWeight: 700, color: '#0B0C0E',
                  marginBottom: '14px', letterSpacing: '-0.02em'
                }}>
                  What could you keep?
                </h2>
                <p style={{ fontSize: '17px', color: '#6B7280' }}>
                  Enter your numbers. See your Pleero revenue in seconds.
                </p>
              </div>
              <div style={{
                background: '#fff', borderRadius: '20px', padding: '48px',
                border: '2px solid #0B0C0E', boxShadow: '0 20px 60px rgba(0,0,0,0.08)'
              }}>
                <ROICalculator />
              </div>
            </div>
          </section>
        </AnimatedSection>

        {/* ── Pricing ── */}
        <section id="pricing" style={{ padding: '100px 32px', background: '#F7F8FA' }}>
          <AnimatedSection>
            <div style={{ maxWidth: '1280px', margin: '0 auto', textAlign: 'center' }}>
              <h2 className="section-h2" style={{
                fontSize: '42px', fontWeight: 700, color: '#0B0C0E',
                marginBottom: '14px', letterSpacing: '-0.02em'
              }}>
                One plan. No surprises.
              </h2>
              <p style={{ fontSize: '17px', color: '#6B7280', marginBottom: '60px' }}>
                If you retain just two refunds a month, Pleero pays for itself.
              </p>

              <div className="hover-lift" style={{
                maxWidth: '480px', margin: '0 auto', background: '#fff',
                border: '2px solid #0B0C0E', borderRadius: '16px', padding: '48px',
                boxShadow: '0 20px 60px rgba(0,0,0,0.07)', position: 'relative'
              }}>
                <div style={{
                  position: 'absolute', top: '-15px', left: '50%', transform: 'translateX(-50%)',
                  background: '#0B0C0E', color: '#fff', padding: '5px 18px',
                  borderRadius: '20px', fontSize: '12px', fontWeight: 700, letterSpacing: '0.05em'
                }}>
                  EARLY ADOPTER RATE
                </div>

                <div style={{ marginBottom: '28px' }}>
                  <div style={{
                    display: 'flex', alignItems: 'baseline',
                    justifyContent: 'center', gap: '6px', marginBottom: '6px'
                  }}>
                    <span style={{
                      fontSize: '60px', fontWeight: 700,
                      fontFamily: 'var(--font-mono)', color: '#0B0C0E'
                    }}>$99</span>
                    <span style={{ fontSize: '18px', color: '#6B7280' }}>/month</span>
                  </div>
                  <p style={{ fontSize: '14px', color: '#6B7280' }}>
                    14-day free trial · No credit card · Cancel anytime
                  </p>
                </div>

                <div style={{ textAlign: 'left', marginBottom: '28px' }}>
                  <PricingFeature text="Unlimited store credit offers" />
                  <PricingFeature text="Automatic refund detection" />
                  <PricingFeature text="Custom bonus % and cap" />
                  <PricingFeature text="Fully branded customer emails" />
                  <PricingFeature text="Revenue retention dashboard" />
                  <PricingFeature text="Email support" />
                  <PricingFeature text="GDPR & CCPA compliant" />
                </div>

                <button onClick={handleInstall} className="btn-primary" style={{
                  width: '100%', padding: '16px', background: '#0B0C0E', color: '#fff',
                  border: 'none', borderRadius: '10px', fontSize: '16px',
                  fontWeight: 700, cursor: 'pointer'
                }}>
                  Start 14-day free trial
                </button>

                <p style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '12px', textAlign: 'center' }}>
                  No rev-share. No per-transaction fees. No hidden anything.
                </p>
              </div>
            </div>
          </AnimatedSection>
        </section>

        {/* ── FAQ ── */}
        <section id="faq" style={{ padding: '100px 32px', background: '#fff' }}>
          <AnimatedSection>
            <div style={{ maxWidth: '720px', margin: '0 auto' }}>
              <h2 className="section-h2" style={{
                fontSize: '42px', fontWeight: 700, color: '#0B0C0E',
                marginBottom: '48px', textAlign: 'center', letterSpacing: '-0.02em'
              }}>
                Common questions
              </h2>

              <div style={{ border: '1px solid rgba(0,0,0,0.08)', borderRadius: '16px', overflow: 'hidden' }}>
                {faqs.map((faq, i) => (
                  <div key={i} className="faq-item">
                    <button
                      onClick={() => setOpenFaq(openFaq === i ? null : i)}
                      aria-expanded={openFaq === i}
                      style={{
                        width: '100%', padding: '22px 28px',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left'
                      }}
                    >
                      <span style={{ fontSize: '16px', fontWeight: 600, color: '#0B0C0E', paddingRight: '16px' }}>
                        {faq.q}
                      </span>
                      <span style={{
                        fontSize: '20px', color: '#6B7280', flexShrink: 0,
                        transform: openFaq === i ? 'rotate(45deg)' : 'none',
                        transition: 'transform 0.2s ease'
                      }}>+</span>
                    </button>
                    {openFaq === i && (
                      <div style={{ padding: '0 28px 22px', color: '#4B5563', fontSize: '15px', lineHeight: 1.7 }}>
                        {faq.a}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </AnimatedSection>
        </section>

        {/* ── Footer CTA ── */}
        <section style={{ padding: '80px 32px', background: '#0B0C0E', textAlign: 'center' }}>
          <div style={{ maxWidth: '600px', margin: '0 auto' }}>
            <h2 style={{
              fontSize: '36px', fontWeight: 700, color: '#fff',
              marginBottom: '16px', letterSpacing: '-0.02em'
            }}>
              Ready to stop losing refund revenue?
            </h2>
            <p style={{ fontSize: '17px', color: '#9CA3AF', marginBottom: '36px' }}>
              14 days free. Live in 5 minutes. No code required.
            </p>
            <button onClick={handleInstall} className="btn-primary" style={{
              padding: '18px 48px', background: '#fff', color: '#0B0C0E',
              border: 'none', borderRadius: '12px', fontSize: '17px',
              fontWeight: 700, cursor: 'pointer'
            }}>
              Start free trial →
            </button>
          </div>
        </section>

        {/* ── Footer ── */}
        <footer style={{ background: '#0B0C0E', borderTop: '1px solid rgba(255,255,255,0.07)', padding: '40px 32px 28px' }}>
          <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '40px', marginBottom: '40px'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                  <img src="/app-icon.png" alt="Pleero" width={32} height={32} style={{ borderRadius: '6px' }} />
                  <span style={{ fontSize: '18px', fontWeight: 700, color: '#fff' }}>Pleero</span>
                </div>
                <p style={{ fontSize: '13px', color: '#6B7280', lineHeight: 1.6 }}>
                  Turn Shopify refunds into store credit. Keep revenue that would otherwise leave permanently.
                </p>
              </div>
              <div>
                <h3 style={{ fontSize: '13px', fontWeight: 600, color: '#F2F4F7', marginBottom: '14px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Product</h3>
                <FooterLink href="#how-it-works" text="How it works" />
                <FooterLink href="#pricing" text="Pricing" />
                <FooterLink href="#faq" text="FAQ" />
                <FooterLink href="mailto:hello@pleero.app" text="Contact" />
              </div>
              <div>
                <h3 style={{ fontSize: '13px', fontWeight: 600, color: '#F2F4F7', marginBottom: '14px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Legal</h3>
                <FooterLink href="/legal/privacy" text="Privacy Policy" />
                <FooterLink href="/legal/terms" text="Terms of Service" />
              </div>
              <div>
                <h3 style={{ fontSize: '13px', fontWeight: 600, color: '#F2F4F7', marginBottom: '14px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Support</h3>
                <FooterLink href="mailto:support@pleero.app" text="support@pleero.app" />
                <FooterLink href="https://apps.shopify.com/pleero" text="Shopify App Store" />
              </div>
            </div>
            <div style={{
              paddingTop: '24px', borderTop: '1px solid rgba(255,255,255,0.06)',
              textAlign: 'center', fontSize: '13px', color: '#4A5058'
            }}>
              © {new Date().getFullYear()} Pleero. All rights reserved. · US merchants only in Phase 1.
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function AnimatedSection({ children }: { children: React.ReactNode }) {
  const { ref, isInView } = useInView();
  return <div ref={ref} className={isInView ? 'in-view' : 'before-view'}>{children}</div>;
}

function ProofStat({ number, label }: { number: string; label: string }) {
  return (
    <div>
      <div style={{ fontSize: '30px', fontWeight: 700, color: '#fff', marginBottom: '4px', fontFamily: 'var(--font-mono)' }}>
        {number}
      </div>
      <div style={{ fontSize: '13px', color: '#6B7280', lineHeight: 1.4 }}>{label}</div>
    </div>
  );
}

function TrustBadge({ icon, text }: { icon: string; text: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
      <span style={{ fontSize: '15px' }}>{icon}</span>
      <span style={{ fontSize: '14px', color: '#6B7280', fontWeight: 500 }}>{text}</span>
    </div>
  );
}

function CheckItem({ text }: { text: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <span style={{ color: '#22c55e', fontSize: '14px', fontWeight: 700 }}>✓</span>
      <span style={{ fontSize: '14px', color: '#4B5563' }}>{text}</span>
    </div>
  );
}

function ProblemItem({ text }: { text: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
      <span style={{ color: '#DC2626', fontSize: '14px', marginTop: '1px', flexShrink: 0 }}>✗</span>
      <span style={{ fontSize: '14px', color: '#374151', lineHeight: 1.5 }}>{text}</span>
    </div>
  );
}

function SolutionItem({ text }: { text: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
      <span style={{ color: '#16A34A', fontSize: '14px', marginTop: '1px', flexShrink: 0 }}>✓</span>
      <span style={{ fontSize: '14px', color: '#374151', lineHeight: 1.5 }}>{text}</span>
    </div>
  );
}

function StepRow({ number, title, description, screenshotSrc, screenshotAlt, screenshotCaption, imageRight, isMobile }: {
  number: string;
  title: string;
  description: string;
  screenshotSrc: string;
  screenshotAlt: string;
  screenshotCaption: string;
  imageRight: boolean;
  isMobile?: boolean;
}) {
  const { ref, isInView } = useInView();

  const content = (
    <div>
      <div style={{
        fontFamily: 'var(--font-mono)', fontSize: '64px', fontWeight: 700,
        color: 'rgba(11,12,14,0.07)', marginBottom: '12px', lineHeight: 1
      }}>
        {number}
      </div>
      <h3 style={{
        fontSize: '28px', fontWeight: 700, color: '#0B0C0E',
        marginBottom: '14px', letterSpacing: '-0.015em', lineHeight: 1.25
      }}>
        {title}
      </h3>
      <p style={{ fontSize: '17px', color: '#4B5563', lineHeight: 1.7 }}>
        {description}
      </p>
    </div>
  );

  const phoneFrame = (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{
        background: '#1a1a1a', borderRadius: '36px', padding: '12px',
        boxShadow: '0 32px 80px rgba(0,0,0,0.25), inset 0 0 0 1px rgba(255,255,255,0.1)',
        display: 'inline-block', maxWidth: '300px', width: '100%',
      }}>
        <div style={{
          background: '#1a1a1a', borderRadius: '24px 24px 0 0',
          padding: '8px 0 4px', textAlign: 'center'
        }}>
          <div style={{ display: 'inline-block', width: '80px', height: '6px', background: '#333', borderRadius: '3px' }} />
        </div>
        <div style={{ borderRadius: '18px', overflow: 'hidden', background: '#fff' }}>
          <img src={screenshotSrc} alt={screenshotAlt}
            style={{ width: '100%', display: 'block', height: 'auto' }} />
        </div>
        <div style={{
          background: '#1a1a1a', borderRadius: '0 0 24px 24px',
          padding: '8px 0', display: 'flex', justifyContent: 'center'
        }}>
          <div style={{ width: '120px', height: '5px', background: '#444', borderRadius: '3px' }} />
        </div>
      </div>
      <p style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '14px', textAlign: 'center' }}>
        {screenshotCaption}
      </p>
    </div>
  );

  // Desktop screenshots: stack vertically — text on top, screenshot full-width below
  // This gives the image ~900px display width instead of ~560px, preserving clarity
  if (!isMobile) {
    return (
      <div
        ref={ref}
        className={isInView ? 'in-view' : 'before-view'}
        style={{ marginBottom: '96px' }}
      >
        {/* Step text */}
        <div style={{ maxWidth: '600px', marginBottom: '32px', marginLeft: imageRight ? 'auto' : '0' }}>
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: '56px', fontWeight: 700,
            color: 'rgba(11,12,14,0.07)', marginBottom: '10px', lineHeight: 1
          }}>
            {number}
          </div>
          <h3 style={{
            fontSize: '28px', fontWeight: 700, color: '#0B0C0E',
            marginBottom: '12px', letterSpacing: '-0.015em', lineHeight: 1.25
          }}>
            {title}
          </h3>
          <p style={{ fontSize: '17px', color: '#4B5563', lineHeight: 1.7 }}>
            {description}
          </p>
        </div>

        {/* Screenshot — full column width so source pixels map 1:1 */}
        <div>
          <div style={{
            borderRadius: '12px', overflow: 'hidden',
            boxShadow: '0 24px 64px rgba(0,0,0,0.16)',
            border: '1px solid rgba(0,0,0,0.08)', background: '#e8e8e8',
          }}>
            {/* Browser chrome */}
            <div style={{
              background: '#e0e0e0', padding: '9px 14px',
              display: 'flex', alignItems: 'center', gap: '6px',
              borderBottom: '1px solid rgba(0,0,0,0.09)',
            }}>
              <div style={{ width: '11px', height: '11px', borderRadius: '50%', background: '#ff5f56', flexShrink: 0 }} />
              <div style={{ width: '11px', height: '11px', borderRadius: '50%', background: '#ffbd2e', flexShrink: 0 }} />
              <div style={{ width: '11px', height: '11px', borderRadius: '50%', background: '#27c93f', flexShrink: 0 }} />
              <div style={{
                flex: 1, marginLeft: '10px', background: '#fff', borderRadius: '5px',
                padding: '4px 12px', fontSize: '12px', color: '#999'
              }}>
                pleero.app/dashboard
              </div>
            </div>
            <img
              src={screenshotSrc}
              alt={screenshotAlt}
              style={{
                width: '100%', display: 'block', height: 'auto',
                imageRendering: '-webkit-optimize-contrast',
              }}
            />
          </div>
          <p style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '10px', textAlign: 'center' }}>
            {screenshotCaption}
          </p>
        </div>
      </div>
    );
  }

  // Mobile screenshots: side-by-side in phone frame
  return (
    <div
      ref={ref}
      className={`step-grid ${isInView ? 'in-view' : 'before-view'}`}
      style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr',
        gap: '64px', alignItems: 'center', marginBottom: '80px'
      }}
    >
      {imageRight ? <>{content}{phoneFrame}</> : <>{phoneFrame}{content}</>}
    </div>
  );
}

function PricingFeature({ text }: { text: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
      <span style={{ color: '#22c55e', fontSize: '14px', fontWeight: 700, flexShrink: 0 }}>✓</span>
      <span style={{ fontSize: '14px', color: '#4B5563' }}>{text}</span>
    </div>
  );
}

function FooterLink({ href, text }: { href: string; text: string }) {
  return (
    <div style={{ marginBottom: '8px' }}>
      <a href={href} style={{ fontSize: '13px', color: '#6B7280', textDecoration: 'none' }}>
        {text}
      </a>
    </div>
  );
}
