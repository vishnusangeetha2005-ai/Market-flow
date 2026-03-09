export function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow p-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Privacy Policy</h1>
          <p className="text-gray-500 text-sm mt-1">Last updated: March 2026</p>
        </div>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-gray-800">1. Introduction</h2>
          <p className="text-gray-600 text-sm leading-relaxed">
            MarketFlow ("we", "our", or "us") is committed to protecting your privacy.
            This Privacy Policy explains how we collect, use, and safeguard your information
            when you use our digital marketing automation platform.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-gray-800">2. Information We Collect</h2>
          <ul className="text-gray-600 text-sm leading-relaxed list-disc pl-5 space-y-1">
            <li>Account information (name, email address)</li>
            <li>Business details (company name, phone, address, website)</li>
            <li>Social media access tokens (Facebook, Instagram, LinkedIn)</li>
            <li>Content you create (posts, banners, captions)</li>
            <li>Usage data and login activity</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-gray-800">3. How We Use Your Information</h2>
          <ul className="text-gray-600 text-sm leading-relaxed list-disc pl-5 space-y-1">
            <li>To provide and operate the MarketFlow platform</li>
            <li>To post content to your connected social media accounts</li>
            <li>To generate AI-powered marketing content on your behalf</li>
            <li>To send service-related notifications</li>
            <li>To improve our services</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-gray-800">4. Facebook & Instagram Data</h2>
          <p className="text-gray-600 text-sm leading-relaxed">
            When you connect your Facebook or Instagram account, we receive access tokens
            to post content on your behalf. We only use these tokens to publish content
            you have approved. We do not sell or share your social media data with third parties.
            You can disconnect your accounts at any time from your Profile settings.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-gray-800">5. Data Storage & Security</h2>
          <p className="text-gray-600 text-sm leading-relaxed">
            Your data is stored securely on encrypted servers. Access tokens are stored
            in encrypted form and are never exposed in plain text. We implement
            industry-standard security measures to protect your information.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-gray-800">6. Data Sharing</h2>
          <p className="text-gray-600 text-sm leading-relaxed">
            We do not sell, trade, or share your personal information with third parties
            except as required to provide our services (e.g., OpenAI for content generation,
            Facebook API for posting).
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-gray-800">7. Your Rights</h2>
          <ul className="text-gray-600 text-sm leading-relaxed list-disc pl-5 space-y-1">
            <li>Access your personal data at any time</li>
            <li>Request deletion of your account and data</li>
            <li>Disconnect social media accounts at any time</li>
            <li>Update or correct your information</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-gray-800">8. Data Deletion</h2>
          <p className="text-gray-600 text-sm leading-relaxed">
            You can request deletion of all your data by visiting our{" "}
            <a href="/data-deletion" className="text-orange-500 underline">Data Deletion page</a>{" "}
            or contacting us directly. We will delete your data within 30 days of your request.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-gray-800">9. Contact Us</h2>
          <p className="text-gray-600 text-sm leading-relaxed">
            If you have any questions about this Privacy Policy, please contact us at:{" "}
            <span className="text-orange-500">support@marketflow.io</span>
          </p>
        </section>
      </div>
    </div>
  );
}
