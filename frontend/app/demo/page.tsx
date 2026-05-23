'use client';

/**
 * Demo page — publicly accessible at /demo.
 * Listed as the "Demo Store URL" in the Shopify App Store listing.
 *
 * Shows merchants exactly what their customers experience when they receive
 * a refund offer from Pleero. Uses realistic mock data; no API calls.
 *
 * Accept / Decline interactions play through the real customer journey
 * so merchants understand the full flow before installing.
 */

import { useState, useEffect } from 'react';

// ── Confetti ───────────────────────────────────────────────────────────────────

const CONFETTI_COLORS = [
  '#FF6B6B', '#FF8C42', '#F9CA24', '#6BCB77', '#4D96FF',
  '#C77DFF', '#FF6FC8', '#ffffff', '#2D7A4F', '#6FCF97',
];

async function fireConfetti() {
  const confetti = (await import('canvas-confetti')).default;
  const opts = { colors: CONFETTI_COLORS, gravity: 2.8, ticks: 140, startVelocity: 42, scalar: 1.1 };
  // Centre burst
  confetti({ ...opts, particleCount: 120, spread: 75, origin: { y: 0.52 } });
  // Side bursts
  setTimeout(() => {
    confetti({ ...opts, particleCount: 60, angle: 58, spread: 60, origin: { x: 0, y: 0.58 } });
    confetti({ ...opts, particleCount: 60, angle: 122, spread: 60, origin: { x: 1, y: 0.58 } });
  }, 160);
}

// ── Mock offer data ────────────────────────────────────────────────────────────
const DEMO = {
  customerName: 'Sarah',
  refundAmountCents: 8900,   // $89.00 — realistic mid-market refund
  creditAmountCents: 9790,   // $97.90 — original + 10% bonus
  bonusAmountCents:  890,    //  $8.90 bonus
  brandColor: '#2D7A4F',
};

function fmt(cents: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function DemoBanner() {
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        background: '#0B0C0E',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        padding: '10px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        fontFamily: 'var(--font-display)',
      }}
    >
      <span style={{ fontSize: 13, color: '#6FCF97', fontWeight: 600 }}>
        ✦ Demo Mode
      </span>
      <span style={{ fontSize: 13, color: '#8A9099' }}>
        This is what your customers see when they receive a refund offer from your Shopify store.
      </span>
      <a
        href="https://apps.shopify.com/pleero"
        target="_blank"
        rel="noopener noreferrer"
        style={{
          marginLeft: 8,
          padding: '5px 14px',
          background: '#2D7A4F',
          color: '#fff',
          borderRadius: 6,
          fontSize: 12,
          fontWeight: 600,
          textDecoration: 'none',
          whiteSpace: 'nowrap',
        }}
      >
        Install Free →
      </a>
    </div>
  );
}

function CheckBadge({ text }: { text: string }) {
  return (
    <li
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 8,
        fontFamily: 'var(--font-display)',
        fontSize: 13,
        color: 'var(--offer-text-secondary)',
        marginBottom: 8,
      }}
    >
      <span style={{ color: 'var(--pleero-green)', marginTop: 1, flexShrink: 0 }}>✓</span>
      <span>{text}</span>
    </li>
  );
}

// ── Offer display (the customer-facing card) ───────────────────────────────────

