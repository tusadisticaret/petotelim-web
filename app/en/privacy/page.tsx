export default function PrivacyPageEN() {
  return (
    <main className="legal-page">
      <div className="legal-container">
        <a href="/en" className="back-link">
          ← Back to home
        </a>

        <h1 className="legal-title">Privacy Policy</h1>

        <p>
          This privacy policy explains how information collected through the
          PetOtelim mobile application and website is processed.
        </p>

        <h2>Scope</h2>
        <p>
          This policy applies to personal data collected through the PetOtelim
          iOS application and website (petotelim.app).
        </p>

        <h2>Information Collected</h2>
        <p>The app may collect the following information:</p>
        <ul>
          <li>Name, surname and contact details (during business registration)</li>
          <li>Business name and capacity</li>
          <li>Pet owner names and phone numbers</li>
          <li>Stay, grooming and daycare records</li>
          <li>Invoice and accounting data</li>
          <li>App usage statistics</li>
        </ul>

        <h2>Use of Information</h2>
        <p>Collected information is used for the following purposes:</p>
        <ul>
          <li>Providing the pet hotel management service</li>
          <li>Syncing data across devices</li>
          <li>Customer and reservation management</li>
          <li>Invoice and accounting operations</li>
          <li>Improving app performance</li>
        </ul>

        <h2>Subscription and Payments</h2>
        <p>
          PetOtelim Premium subscriptions are processed through the App Store.
          Payment information is managed by Apple and is not stored by PetOtelim.
          You can manage or cancel your subscription through your App Store
          account settings.
        </p>

        <h2>Data Storage</h2>
        <p>
          App data is stored on secure servers using Supabase infrastructure.
          Data is transmitted and stored in encrypted form.
        </p>

        <h2>Third-Party Services</h2>
        <p>The app may use the following third-party services:</p>
        <ul>
          <li>Supabase (data storage and synchronization)</li>
          <li>Apple App Store (subscription and payment processing)</li>
          <li>Anthropic Claude API (AI assistant feature)</li>
        </ul>

        <h2>Data Security</h2>
        <p>
          Reasonable technical and organizational measures are taken to protect
          your data. However, absolute security of data transmission over the
          internet cannot be guaranteed.
        </p>

        <h2>User Rights</h2>
        <p>
          You have the right to request information about, correction of, or
          deletion of your personal data. Please contact us to submit a request.
        </p>

        <h2>Contact</h2>
        <p>
          For questions regarding this privacy policy:{" "}
          <a href="mailto:info@petotelim.app">info@petotelim.app</a>
        </p>
      </div>
    </main>
  );
}