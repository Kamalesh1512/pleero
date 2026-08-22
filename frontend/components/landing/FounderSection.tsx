export default function FounderSection() {
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