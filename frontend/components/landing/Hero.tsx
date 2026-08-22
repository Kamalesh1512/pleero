import Eyebrow from "./shared/Eyebrow";
import PrimaryButton from "./shared/PrimaryButton";
import SecondaryButton from "./shared/SecondaryButton";
import DashboardPreview from "./DashboardPreview";

export default function Hero({ onGetReport }: { onGetReport: () => void }) {
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