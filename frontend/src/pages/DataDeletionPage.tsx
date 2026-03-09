export function DataDeletionPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow p-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Data Deletion Request</h1>
          <p className="text-gray-500 text-sm mt-1">Request removal of your data from MarketFlow</p>
        </div>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-gray-800">How to Delete Your Data</h2>
          <p className="text-gray-600 text-sm leading-relaxed">
            If you want to delete all your data from MarketFlow, including your account,
            social media tokens, and all generated content, you can:
          </p>
          <ul className="text-gray-600 text-sm leading-relaxed list-disc pl-5 space-y-2 mt-2">
            <li>
              <strong>Option 1:</strong> Log in to MarketFlow → Go to Profile → Click "Delete Account"
            </li>
            <li>
              <strong>Option 2:</strong> Send an email to{" "}
              <span className="text-orange-500">support@marketflow.io</span>{" "}
              with subject "Data Deletion Request" and your registered email address
            </li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-gray-800">What Gets Deleted</h2>
          <ul className="text-gray-600 text-sm leading-relaxed list-disc pl-5 space-y-1">
            <li>Your account and profile information</li>
            <li>All connected social media tokens (Facebook, Instagram, LinkedIn)</li>
            <li>All generated content (hooks, captions, banners)</li>
            <li>All scheduled and published posts</li>
            <li>Login history and activity logs</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-gray-800">Timeline</h2>
          <p className="text-gray-600 text-sm leading-relaxed">
            We will process your deletion request within <strong>30 days</strong>.
            You will receive a confirmation email once your data has been deleted.
          </p>
        </section>

        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
          <p className="text-orange-700 text-sm">
            <strong>Facebook Users:</strong> You can also revoke MarketFlow's access to your
            Facebook data directly from your Facebook account settings under
            <strong> Settings → Apps and Websites → MarketFlow → Remove</strong>
          </p>
        </div>
      </div>
    </div>
  );
}
