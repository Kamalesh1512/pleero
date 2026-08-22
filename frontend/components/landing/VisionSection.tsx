import Eyebrow from "./shared/Eyebrow";
import PrimaryButton from "./shared/PrimaryButton";
import Badge from "./shared/Badge";

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

export default function VisionSection({ onGetReport }: { onGetReport: () => void }) {
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
              one. We&apos;re building the layer that tells you whether it&apos;s working, no
              matter which tool you use to issue it.
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
                <div key={card.label} className="rounded-xl border border-black/10 bg-[#F7F8FA] p-6">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#2D7A4F]">
                      {card.label}
                    </p>
                    {card.comingSoon && <Badge compact>Coming soon</Badge>}
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