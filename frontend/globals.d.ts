// Allow side-effect CSS imports (e.g. @shopify/polaris/build/esm/styles.css)
declare module "*.css" {
  const content: Record<string, string>;
  export default content;
}

interface Window {
  gtag?: (command: "event", eventName: string, params?: Record<string, unknown>) => void;
}
