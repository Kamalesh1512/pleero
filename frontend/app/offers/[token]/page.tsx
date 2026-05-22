'use client';

/**
 * Public offer page - customer-facing.
 * NOT embedded in Shopify (standalone page).
 * Follows light design system (max-width 420px, #F7F8FA background).
 */

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import { getOffer, acceptOffer, declineOffer, formatCurrency, type Offer } from '@/lib/api';

export default function OfferPage() {
  const params = useParams();
  const token = params.token as string;
  const [offer, setOffer] = useState<Offer | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    async function loadOffer() {
      try {
        const data = await getOffer(token);
        setOffer(data);
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load offer');
        setLoading(false);
      }
    }

    loadOffer();
  }, [token]);

  const handleAccept = async () => {
    setProcessing(true);
    setError(null);

    try {
      const result = await acceptOffer(token);
      setSuccess(result.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to accept offer');
    } finally {
      setProcessing(false);
    }
  };

  const handleDecline = async () => {
    if (!confirm('Are you sure you want a cash refund instead? This will take 5-7 business days.')) {
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      const result = await declineOffer(token);
      setSuccess(result.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to decline offer');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-4"
        style={{ background: 'var(--offer-page-bg)' }}
      >
        <div className="text-center">
          <p style={{
            fontFamily: 'var(--font-display)',
            fontSize: '14px',
            color: 'var(--offer-text-secondary)'
          }}>
            Loading your offer...
          </p>
        </div>
      </div>
    );
  }

  if (error && !offer) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-4"
        style={{ background: 'var(--offer-page-bg)' }}
      >
        <div
          className="w-full p-8 text-center"
          style={{
            maxWidth: '420px',
            background: 'var(--offer-card-bg)',
            border: '1px solid var(--offer-border)',
            borderRadius: 'var(--radius-md)'
          }}
        >
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: '22px',
            fontWeight: 500,
            color: 'var(--offer-text-primary)',
            marginBottom: 'var(--space-4)'
          }}>
            Offer not found
          </h1>
          <p style={{
            fontFamily: 'var(--font-display)',
            fontSize: '14px',
            color: 'var(--offer-text-secondary)'
          }}>
            {error}
          </p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-4"
        style={{ background: 'var(--offer-page-bg)' }}
      >
        <div
          className="w-full p-8 text-center"
          style={{
            maxWidth: '420px',
            background: 'var(--offer-card-bg)',
            border: '1px solid var(--offer-border)',
            borderRadius: 'var(--radius-md)'
          }}
        >
          <div style={{ marginBottom: 'var(--space-4)' }}>
            <svg
              className="mx-auto"
              width="64"
              height="64"
              fill="none"
              stroke="var(--pleero-green)"
              viewBox="0 0 24 24"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: '22px',
            fontWeight: 500,
            color: 'var(--offer-text-primary)',
            marginBottom: 'var(--space-3)'
          }}>
            All set!
          </h1>
          <p style={{
            fontFamily: 'var(--font-display)',
            fontSize: '14px',
            color: 'var(--offer-text-secondary)'
          }}>
            {success}
          </p>
        </div>
      </div>
    );
  }

  if (!offer) {
    return null;
  }

  const creditAmount = formatCurrency(offer.credit_amount_cents);
  const bonusAmount = formatCurrency(offer.bonus_applied_cents);
  const merchantName = offer.merchant_logo_url ? 'your favorite store' : 'the merchant';

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'var(--offer-page-bg)' }}
    >
      <div className="w-full" style={{ maxWidth: '420px' }}>
        {/* Merchant Logo */}
        {offer.merchant_logo_url && (
          <div className="text-center relative" style={{
            marginBottom: 'var(--space-8)',
            height: '80px'
          }}>
            <Image
              src={offer.merchant_logo_url}
              alt="Store logo"
              width={200}
              height={80}
              className="mx-auto"
              style={{ objectFit: 'contain', maxHeight: '80px' }}
              priority
            />
          </div>
        )}

        {/* Main Card */}
        <div
          className="w-full"
          style={{
            background: 'var(--offer-card-bg)',
            border: '1px solid var(--offer-border)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-6)'
          }}
        >
          {/* Greeting */}
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: '22px',
            fontWeight: 500,
            color: 'var(--offer-text-primary)',
            marginBottom: 'var(--space-3)'
          }}>
            Hi {offer.customer_first_name}, your return is approved.
          </h1>

          {/* Credit Amount - Prominent */}
          <div style={{ marginBottom: 'var(--space-4)' }}>
            <p style={{
              fontFamily: 'var(--font-display)',
              fontSize: '14px',
              color: 'var(--offer-text-secondary)',
              marginBottom: 'var(--space-2)'
            }}>
              Instead of waiting 5-7 days for a refund, get
            </p>
            <p style={{
              fontFamily: 'var(--font-display)',
              fontSize: '28px',
              fontWeight: 600,
              color: 'var(--offer-text-primary)',
              marginBottom: 'var(--space-2)'
            }}>
              {creditAmount}
            </p>
            <p style={{
              fontFamily: 'var(--font-display)',
              fontSize: '14px',
              color: 'var(--offer-text-secondary)'
            }}>
              in store credit to use right now
            </p>
          </div>

          {/* Primary CTA */}
          <button
            onClick={handleAccept}
            disabled={processing}
            className="w-full"
            style={{
              background: processing ? 'var(--pleero-muted)' : 'var(--pleero-green)',
              color: '#FFFFFF',
              fontFamily: 'var(--font-display)',
              fontSize: '16px',
              fontWeight: 600,
              height: '52px',
              borderRadius: 'var(--radius-md)',
              border: 'none',
              cursor: processing ? 'not-allowed' : 'pointer',
              transition: 'background 0.15s ease',
              marginBottom: 'var(--space-4)'
            }}
            onMouseEnter={(e) => {
              if (!processing) {
                e.currentTarget.style.background = 'var(--pleero-green-hover)';
              }
            }}
            onMouseLeave={(e) => {
              if (!processing) {
                e.currentTarget.style.background = 'var(--pleero-green)';
              }
            }}
          >
            {processing ? 'Processing...' : `Take the ${creditAmount} credit`}
          </button>

          {/* Benefits List */}
          <div style={{
            background: 'var(--offer-page-bg)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-4)',
            marginBottom: 'var(--space-5)'
          }}>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              <li style={{
                fontFamily: 'var(--font-display)',
                fontSize: '13px',
                color: 'var(--offer-text-secondary)',
                marginBottom: 'var(--space-2)',
                display: 'flex',
                alignItems: 'flex-start'
              }}>
                <span style={{ marginRight: 'var(--space-2)', color: 'var(--pleero-green)' }}>✓</span>
                <span>Instant – use it right now</span>
              </li>
              <li style={{
                fontFamily: 'var(--font-display)',
                fontSize: '13px',
                color: 'var(--offer-text-secondary)',
                marginBottom: 'var(--space-2)',
                display: 'flex',
                alignItems: 'flex-start'
              }}>
                <span style={{ marginRight: 'var(--space-2)', color: 'var(--pleero-green)' }}>✓</span>
                <span>No expiry – keep it forever</span>
              </li>
              <li style={{
                fontFamily: 'var(--font-display)',
                fontSize: '13px',
                color: 'var(--offer-text-secondary)',
                display: 'flex',
                alignItems: 'flex-start'
              }}>
                <span style={{ marginRight: 'var(--space-2)', color: 'var(--pleero-green)' }}>✓</span>
                <span>Bonus {bonusAmount} included</span>
              </li>
            </ul>
          </div>

          {/* Error Message */}
          {error && (
            <div style={{
              background: 'rgba(229, 115, 115, 0.1)',
              border: '1px solid rgba(229, 115, 115, 0.3)',
              borderRadius: 'var(--radius-md)',
              padding: 'var(--space-4)',
              marginBottom: 'var(--space-4)'
            }}>
              <p style={{
                fontFamily: 'var(--font-display)',
                fontSize: '13px',
                color: 'var(--pleero-danger)',
                margin: 0
              }}>
                {error}
              </p>
            </div>
          )}

          {/* Secondary Action - Cash Refund Link */}
          <div className="text-center">
            <button
              onClick={handleDecline}
              disabled={processing}
              style={{
                background: 'transparent',
                border: 'none',
                fontFamily: 'var(--font-display)',
                fontSize: '13px',
                color: processing ? 'var(--offer-text-hint)' : 'var(--offer-text-hint)',
                cursor: processing ? 'not-allowed' : 'pointer',
                textDecoration: 'none',
                padding: 0,
                transition: 'color 0.15s ease'
              }}
              onMouseEnter={(e) => {
                if (!processing) {
                  e.currentTarget.style.color = 'var(--offer-text-secondary)';
                }
              }}
              onMouseLeave={(e) => {
                if (!processing) {
                  e.currentTarget.style.color = 'var(--offer-text-hint)';
                }
              }}
            >
              Proceed with cash refund
            </button>
          </div>
        </div>

        {/* Trust Line */}
        <div className="text-center" style={{ marginTop: 'var(--space-6)' }}>
          <p style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            color: 'var(--offer-text-hint)'
          }}>
            Secured by {merchantName}
          </p>
        </div>
      </div>
    </div>
  );
}
