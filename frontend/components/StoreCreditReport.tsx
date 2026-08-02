"use client";

import { FormEvent, useEffect, useState } from "react";

const EXPIRE_SHARE = 0.4;

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

function track(eventName: string) {
  if (typeof window === "undefined") return;
  window.gtag?.("event", eventName);
}

function MetricCard({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="rounded-xl border border-black/10 bg-[#F7F8FA] p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#7A8492]">{label}</p>
      <p className="mt-2 text-2xl font-bold tracking-tight text-[#0B0C0E]">{value}</p>
      <p className="mt-1 text-xs text-[#687281]">{note}</p>
    </div>
  );
}

interface StoreCreditReportProps {
  open: boolean;
  onClose: () => void;
  onContinueToWaitlist: (email: string) => void;
}

export default function StoreCreditReport({
  open,
  onClose,
  onContinueToWaitlist,
}: StoreCreditReportProps) {
  const [monthlyIssued, setMonthlyIssued] = useState(5000);
  const [redemptionRate, setRedemptionRate] = useState(38);
  const [email, setEmail] = useState("");
  const [step, setStep] = useState<"estimate" | "email" | "success">("estimate");
  const [status, setStatus] = useState<"idle" | "submitting" | "error">("idle");
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setStep("estimate");
      setStatus("idle");
      setError("");
      setEmail("");
    }
  }, [open]);

  const comesBack = monthlyIssued * (redemptionRate / 100);
  const sittingUnused = monthlyIssued * (1 - redemptionRate / 100);
  const aboutToExpire = sittingUnused * EXPIRE_SHARE;

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    if (open) window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  async function submitEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!/\S+@\S+\.\S+/.test(email)) {
      setError("Enter a valid email.");
      return;
    }
    setStatus("submitting");
    setError("");
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const response = await fetch(`${apiUrl}/api/report-requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          monthlyCreditIssued: monthlyIssued,
          redemptionRate,
          source: "landing_report_modal",
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(body.detail || "Unable to request your report.");
      }
      track("report_email_captured");
      setStep("success");
    } catch (err) {
      track("report_email_error");
      setStatus("error");
      setError(err instanceof Error ? err.message : "Unable to request your report.");
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-[#0B0C0E]/60 p-4 sm:p-6"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Your free Store Credit report"
        className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-[0_24px_70px_rgba(11,12,14,0.25)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-black/10 px-5 py-4 sm:px-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#7A8492]">
              Free Store Credit report
            </p>
            <h3 className="mt-1 text-lg font-bold text-[#0B0C0E]">Your Store Credit, in numbers</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-2 text-[#687281] transition hover:bg-[#F7F8FA] hover:text-[#0B0C0E]"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M18 6 6 18M6 6l12 12"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        <div className="p-5 sm:p-6">
          {step === "estimate" && (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="monthlyIssued"
                    className="mb-2 block text-sm font-bold text-[#0B0C0E]"
                  >
                    Monthly Store Credit issued ($)
                  </label>
                  <input
                    id="monthlyIssued"
                    type="number"
                    min="0"
                    step="100"
                    value={monthlyIssued}
                    onChange={(e) => setMonthlyIssued(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full rounded-lg border border-black/15 px-4 py-3 text-[#0B0C0E] outline-none transition focus:border-[#2D7A4F] focus:ring-4 focus:ring-[#2D7A4F]/15"
                  />
                </div>
                <div>
                  <label
                    htmlFor="redemptionRate"
                    className="mb-2 block text-sm font-bold text-[#0B0C0E]"
                  >
                    Estimated redemption rate (%)
                  </label>
                  <input
                    id="redemptionRate"
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    value={redemptionRate}
                    onChange={(e) =>
                      setRedemptionRate(Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))
                    }
                    className="w-full rounded-lg border border-black/15 px-4 py-3 text-[#0B0C0E] outline-none transition focus:border-[#2D7A4F] focus:ring-4 focus:ring-[#2D7A4F]/15"
                  />
                </div>
              </div>
              <div className="grid gap-3">
                <MetricCard
                  label="Comes back as revenue"
                  value={usd.format(comesBack)}
                  note="Per month, at your redemption rate"
                />
                <div className="grid gap-3 sm:grid-cols-2">
                  <MetricCard
                    label="Sitting unused"
                    value={usd.format(sittingUnused)}
                    note="Per month"
                  />
                  <MetricCard
                    label="About to expire"
                    value={usd.format(aboutToExpire)}
                    note="Illustrative within ~90 days"
                  />
                </div>
              </div>
              <p className="text-xs leading-5 text-[#687281]">
                Estimate from your inputs and typical industry rates — not your real data yet. When
                Pleero reads your store, you&apos;ll get exact numbers.
              </p>
              <button
                type="button"
                onClick={() => {
                  track("report_estimate_viewed");
                  setStep("email");
                }}
                className="w-full rounded-lg bg-[#0B0C0E] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#1D2023]"
              >
                Email me my free report
              </button>
            </div>
          )}

          {step === "email" && (
            <form onSubmit={submitEmail} className="space-y-4">
              <p className="leading-7 text-[#4E5968]">
                Your estimate is ready. Enter your email and we&apos;ll let you know the moment you
                can pull your real numbers from Shopify.
              </p>
              <div>
                <label
                  htmlFor="reportEmail"
                  className="mb-2 block text-sm font-bold text-[#0B0C0E]"
                >
                  Work email
                </label>
                <input
                  id="reportEmail"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-black/15 px-4 py-3 text-[#0B0C0E] outline-none transition focus:border-[#2D7A4F] focus:ring-4 focus:ring-[#2D7A4F]/15"
                />
              </div>
              {error && (
                <p className="rounded-lg bg-red-50 p-3 text-sm font-medium text-red-700">{error}</p>
              )}
              <button
                type="submit"
                disabled={status === "submitting"}
                className="w-full rounded-lg bg-[#0B0C0E] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#1D2023] disabled:cursor-wait disabled:opacity-70"
              >
                {status === "submitting" ? "Sending..." : "Get notified with my real numbers"}
              </button>
            </form>
          )}

          {step === "success" && (
            <div className="space-y-4">
              <div className="rounded-xl bg-[#E8F5EE] p-5">
                <p className="text-lg font-bold text-[#0B0C0E]">You&apos;re on the list.</p>
                <p className="mt-2 leading-7 text-[#244434]">
                  We&apos;ll email you when you can pull your real Store Credit numbers.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  track("report_to_waitlist_continued");
                  onContinueToWaitlist(email);
                }}
                className="w-full rounded-lg bg-[#0B0C0E] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#1D2023]"
              >
                Answer a few questions to shape what we build
              </button>
              <button
                type="button"
                onClick={onClose}
                className="w-full rounded-lg border border-black/10 px-6 py-3 text-sm font-bold text-[#0B0C0E] transition hover:bg-[#F7F8FA]"
              >
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