function OfferCard({
  onAccept,
  onDecline,
  processing,
  error,
}: {
  onAccept: () => void;
  onDecline: () => void;
  processing: boolean;
  error: string | null;
}) {
  const credit = fmt(DEMO.creditAmountCents);
  const bonus  = fmt(DEMO.bonusAmountCents);

  return (
    <div className="w-full" style={{ maxWidth: 420 }}>
      {/* Merchant logo */}
      <div
        className="text-center"
        style={{ marginBottom: 'var(--space-8)', height: 60 }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/merchant-logo.jpg"
          alt="Kael&Co"
          style={{
            height: 52,
            maxWidth: 180,
            objectFit: 'contain',
            display: 'inline-block',
            borderRadius: 8,
          }}
        />
      </div>

      {/* Main card */}
      <div
        style={{
          background: 'var(--offer-card-bg)',
          border: '1px solid var(--offer-border)',
          borderRadius: 'var(--radius-md)',
          padding: 'var(--space-6)',
          boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
        }}
      >
        {/* Greeting */}
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 22,
            fontWeight: 500,
            color: 'var(--offer-text-primary)',
            marginBottom: 'var(--space-3)',
          }}
        >
          Hi {DEMO.customerName}, your return is approved.
        </h1>

        {/* Offer amount */}
        <div style={{ marginBottom: 'var(--space-4)' }}>
          <p
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 14,
              color: 'var(--offer-text-secondary)',
              marginBottom: 'var(--space-2)',
            }}
          >
            Instead of waiting 5–7 days for a refund, get
          </p>
          <p
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 36,
              fontWeight: 700,
              color: 'var(--offer-text-primary)',
              marginBottom: 4,
              letterSpacing: '-0.5px',
            }}
          >
            {credit}
          </p>
          <p
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 14,
              color: 'var(--offer-text-secondary)',
            }}
          >
            in store credit — available instantly
          </p>
        </div>

        {/* Primary CTA */}
        <button
          onClick={onAccept}
          disabled={processing}
          className="w-full"
          style={{
            background: processing ? 'var(--pleero-muted)' : DEMO.brandColor,
            color: '#fff',
            fontFamily: 'var(--font-display)',
            fontSize: 16,
            fontWeight: 600,
            height: 52,
            borderRadius: 'var(--radius-md)',
            border: 'none',
            cursor: processing ? 'not-allowed' : 'pointer',
            transition: 'background 0.15s ease',
            marginBottom: 'var(--space-4)',
          }}
        >
          {processing ? 'Processing...' : `Take the ${credit} credit`}
        </button>

        {/* Benefits list */}
        <div
          style={{
            background: 'var(--offer-page-bg)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-4)',
            marginBottom: 'var(--space-5)',
          }}
        >
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            <CheckBadge text="Instant – use it right now" />
            <CheckBadge text="No expiry – keep it forever" />
            <CheckBadge text={`${bonus} bonus included`} />
          </ul>
        </div>

        {/* Error */}
        {error && (
          <div
            style={{
              background: 'rgba(229,115,115,0.1)',
              border: '1px solid rgba(229,115,115,0.3)',
              borderRadius: 'var(--radius-md)',
              padding: 'var(--space-4)',
              marginBottom: 'var(--space-4)',
            }}
          >
            <p
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 13,
                color: 'var(--pleero-danger)',
                margin: 0,
              }}
            >
              {error}
            </p>
          </div>
        )}

        {/* Secondary action */}
        <div className="text-center">
          <button
            onClick={onDecline}
            disabled={processing}
            style={{
              background: 'transparent',
              border: 'none',
              fontFamily: 'var(--font-display)',
              fontSize: 13,
              color: 'var(--offer-text-hint)',
              cursor: processing ? 'not-allowed' : 'pointer',
              padding: 0,
              transition: 'color 0.15s ease',
            }}
            onMouseEnter={(e) => {
              if (!processing) e.currentTarget.style.color = 'var(--offer-text-secondary)';
            }}
            onMouseLeave={(e) => {
              if (!processing) e.currentTarget.style.color = 'var(--offer-text-hint)';
            }}
          >
            I still want a cash refund
          </button>
        </div>
      </div>

      {/* Trust line */}
      <div className="text-center" style={{ marginTop: 'var(--space-6)' }}>
        <p
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            color: 'var(--offer-text-hint)',
          }}
        >
          Powered by Pleero · Secured by Kael&amp;Co
        </p>
      </div>
    </div>
  );
}

// ── Result screens ─────────────────────────────────────────────────────────────

