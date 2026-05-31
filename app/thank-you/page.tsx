export default function ThankYouPage() {
  return (
    <main className="thankyou-page">
      <div className="thankyou-container">
        <a href="/" className="back-link">
          ← Ana sayfaya dön
        </a>

        <div className="thankyou-card">
          <div className="badge">Başarılı gönderim</div>
          <h1 className="thankyou-title">Talebiniz alındı</h1>
          <p>
            Demo başvurunuz başarıyla iletildi. En kısa sürede sizinle iletişime
            geçeceğiz.
          </p>
          <p>
            Daha hızlı iletişim isterseniz ana sayfadaki WhatsApp bağlantısı
            üzerinden bize yazabilirsiniz.
          </p>

          <div className="hero-actions" style={{ marginTop: 24 }}>
            <a href="/" className="primary-button">
              Ana Sayfaya Dön
            </a>
            <a href="/#demo-form" className="outline-button">
              Yeni Başvuru Yap
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}
