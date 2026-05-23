function ProofStat({ number, label }: { number: string; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className="font-mono-brand text-[26px] sm:text-[30px] font-bold text-white mb-1">
        {number}
      </div>
      <div className="text-[12px] sm:text-[13px] text-[#6B7280] leading-[1.4] text-center px-2">
        {label}
      </div>
    </div>
  );
}

export default function SocialProofBar() {
  return (
    <section className="bg-[#0B0C0E] py-8 sm:py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-[1280px] mx-auto grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
        <ProofStat number="15–25%" label="of refunds converted to credit" />
        <ProofStat number="60 sec" label="for credit to appear in customer account" />
        <ProofStat number="5 min" label="to install and go live" />
        <ProofStat number="$99/mo" label="flat — no rev-share, no surprises" />
      </div>
    </section>
  );
}
