import SectionHeading from "./shared/SectionHeading";
import Card from "./shared/Card";
import { scrollToWaitlist } from "./shared/analytics";

export default function ProblemSection() {
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
            Some came from a return, some from Shopify directly, some from a loyalty app, some
            from a gift card you made by hand. None of it talks to the others.
          </Card>
          <Card title="Money is quietly expiring">
            Unused credit sits in customer accounts until it expires, and nobody&apos;s watching
            the clock or reminding anyone.
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