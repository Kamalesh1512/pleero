export default function Card({
  title,
  children,
  muted = false,
}: {
  title: string;
  children: React.ReactNode;
  muted?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-6 ${muted ? "border-black/10 bg-[#F7F8FA]" : "border-black/10 bg-white"}`}
    >
      <h3 className="text-lg font-bold tracking-tight text-[#0B0C0E]">{title}</h3>
      <p className="mt-3 leading-7 text-[#5D6673]">{children}</p>
    </div>
  );
}