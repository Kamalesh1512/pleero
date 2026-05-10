'use client';

/**
 * Public offer page - customer-facing.
 * NOT embedded in Shopify (standalone page).
 * Mobile-first design with Tailwind (NOT Polaris).
 */

import { use, useEffect, useState } from 'react';
import { getOffer, acceptOffer, declineOffer, formatCurrency, type Offer } from '@/lib/api';

interface OfferPageProps {
  params: Promise<{ token: string }>;
}

export default function OfferPage({ params }: OfferPageProps) {
  const { token } = use(params);
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-gray-600">Loading your offer...</p>
        </div>
      </div>
    );
  }

  if (error && !offer) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-sm p-8 text-center">
          <h1 className="text-2xl font-semibold text-gray-900 mb-4">Offer Not Found</h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-sm p-8 text-center">
          <div className="mb-4">
            <svg
              className="mx-auto h-16 w-16 text-green-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-gray-900 mb-4">All Set!</h1>
          <p className="text-gray-600">{success}</p>
        </div>
      </div>
    );
  }

  if (!offer) {
    return null;
  }

  const creditAmount = formatCurrency(offer.credit_amount_cents);
  const refundAmount = formatCurrency(offer.refund_amount_cents);
  const bonusAmount = formatCurrency(offer.bonus_applied_cents);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Logo */}
        {offer.merchant_logo_url && (
          <div className="text-center mb-8">
            <img
              src={offer.merchant_logo_url}
              alt="Store logo"
              className="mx-auto max-w-[200px] h-auto"
            />
          </div>
        )}

        {/* Main Card */}
        <div className="bg-white rounded-lg shadow-sm p-8">
          <h1 className="text-2xl font-semibold text-gray-900 mb-4">
            Hi {offer.customer_first_name}, your return is approved.
          </h1>

          <p className="text-gray-600 mb-8">
            We've got you covered. Instead of waiting 5-7 days for a refund, keep{' '}
            <strong className="text-gray-900">{creditAmount}</strong> as store credit and shop
            again instantly.
          </p>

          {/* Primary CTA */}
          <button
            onClick={handleAccept}
            disabled={processing}
            className="w-full mb-4 py-4 px-6 rounded-lg font-semibold text-white text-lg min-h-[56px] transition-opacity disabled:opacity-50"
            style={{ backgroundColor: offer.merchant_brand_color }}
          >
            {processing ? 'Processing...' : `Take the ${creditAmount} credit`}
          </button>

          {/* Benefits */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-start">
                <span className="mr-2">✓</span>
                <span>Instant – use it right now</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">✓</span>
                <span>No expiry – keep it forever</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">✓</span>
                <span>Bonus {bonusAmount} included</span>
              </li>
            </ul>
          </div>

          {/* Error message */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          {/* Secondary link */}
          <div className="text-center">
            <button
              onClick={handleDecline}
              disabled={processing}
              className="text-gray-600 underline text-sm hover:text-gray-900 disabled:opacity-50"
            >
              I still want a cash refund ({refundAmount}, 5-7 days)
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-xs text-gray-500">Secured by your favorite store</p>
        </div>
      </div>
    </div>
  );
}
