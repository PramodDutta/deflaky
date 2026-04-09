import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — DeFlaky",
  description: "DeFlaky privacy policy. How we collect, use, and protect your data.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <div className="grid-bg min-h-screen">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-sm text-muted mb-10">Last updated: April 8, 2026</p>

        <div className="space-y-8 text-sm leading-relaxed text-muted">
          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">1. Introduction</h2>
            <p>
              DeFlaky (&quot;we&quot;, &quot;our&quot;, &quot;us&quot;) operates the deflaky.com website and the DeFlaky CLI tool.
              This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our services.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">2. Information We Collect</h2>
            <p className="mb-3"><strong className="text-foreground">Account Information:</strong> When you sign in via GitHub or Google OAuth, we receive your name, email address, and profile picture. We do not receive or store your password.</p>
            <p className="mb-3"><strong className="text-foreground">Test Results Data:</strong> When you use the DeFlaky CLI with the <code className="bg-gray-100 px-1 py-0.5 rounded text-xs">--push</code> flag, we receive test names, file paths, pass/fail statuses, durations, and run metadata. We do not receive your source code.</p>
            <p className="mb-3"><strong className="text-foreground">AI Analysis (BYOK):</strong> When you use the AI root cause analysis feature, your AI API keys are stored locally in your browser only. We proxy analysis requests but do not store your API keys on our servers.</p>
            <p><strong className="text-foreground">Usage Data:</strong> We collect standard web analytics (page views, referrer, device type) to improve our service. We do not use third-party tracking scripts.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">3. How We Use Your Information</h2>
            <ul className="list-disc ml-5 space-y-2">
              <li>To provide and maintain the DeFlaky dashboard and API</li>
              <li>To authenticate your identity and secure your account</li>
              <li>To display test results and flakiness metrics in your dashboard</li>
              <li>To send service-related notifications (if enabled)</li>
              <li>To improve and optimize our services</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">4. Data Storage and Security</h2>
            <p>
              Your data is stored on secure cloud infrastructure (Neon PostgreSQL on AWS). All data is encrypted in transit via TLS/HTTPS.
              API tokens are generated per-project and can be revoked at any time. We implement industry-standard security practices
              including parameterized database queries and input validation.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">5. Data Sharing</h2>
            <p>
              We do not sell, trade, or rent your personal information. We do not share your test results data with third parties.
              We may share anonymized, aggregated statistics (e.g., &quot;average FlakeScore across all users&quot;) for marketing or research purposes.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">6. Data Retention</h2>
            <p>
              Test results data is retained for 90 days on the free plan. You may request deletion of your account and all associated data
              at any time by contacting us. Upon account deletion, all data is permanently removed within 30 days.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">7. Your Rights</h2>
            <ul className="list-disc ml-5 space-y-2">
              <li><strong className="text-foreground">Access:</strong> You can access all your test data via the dashboard or API</li>
              <li><strong className="text-foreground">Deletion:</strong> You can request complete deletion of your account and data</li>
              <li><strong className="text-foreground">Export:</strong> You can export your test results via the API</li>
              <li><strong className="text-foreground">Correction:</strong> You can update your profile information through your OAuth provider</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">8. Cookies</h2>
            <p>
              We use essential cookies for authentication session management only. We do not use advertising or tracking cookies.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">9. Children&apos;s Privacy</h2>
            <p>
              Our service is not directed to children under 13. We do not knowingly collect personal information from children.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">10. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of material changes by posting the new policy on this page
              and updating the &quot;Last updated&quot; date.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">11. Contact Us</h2>
            <p>
              If you have questions about this Privacy Policy, contact us at{" "}
              <a href="mailto:pramod@thetestingacademy.com" className="text-accent hover:underline">pramod@thetestingacademy.com</a>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
