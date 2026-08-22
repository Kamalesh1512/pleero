import SectionHeading from "./shared/SectionHeading";
import Card from "./shared/Card";

export default function OutcomeSection() {
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
            Get an alert when balances are about to expire, with a ready-made list of who to
            remind.
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
            It should <span className="text-[#0B0C0E]">prove the next purchase</span> — or tell
            you exactly why it didn&apos;t.
          </p>
        </div>
      </div>
    </section>
  );
}