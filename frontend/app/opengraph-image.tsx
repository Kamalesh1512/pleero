import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Pleero – Turn Shopify Refunds Into Store Credit';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// Stat pill rendered inline in the stats footer
function Stat({ number, label }: { number: string; label: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ fontSize: 28, fontWeight: 700, color: '#F2F4F7', letterSpacing: '-0.5px' }}>
        {number}
      </span>
      <span style={{ fontSize: 13, color: '#4A5058' }}>{label}</span>
    </div>
  );
}

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: '#0B0C0E',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          padding: '60px 80px',
          fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
          position: 'relative',
        }}
      >
        {/* Subtle green glow in top-right corner */}
        <div
          style={{
            position: 'absolute',
            top: -120,
            right: -120,
            width: 480,
            height: 480,
            borderRadius: '50%',
            background:
              'radial-gradient(circle, rgba(45,122,79,0.18) 0%, transparent 70%)',
            display: 'flex',
          }}
        />

        {/* ── Header row: logo + live badge ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 52 }}>
          {/* Pleero logomark */}
          <div
            style={{
              width: 50,
              height: 50,
              borderRadius: 11,
              background: '#2D7A4F',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontSize: 26,
              fontWeight: 800,
            }}
          >
            P
          </div>
          <span
            style={{
              fontSize: 30,
              fontWeight: 700,
              color: '#F2F4F7',
              letterSpacing: '-0.5px',
            }}
          >
            Pleero
          </span>

          {/* Live badge */}
          <div
            style={{
              marginLeft: 'auto',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: 'rgba(45,122,79,0.15)',
              border: '1px solid rgba(45,122,79,0.35)',
              color: '#6FCF97',
              borderRadius: 40,
              padding: '7px 18px',
              fontSize: 14,
              fontWeight: 500,
            }}
          >
            <div
              style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: '#6FCF97',
                display: 'flex',
              }}
            />
            Live on Shopify App Store
          </div>
        </div>

        {/* ── Hero headline ── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 28 }}>
            <span
              style={{
                fontSize: 72,
                fontWeight: 800,
                color: '#6FCF97',
                lineHeight: 1.06,
                letterSpacing: '-3px',
              }}
            >
              Refunds happen.
            </span>
            <span
              style={{
                fontSize: 72,
                fontWeight: 800,
                color: '#F2F4F7',
                lineHeight: 1.06,
                letterSpacing: '-3px',
              }}
            >
              Losing revenue
            </span>
            <span
              style={{
                fontSize: 72,
                fontWeight: 800,
                color: '#F2F4F7',
                lineHeight: 1.06,
                letterSpacing: '-3px',
              }}
            >
              {/* eslint-disable-next-line react/no-unescaped-entities */}
              doesn't have to.
            </span>
          </div>

          <p
            style={{
              fontSize: 22,
              color: '#8A9099',
              lineHeight: 1.55,
              maxWidth: 680,
              margin: 0,
            }}
          >
            Automatically convert Shopify refund requests into bonus store credit
            offers. Keep 15–25% of refund revenue in your store.
          </p>
        </div>

        {/* ── Stats footer ── */}
        <div
          style={{
            display: 'flex',
            gap: 52,
            paddingTop: 36,
            borderTop: '1px solid rgba(255,255,255,0.07)',
          }}
        >
          <Stat number="15–25%" label="of refunds retained" />
          <Stat number="60 sec" label="credit issuance" />
          <Stat number="$99/mo" label="flat — no rev-share" />
          <Stat number="5 min" label="to install & go live" />
        </div>
      </div>
    ),
    { ...size }
  );
}
