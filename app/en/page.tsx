export default function HomeEN() {
  const whatsappLink =
    "https://wa.me/905XXXXXXXXX?text=Hello,%20I%20would%20like%20to%20get%20information%20about%20PetOtelim.";

  return (
    <main className="site-shell">
      <div className="container">
        <header className="header">
          <a href="/en" className="brand">
            <img src="/logo.png" alt="PetOtelim" className="brand-logo" />
            <div className="brand-text">PetOtelim</div>
          </a>

          <nav className="nav">
            <a href="#features" className="nav-link">
              Features
            </a>
            <a href="#pricing" className="nav-link">
              Pricing
            </a>
            <a href="#faq" className="nav-link">
              FAQ
            </a>
            <a href="#demo-form" className="nav-link">
              Demo
            </a>
            <a href="/en/privacy" className="nav-link">
              Privacy
            </a>
            <a href="/en/terms" className="nav-link">
              Terms
            </a>
            <a href="#demo-form" className="nav-button">
              Request Demo
            </a>
            <a href="/" className="lang-button">
              TR
            </a>
          </nav>
        </header>

        <section className="hero">
          <div className="card">
            <div className="badge">Management platform for pet hotels</div>

            <h1 className="hero-title">
              Digitize Your
              <br />
              Pet Hotel
            </h1>

            <p className="hero-text">
              Manage reservations, customer records, boarding operations,
              daily workflow and revenue from one clean dashboard.
            </p>

            <div className="hero-actions">
              <a href="#demo-form" className="primary-button">
                Request Demo
              </a>

              <a
                href={whatsappLink}
                target="_blank"
                rel="noreferrer"
                className="secondary-button"
              >
                Contact via WhatsApp
              </a>

              <a href="#pricing" className="outline-button">
                View Plans
              </a>
            </div>

            <div className="hero-points">
              <span>✓ Easy to use</span>
              <span>✓ Multi-device support</span>
              <span>✓ Scalable structure</span>
            </div>
          </div>

          <div className="dashboard-card">
            <div className="dashboard-label">PetOtelim Dashboard</div>

            <div className="stats-grid">
              {[
                ["Active Boardings", "18"],
                ["Today Check-ins", "6"],
                ["Today Check-outs", "4"],
                ["Monthly Revenue", "₺84,500"],
              ].map(([title, value]) => (
                <div key={title} className="stat-box">
                  <div className="stat-title">{title}</div>
                  <div className="stat-value">{value}</div>
                </div>
              ))}
            </div>

            <div className="benefit-box">
              <div className="stat-title">Main benefit</div>
              <div style={{ marginTop: 8, fontSize: 18, fontWeight: 700 }}>
                More organized operations, clearer tracking
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="section">
          <h2 className="section-title">What Can You Do?</h2>
          <p className="section-subtitle">
            PetOtelim is designed to simplify daily pet hotel operations and help
            businesses run in a more professional way.
          </p>

          <div className="features-grid">
            {[
              [
                "🐶 Boarding Management",
                "Manage check-ins, check-outs and active stays in an organized way.",
              ],
              [
                "👤 Customer & Pet Tracking",
                "Keep customer details, pet information and history in one place.",
              ],
              [
                "📊 Revenue & Reporting",
                "Track daily, weekly and monthly performance more clearly.",
              ],
              [
                "🧾 Payment Tracking",
                "Manage payment flow and collections more consistently.",
              ],
              [
                "📅 Reservation Workflow",
                "Create and manage incoming reservations with ease.",
              ],
              [
                "💼 Scalable Structure",
                "Grow from a small operation to a broader business structure.",
              ],
            ].map(([title, text]) => (
              <div key={title} className="feature-card">
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="section">
          <h2 className="section-title">Why PetOtelim?</h2>
          <p className="section-subtitle">
            Unlike generic tools, PetOtelim is shaped around the actual workflow
            of pet hotel businesses.
          </p>

          <div className="trust-grid">
            {[
              [
                "Built for real usage",
                "Designed around the practical needs of pet hotel operations.",
              ],
              [
                "Professional image",
                "Helps your business look more structured and reliable.",
              ],
              [
                "Ready for growth",
                "Suitable for expansion toward web, mobile and multi-user structures.",
              ],
            ].map(([title, text]) => (
              <div key={title} className="trust-card">
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="pricing" className="section">
          <h2 className="section-title">Pricing</h2>
          <p className="section-subtitle">
            Sample package structure for now. Final pricing can be defined later.
          </p>

          <div className="pricing-grid">
            <div className="pricing-card">
              <h3>Starter</h3>
              <div className="price">Coming Soon</div>
              <div className="price-note">For smaller businesses</div>
              <ul className="pricing-list">
                <li>Basic customer records</li>
                <li>Basic boarding tracking</li>
                <li>Simple reporting</li>
              </ul>
            </div>

            <div className="pricing-card featured">
              <div className="pricing-badge">Recommended</div>
              <h3>Professional</h3>
              <div className="price">Coming Soon</div>
              <div className="price-note">For growing businesses</div>
              <ul className="pricing-list">
                <li>Reservation and operations flow</li>
                <li>Revenue and payment tracking</li>
                <li>More advanced reporting</li>
              </ul>
            </div>

            <div className="pricing-card">
              <h3>Enterprise</h3>
              <div className="price">Custom Offer</div>
              <div className="price-note">For larger structures</div>
              <ul className="pricing-list">
                <li>Custom needs analysis</li>
                <li>Extended support</li>
                <li>Customization options</li>
              </ul>
            </div>
          </div>
        </section>

        <section id="about" className="section">
          <div className="about-card">
            <h2 className="section-title" style={{ marginBottom: 12 }}>
              Built for pet hotels in Türkiye
            </h2>

            <p>
              PetOtelim is a simple and scalable management solution designed
              around the real operational needs of pet hotel businesses.
              Its goal is to help business owners work with a more organized,
              measurable and professional system.
            </p>
          </div>
        </section>

        <section id="faq" className="section">
          <h2 className="section-title">Frequently Asked Questions</h2>

          <div className="faq-grid">
            {[
              [
                "Who is PetOtelim for?",
                "It is suitable for pet hotels, pet boarding businesses and similar stay-focused operations.",
              ],
              [
                "Does it work on mobile devices?",
                "Yes. The structure is being developed with multi-device usage in mind.",
              ],
              [
                "Can I request a demo?",
                "Yes. You can submit a demo request using the form below.",
              ],
              [
                "Is pricing finalized?",
                "The website currently shows a sample structure. Final packages can be clarified later.",
              ],
            ].map(([title, text]) => (
              <div key={title} className="faq-card">
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="demo-form" className="section">
          <div className="card">
            <div className="badge">Demo request form</div>

            <h2 className="section-title" style={{ marginBottom: 12 }}>
              Apply for a PetOtelim demo
            </h2>

            <p className="section-subtitle">
              Leave your details and we will get back to you as soon as possible.
            </p>

            <form
              action="https://formspree.io/f/xyklgdnl"
              method="POST"
              className="form-grid"
            >
              <div className="form-row">
                <div className="form-field">
                  <label htmlFor="name">Full Name</label>
                  <input id="name" name="name" type="text" required placeholder="Full Name" />
                </div>

                <div className="form-field">
                  <label htmlFor="business">Business Name</label>
                  <input
                    id="business"
                    name="business"
                    type="text"
                    required
                    placeholder="Business Name"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-field">
                  <label htmlFor="phone">Phone</label>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    required
                    placeholder="+90 ..."
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="email">Email</label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    placeholder="example@email.com"
                  />
                </div>
              </div>

              <div className="form-field">
                <label htmlFor="message">Message</label>
                <textarea
                  id="message"
                  name="message"
                  rows={5}
                  placeholder="You can briefly describe your business and needs."
                />
              </div>

              <input type="hidden" name="_subject" value="PetOtelim Demo Request" />
              <input
                type="hidden"
                name="_next"
                value="https://petotelim.app/en/thank-you"
              />

              <button type="submit" className="primary-button">
                Submit Demo Request
              </button>

              <div className="form-note">
                By submitting the form, you agree to be contacted regarding your request.
              </div>
            </form>
          </div>
        </section>

        <section className="cta-section">
          <h2 className="section-title" style={{ color: "white", marginTop: 0 }}>
            Get started today
          </h2>

          <p>
            Run your pet hotel more professionally, more clearly and more
            efficiently with PetOtelim.
          </p>

          <a
            href={whatsappLink}
            target="_blank"
            rel="noreferrer"
            className="cta-button"
          >
            Contact via WhatsApp
          </a>
        </section>

        <footer className="footer">
          <div>
            <div>© 2026 PetOtelim. All rights reserved.</div>
            <div className="footer-brandline">
              PetOtelim — Modern management system for pet hotels
            </div>
          </div>

          <div className="footer-links">
            <a href="mailto:info@petotelim.app">info@petotelim.app</a>
            <a href="/en/privacy">Privacy Policy</a>
            <a href="/en/terms">Terms of Use</a>
            <a href="/">Türkçe</a>
          </div>
        </footer>
      </div>
    </main>
  );
}
