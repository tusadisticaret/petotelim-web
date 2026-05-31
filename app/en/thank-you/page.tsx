export default function ThankYouPageEN() {
  return (
    <main className="thankyou-page">
      <div className="thankyou-container">
        <a href="/en" className="back-link">
          ← Back to home
        </a>

        <div className="thankyou-card">
          <div className="badge">Submission successful</div>
          <h1 className="thankyou-title">Your request has been received</h1>
          <p>
            Your demo request has been submitted successfully. We will contact
            you as soon as possible.
          </p>
          <p>
            If you would like a faster response, you can also reach us through
            the WhatsApp link on the home page.
          </p>

          <div className="hero-actions" style={{ marginTop: 24 }}>
            <a href="/en" className="primary-button">
              Back to Home
            </a>
            <a href="/en#demo-form" className="outline-button">
              Submit Another Request
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}
