"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { ChoiceGroup, MultiChoiceGroup } from "./shared/Choice";
import { track } from "./shared/analytics";

type WaitlistData = {
  email: string;
  storeUrl: string;
  businessCategory: string;
  monthlyOrders: string;
  creditSources: string[];
  biggestPain: string;
  openResponse: string;
  valuableCapability: string;
  interviewWillingness: string;
};

const initialForm: WaitlistData = {
  email: "",
  storeUrl: "",
  businessCategory: "",
  monthlyOrders: "",
  creditSources: [],
  biggestPain: "",
  openResponse: "",
  valuableCapability: "",
  interviewWillingness: "",
};

const businessCategories = [
  "Apparel / Fashion",
  "Beauty / Skincare",
  "Accessories",
  "Home & Lifestyle",
  "Food & Beverage",
  "Other",
];

const monthlyOrders = [
  "Fewer than 100",
  "100-500",
  "500-2,000",
  "2,000-10,000",
  "10,000+",
];

const creditSourceOptions = [
  "Shopify's native Store Credit",
  "A returns app (Loop, AfterShip, ReturnGO, etc.)",
  "A loyalty or gift-card app (Rise.ai, Smile.io, etc.)",
  "Manually — gift cards, discount codes, or a spreadsheet",
  "We don't use Store Credit yet",
  "Not sure",
];

const painPoints = [
  "I don't know what % of it actually gets redeemed",
  "I can't tell if it's bringing customers back or just sitting there",
  "Our Store Credit data is scattered across different tools",
  "I don't know how much is about to expire unused",
  "Converting refunds into Store Credit in the first place",
  "Automating when Store Credit gets issued",
  "Something else",
];

const capabilities = [
  "A single dashboard showing redemption rate and revenue brought back",
  "Alerts for credit that's about to expire, unused",
  "One view across every tool that issues our Store Credit",
  "Automatic reminders to customers with unused credit",
  "A bonus-credit offer at checkout or during returns",
  "Something else",
];

const interviewOptions = ["Yes, happy to chat", "Maybe", "Not right now"];

const inputClasses =
  "w-full rounded-lg border border-black/15 px-4 py-3 text-[#0B0C0E] outline-none transition focus:border-[#2D7A4F] focus:ring-4 focus:ring-[#2D7A4F]/15";

