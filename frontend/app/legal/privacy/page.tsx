import LegalLayout from '@/components/LegalLayout';

export default function PrivacyPolicy() {
  return (
    <LegalLayout
      title="Privacy Policy"
      lastUpdated="May 16, 2026"
      contactEmail="privacy@pleero.app"
    >
      <div className="space-y-6 legal-content">
        {/* Table of Contents */}
        <nav className="bg-gray-50 p-6 rounded-lg">
          <h2 className="text-lg font-semibold mb-3">Table of Contents</h2>
          <ul className="space-y-2">
            <li><a href="#overview" className="text-blue-600 hover:underline">1. Overview</a></li>
            <li><a href="#data-collection" className="text-blue-600 hover:underline">2. Data Collection & Use</a></li>
            <li><a href="#third-parties" className="text-blue-600 hover:underline">3. Third-Party Services</a></li>
            <li><a href="#customer-rights" className="text-blue-600 hover:underline">4. Customer Rights (Global)</a></li>
            <li><a href="#regional" className="text-blue-600 hover:underline">5. Regional Disclosures</a></li>
            <li><a href="#cookies" className="text-blue-600 hover:underline">6. Cookies & Tracking</a></li>
            <li><a href="#security" className="text-blue-600 hover:underline">7. Data Security</a></li>
            <li><a href="#retention" className="text-blue-600 hover:underline">8. Data Retention</a></li>
            <li><a href="#international" className="text-blue-600 hover:underline">9. International Transfers</a></li>
            <li><a href="#changes" className="text-blue-600 hover:underline">10. Changes to This Policy</a></li>
            <li><a href="#contact" className="text-blue-600 hover:underline">11. Contact Us</a></li>
          </ul>
        </nav>

        {/* 1. Overview */}
        <section id="overview">
          <h2>1. Overview</h2>
          <p>
            Pleero ("we," "us," "our") is a Shopify app that sends store credit offers to customers who request refunds. This Privacy Policy explains how we collect, use, and protect personal information when merchants use our app and when their customers interact with our store credit offers.
          </p>
          <p>
            This policy applies to:
          </p>
          <ul>
            <li><strong>Merchants</strong>: Shopify store owners who install and use Pleero</li>
            <li><strong>Customers</strong>: End customers of merchant stores who receive store credit offers</li>
          </ul>
          <p>
            We are committed to protecting your privacy and complying with global data protection laws, including GDPR (EU/UK), CCPA (California), Australian Privacy Principles, PIPEDA (Canada), and other applicable regulations.
          </p>
        </section>

        {/* 2. Data Collection & Use */}
        <section id="data-collection">
          <h2>2. Data Collection & Use</h2>

          <h3>2.1 Merchant Data</h3>
          <p>When you install Pleero on your Shopify store, we collect and process:</p>
          <ul>
            <li><strong>Store information</strong>: Shop domain, store name, timezone, currency</li>
            <li><strong>Authentication data</strong>: Shopify access tokens (encrypted at rest)</li>
            <li><strong>Settings</strong>: Bonus percentage, bonus cap, brand color preferences</li>
            <li><strong>Usage data</strong>: Number of offers sent, acceptance rates, revenue retained</li>
            <li><strong>Contact information</strong>: Email address associated with your Shopify account</li>
          </ul>
          <p><strong>How we use this data</strong>:</p>
          <ul>
            <li>Provide and operate the Pleero service</li>
            <li>Send store credit offers on your behalf</li>
            <li>Display dashboard metrics</li>
            <li>Communicate important service updates</li>
            <li>Process subscription billing via Shopify</li>
            <li>Improve our service and develop new features</li>
          </ul>
          <p><strong>Legal basis (GDPR)</strong>: Legitimate interest (service provision) and contractual necessity.</p>

          <h3>2.2 Customer Data</h3>
          <p>When a customer of a merchant store requests a refund, we collect and process:</p>
          <ul>
            <li><strong>Order information</strong>: Order ID, refund amount, product details</li>
            <li><strong>Customer information</strong>: Email address, first name</li>
            <li><strong>Offer interaction data</strong>: Whether the customer accepted or declined the offer</li>
            <li><strong>Technical data</strong>: IP address, browser type, device type (for fraud prevention)</li>
          </ul>
          <p><strong>How we use this data</strong>:</p>
          <ul>
            <li>Send personalized store credit offer emails</li>
            <li>Process offer acceptances and issue store credit via Shopify</li>
            <li>Prevent fraud and abuse</li>
            <li>Improve offer acceptance rates</li>
          </ul>
          <p><strong>Legal basis (GDPR)</strong>: Legitimate interest (refund processing), consent (where required), and contractual necessity.</p>
          <p className="bg-yellow-50 border-l-4 border-yellow-400 p-4 my-4">
            <strong>Important</strong>: We do NOT duplicate or permanently store Shopify customer data. We pull order and customer information from the merchant's Shopify store via API only when needed to send offers. Offer records (email, refund amount, acceptance status) are retained for 90 days, then deleted.
          </p>
        </section>

        {/* 3. Third-Party Services */}
        <section id="third-parties">
          <h2>3. Third-Party Services (GDPR Sub-processors)</h2>
          <p>We share data with the following third-party service providers to operate Pleero:</p>

          <h3>3.1 Shopify Inc.</h3>
          <ul>
            <li><strong>Purpose</strong>: Core platform integration, authentication, API access</li>
            <li><strong>Data shared</strong>: Store domain, access tokens, order data, customer data</li>
            <li><strong>Location</strong>: Canada (GDPR-compliant via Standard Contractual Clauses)</li>
            <li><strong>Privacy Policy</strong>: <a href="https://www.shopify.com/legal/privacy" target="_blank" rel="noopener noreferrer">shopify.com/legal/privacy</a></li>
          </ul>

          <h3>3.2 Resend</h3>
          <ul>
            <li><strong>Purpose</strong>: Transactional email delivery (store credit offers)</li>
            <li><strong>Data shared</strong>: Customer email addresses, offer content</li>
            <li><strong>Location</strong>: United States (GDPR-compliant, DPA available)</li>
            <li><strong>Privacy Policy</strong>: <a href="https://resend.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer">resend.com/legal/privacy-policy</a></li>
          </ul>

          <h3>3.3 DigitalOcean LLC</h3>
          <ul>
            <li><strong>Purpose</strong>: Cloud hosting and infrastructure</li>
            <li><strong>Data shared</strong>: All data stored in our application database</li>
            <li><strong>Location</strong>: United States (GDPR-compliant, DPA available)</li>
            <li><strong>Privacy Policy</strong>: <a href="https://www.digitalocean.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer">digitalocean.com/legal/privacy-policy</a></li>
          </ul>

          <h3>3.4 Cloudflare Inc.</h3>
          <ul>
            <li><strong>Purpose</strong>: CDN, DDoS protection, DNS management</li>
            <li><strong>Data shared</strong>: IP addresses, request metadata</li>
            <li><strong>Location</strong>: Global network (GDPR-compliant, DPA available)</li>
            <li><strong>Privacy Policy</strong>: <a href="https://www.cloudflare.com/privacypolicy/" target="_blank" rel="noopener noreferrer">cloudflare.com/privacypolicy/</a></li>
          </ul>

          <p className="mt-4">
            <strong>Data Processing Agreements</strong>: We maintain Data Processing Agreements (DPAs) with all sub-processors as required by GDPR Article 28. Merchants may request a copy by emailing privacy@pleero.app.
          </p>
        </section>

        {/* 4. Customer Rights */}
        <section id="customer-rights">
          <h2>4. Customer Rights (Global)</h2>
          <p>
            Depending on your location, you have various rights regarding your personal data:
          </p>

          <h3>4.1 European Union & United Kingdom (GDPR)</h3>
          <ul>
            <li><strong>Right to access</strong>: Request a copy of your personal data</li>
            <li><strong>Right to rectification</strong>: Correct inaccurate or incomplete data</li>
            <li><strong>Right to erasure</strong>: Request deletion of your data ("right to be forgotten")</li>
            <li><strong>Right to data portability</strong>: Receive your data in a structured, machine-readable format</li>
            <li><strong>Right to object</strong>: Object to processing based on legitimate interests</li>
            <li><strong>Right to restrict processing</strong>: Limit how we use your data</li>
            <li><strong>Right to withdraw consent</strong>: Where processing is based on consent</li>
            <li><strong>Right to lodge a complaint</strong>: Contact your local data protection authority</li>
          </ul>

          <h3>4.2 California (CCPA/CPRA)</h3>
          <ul>
            <li><strong>Right to know</strong>: What personal information we collect and how it's used</li>
            <li><strong>Right to delete</strong>: Request deletion of your personal information</li>
            <li><strong>Right to opt-out</strong>: We do not sell personal information</li>
            <li><strong>Right to non-discrimination</strong>: We will not discriminate for exercising your rights</li>
          </ul>

          <h3>4.3 Australia (Australian Privacy Principles)</h3>
          <ul>
            <li><strong>Right to access</strong>: Request access to your personal information</li>
            <li><strong>Right to correction</strong>: Request correction of inaccurate data</li>
            <li><strong>Right to complain</strong>: Lodge a complaint with the Office of the Australian Information Commissioner (OAIC)</li>
          </ul>

          <h3>4.4 Canada (PIPEDA)</h3>
          <ul>
            <li><strong>Right to access</strong>: Request access to your personal information</li>
            <li><strong>Right to correction</strong>: Request correction of inaccurate data</li>
            <li><strong>Right to withdraw consent</strong>: Where processing is based on consent</li>
          </ul>

          <h3>4.5 India</h3>
          <ul>
            <li><strong>Right to access</strong>: Request access to your personal data</li>
            <li><strong>Right to deletion</strong>: Request deletion of your data upon request</li>
          </ul>

          <p className="mt-4">
            <strong>How to exercise your rights</strong>: Contact us at privacy@pleero.app with your request. We will respond within 30 days (or as required by applicable law). For customer data, you may also contact the merchant whose store you interacted with.
          </p>
        </section>

        {/* 5. Regional Disclosures */}
        <section id="regional">
          <h2>5. Regional Disclosures</h2>

          <h3>5.1 California Residents (SB 22 Disclosure)</h3>
          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 my-4">
            <p className="font-semibold">
              California SB 22 Store Credit Disclosure:
            </p>
            <p>
              California customers: If you accept a store credit offer and the credit balance is less than $15, you have the right to redeem it for cash on demand. To request cash redemption, contact the merchant whose store issued the credit. This right is guaranteed under California Civil Code § 1749.5.
            </p>
          </div>

          <h3>5.2 European Union & United Kingdom</h3>
          <p>
            <strong>Data Protection Authority</strong>: If you are located in the EU or UK and believe we have not adequately addressed your privacy concerns, you have the right to lodge a complaint with your local data protection authority. A list of authorities is available at{' '}
            <a href="https://edpb.europa.eu/about-edpb/board/members_en" target="_blank" rel="noopener noreferrer">
              edpb.europa.eu
            </a>.
          </p>
          <p>
            <strong>Legal basis for processing</strong>: We process personal data based on legitimate interest (service provision), contractual necessity, and consent where required by GDPR Article 6.
          </p>

          <h3>5.3 Australia</h3>
          <p>
            <strong>Complaints</strong>: If you wish to make a complaint about how we handle your personal information, please contact us at privacy@pleero.app. If you are not satisfied with our response, you may contact the Office of the Australian Information Commissioner (OAIC) at{' '}
            <a href="https://www.oaic.gov.au" target="_blank" rel="noopener noreferrer">oaic.gov.au</a>.
          </p>
        </section>

        {/* 6. Cookies & Tracking */}
        <section id="cookies">
          <h2>6. Cookies & Tracking</h2>
          <p>
            Pleero uses minimal cookies and tracking technologies:
          </p>

          <h3>6.1 Essential Cookies</h3>
          <ul>
            <li><strong>Session management</strong>: Required for merchant authentication and App Bridge integration</li>
            <li><strong>Security</strong>: CSRF protection tokens</li>
            <li>These cookies are strictly necessary to provide the service and cannot be disabled.</li>
          </ul>

          <h3>6.2 Analytics (Optional)</h3>
          <p>
            We do NOT use advertising or analytics cookies on customer-facing offer pages. Our landing page (pleero.app) may use Google Analytics with IP anonymization enabled. You can opt out by installing browser extensions like uBlock Origin or Privacy Badger.
          </p>

          <h3>6.3 Third-Party Cookies</h3>
          <p>
            When you access Pleero through Shopify Admin, Shopify may set its own cookies. Please review{' '}
            <a href="https://www.shopify.com/legal/cookies" target="_blank" rel="noopener noreferrer">
              Shopify's Cookie Policy
            </a>.
          </p>
        </section>

        {/* 7. Data Security */}
        <section id="security">
          <h2>7. Data Security</h2>
          <p>
            We implement industry-standard security measures to protect your data:
          </p>
          <ul>
            <li><strong>Encryption at rest</strong>: All Shopify access tokens are encrypted using Fernet (AES-256)</li>
            <li><strong>Encryption in transit</strong>: All data transmission uses HTTPS with TLS 1.3</li>
            <li><strong>Access controls</strong>: Database and Redis ports are never exposed outside Docker network</li>
            <li><strong>HMAC verification</strong>: All Shopify webhook requests are cryptographically verified</li>
            <li><strong>DDoS protection</strong>: Cloudflare WAF and rate limiting</li>
            <li><strong>XSS protection</strong>: Content Security Policy headers on all pages</li>
          </ul>
          <p>
            However, no method of transmission over the internet is 100% secure. While we strive to protect your data, we cannot guarantee absolute security.
          </p>
        </section>

        {/* 8. Data Retention */}
        <section id="retention">
          <h2>8. Data Retention</h2>
          <p>
            We retain data only as long as necessary to provide the service:
          </p>
          <ul>
            <li><strong>Offer records</strong>: 90 days after offer is sent (includes email, refund amount, acceptance status)</li>
            <li><strong>Application logs</strong>: 30 days (for debugging and fraud prevention)</li>
            <li><strong>Merchant account data</strong>: Retained until you uninstall the app or request deletion</li>
            <li><strong>Billing records</strong>: Retained for 7 years to comply with tax and accounting regulations</li>
          </ul>
          <p>
            When you uninstall Pleero, we automatically delete your merchant data within 30 days, except for billing records (retained for legal compliance). To request immediate deletion, email privacy@pleero.app.
          </p>
        </section>

        {/* 9. International Transfers */}
        <section id="international">
          <h2>9. International Transfers</h2>
          <p>
            Pleero operates globally and processes data in the United States. If you are located outside the U.S., your data may be transferred to and processed in the United States.
          </p>
          <p>
            <strong>GDPR Compliance</strong>: For EU/UK personal data, we use Standard Contractual Clauses (SCCs) approved by the European Commission to ensure adequate protection. We also rely on Shopify's GDPR-compliant infrastructure for data processing.
          </p>
          <p>
            <strong>Data Protection Impact</strong>: We have conducted transfer impact assessments and implemented supplementary measures (encryption, access controls) to protect data transferred outside the EU/UK.
          </p>
        </section>

        {/* 10. Changes to This Policy */}
        <section id="changes">
          <h2>10. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time to reflect changes in our practices or legal requirements. Material changes will be communicated via:
          </p>
          <ul>
            <li>Email notification to merchants</li>
            <li>Banner notice in the Pleero dashboard</li>
            <li>Updated "Last Updated" date at the top of this page</li>
          </ul>
          <p>
            Your continued use of Pleero after changes are posted constitutes acceptance of the updated policy.
          </p>
        </section>

        {/* 11. Contact Us */}
        <section id="contact">
          <h2>11. Contact Us</h2>
          <p>
            For questions, concerns, or requests regarding this Privacy Policy or your personal data, please contact us:
          </p>
          <div className="bg-gray-50 p-6 rounded-lg my-4">
            <p className="font-semibold">Pleero Privacy Team</p>
            <p>Email: <a href="mailto:privacy@pleero.app" className="text-blue-600 hover:underline">privacy@pleero.app</a></p>
            <p>Website: <a href="https://pleero.app" className="text-blue-600 hover:underline">pleero.app</a></p>
          </div>
          <p>
            We will respond to all requests within 30 days (or as required by applicable law).
          </p>
        </section>

        {/* Summary for easy reference */}
        <div className="bg-green-50 border-l-4 border-green-500 p-6 my-8">
          <h3 className="font-semibold text-lg mb-2">Quick Summary</h3>
          <ul className="space-y-1">
            <li>✓ We collect minimal data needed to send store credit offers</li>
            <li>✓ Customer data is NOT permanently stored (90-day retention)</li>
            <li>✓ We do NOT sell your data to third parties</li>
            <li>✓ We use encryption and security best practices</li>
            <li>✓ You have rights to access, delete, and control your data</li>
            <li>✓ California customers: Store credits under $15 can be redeemed for cash</li>
            <li>✓ GDPR, CCPA, and Australian Privacy Principles compliant</li>
          </ul>
        </div>
      </div>
    </LegalLayout>
  );
}
