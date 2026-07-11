"use client";

import Image from "next/image";
import { FormEvent, useMemo, useState } from "react";

type WaitlistData = {
  email: string;
  storeUrl: string;
  businessCategory: string;
  monthlyOrders: string;
  currentUseCases: string[];
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
  currentUseCases: [],
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

const currentUseCases = [
  "Refunds or returns",
  "Customer service / goodwill",
  "Loyalty or rewards",
  "Promotions or campaigns",
  "VIP customers",
  "We don't use Store Credit yet",
  "Other",
];

const painPoints = [
  "Converting refunds into Store Credit",
  "Automating when Store Credit is issued",
  "Understanding whether Store Credit gets redeemed",
  "Getting customers to come back and use their credit",
  "Reporting and analytics",
  "Bulk management",
  "Customer communication and notifications",
  "Something else",
];

const capabilities = [
  "Refund-to-Store-Credit conversion",
  "Store Credit analytics and reporting",
  "Automated Store Credit workflows",
  "Customer reminders and redemption campaigns",
  "All-in-one Store Credit platform",
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

function PrimaryButton({ children }: { children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={scrollToWaitlist}
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

function Nav() {
  return (
    <nav className="sticky top-0 z-50 border-b border-black/10 bg-[#F7F8FA]/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <a href="/" className="flex items-center gap-2.5 text-[#0B0C0E] no-underline">
          <Image src="/app-icon.png" alt="Pleero" width={34} height={34} className="rounded-lg" />
          <span className="text-lg font-bold tracking-tight">Pleero</span>
        </a>
        <div className="hidden items-center gap-7 md:flex">
          <a
            href="#why-pleero"
            className="text-sm font-medium text-[#5D6673] no-underline hover:text-[#0B0C0E]"
          >
            Why Pleero
          </a>
          <a
            href="#building"
            className="text-sm font-medium text-[#5D6673] no-underline hover:text-[#0B0C0E]"
          >
            What We&apos;re Building
          </a>
          <a
            href="#early-access"
            className="text-sm font-medium text-[#5D6673] no-underline hover:text-[#0B0C0E]"
          >
            Early Access
          </a>
        </div>
        <PrimaryButton>Join the Waitlist</PrimaryButton>
      </div>
    </nav>
  );
}

function DashboardPreview() {
  const rows = [
    ["Refund recovery offer", "Choice presented", "$110 credit option"],
    ["Credit reminder", "Ready to send", "Balance visible"],
    ["VIP milestone", "Exploring", "Reward trigger"],
  ];

  return (
    <div className="rounded-2xl border border-black/10 bg-white p-4 shadow-[0_24px_70px_rgba(11,12,14,0.12)] sm:p-5">
      <div className="mb-4 flex items-center justify-between border-b border-black/10 pb-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#7A8492]">
            Concept preview
          </p>
          <h3 className="mt-1 text-lg font-bold text-[#0B0C0E]">Store Credit Intelligence</h3>
        </div>
        <span className="rounded-full bg-[#E8F5EE] px-3 py-1 text-xs font-bold text-[#2D7A4F]">
          Shopify
        </span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {[
          ["Credit issued", "$4,820", "Demo period"],
          ["Redemption rate", "38%", "Illustrative"],
          ["Revenue retained", "$1,460", "Concept metric"],
          ["Outstanding credit", "$2,990", "Needs action"],
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
          Refund to credit
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
          <div className="rounded-lg bg-white/10 p-3">
            <p className="text-sm text-[#D5DAE1]">Standard refund</p>
            <p className="text-xl font-bold">$100</p>
          </div>
          <span className="text-center text-sm font-bold text-[#6FCF97]">or</span>
          <div className="rounded-lg bg-[#E8F5EE] p-3 text-[#0B0C0E]">
            <p className="text-sm text-[#3E4B43]">Bonus Store Credit</p>
            <p className="text-xl font-bold">$110</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Hero() {
  return (
    <header className="overflow-hidden bg-[#F7F8FA] px-4 pb-16 pt-12 sm:px-6 sm:pb-20 sm:pt-16 lg:px-8">
      <div className="mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-[1fr_0.92fr]">
        <div>
          <Eyebrow>Store Credit Intelligence for Shopify</Eyebrow>
          <h1 className="text-balance text-4xl font-black tracking-tight text-[#0B0C0E] sm:text-5xl lg:text-6xl">
            Turn Shopify Store Credit into a retention channel.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-[#4E5968]">
            Pleero is the intelligence and automation layer for Shopify Store Credit, helping
            merchants turn refunds, unused credit, and customer moments into opportunities for
            repeat purchases.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <PrimaryButton>Join the Early Access Waitlist</PrimaryButton>
            <SecondaryButton href="#building">See What We&apos;re Building</SecondaryButton>
          </div>
          <p className="mt-5 text-sm font-medium text-[#687281]">
            Built for Shopify merchants who want to do more with Store Credit.
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
    <section id="why-pleero" className="bg-white px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <SectionHeading
          eyebrow="Shopify built Store Credit. The hard part comes next."
          title="Store Credit exists. Using it strategically is another story."
          intro="For many merchants, Store Credit is still a manual tool used after something goes wrong. The balance exists, but the automation, visibility, and customer journey around it are fragmented."
        />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card title="Reactive, not strategic">
            Store Credit is often issued manually after a refund, return, late delivery, or
            complaint instead of being used intentionally as part of a retention strategy.
          </Card>
          <Card title="Limited visibility">
            You can issue Store Credit, but understanding what gets redeemed, what sits unused, and
            whether it actually drives another purchase is much harder.
          </Card>
          <Card title="Fragmented automation">
            Turning customer behavior into Store Credit workflows can mean stitching together Flow,
            custom logic, multiple apps, or manual processes.
          </Card>
          <Card title="Customers forget it exists">
            If customers cannot easily see, understand, or remember their Store Credit, the balance
            sits unused instead of bringing them back.
          </Card>
        </div>
        <div className="mt-10 rounded-2xl bg-[#0B0C0E] p-6 text-white sm:p-8 lg:p-10">
          <p className="text-balance text-2xl font-bold tracking-tight sm:text-3xl">
            The problem isn&apos;t Store Credit itself. The problem is everything that needs to
            happen around it.
          </p>
          <p className="mt-4 max-w-3xl leading-7 text-[#C8CED7]">
            Shopify provides the infrastructure. Merchants still need the intelligence, automation,
            and customer experience to turn Store Credit into a measurable growth channel.
          </p>
          <div className="mt-6">
            <button
              type="button"
              onClick={scrollToWaitlist}
              className="rounded-lg bg-white px-5 py-3 text-sm font-bold text-[#0B0C0E] transition hover:bg-[#EEF1F5] focus:outline-none focus:ring-4 focus:ring-white/25"
            >
              Help Us Build the Missing Layer
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
          eyebrow="A better way to think about Store Credit"
          title="What if Store Credit worked like a growth channel?"
        />
        <div className="grid gap-4 md:grid-cols-3">
          <Card title="Retain more value when refunds happen" muted>
            Give customers a compelling choice between a standard refund and a higher-value Store
            Credit offer without forcing Store Credit on them.
          </Card>
          <Card title="Bring customers back intentionally" muted>
            Use Store Credit across refund recovery, retention campaigns, VIP rewards, customer
            milestones, and win-back journeys.
          </Card>
          <Card title="Know what's actually working" muted>
            Understand how Store Credit is issued, redeemed, and connected to repeat purchases
            instead of treating it as an invisible balance.
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
            It should <span className="text-[#0B0C0E]">help create</span> the next purchase.
          </p>
        </div>
      </div>
    </section>
  );
}

function VisionSection() {
  const cards = [
    [
      "Refund Recovery",
      "Turn a refund into a choice.",
      "Explore personalized bonus Store Credit offers that give customers a reason to shop again while preserving their option to receive a standard refund.",
    ],
    [
      "Credit Intelligence",
      "See what happens after credit is issued.",
      "Understand issuance, redemption, outstanding balances, repeat purchases, and the real performance of Store Credit.",
    ],
    [
      "Smart Automation",
      "Use Store Credit at the right customer moments.",
      "Explore workflows around refunds, customer milestones, VIP rewards, spending thresholds, and retention campaigns.",
    ],
    [
      "Redemption Journeys",
      "Don't let valuable credit disappear into an account.",
      "Explore reminders and customer journeys designed to make Store Credit easier to discover and redeem.",
    ],
  ];

  return (
    <section id="building" className="bg-white px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div>
            <Eyebrow>Introducing the vision</Eyebrow>
            <h2 className="text-balance text-3xl font-black tracking-tight text-[#0B0C0E] sm:text-5xl">
              The Store Credit Intelligence Platform for Shopify
            </h2>
            <p className="mt-5 text-lg leading-8 text-[#4E5968]">
              Pleero is building a dedicated intelligence and automation layer for Shopify Store
              Credit, designed to help merchants decide when to use credit, create better customer
              experiences, and understand its impact on retention and revenue.
            </p>
            <p className="mt-5 rounded-xl border border-[#2D7A4F]/20 bg-[#E8F5EE] p-5 leading-7 text-[#244434]">
              We&apos;re currently speaking with Shopify merchants and shaping the next version of
              Pleero around the problems that matter most. Join the waitlist to get early access and
              help influence what we build.
            </p>
            <div className="mt-6">
              <PrimaryButton>Join the Early Access Waitlist</PrimaryButton>
            </div>
          </div>
          <div>
            <div className="grid gap-4 md:grid-cols-2">
              {cards.map(([label, title, copy]) => (
                <div key={label} className="rounded-xl border border-black/10 bg-[#F7F8FA] p-6">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#2D7A4F]">
                    {label}
                  </p>
                  <h3 className="mt-3 text-xl font-bold tracking-tight text-[#0B0C0E]">{title}</h3>
                  <p className="mt-3 leading-7 text-[#5D6673]">{copy}</p>
                </div>
              ))}
            </div>
            <p className="mt-4 text-sm font-medium text-[#687281]">
              These are areas we&apos;re actively exploring. Your feedback will help determine what
              we build first.
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
        <SectionHeading title="From Store Credit balance to repeat purchase" />
        <div className="grid gap-4 md:grid-cols-3">
          {[
            [
              "01",
              "Choose the moment",
              "A refund, customer milestone, retention campaign, or another high-value event creates an opportunity.",
            ],
            [
              "02",
              "Deliver the right Store Credit experience",
              "Give the customer a clear, relevant reason to return instead of issuing credit with no strategy around it.",
            ],
            [
              "03",
              "Measure what happens next",
              "Understand whether Store Credit gets redeemed and whether it contributes to another purchase.",
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

function WaitlistForm() {
  const [form, setForm] = useState<WaitlistData>(initialForm);
  const [step, setStep] = useState(0);
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [error, setError] = useState("");
  const progress = useMemo(() => Math.round(((step + 1) / 6) * 100), [step]);

  function update<K extends keyof WaitlistData>(key: K, value: WaitlistData[K]) {
    if (step === 0 && !form.email && !form.storeUrl) track("waitlist_form_started");
    setForm((current) => ({ ...current, [key]: value }));
  }

  function stepIsValid() {
    if (step === 0) return /\S+@\S+\.\S+/.test(form.email) && form.storeUrl.trim().length > 3;
    if (step === 1) return Boolean(form.businessCategory && form.monthlyOrders);
    if (step === 2) return form.currentUseCases.length > 0;
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
          Thanks for helping shape Pleero. We&apos;ll use your feedback to decide what we build next
          and reach out when early access becomes available.
        </p>
        {form.interviewWillingness === "Yes, happy to chat" && (
          <p className="mt-3 leading-7 text-[#244434]">
            We may also reach out for a short conversation about your Store Credit workflow.
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
            label="How do you currently use Store Credit?"
            options={currentUseCases}
            values={form.currentUseCases}
            onChange={(values) => update("currentUseCases", values)}
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

function WaitlistSection() {
  return (
    <section
      id="early-access"
      className="scroll-mt-20 bg-[#0B0C0E] px-4 py-16 sm:px-6 sm:py-24 lg:px-8"
    >
      <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
        <div className="text-white">
          <Eyebrow>Early Access</Eyebrow>
          <h2 className="text-balance text-3xl font-black tracking-tight sm:text-5xl">
            Help shape the future of Store Credit on Shopify.
          </h2>
          <p className="mt-5 text-lg leading-8 text-[#C8CED7]">
            We&apos;re looking for Shopify merchants who already use Store Credit, or want to use it
            more strategically. Tell us how you handle it today and what you wish worked better.
          </p>
        </div>
        <WaitlistForm />
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
              I originally started Pleero around one simple idea: when a customer asks for a refund,
              could a better Store Credit offer help the merchant retain the relationship and give the
              customer more value?
            </p>
            <p>
              But while researching the problem, I kept seeing the same pattern. Refund conversion was
              only one part of a much bigger problem.
            </p>
            <p>
              Merchants could issue Store Credit, but using it strategically, automating it,
              understanding what gets redeemed, and turning it into another purchase, was still
              fragmented.
            </p>
            <p>That&apos;s the direction I&apos;m exploring with Pleero.</p>
            <p>
              I&apos;m speaking with Shopify merchants before building the broader platform because I
              want the next version to be shaped by real <span className="text-[#2D7A4F]">Store Credit workflows</span>, not assumptions.
            </p>
            <p>
              If Store Credit is something you&apos;re trying to make work better in your store,
              I&apos;d <span className="text-[#2D7A4F]">love to learn from you</span>.
            </p>
          </div>
          <div className="mt-6 border-t border-black/10 pt-4 text-right">
            <p className="font-handwritten text-lg font-semibold text-[#0B0C0E]">
              Kamalesh
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="bg-[#F7F8FA] px-4 py-16 text-center sm:px-6 sm:py-24 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <h2 className="text-balance text-3xl font-black tracking-tight text-[#0B0C0E] sm:text-5xl">
          Store Credit is already in Shopify.
          <br />
          Now let&apos;s make it work harder.
        </h2>
        <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-[#4E5968]">
          Join the early access waitlist and help shape a better way to use Store Credit for
          retention, refund recovery, and repeat purchases.
        </p>
        <div className="mt-8">
          <PrimaryButton>Join the Early Access Waitlist</PrimaryButton>
        </div>
        <p className="mt-4 text-sm font-medium text-[#687281]">
          Early access. Product research. No spam.
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
            Store Credit Intelligence for Shopify merchants.
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
  return (
    <div className="min-h-screen bg-[#F7F8FA]">
      <Nav />
      <Hero />
      <ProblemSection />
      <OutcomeSection />
      <VisionSection />
      <StepsSection />
      <WaitlistSection />
      <FounderSection />
      <FinalCta />
      <Footer />
    </div>
  );
}