export default function WaitlistForm({ prefillEmail = "" }: { prefillEmail?: string }) {
  const [form, setForm] = useState<WaitlistData>(initialForm);
  const [step, setStep] = useState(0);
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [error, setError] = useState("");
  const progress = useMemo(() => Math.round(((step + 1) / 6) * 100), [step]);

  useEffect(() => {
    if (prefillEmail && !form.email) {
      setForm((current) => ({ ...current, email: prefillEmail }));
    }
  }, [prefillEmail, form.email]);

  function update<K extends keyof WaitlistData>(key: K, value: WaitlistData[K]) {
    if (step === 0 && !form.email && !form.storeUrl) {
      track("waitlist_form_started");
    }
    setForm((current) => ({ ...current, [key]: value }));
  }

  function stepIsValid() {
    if (step === 0) return /\S+@\S+\.\S+/.test(form.email) && form.storeUrl.trim().length > 3;
    if (step === 1) return Boolean(form.businessCategory && form.monthlyOrders);
    if (step === 2) return form.creditSources.length > 0;
    if (step === 3) return Boolean(form.biggestPain);
    if (step === 4) return form.openResponse.trim().length >= 10;
    return Boolean(form.valuableCapability && form.interviewWillingness);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!stepIsValid()) {
      setError("Please complete this step before continuing.");
      return;
    }
    if (step < 5) {
      setError("");
      setStep((current) => current + 1);
      return;
    }

    setStatus("submitting");
    setError("");
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const response = await fetch(`${apiUrl}/api/waitlist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(body.detail || "Unable to submit the waitlist form.");
      }
      track("waitlist_form_completed");
      setStatus("success");
    } catch (err) {
      track("waitlist_form_error");
      setStatus("error");
      setError(err instanceof Error ? err.message : "Unable to submit the waitlist form.");
    }
  }

  if (status === "success") {
    return (
      <div className="rounded-2xl border border-[#2D7A4F]/25 bg-[#E8F5EE] p-6 sm:p-8">
        <h3 className="text-2xl font-black tracking-tight text-[#0B0C0E]">
          You&apos;re on the list.
        </h3>
        <p className="mt-4 leading-7 text-[#244434]">
          Thanks for signing up. Your feedback will help us build something that actually solves
          real problems. We&apos;ll reach out when early access is ready.
        </p>
        {form.interviewWillingness === "Yes, happy to chat" && (
          <p className="mt-3 leading-7 text-[#244434]">
            We may reach out for a quick chat to learn more about how you use Store Credit today.
          </p>
        )}
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-2xl border border-black/10 bg-white p-5 shadow-[0_24px_70px_rgba(11,12,14,0.10)] sm:p-8"
    >
      <div className="mb-6">
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm font-bold text-[#0B0C0E]">Step {step + 1} of 6</p>
          <p className="text-sm font-semibold text-[#687281]">{progress}% complete</p>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#E5E7EB]">
          <div
            className="h-full rounded-full bg-[#2D7A4F] transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="min-h-[360px]">
        {step === 0 && (
          <div className="space-y-5">
            <div>
              <label htmlFor="email" className="mb-2 block text-sm font-bold text-[#0B0C0E]">
                Work email
              </label>
              <input
                id="email"
                type="email"
                required
                value={form.email}
                onChange={(event) => update("email", event.target.value)}
                className={inputClasses}
              />
            </div>
            <div>
              <label htmlFor="storeUrl" className="mb-2 block text-sm font-bold text-[#0B0C0E]">
                Store URL
              </label>
              <input
                id="storeUrl"
                type="text"
                required
                placeholder="yourstore.com or yourstore.myshopify.com"
                value={form.storeUrl}
                onChange={(event) => update("storeUrl", event.target.value)}
                className={inputClasses}
              />
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-7">
            <ChoiceGroup
              label="What best describes your business?"
              options={businessCategories}
              value={form.businessCategory}
              onChange={(value) => update("businessCategory", value)}
            />
            <ChoiceGroup
              label="Approximately how many orders do you process per month?"
              options={monthlyOrders}
              value={form.monthlyOrders}
              onChange={(value) => update("monthlyOrders", value)}
            />
          </div>
        )}

        {step === 2 && (
          <MultiChoiceGroup
            label="How is Store Credit currently issued in your store?"
            options={creditSourceOptions}
            values={form.creditSources}
            onChange={(values) => update("creditSources", values)}
          />
        )}

        {step === 3 && (
          <ChoiceGroup
            label="What's your biggest challenge with Store Credit today?"
            options={painPoints}
            value={form.biggestPain}
            onChange={(value) => update("biggestPain", value)}
          />
        )}

        {step === 4 && (
          <div>
            <label htmlFor="openResponse" className="mb-2 block text-sm font-bold text-[#0B0C0E]">
              If you could fix one thing about Store Credit on Shopify, what would it be?
            </label>
            <textarea
              id="openResponse"
              required
              rows={8}
              value={form.openResponse}
              onChange={(event) => update("openResponse", event.target.value)}
              className={`${inputClasses} resize-none`}
            />
          </div>
        )}

        {step === 5 && (
          <div className="space-y-7">
            <ChoiceGroup
              label="Which capability would be most valuable to you?"
              options={capabilities}
              value={form.valuableCapability}
              onChange={(value) => update("valuableCapability", value)}
            />
            <ChoiceGroup
              label="Would you be open to a 15-minute conversation about how you use Store Credit?"
              options={interviewOptions}
              value={form.interviewWillingness}
              onChange={(value) => update("interviewWillingness", value)}
            />
          </div>
        )}
      </div>

      {error && (
        <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm font-medium text-red-700">{error}</p>
      )}

      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
        <button
          type="button"
          onClick={() => {
            setError("");
            setStep((current) => Math.max(0, current - 1));
          }}
          disabled={step === 0 || status === "submitting"}
          className="rounded-lg border border-black/10 px-5 py-3 text-sm font-bold text-[#0B0C0E] transition hover:bg-[#F7F8FA] disabled:cursor-not-allowed disabled:opacity-40"
        >
          Back
        </button>
        <button
          type="submit"
          disabled={status === "submitting"}
          className="rounded-lg bg-[#0B0C0E] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#1D2023] focus:outline-none focus:ring-4 focus:ring-[#2D7A4F]/25 disabled:cursor-wait disabled:opacity-70"
        >
          {step < 5
            ? "Continue"
            : status === "submitting"
              ? "Submitting..."
              : "Join the Early Access Waitlist"}
        </button>
      </div>
    </form>
  );
}