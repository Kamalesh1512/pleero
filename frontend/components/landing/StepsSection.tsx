import SectionHeading from "./shared/SectionHeading";

const steps = [
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
];

export default function StepsSection() {
  return (
    <section className="bg-[#F7F8FA] px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <SectionHeading title="How Pleero works in three steps" />
        <div className="grid gap-4 md:grid-cols-3">
          {steps.map(([step, title, copy]) => (
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