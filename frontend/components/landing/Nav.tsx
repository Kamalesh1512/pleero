import Image from "next/image";
import PrimaryButton from "./shared/PrimaryButton";

export default function Nav({ onGetReport }: { onGetReport: () => void }) {
  return (
    <nav className="sticky top-0 z-50 border-b border-black/10 bg-[#F7F8FA]/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <a href="/" className="flex items-center gap-2.5 text-[#0B0C0E] no-underline">
          <Image src="/app-icon.png" alt="Pleero" width={34} height={34} className="rounded-lg" />
          <span className="text-lg font-bold tracking-tight">Pleero</span>
        </a>
        <div className="hidden items-center gap-7 md:flex">
          <a
            href="#problem"
            className="text-sm font-medium text-[#5D6673] no-underline hover:text-[#0B0C0E]"
          >
            The Problem
          </a>
          <a
            href="#what-youll-see"
            className="text-sm font-medium text-[#5D6673] no-underline hover:text-[#0B0C0E]"
          >
            What You&apos;ll See
          </a>
          <a
            href="#early-access"
            className="text-sm font-medium text-[#5D6673] no-underline hover:text-[#0B0C0E]"
          >
            Early Access
          </a>
        </div>
        <PrimaryButton onClick={onGetReport}>Get My Free Report</PrimaryButton>
      </div>
    </nav>
  );
}