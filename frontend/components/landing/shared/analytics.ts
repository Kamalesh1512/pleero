export function track(eventName: string) {
  if (typeof window === "undefined") return;
  window.gtag?.("event", eventName);
}

export function scrollToWaitlist() {
  track("waitlist_cta_clicked");
  document.getElementById("early-access")?.scrollIntoView({ behavior: "smooth", block: "start" });
}