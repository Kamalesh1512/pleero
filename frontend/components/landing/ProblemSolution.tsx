import AnimatedSection from '@/components/ui/AnimatedSection';

function ProblemItem({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-[#DC2626] text-sm mt-0.5 shrink-0">✗</span>
      <span className="text-sm text-[#374151] leading-[1.5]">{text}</span>
    </div>
  );
}

function SolutionItem({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-[#16A34A] text-sm mt-0.5 shrink-0">✓</span>
      <span className="text-sm text-[#374151] leading-[1.5]">{text}</span>
    </div>
  );
}

export default function ProblemSolution() {
  return (
    <AnimatedSection>
      <section className="py-20 sm:py-24 lg:py-[100px] px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-[1280px] mx-auto">

          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-[30px] sm:text-[38px] lg:text-[42px] font-bold text-[#0B0C0E] mb-3.5 tracking-[-0.02em] text-balance leading-[1.2]">
              Right now, every refund costs you twice
            </h2>
            <p className="text-[15px] sm:text-[17px] text-[#6B7280] max-w-[580px] mx-auto">
              You lose the revenue <em>and</em> you lose the customer. Pleero breaks that cycle.
            </p>
          </div>

          <div className="flex flex-col lg:grid lg:grid-cols-[1fr_auto_1fr] gap-5 lg:gap-6 items-stretch lg:items-center max-w-[900px] mx-auto">

            {/* Without Pleero */}
            <div className="p-6 sm:p-8 rounded-2xl bg-[#FFF5F5] border-[1.5px] border-[#FCA5A5]">
              <div className="text-[12px] font-bold text-[#DC2626] mb-4 uppercase tracking-[0.05em]">
                Without Pleero
              </div>
              <div className="flex flex-col gap-2.5">
                <ProblemItem text="Customer emails asking for refund" />
                <ProblemItem text="You process $100 cash refund" />
                <ProblemItem text="$100 leaves your account permanently" />
                <ProblemItem text="Customer may never return" />
              </div>
            </div>

            {/* Arrow — rotated on mobile, horizontal on desktop */}
            <div className="flex justify-center py-1 lg:py-0">
              <span className="text-2xl lg:text-[28px] text-[#9CA3AF] rotate-90 lg:rotate-0 inline-block">
                →
              </span>
            </div>

            {/* With Pleero */}
            <div className="p-6 sm:p-8 rounded-2xl bg-[#F0FDF4] border-[1.5px] border-[#86EFAC]">
              <div className="text-[12px] font-bold text-[#16A34A] mb-4 uppercase tracking-[0.05em]">
                With Pleero
              </div>
              <div className="flex flex-col gap-2.5">
                <SolutionItem text="Customer emails asking for refund" />
                <SolutionItem text="Pleero emails: 'Take $110 credit instantly'" />
                <SolutionItem text="Customer accepts — $100 stays in your store" />
                <SolutionItem text="Customer shops again with $110 credit" />
              </div>
            </div>
          </div>
        </div>
      </section>
    </AnimatedSection>
  );
}
