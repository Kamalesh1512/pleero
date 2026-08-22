"use client";

import { useState } from "react";
import Nav from "@/components/landing/Nav";
import Hero from "@/components/landing/Hero";
import ProblemSection from "@/components/landing/ProblemSection";
import OutcomeSection from "@/components/landing/OutcomeSection";
import VisionSection from "@/components/landing/VisionSection";
import StepsSection from "@/components/landing/StepsSection";
import WaitlistSection from "@/components/landing/WaitlistSection";
import FounderSection from "@/components/landing/FounderSection";
import FinalCta from "@/components/landing/FinalCta";
import Footer from "@/components/landing/Footer";
import { track, scrollToWaitlist } from "@/components/landing/shared/analytics";
import StoreCreditReport from "@/components/StoreCreditReport";

export default function LandingPage() {
  const [reportOpen, setReportOpen] = useState(false);
  const [reportedEmail, setReportedEmail] = useState("");

  function openReport() {
    track("report_cta_clicked");
    setReportOpen(true);
  }

  function openWaitlistFromReport(email: string) {
    setReportedEmail(email);
    setReportOpen(false);
    scrollToWaitlist();
  }

  return (
    <div className="min-h-screen bg-[#F7F8FA]">
      <Nav onGetReport={openReport} />
      <Hero onGetReport={openReport} />
      <ProblemSection />
      <OutcomeSection />
      <VisionSection onGetReport={openReport} />
      <StepsSection />
      <WaitlistSection prefillEmail={reportedEmail} />
      <FounderSection />
      <FinalCta onGetReport={openReport} />
      <Footer />
      <StoreCreditReport
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        onContinueToWaitlist={openWaitlistFromReport}
      />
    </div>
  );
}