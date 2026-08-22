export default function PrimaryButton({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex min-h-12 items-center justify-center rounded-lg bg-[#0B0C0E] px-6 py-3 text-sm font-bold text-white shadow-[0_12px_30px_rgba(11,12,14,0.18)] transition hover:bg-[#1D2023] focus:outline-none focus:ring-4 focus:ring-[#2D7A4F]/25"
    >
      {children}
    </button>
  );
}