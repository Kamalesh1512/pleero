export default function SecondaryButton({ children, href }: { children: React.ReactNode; href: string }) {
  return (
    <a
      href={href}
      className="inline-flex min-h-12 items-center justify-center rounded-lg border border-black/10 bg-white px-6 py-3 text-sm font-bold text-[#0B0C0E] no-underline transition hover:border-black/20 hover:bg-[#F7F8FA] focus:outline-none focus:ring-4 focus:ring-[#2D7A4F]/20"
    >
      {children}
    </a>
  );
}