import LegalLayout from '@/components/LegalLayout';

export default function TermsOfService() {
  return (
    <LegalLayout
      title="Terms of Service"
      lastUpdated="May 16, 2026"
      contactEmail="legal@pleero.app"
    >
      <div className="space-y-6 legal-content">
        {/* Table of Contents */}
        <nav className="bg-gray-50 p-6 rounded-lg">
          <h2 className="text-lg font-semibold mb-3">Table of Contents</h2>
          <ul className="space-y-2">
            <li><a href="#acceptance" className="text-blue-600 hover:underline">1. Acceptance of Terms</a></li>
            <li><a href="#service" className="text-blue-600 hover:underline">2. Service Description</a></li>
            <li><a href="#merchant-responsibilities" className="text-blue-600 hover:underline">3. Merchant Responsibilities</a></li>
            <li><a href="#subscription" className="text-blue-600 hover:underline">4. Subscription Terms</a></li>
            <li><a href="#data-processing" className="text-blue-600 hover:underline">5. Data Processing</a></li>
            <li><a href="#shopify" className="text-blue-600 hover:underline">6. Shopify Integration</a></li>
            <li><a href="#liability" className="text-blue-600 hover:underline">7. Limitation of Liability</a></li>
            <li><a href="#termination" className="text-blue-600 hover:underline">8. Termination Rights</a></li>
            <li><a href="#governing-law" className="text-blue-600 hover:underline">9. Governing Law & Disputes</a></li>
            <li><a href="#regional-compliance" className="text-blue-600 hover:underline">10. Regional Compliance Notes</a></li>
            <li><a href="#miscellaneous" className="text-blue-600 hover:underline">11. Miscellaneous</a></li>
          </ul>
        </nav>

        {/* 1. Acceptance */}
        <section id="acceptance">
          <h2>1. Acceptance of Terms</h2>
          <p>
            By installing, accessing, or using Pleero ("the Service"), you ("Merchant," "you," or "your") agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, do not use the Service.
          </p>
          <p>
            These Terms constitute a legally binding agreement between you and Pleero ("we," "us," or "our"). By clicking "Install" or using the Service, you represent that you have the authority to bind your business to these Terms.
          </p>
        </section>

        {/* 2. Service Description */}
        <section id="service">
          <h2>2. Service Description</h2>
          <p>
            Pleero is a Shopify app that automates the process of sending store credit offers to customers who request refunds. Specifically, Pleero:
          </p>
          <ul>
            <li>Monitors refund requests created in your Shopify store via webhooks</li>
            <li>Sends branded email offers to customers proposing store credit with a bonus percentage (default 10%) instead of cash refunds</li>
            <li>Processes customer acceptances and issues store credit via Shopify's native Store Credit API</li>
            <li>Provides dashboard analytics showing offers sent, accepted, and revenue retained</li>
          </ul>
          <p className="bg-blue-50 border-l-4 border-blue-500 p-4 my-4">
            <strong>Important</strong>: The customer always has the option to decline the store credit offer and receive a cash refund instead. Pleero does not prevent or delay cash refunds. You remain responsible for processing refunds in compliance with applicable laws.
          </p>
        </section>

        {/* 3. Merchant Responsibilities - CRITICAL SECTION */}
        <section id="merchant-responsibilities">
          <h2>3. Merchant Responsibilities</h2>
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 my-4">
            <p className="font-semibold text-lg">
              CRITICAL: You are solely responsible for ensuring your use of Pleero complies with all applicable laws.
            </p>
          </div>

          <h3>3.1 Legal Compliance</h3>
          <p>
            You acknowledge and agree that you are solely responsible for ensuring your use of Pleero complies with all applicable consumer protection, refund, and data privacy laws in your jurisdiction and the jurisdictions where your customers are located, including but not limited to:
          </p>
          <ul>
            <li>
              <strong>United States</strong>: State-specific store credit laws, including:
              <ul className="ml-6 mt-2">
                <li>California Civil Code § 1749.5 (SB 22: store credits under $15 redeemable for cash)</li>
                <li>Vermont 9 V.S.A. § 2464 (cash redemption rights)</li>
                <li>Rhode Island Gen. Laws § 6-13-17 (store credit disclosure requirements)</li>
                <li>Federal Trade Commission Act (deceptive practices)</li>
              </ul>
            </li>
            <li>
              <strong>European Union</strong>: Consumer Rights Directive 2011/83/EU (14-day cooling-off period for distance sales, same-method refund default for online purchases)
            </li>
            <li>
              <strong>United Kingdom</strong>: Consumer Rights Act 2015, Consumer Contracts Regulations 2013
            </li>
            <li>
              <strong>Australia</strong>: Australian Consumer Law (ACL) - statutory guarantees and refund rights
            </li>
            <li>
              <strong>Canada</strong>: Provincial consumer protection acts (e.g., Ontario Consumer Protection Act, Quebec Consumer Protection Act)
            </li>
            <li>
              <strong>India</strong>: Consumer Protection (E-Commerce) Rules 2020 (15-day refund timeline)
            </li>
            <li>Any other jurisdiction where you conduct business</li>
          </ul>

          <h3>3.2 Defective/Damaged Returns</h3>
          <p>
            You must ensure that customers receiving defective, damaged, or incorrect products are offered cash refunds only. Do not use Pleero to send store credit offers for defective product returns, as this may violate consumer protection laws in many jurisdictions.
          </p>
          <p>
            <strong>Your responsibility</strong>: Configure your refund workflows to bypass Pleero for defective items (e.g., use refund reason codes, manually process defective returns before creating refunds in Shopify).
          </p>

          <h3>3.3 Return Policy Disclosure</h3>
          <p>
            Your store's return policy must clearly state that:
          </p>
          <ul>
            <li>Store credit offers are optional and customers can always request cash refunds</li>
            <li>The bonus percentage offered (e.g., "We may offer 10% bonus store credit as an alternative to cash refunds")</li>
            <li>Store credit does not expire (if applicable in your configuration)</li>
            <li>Any regional-specific rights (e.g., California SB 22 cash redemption for credits under $15)</li>
          </ul>

          <h3>3.4 Currency and Pricing</h3>
          <p>
            You acknowledge that Pleero operates in USD and subscription fees are charged in USD. You are responsible for ensuring your Shopify store's currency settings, pricing, and refund practices comply with local regulations (e.g., EU price transparency rules, Canadian dual-language requirements).
          </p>

          <h3>3.5 Customer Consent</h3>
          <p>
            You represent and warrant that you have obtained all necessary consents from your customers to process their personal data as described in our Privacy Policy. Pleero processes customer data on your behalf as a data processor (GDPR terminology) or service provider (CCPA terminology).
          </p>

          <h3>3.6 Indemnification</h3>
          <p>
            You agree to indemnify, defend, and hold harmless Pleero, its officers, employees, and agents from any claims, damages, or expenses (including legal fees) arising from:
          </p>
          <ul>
            <li>Your violation of consumer protection laws or regulations</li>
            <li>Your failure to comply with these Terms</li>
            <li>Your use of Pleero in a manner that violates applicable laws</li>
            <li>Disputes between you and your customers regarding refunds or store credit</li>
          </ul>
        </section>

        {/* 4. Subscription Terms */}
        <section id="subscription">
          <h2>4. Subscription Terms</h2>

          <h3>4.1 Pricing</h3>
          <p>
            Pleero is offered as a monthly subscription for <strong>$99 USD per month</strong>. Pricing is subject to change with 30 days' notice via email.
          </p>

          <h3>4.2 Free Trial</h3>
          <p>
            New merchants receive a <strong>14-day free trial</strong>. No credit card is required to start the trial. If you do not activate a paid subscription before the trial ends, your access to Pleero will be suspended (you will no longer receive offers, but data is retained for 30 days).
          </p>

          <h3>4.3 Billing</h3>
          <p>
            Subscription fees are billed monthly via Shopify's Billing API and appear on your Shopify invoice. By subscribing, you authorize Shopify to charge your payment method on file.
          </p>

          <h3>4.4 Auto-Renewal</h3>
          <p>
            Subscriptions automatically renew each month unless you cancel before the next billing date. You can cancel anytime via the Shopify Admin under Apps → Pleero → Uninstall.
          </p>

          <h3>4.5 No Refunds</h3>
          <p>
            Subscription fees are non-refundable. If you cancel mid-month, you will retain access until the end of your current billing period, but no refund will be issued for unused time. This is standard SaaS practice.
          </p>

          <h3>4.6 Failed Payments</h3>
          <p>
            If a payment fails, Shopify will retry billing. If payment is not received within 7 days, we may suspend your access to Pleero until payment is resolved.
          </p>
        </section>

        {/* 5. Data Processing */}
        <section id="data-processing">
          <h2>5. Data Processing</h2>

          <h3>5.1 Authorization</h3>
          <p>
            By using Pleero, you authorize us to access and process customer data from your Shopify store as necessary to provide the Service. This includes:
          </p>
          <ul>
            <li>Reading order and refund data via Shopify's API</li>
            <li>Sending emails to customers who request refunds</li>
            <li>Issuing store credit via Shopify's Store Credit API</li>
          </ul>

          <h3>5.2 Data Processor Relationship (GDPR)</h3>
          <p>
            For GDPR purposes, you are the data controller and Pleero is the data processor. We process personal data solely on your behalf and in accordance with your instructions (i.e., to send store credit offers).
          </p>

          <h3>5.3 Data Processing Agreement (DPA)</h3>
          <p>
            A Data Processing Agreement (DPA) compliant with GDPR Article 28 is available upon request. Email legal@pleero.app to receive a signed copy.
          </p>

          <h3>5.4 Data Security</h3>
          <p>
            We implement industry-standard security measures as described in our Privacy Policy, including encryption at rest and in transit, access controls, and HMAC verification of webhooks.
          </p>

          <h3>5.5 Data Retention</h3>
          <p>
            We retain customer data (offer records) for 90 days after sending an offer, then automatically delete it. Merchant account data is retained until you uninstall the app or request deletion.
          </p>
        </section>

        {/* 6. Shopify Integration */}
        <section id="shopify">
          <h2>6. Shopify Integration</h2>

          <h3>6.1 Shopify Policies</h3>
          <p>
            Pleero integrates with Shopify's APIs and is subject to Shopify's Terms of Service and API Terms. You acknowledge that:
          </p>
          <ul>
            <li>You must maintain an active Shopify store in good standing to use Pleero</li>
            <li>Shopify may modify its APIs, which could affect Pleero's functionality</li>
            <li>We may suspend service if your Shopify account is terminated or violates Shopify's policies</li>
          </ul>

          <h3>6.2 API Access</h3>
          <p>
            By installing Pleero, you grant us access to the following Shopify API scopes:
          </p>
          <ul>
            <li><code>write_orders</code>: Required to read order and refund data, and to subscribe to refund webhook notifications</li>
            <li><code>write_customers</code>: Required for customer management and account access</li>
            <li><code>write_store_credit_account_transactions</code>: Required to issue store credit to customer accounts via Shopify's Store Credit API</li>
          </ul>
          <p className="bg-blue-50 border-l-4 border-blue-500 p-4 my-4">
            <strong>Minimal Permissions</strong>: We only request the minimum scopes necessary to provide our service. We do not request access to sensitive data like payment information, product inventory, or customer addresses.
          </p>

          <h3>6.3 Uninstallation</h3>
          <p>
            When you uninstall Pleero, we automatically:
          </p>
          <ul>
            <li>Delete your access token from our database</li>
            <li>Stop sending store credit offers</li>
            <li>Retain your data for 30 days (for recovery), then permanently delete it</li>
          </ul>
        </section>

        {/* 7. Limitation of Liability */}
        <section id="liability">
          <h2>7. Limitation of Liability</h2>

          <h3>7.1 No Guarantees</h3>
          <p>
            Pleero is provided "as is" without warranties of any kind. We do not guarantee:
          </p>
          <ul>
            <li>Any specific offer acceptance rate or revenue retention</li>
            <li>Uninterrupted or error-free service</li>
            <li>Compatibility with future Shopify API changes</li>
            <li>That the Service will meet your specific business needs</li>
          </ul>

          <h3>7.2 Disclaimer of Warranties</h3>
          <p>
            TO THE MAXIMUM EXTENT PERMITTED BY LAW, WE DISCLAIM ALL WARRANTIES, EXPRESS OR IMPLIED, INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
          </p>

          <h3>7.3 Liability Cap</h3>
          <p>
            IN NO EVENT SHALL PLEERO'S TOTAL LIABILITY TO YOU EXCEED THE AMOUNT YOU PAID US IN THE 12 MONTHS PRECEDING THE CLAIM (MAXIMUM $1,188 USD).
          </p>

          <h3>7.4 Exclusion of Consequential Damages</h3>
          <p>
            WE SHALL NOT BE LIABLE FOR INDIRECT, INCIDENTAL, CONSEQUENTIAL, SPECIAL, OR PUNITIVE DAMAGES, INCLUDING LOST PROFITS, LOST REVENUE, OR LOST DATA, EVEN IF WE WERE ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.
          </p>

          <h3>7.5 Merchant Responsibility</h3>
          <p>
            You remain solely responsible for:
          </p>
          <ul>
            <li>All refund obligations to your customers under applicable law</li>
            <li>Compliance with consumer protection laws</li>
            <li>Disputes with customers regarding refunds or store credit</li>
            <li>Your use of Pleero in violation of applicable laws</li>
          </ul>
        </section>

        {/* 8. Termination */}
        <section id="termination">
          <h2>8. Termination Rights</h2>

          <h3>8.1 Termination by Merchant</h3>
          <p>
            You may cancel your subscription and terminate these Terms at any time by uninstalling Pleero from your Shopify admin. Termination is effective immediately, but you will retain access until the end of your current billing period (no refunds).
          </p>

          <h3>8.2 Termination by Pleero</h3>
          <p>
            We may suspend or terminate your access to Pleero immediately if:
          </p>
          <ul>
            <li>You fail to pay subscription fees</li>
            <li>You violate these Terms</li>
            <li>You engage in fraudulent or illegal activity</li>
            <li>Your Shopify account is terminated</li>
            <li>We cease operations (with 30 days' notice)</li>
          </ul>

          <h3>8.3 Effect of Termination</h3>
          <p>
            Upon termination:
          </p>
          <ul>
            <li>We will stop sending store credit offers</li>
            <li>You will lose access to the Pleero dashboard</li>
            <li>Your data will be retained for 30 days (for recovery), then permanently deleted</li>
            <li>Billing records will be retained for 7 years (legal compliance)</li>
          </ul>
        </section>

        {/* 9. Governing Law */}
        <section id="governing-law">
          <h2>9. Governing Law & Dispute Resolution</h2>

          <h3>9.1 Governing Law</h3>
          <p>
            These Terms are governed by the laws of the State of Delaware, United States, without regard to conflict of law principles. If you are located in a jurisdiction with stronger consumer protection laws, those laws shall apply to the extent required.
          </p>

          <h3>9.2 Dispute Resolution</h3>
          <p>
            Any disputes arising from these Terms shall be resolved through binding arbitration in accordance with the Commercial Arbitration Rules of the American Arbitration Association (AAA). Arbitration shall take place in Delaware or remotely via videoconference.
          </p>

          <h3>9.3 Exceptions</h3>
          <p>
            Either party may seek injunctive relief in court to prevent irreparable harm (e.g., intellectual property violations, data breaches).
          </p>

          <h3>9.4 Class Action Waiver</h3>
          <p>
            YOU AGREE TO RESOLVE DISPUTES INDIVIDUALLY AND WAIVE YOUR RIGHT TO PARTICIPATE IN CLASS ACTION LAWSUITS OR CLASS-WIDE ARBITRATION.
          </p>
        </section>

        {/* 10. Regional Compliance Notes */}
        <section id="regional-compliance">
          <h2>10. Regional Compliance Notes (Informational)</h2>
          <p>
            The following is a non-exhaustive summary of key regional consumer protection rules that may apply to your use of Pleero. This is for informational purposes only and does not constitute legal advice. You are responsible for consulting legal counsel in your jurisdiction.
          </p>

          <h3>10.1 United States</h3>
          <ul>
            <li>
              <strong>California (SB 22)</strong>: Store credit balances under $15 must be redeemable for cash on demand (Civil Code § 1749.5). Failure to comply can result in penalties ($250-$500 per violation).
            </li>
            <li>
              <strong>Vermont</strong>: Store credit must be redeemable for cash if balance is under $1 (9 V.S.A. § 2464).
            </li>
            <li>
              <strong>Rhode Island</strong>: Gift certificates and store credit must disclose expiration dates (none for Pleero unless you configure one).
            </li>
          </ul>

          <h3>10.2 European Union & United Kingdom</h3>
          <ul>
            <li>
              <strong>14-day cooling-off period</strong>: For distance sales (online purchases), customers have an unconditional right to return within 14 days and receive a full refund via the same payment method. Store credit offers do not override this right.
            </li>
            <li>
              <strong>Same-method refund default</strong>: Refunds should default to the original payment method unless the customer explicitly chooses store credit (Consumer Rights Directive 2011/83/EU).
            </li>
            <li>
              <strong>Pleero compliance</strong>: Our offer page always displays the cash refund option with equal prominence and requires active customer consent for store credit.
            </li>
          </ul>

          <h3>10.3 Australia</h3>
          <ul>
            <li>
              <strong>Australian Consumer Law (ACL)</strong>: Statutory guarantees apply to all products. If a product is faulty, customers have the right to a repair, replacement, or refund. Store credit cannot replace these rights for defective goods.
            </li>
            <li>
              <strong>Pleero compliance</strong>: Do not use Pleero for defective product returns.
            </li>
          </ul>

          <h3>10.4 Canada</h3>
          <ul>
            <li>
              <strong>Provincial variations</strong>: Each province has its own consumer protection laws. Key considerations:
              <ul className="ml-6 mt-2">
                <li>Quebec: French-language disclosures required</li>
                <li>British Columbia: 10-day cooling-off period for distance sales</li>
                <li>Ontario: Clear refund policy disclosure required</li>
              </ul>
            </li>
          </ul>

          <h3>10.5 India</h3>
          <ul>
            <li>
              <strong>Consumer Protection (E-Commerce) Rules 2020</strong>: Refunds must be processed within 15 days of return. Store credit offers do not extend this timeline.
            </li>
          </ul>
        </section>

        {/* 11. Miscellaneous */}
        <section id="miscellaneous">
          <h2>11. Miscellaneous</h2>

          <h3>11.1 Entire Agreement</h3>
          <p>
            These Terms, together with our Privacy Policy, constitute the entire agreement between you and Pleero regarding the Service and supersede all prior agreements.
          </p>

          <h3>11.2 Amendments</h3>
          <p>
            We may modify these Terms at any time. Material changes will be communicated via email with 30 days' notice. Your continued use after changes are posted constitutes acceptance.
          </p>

          <h3>11.3 Severability</h3>
          <p>
            If any provision of these Terms is found invalid or unenforceable, the remaining provisions shall remain in full force and effect.
          </p>

          <h3>11.4 No Waiver</h3>
          <p>
            Our failure to enforce any provision of these Terms does not constitute a waiver of that provision.
          </p>

          <h3>11.5 Assignment</h3>
          <p>
            You may not assign or transfer these Terms without our written consent. We may assign these Terms in connection with a merger, acquisition, or sale of assets.
          </p>

          <h3>11.6 Force Majeure</h3>
          <p>
            We are not liable for delays or failures caused by events beyond our reasonable control (e.g., natural disasters, pandemics, internet outages, Shopify API downtime).
          </p>

          <h3>11.7 Contact</h3>
          <p>
            For questions about these Terms, contact us at:
          </p>
          <div className="bg-gray-50 p-6 rounded-lg my-4">
            <p className="font-semibold">Pleero Legal Team</p>
            <p>Email: <a href="mailto:legal@pleero.app" className="text-blue-600 hover:underline">legal@pleero.app</a></p>
            <p>Website: <a href="https://pleero.app" className="text-blue-600 hover:underline">pleero.app</a></p>
          </div>
        </section>

        {/* Summary */}
        <div className="bg-blue-50 border-l-4 border-blue-500 p-6 my-8">
          <h3 className="font-semibold text-lg mb-2">Key Takeaways</h3>
          <ul className="space-y-1">
            <li>✓ You are responsible for ensuring Pleero complies with your local consumer protection laws</li>
            <li>✓ Do not use Pleero for defective/damaged product returns</li>
            <li>✓ Your return policy must disclose that store credit offers are optional</li>
            <li>✓ $99/month USD, 14-day free trial, cancel anytime</li>
            <li>✓ No refunds for partial months (standard SaaS)</li>
            <li>✓ We do not guarantee specific results (acceptance rates, revenue)</li>
            <li>✓ Liability capped at 12 months fees ($1,188 max)</li>
            <li>✓ Binding arbitration for disputes</li>
          </ul>
        </div>
      </div>
    </LegalLayout>
  );
}
