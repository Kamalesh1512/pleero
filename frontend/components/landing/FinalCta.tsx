import PrimaryButton from "./shared/PrimaryButton";

export default function FinalCta({ onGetReport }: { onGetReport: () => void }) {
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