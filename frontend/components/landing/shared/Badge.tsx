export default function Badge({
  children,
  compact = false,
}: {
  children: React.ReactNode;
  compact?: boolean;
}) {
  const size = compact ? "px-2.5 py-0.5" : "px-3 py-1";
  return (
    <span className={`rounded-full bg-[#E8F5EE] text-xs font-bold text-[#2D7A4F] ${size}`}>
      {children}
    </span>
  );
}