function AcceptedScreen() {
  const credit = fmt(DEMO.creditAmountCents);

  useEffect(() => {
    fireConfetti();
  }, []);

  return (
    <div className="w-full text-center" style={{ maxWidth: 420 }}>
      <div
        style={{
          background: '#fff',
          borderRadius: 'var(--radius-md)',
          padding: 40,
          border: '1px solid var(--offer-border)',
          boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
        }}
      >
        {/* Icon */}
        <div style={{ marginBottom: 20 }}>
          <svg
            width="64"
            height="64"
            fill="none"
            stroke="var(--pleero-green)"
            viewBox="0 0 24 24"
            strokeWidth={1.8}
            style={{ display: 'block', margin: '0 auto' }}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>

        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 22,
            fontWeight: 600,
            color: 'var(--offer-text-primary)',
            marginBottom: 12,
          }}
        >
          Store credit applied!
        </h1>
        <p
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 14,
            color: 'var(--offer-text-secondary)',
            lineHeight: 1.6,
            marginBottom: 28,
          }}
        >
          {credit} has been added to your Kael&amp;Co account.
          It&apos;s ready to use right now — no expiry, ever.
        </p>

        {/* What happens next (merchant perspective note) */}
        <div
          style={{
            background: 'rgba(45,122,79,0.07)',
            border: '1px solid rgba(45,122,79,0.2)',
            borderRadius: 10,
            padding: 16,
            textAlign: 'left',
          }}
        >
          <p
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 12,
              color: '#2D7A4F',
              fontWeight: 600,
              marginBottom: 6,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            Demo note for merchants
          </p>
          <p
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 12,
              color: '#374151',
              lineHeight: 1.6,
              margin: 0,
            }}
          >
            In your live store, Pleero issues store credit via the Shopify API within
            60 seconds of acceptance. Your dashboard instantly updates with the retained
            revenue.
          </p>
        </div>
      </div>

      <div style={{ marginTop: 24 }}>
        <button
          onClick={() => window.location.reload()}
          style={{
            background: 'transparent',
            border: '1px solid rgba(0,0,0,0.12)',
            borderRadius: 8,
            padding: '10px 24px',
            fontFamily: 'var(--font-display)',
            fontSize: 13,
            color: '#6B7280',
            cursor: 'pointer',
          }}
        >
          Replay demo
        </button>
      </div>
    </div>
  );
}

function DeclinedScreen() {
  const refund = fmt(DEMO.refundAmountCents);
  return (
    <div className="w-full text-center" style={{ maxWidth: 420 }}>
      <div
        style={{
          background: '#fff',
          borderRadius: 'var(--radius-md)',
          padding: 40,
          border: '1px solid var(--offer-border)',
          boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
        }}
      >
        <div style={{ marginBottom: 20 }}>
          <svg
            width="56"
            height="56"
            fill="none"
            stroke="#9CA3AF"
            viewBox="0 0 24 24"
            strokeWidth={1.8}
            style={{ display: 'block', margin: '0 auto' }}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>

        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 22,
            fontWeight: 500,
            color: 'var(--offer-text-primary)',
            marginBottom: 12,
          }}
        >
          Refund request received.
        </h1>
        <p
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 14,
            color: 'var(--offer-text-secondary)',
            lineHeight: 1.6,
            marginBottom: 28,
          }}
        >
          Your {refund} cash refund is being processed and will arrive in
          5–7 business days.
        </p>

        <div
          style={{
            background: '#F7F8FA',
            border: '1px solid rgba(0,0,0,0.07)',
            borderRadius: 10,
            padding: 16,
            textAlign: 'left',
          }}
        >
          <p
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 12,
              color: '#6B7280',
              fontWeight: 600,
              marginBottom: 6,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            Demo note for merchants
          </p>
          <p
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 12,
              color: '#374151',
              lineHeight: 1.6,
              margin: 0,
            }}
          >
            When a customer declines, Pleero does nothing — the refund processes
            exactly as it would without the app. No friction, no extra steps.
            Only accepted offers appear in your dashboard.
          </p>
        </div>
      </div>

      <div style={{ marginTop: 24 }}>
        <button
          onClick={() => window.location.reload()}
          style={{
            background: 'transparent',
            border: '1px solid rgba(0,0,0,0.12)',
            borderRadius: 8,
            padding: '10px 24px',
            fontFamily: 'var(--font-display)',
            fontSize: 13,
            color: '#6B7280',
            cursor: 'pointer',
          }}
        >
          Replay demo
        </button>
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function DemoPage() {
  const [status, setStatus] = useState<'offer' | 'accepted' | 'declined'>('offer');
  const [processing, setProcessing] = useState(false);
  const [error] = useState<string | null>(null);

  const handleAccept = () => {
    setProcessing(true);
    // Simulate the 60-second credit issuance latency compressed to 1.2s for demo
    setTimeout(() => {
      setProcessing(false);
      setStatus('accepted');
    }, 1200);
  };

  const handleDecline = () => {
    setProcessing(true);
    setTimeout(() => {
      setProcessing(false);
      setStatus('declined');
    }, 800);
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'var(--offer-page-bg)', paddingTop: 80 }}
    >
      {/* Fixed top banner */}
      <DemoBanner />

      {/* Content */}
      {status === 'accepted' && <AcceptedScreen />}
      {status === 'declined' && <DeclinedScreen />}
      {status === 'offer' && (
        <OfferCard
          onAccept={handleAccept}
          onDecline={handleDecline}
          processing={processing}
          error={error}
        />
      )}
    </div>
  );
}
