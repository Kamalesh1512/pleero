import Eyebrow from "./shared/Eyebrow";
import WaitlistForm from "./WaitlistForm";

export default function WaitlistSection({ prefillEmail }: { prefillEmail?: string }) {
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
            native, Loop, AfterShip, ReturnGO, Rise.ai, or manually — before we build anything
            else. Tell us what you wish you could see.
          </p>
        </div>
        <WaitlistForm prefillEmail={prefillEmail} />
      </div>
    </section>
  );
}