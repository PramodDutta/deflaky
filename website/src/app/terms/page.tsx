import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service — DeFlaky",
  description: "DeFlaky terms of service. The agreement between you and DeFlaky.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <div className="grid-bg min-h-screen">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-3xl font-bold mb-2">Terms of Service</h1>
        <p className="text-sm text-muted mb-10">Last updated: April 8, 2026</p>

        <div className="space-y-8 text-sm leading-relaxed text-muted">
          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">1. Acceptance of Terms</h2>
            <p>
              By accessing or using DeFlaky (&quot;the Service&quot;), including the website at deflaky.com and the DeFlaky CLI,
              you agree to be bound by these Terms of Service. If you do not agree, do not use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">2. Description of Service</h2>
            <p>
              DeFlaky provides a command-line tool and web dashboard for detecting, tracking, and analyzing flaky tests in software projects.
              The CLI is open-source under the MIT license. The dashboard is a hosted SaaS product.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">3. Accounts</h2>
            <ul className="list-disc ml-5 space-y-2">
              <li>You must provide accurate information when creating an account</li>
              <li>You are responsible for maintaining the security of your account and API tokens</li>
              <li>You must notify us immediately of any unauthorized use of your account</li>
              <li>We reserve the right to suspend or terminate accounts that violate these terms</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">4. Acceptable Use</h2>
            <p className="mb-3">You agree not to:</p>
            <ul className="list-disc ml-5 space-y-2">
              <li>Use the Service for any unlawful purpose</li>
              <li>Attempt to gain unauthorized access to the Service or its infrastructure</li>
              <li>Interfere with or disrupt the Service</li>
              <li>Upload malicious content or attempt to exploit vulnerabilities</li>
              <li>Exceed reasonable API rate limits or abuse the push endpoint</li>
              <li>Resell or redistribute the Service without authorization</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">5. Data Ownership</h2>
            <p>
              You retain all rights to your test results data. By using the push feature, you grant DeFlaky a limited license to
              store, process, and display your data solely for the purpose of providing the Service. We do not claim ownership
              of your data and will not use it for purposes unrelated to the Service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">6. Pricing and Payment</h2>
            <p>
              The CLI is free and open-source. The dashboard offers free and paid tiers.
              Paid plans are billed monthly. Prices may change with 30 days notice.
              All fees are non-refundable except as required by law.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">7. API Tokens</h2>
            <p>
              API tokens are secrets that authenticate your CLI to push results. You are responsible for keeping them secure.
              Do not commit tokens to public repositories. Revoke compromised tokens immediately.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">8. Service Availability</h2>
            <p>
              We strive for high availability but do not guarantee 100% uptime. The Service may be temporarily unavailable
              for maintenance or due to factors beyond our control. The CLI operates locally and is not affected by server downtime.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">9. Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by law, DeFlaky shall not be liable for any indirect, incidental, special,
              consequential, or punitive damages resulting from your use of or inability to use the Service, including but
              not limited to loss of data, lost profits, or business interruption.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">10. Open Source Components</h2>
            <p>
              The DeFlaky CLI is released under the MIT License. Third-party open-source components used in the Service
              retain their respective licenses. The dashboard source code is proprietary.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">11. Termination</h2>
            <p>
              You may stop using the Service at any time. We may suspend or terminate your access if you violate these terms.
              Upon termination, your right to use the Service ceases immediately. Data deletion follows our Privacy Policy.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">12. Changes to Terms</h2>
            <p>
              We may modify these terms at any time. Material changes will be communicated via the website or email.
              Continued use after changes constitutes acceptance of the new terms.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">13. Contact</h2>
            <p>
              For questions about these Terms, contact us at{" "}
              <a href="mailto:pramod@thetestingacademy.com" className="text-accent hover:underline">pramod@thetestingacademy.com</a>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
