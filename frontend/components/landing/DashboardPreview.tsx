import Badge from "./shared/Badge";

export default function DashboardPreview() {
  const rows = [
    ["Credit expiring in 7 days", "$340 at risk", "Win-back nudge suggested"],
    ["Redemption spike detected", "+18% this week", "Mostly Loop-issued credit"],
    ["Cross-tool reconciliation", "3 sources synced", "Shopify native + AfterShip + manual"],
  ];

  return (
    <div className="rounded-2xl border border-black/10 bg-white p-4 shadow-[0_24px_70px_rgba(11,12,14,0.12)] sm:p-5">
      <div className="mb-4 flex items-center justify-between border-b border-black/10 pb-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#7A8492]">
            Concept preview
          </p>
          <h3 className="mt-1 text-lg font-bold text-[#0B0C0E]">Store Credit, finally visible</h3>
        </div>
        <Badge>Shopify</Badge>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {[
          ["Credit issued", "$4,820", "Demo period"],
          ["Redemption rate", "38%", "Illustrative"],
          ["Revenue brought back", "$1,460", "Spend above balance"],
          ["Expiring in 30 days", "$1,240", "Win-back opportunity"],
        ].map(([label, value, note]) => (
          <div key={label} className="rounded-xl border border-black/10 bg-[#F7F8FA] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#7A8492]">
              {label}
            </p>
            <p className="mt-2 text-2xl font-bold tracking-tight text-[#0B0C0E]">{value}</p>
            <p className="mt-1 text-xs text-[#687281]">{note}</p>
          </div>
        ))}
      </div>
      <div className="mt-4 rounded-xl border border-black/10">
        <div className="grid grid-cols-[1fr_auto] gap-3 border-b border-black/10 px-4 py-3">
          <p className="text-sm font-bold text-[#0B0C0E]">Recent Store Credit activity</p>
          <p className="text-xs font-semibold text-[#687281]">Demo</p>
        </div>
        <div className="divide-y divide-black/10">
          {rows.map(([event, status, detail]) => (
            <div key={event} className="grid gap-2 px-4 py-3 text-sm sm:grid-cols-[1.2fr_1fr_1fr]">
              <span className="font-semibold text-[#0B0C0E]">{event}</span>
              <span className="text-[#5D6673]">{status}</span>
              <span className="text-[#5D6673]">{detail}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-4 rounded-xl bg-[#0B0C0E] p-4 text-white">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#9CA3AF]">
          Where your Store Credit comes from
        </p>
        <p className="mt-3 text-sm leading-7 text-[#D5DAE1]">
          Shopify native — 40% · Loop / AfterShip — 25% · Manual gift cards — 20% · Rise.ai — 15%
        </p>
        <p className="mt-2 text-xs text-[#9CA3AF]">One dashboard. Every source.</p>
      </div>
    </div>
  );
}