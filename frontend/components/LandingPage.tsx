"use client";

import Image from "next/image";
import { FormEvent, useEffect, useMemo, useState } from "react";
import StoreCreditReport from "@/components/StoreCreditReport";

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

const monthlyOrders = ["Fewer than 100", "100-500", "500-2,000", "2,000-10,000", "10,000+"];

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

function track(eventName: string) {
  if (typeof window === "undefined") return;
  window.gtag?.("event", eventName);
}

function scrollToWaitlist() {
  track("waitlist_cta_clicked");
  document.getElementById("early-access")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-4 text-xs font-bold uppercase tracking-[0.16em] text-[#2D7A4F]">{children}</p>
  );
}

function SectionHeading({
  eyebrow,
  title,
  intro,
}: {
  eyebrow?: string;
  title: string;
  intro?: string;
}) {
  return (
    <div className="mx-auto mb-10 max-w-3xl text-center sm:mb-14">
      {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
      <h2 className="text-balance text-3xl font-bold tracking-tight text-[#0B0C0E] sm:text-4xl lg:text-5xl">
        {title}
      </h2>
      {intro && <p className="mt-5 text-base leading-7 text-[#5D6673] sm:text-lg">{intro}</p>}
    </div>
  );
}

function PrimaryButton({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex min-h-12 items-center justify-center rounded-lg bg-[#0B0C0E] px-6 py-3 text-sm font-bold text-white shadow-[0_12px_30px_rgba(11,12,14,0.18)] transition hover:bg-[#1D2023] focus:outline-none focus:ring-4 focus:ring-[#2D7A4F]/25"
    >
      {children}
    </button>
  );
}

function SecondaryButton({ children, href }: { children: React.ReactNode; href: string }) {
  return (
    <a
      href={href}
      className="inline-flex min-h-12 items-center justify-center rounded-lg border border-black/10 bg-white px-6 py-3 text-sm font-bold text-[#0B0C0E] no-underline transition hover:border-black/20 hover:bg-[#F7F8FA] focus:outline-none focus:ring-4 focus:ring-[#2D7A4F]/20"
    >
      {children}
    </a>
  );
}

function Nav({ onGetReport }: { onGetReport: () => void }) {
  return (
    <nav className="sticky top-0 z-50 border-b border-black/10 bg-[#F7F8FA]/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <a href="/" className="flex items-center gap-2.5 text-[#0B0C0E] no-underline">
          <Image src="/app-icon.png" alt="Pleero" width={34} height={34} className="rounded-lg" />
          <span className="text-lg font-bold tracking-tight">Pleero</span>
        </a>
        <div className="hidden items-center gap-7 md:flex">
          <a
            href="#problem"
            className="text-sm font-medium text-[#5D6673] no-underline hover:text-[#0B0C0E]"
          >
            The Problem
          </a>
          <a
            href="#what-youll-see"
            className="text-sm font-medium text-[#5D6673] no-underline hover:text-[#0B0C0E]"
          >
            What You&apos;ll See
          </a>
          <a
            href="#early-access"
            className="text-sm font-medium text-[#5D6673] no-underline hover:text-[#0B0C0E]"
          >
            Early Access
          </a>
        </div>
        <PrimaryButton onClick={onGetReport}>Get My Free Report</PrimaryButton>
      </div>
    </nav>
  );
}

function DashboardPreview() {
  const rows = [
    ["Credit expiring in 7 days", "$340 at risk", "Win-back nudge suggested"],
    ["Redemption spike detected", "+18% this week", "Mostly Loop-issued credit"],
    ["Cross-tool reconciliation", "3 sources synced", "Shopify native + AfterShip + manual"],
  ];

  return (
    <div className="rounded-2xl border border-black/10 bg-white p-4 shadow-[0_24px_70px_rgba(11,12,14,0.12)] sm:p-5">
      <div className="mb-4 flex items-center justify-between border-b border-black/10 pb-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#7A8492]">
            Concept preview
          </p>
          <h3 className="mt-1 text-lg font-bold text-[#0B0C0E]">Store Credit, finally visible</h3>
        </div>
        <span className="rounded-full bg-[#E8F5EE] px-3 py-1 text-xs font-bold text-[#2D7A4F]">
          Shopify
        </span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {[
          ["Credit issued", "$4,820", "Demo period"],
          ["Redemption rate", "38%", "Illustrative"],
          ["Revenue brought back", "$1,460", "Spend above balance"],
          ["Expiring in 30 days", "$1,240", "Win-back opportunity"],
        ].map(([label, value, note]) => (
          <div key={label} className="rounded-xl border border-black/10 bg-[#F7F8FA] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#7A8492]">
              {label}
            </p>
            <p className="mt-2 text-2xl font-bold tracking-tight text-[#0B0C0E]">{value}</p>
            <p className="mt-1 text-xs text-[#687281]">{note}</p>
          </div>
        ))}
      </div>
      <div className="mt-4 rounded-xl border border-black/10">
        <div className="grid grid-cols-[1fr_auto] gap-3 border-b border-black/10 px-4 py-3">
          <p className="text-sm font-bold text-[#0B0C0E]">Recent Store Credit activity</p>
          <p className="text-xs font-semibold text-[#687281]">Demo</p>
        </div>
        <div className="divide-y divide-black/10">
          {rows.map(([event, status, detail]) => (
            <div key={event} className="grid gap-2 px-4 py-3 text-sm sm:grid-cols-[1.2fr_1fr_1fr]">
              <span className="font-semibold text-[#0B0C0E]">{event}</span>
              <span className="text-[#5D6673]">{status}</span>
              <span className="text-[#5D6673]">{detail}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-4 rounded-xl bg-[#0B0C0E] p-4 text-white">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#9CA3AF]">
          Where your Store Credit comes from
        </p>
        <p className="mt-3 text-sm leading-7 text-[#D5DAE1]">
          Shopify native — 40% · Loop / AfterShip — 25% · Manual gift cards — 20% · Rise.ai — 15%
        </p>
        <p className="mt-2 text-xs text-[#9CA3AF]">One dashboard. Every source.</p>
      </div>
    </div>
  );
}

function Hero({ onGetReport }: { onGetReport: () => void }) {
  return (
    <header className="overflow-hidden bg-[#F7F8FA] px-4 pb-16 pt-12 sm:px-6 sm:pb-20 sm:pt-16 lg:px-8">
      <div className="mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-[1fr_0.92fr]">
        <div>
          <Eyebrow>You already issue Store Credit. Do you know if it&apos;s working?</Eyebrow>
          {/* Recommended H1. A/B alternates (refund framing): "Stop guessing whether your
              refund-to-credit strategy is working."
              (finance/loss-aversion framing): "How much unused Store Credit is sitting on your
              books right now?" */}
          <h1 className="text-balance text-4xl font-black tracking-tight text-[#0B0C0E] sm:text-5xl lg:text-6xl">
            How much of your Store Credit actually comes back to you?
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-[#4E5968]">
            Pleero shows you exactly how much Store Credit gets redeemed, how much revenue it brings
            back, and how much is about to expire — no matter which app issued it. Shopify native,
            Loop, AfterShip, ReturnGO, Rise.ai, or a pile of manual gift-card codes. One view.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <PrimaryButton onClick={onGetReport}>Get My Free Report</PrimaryButton>
            <SecondaryButton href="#what-youll-see">See What You&apos;re Missing</SecondaryButton>
          </div>
          <p className="mt-5 text-sm font-medium text-[#687281]">
            For Shopify merchants who issue Store Credit and have no real way to tell if it&apos;s
            working.
          </p>
        </div>
        <DashboardPreview />
      </div>
    </header>
  );
}

function Card({
  title,
  children,
  muted = false,
}: {
  title: string;
  children: React.ReactNode;
  muted?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-6 ${muted ? "border-black/10 bg-[#F7F8FA]" : "border-black/10 bg-white"}`}
    >
      <h3 className="text-lg font-bold tracking-tight text-[#0B0C0E]">{title}</h3>
      <p className="mt-3 leading-7 text-[#5D6673]">{children}</p>
    </div>
  );
}

function ProblemSection() {
  return (
    <section id="problem" className="scroll-mt-20 bg-white px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <SectionHeading
          eyebrow="You have Store Credit. Knowing if it works is the hard part."
          title="Store Credit shouldn't be a black box."
          intro="Most Shopify merchants issue Store Credit — through Shopify itself, a returns app, or a loyalty tool — and then lose track of it completely. No single view. No idea what's working. No idea what's about to expire unused."
        />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card title="You don't know your redemption rate">
            You&apos;ve issued Store Credit for months. You have no idea what percentage of it
            customers actually use.
          </Card>
          <Card title="Your Store Credit data is scattered">
            Some came from a return, some from Shopify directly, some from a loyalty app, some from
            a gift card you made by hand. None of it talks to the others.
          </Card>
          <Card title="Money is quietly expiring">
            Unused credit sits in customer accounts until it expires, and nobody&apos;s watching the
            clock or reminding anyone.
          </Card>
          <Card title="You can't prove it's working">
            When someone asks &ldquo;is Store Credit actually bringing customers back,&rdquo; you
            don&apos;t have a number to give them.
          </Card>
        </div>
        <div className="mt-10 rounded-2xl bg-[#0B0C0E] p-6 text-white sm:p-8 lg:p-10">
          <p className="text-balance text-2xl font-bold tracking-tight sm:text-3xl">
            Store Credit could be one of your best retention tools. Right now, it&apos;s mostly a
            mystery.
          </p>
          <p className="mt-4 max-w-3xl leading-7 text-[#C8CED7]">
            You don&apos;t need another app to issue credit. You need one that tells you the truth
            about the credit you already have.
          </p>
          <div className="mt-6">
            <button
              type="button"
              onClick={scrollToWaitlist}
              className="rounded-lg bg-white px-5 py-3 text-sm font-bold text-[#0B0C0E] transition hover:bg-[#EEF1F5] focus:outline-none focus:ring-4 focus:ring-white/25"
            >
              Help Us Build the Missing Report
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

function OutcomeSection() {
  return (
    <section className="bg-[#F7F8FA] px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <SectionHeading
          eyebrow="Imagine finally being able to answer the question"
          title="What if you could see exactly what your Store Credit is doing?"
        />
        <div className="grid gap-4 md:grid-cols-3">
          <Card title="One number for the whole picture" muted>
            See total issued, redeemed, and revenue brought back — across every tool you use to
            issue it.
          </Card>
          <Card title="Catch credit before it expires" muted>
            Get an alert when balances are about to expire, with a ready-made list of who to remind.
          </Card>
          <Card title="Finally prove the ROI" muted>
            Walk into your next planning meeting with a real number for what Store Credit is doing
            for the business.
          </Card>
        </div>
        <div className="relative mx-auto mt-10 max-w-3xl -rotate-1 rounded-sm bg-[#FFF9E3] p-8 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.08)] transition sm:p-12">
          <div className="absolute -top-2 left-1/2 z-10 -translate-x-1/2">
            <div className="h-4 w-4 rounded-full bg-gradient-to-br from-[#6B7280] to-[#374151] shadow-[0_1px_2px_rgba(0,0,0,0.3)]" />
            <div className="absolute left-1/2 top-3 h-2.5 w-0.5 -translate-x-1/2 bg-[#6B7280]" />
          </div>
          <p className="font-handwritten text-balance text-2xl font-semibold leading-[1.4] text-[#0B0C0E] sm:text-4xl">
            &ldquo;Store Credit shouldn&rsquo;t just sit in a customer account.&rdquo;
          </p>
          <p className="mt-4 font-handwritten text-balance text-xl font-semibold leading-[1.4] text-[#2D7A4F] sm:text-3xl">
            It should <span className="text-[#0B0C0E]">prove the next purchase</span> — or tell you
            exactly why it didn&apos;t.
          </p>
        </div>
      </div>
    </section>
  );
}

function VisionSection({ onGetReport }: { onGetReport: () => void }) {
  const cards = [
    {
      label: "Store Credit ROI Dashboard",
      title: "One number: how much revenue Store Credit actually brought back.",
      copy: "See what's issued, what's redeemed, and what it's worth — in one place, updated automatically.",
      comingSoon: false,
    },
    {
      label: "Expiry & Liability Tracking",
      title: "See what's about to go to waste — before it does.",
      copy: "Get a clear list of balances nearing expiration, so nothing quietly disappears.",
      comingSoon: false,
    },
    {
      label: "Works With What You Already Use",
      title: "No need to switch tools.",
      copy: "Pulls data from Shopify native Store Credit, Loop, AfterShip, ReturnGO, Rise.ai, or manual gift-card codes into one reconciled view.",
      comingSoon: false,
    },
    {
      label: "Win-Back Nudges",
      title: "Turn unused credit into a reason to come back.",
      copy: "Automatic reminders for customers sitting on balances they've forgotten about.",
      comingSoon: true,
    },
  ];

  return (
    <section
      id="what-youll-see"
      className="scroll-mt-20 bg-white px-4 py-16 sm:px-6 sm:py-24 lg:px-8"
    >
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div>
            <Eyebrow>What we&apos;re building</Eyebrow>
            <h2 className="text-balance text-3xl font-black tracking-tight text-[#0B0C0E] sm:text-5xl">
              The report your Store Credit app doesn&apos;t give you
            </h2>
            <p className="mt-5 text-lg leading-8 text-[#4E5968]">
              We&apos;re not building another way to issue Store Credit — you probably already have
              one. We&apos;re building the layer that tells you whether it&apos;s working, no matter
              which tool you use to issue it.
            </p>
            <p className="mt-5 rounded-xl border border-[#2D7A4F]/20 bg-[#E8F5EE] p-5 leading-7 text-[#244434]">
              We&apos;re talking to Shopify merchants before building anything else. Join early
              access and help us decide exactly what ships first.
            </p>
            <div className="mt-6">
              <PrimaryButton onClick={onGetReport}>Get My Free Report</PrimaryButton>
            </div>
          </div>
          <div>
            <div className="grid gap-4 md:grid-cols-2">
              {cards.map((card) => (
                <div
                  key={card.label}
                  className="rounded-xl border border-black/10 bg-[#F7F8FA] p-6"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#2D7A4F]">
                      {card.label}
                    </p>
                    {card.comingSoon && (
                      <span className="rounded-full bg-[#E8F5EE] px-2.5 py-0.5 text-xs font-bold text-[#2D7A4F]">
                        Coming soon
                      </span>
                    )}
                  </div>
                  <h3 className="mt-3 text-xl font-bold tracking-tight text-[#0B0C0E]">
                    {card.title}
                  </h3>
                  <p className="mt-3 leading-7 text-[#5D6673]">{card.copy}</p>
                </div>
              ))}
            </div>
            <p className="mt-4 text-sm font-medium text-[#687281]">
              These are the areas we&apos;re working on. Your feedback will help decide what we
              build first.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function StepsSection() {
  return (
    <section className="bg-[#F7F8FA] px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <SectionHeading title="How Pleero works in three steps" />
        <div className="grid gap-4 md:grid-cols-3">
          {[
            [
              "01",
              "Connect your store",
              "Install Pleero. It reads your existing Store Credit activity — no matter which app issues it.",
            ],
            [
              "02",
              "See what's really happening",
              "Get a clear picture: how much is issued, how much is redeemed, how much revenue it's brought back, and how much is about to expire.",
            ],
            [
              "03",
              "Act before credit goes to waste",
              "Get alerts and win-back nudges for customers sitting on unused balances, before that money disappears for good.",
            ],
          ].map(([step, title, copy]) => (
            <div key={step} className="rounded-xl border border-black/10 bg-white p-6">
              <span className="font-mono-brand text-sm font-bold text-[#2D7A4F]">{step}</span>
              <h3 className="mt-4 text-xl font-bold tracking-tight text-[#0B0C0E]">{title}</h3>
              <p className="mt-3 leading-7 text-[#5D6673]">{copy}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ChoiceGroup({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <fieldset>
      <legend className="mb-3 text-sm font-bold text-[#0B0C0E]">{label}</legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {options.map((option) => (
          <label
            key={option}
            className={`flex cursor-pointer items-center rounded-lg border p-3 text-sm font-medium transition ${
              value === option
                ? "border-[#2D7A4F] bg-[#E8F5EE] text-[#163D29]"
                : "border-black/10 bg-white text-[#4E5968] hover:border-black/20"
            }`}
          >
            <input
              type="radio"
              name={label}
              value={option}
              checked={value === option}
              onChange={() => onChange(option)}
              className="mr-3 h-4 w-4 accent-[#2D7A4F]"
            />
            {option}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function MultiChoiceGroup({
  label,
  options,
  values,
  onChange,
}: {
  label: string;
  options: string[];
  values: string[];
  onChange: (values: string[]) => void;
}) {
  function toggle(option: string) {
    onChange(
      values.includes(option) ? values.filter((value) => value !== option) : [...values, option]
    );
  }

  return (
    <fieldset>
      <legend className="mb-3 text-sm font-bold text-[#0B0C0E]">{label}</legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {options.map((option) => (
          <label
            key={option}
            className={`flex cursor-pointer items-center rounded-lg border p-3 text-sm font-medium transition ${
              values.includes(option)
                ? "border-[#2D7A4F] bg-[#E8F5EE] text-[#163D29]"
                : "border-black/10 bg-white text-[#4E5968] hover:border-black/20"
            }`}
          >
            <input
              type="checkbox"
              value={option}
              checked={values.includes(option)}
              onChange={() => toggle(option)}
              className="mr-3 h-4 w-4 rounded accent-[#2D7A4F]"
            />
            {option}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function WaitlistForm({ prefillEmail = "" }: { prefillEmail?: string }) {
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
    if (step === 0 && !form.email && !form.storeUrl) track("waitlist_form_started");
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
                className="w-full rounded-lg border border-black/15 px-4 py-3 text-[#0B0C0E] outline-none transition focus:border-[#2D7A4F] focus:ring-4 focus:ring-[#2D7A4F]/15"
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
                className="w-full rounded-lg border border-black/15 px-4 py-3 text-[#0B0C0E] outline-none transition focus:border-[#2D7A4F] focus:ring-4 focus:ring-[#2D7A4F]/15"
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
              className="w-full resize-none rounded-lg border border-black/15 px-4 py-3 text-[#0B0C0E] outline-none transition focus:border-[#2D7A4F] focus:ring-4 focus:ring-[#2D7A4F]/15"
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

function WaitlistSection({ prefillEmail }: { prefillEmail?: string }) {
  return (
    <section
      id="early-access"
      className="scroll-mt-20 bg-[#0B0C0E] px-4 py-16 sm:px-6 sm:py-24 lg:px-8"
    >
      <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
        <div className="text-white">
          <Eyebrow>Early Access</Eyebrow>
          <h2 className="text-balance text-3xl font-black tracking-tight sm:text-5xl">
            Help us build the report you actually need.
          </h2>
          <p className="mt-5 text-lg leading-8 text-[#C8CED7]">
            We&apos;re talking to Shopify merchants who already issue Store Credit — through Shopify
            native, Loop, AfterShip, ReturnGO, Rise.ai, or manually — before we build anything else.
            Tell us what you wish you could see.
          </p>
        </div>
        <WaitlistForm prefillEmail={prefillEmail} />
      </div>
    </section>
  );
}

function FounderSection() {
  return (
    <section className="bg-[#F7F8FA] px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <div className="relative rotate-1 rounded-sm bg-[#FFF9E3] p-8 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.08)] sm:p-10">
          <div className="absolute -top-2 left-1/2 z-10 -translate-x-1/2">
            <div className="h-4 w-4 rounded-full bg-gradient-to-br from-[#6B7280] to-[#374151] shadow-[0_1px_2px_rgba(0,0,0,0.3)]" />
            <div className="absolute left-1/2 top-3 h-2.5 w-0.5 -translate-x-1/2 bg-[#6B7280]" />
          </div>
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0B0C0E] text-sm font-bold text-white">
              K
            </div>
            <div>
              <p className="font-handwritten text-lg font-semibold text-[#0B0C0E]">Kamalesh</p>
              <p className="font-handwritten text-sm text-[#2D7A4F]">Founder, Pleero</p>
            </div>
          </div>
          <div className="space-y-4 font-handwritten text-lg leading-[1.6] text-[#0B0C0E] sm:text-xl">
            <p>
              I started Pleero with a simple idea: when a customer asks for a refund, what if you
              could offer them bonus Store Credit instead? You keep the sale. They get more value.
            </p>
            <p>
              But the more I talked to merchants, the more I realized that wasn&apos;t actually the
              problem. Most of them already had some way to issue Store Credit — Shopify&apos;s own
              tools, a returns app, a loyalty app, or just a pile of gift-card codes.
            </p>
            <p>
              What none of them had was a way to know if it was working. How much gets redeemed. How
              much just sits there. How much is about to quietly expire. Nobody could give me a
              straight answer, and nobody had a tool that could either.
            </p>
            <p>
              That&apos;s what I&apos;m building with Pleero — not another way to issue credit, but
              the report that tells you the truth about the credit you&apos;ve already got.
            </p>
            <p>
              I&apos;m talking to Shopify merchants before building anything big, because I want to
              build what people actually need — not what I <em>think</em> they need.
            </p>
            <p>
              If you issue Store Credit and have no real idea whether it&apos;s working, I&apos;d{" "}
              <span className="text-[#2D7A4F]">love to hear your story</span>.
            </p>
          </div>
          <div className="mt-6 border-t border-black/10 pt-4 text-right">
            <p className="font-handwritten text-lg font-semibold text-[#0B0C0E]">Kamalesh</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function FinalCta({ onGetReport }: { onGetReport: () => void }) {
  return (
    <section className="bg-[#F7F8FA] px-4 py-16 text-center sm:px-6 sm:py-24 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <h2 className="text-balance text-3xl font-black tracking-tight text-[#0B0C0E] sm:text-5xl">
          You already have Store Credit in Shopify.
          <br />
          Let&apos;s find out if it&apos;s actually working.
        </h2>
        <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-[#4E5968]">
          Join early access and help us build the report that finally tells you the truth about your
          Store Credit — no matter what issues it.
        </p>
        <div className="mt-8">
          <PrimaryButton onClick={onGetReport}>Get My Free Report</PrimaryButton>
        </div>
        <p className="mt-4 text-sm font-medium text-[#687281]">
          Early access. Real product research. No spam.
        </p>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-white/10 bg-[#0B0C0E] px-4 py-10 text-white sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <Image src="/app-icon.png" alt="Pleero" width={32} height={32} className="rounded-md" />
            <span className="text-lg font-bold">Pleero</span>
          </div>
          <p className="mt-3 max-w-sm text-sm leading-6 text-[#8A9099]">
            Store Credit, finally visible — for Shopify merchants.
          </p>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-3 text-sm">
          <a href="/legal/privacy" className="text-[#C8CED7] no-underline hover:text-white">
            Privacy Policy
          </a>
          <a href="/legal/terms" className="text-[#C8CED7] no-underline hover:text-white">
            Terms
          </a>
          <a
            href="mailto:hello@pleero.app"
            className="text-[#C8CED7] no-underline hover:text-white"
          >
            Contact
          </a>
        </div>
      </div>
      <div className="mx-auto mt-8 max-w-7xl border-t border-white/10 pt-6 text-sm text-[#6B7280]">
        © {new Date().getFullYear()} Pleero. All rights reserved.
      </div>
    </footer>
  );
}

export default function LandingPage() {
  const [reportOpen, setReportOpen] = useState(false);
  const [reportedEmail, setReportedEmail] = useState("");

  function openReport() {
    track("report_cta_clicked");
    setReportOpen(true);
  }

  function openWaitlistFromReport(email: string) {
    setReportedEmail(email);
    setReportOpen(false);
    scrollToWaitlist();
  }

  return (
    <div className="min-h-screen bg-[#F7F8FA]">
      <Nav onGetReport={openReport} />
      <Hero onGetReport={openReport} />
      <ProblemSection />
      <OutcomeSection />
      <VisionSection onGetReport={openReport} />
      <StepsSection />
      <WaitlistSection prefillEmail={reportedEmail} />
      <FounderSection />
      <FinalCta onGetReport={openReport} />
      <Footer />
      <StoreCreditReport
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        onContinueToWaitlist={openWaitlistFromReport}
      />
    </div>
  );
}
