import Image from "next/image";

export default function Footer() {
  return (
    <footer className="border-t border-white/10 bg-[#0B0C0E] px-4 py-10 text-white sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <Image src="/app-icon.png" alt="Pleero" width={32} height={32} className="rounded-md" />
            <span className="text-lg font-bold">Pleero</span>
          </div>
          <p className="mt-3 max-w-sm text-sm leading-6 text-[#8A9099]">
            Store Credit, finally visible — for Shopify merchants.
          </p>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-3 text-sm">
          <a href="/legal/privacy" className="text-[#C8CED7] no-underline hover:text-white">
            Privacy Policy
          </a>
          <a href="/legal/terms" className="text-[#C8CED7] no-underline hover:text-white">
            Terms
          </a>
          <a href="mailto:hello@pleero.app" className="text-[#C8CED7] no-underline hover:text-white">
            Contact
          </a>
        </div>
      </div>
      <div className="mx-auto mt-8 max-w-7xl border-t border-white/10 pt-6 text-sm text-[#6B7280]">
        © {new Date().getFullYear()} Pleero. All rights reserved.
      </div>
    </footer>
  );
}