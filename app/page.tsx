export default function Home() {
  const whatsappLink =
    "https://wa.me/905XXXXXXXXX?text=Merhaba,%20PetOtelim%20hakkında%20bilgi%20almak%20istiyorum.";

  return (
    <main className="site-shell">
      <div className="container">
        <header className="header">
          <a href="/" className="brand">
            <img src="/logo.png" alt="PetOtelim" className="brand-logo" />
            <div className="brand-text">PetOtelim</div>
          </a>

          <nav className="nav">
            <a href="#features" className="nav-link">Özellikler</a>
            <a href="#pricing" className="nav-link">Fiyatlandırma</a>
            <a href="#faq" className="nav-link">SSS</a>
            <a href="#demo-form" className="nav-link">Demo</a>
            <a href="/privacy" className="nav-link">Gizlilik</a>
            <a href="/terms" className="nav-link">Şartlar</a>
            <a href="/login" className="nav-link" style={{ fontWeight: 600, color: "#007AFF" }}>
              Giriş Yap
            </a>
            <a href="#demo-form" className="nav-button">Demo Talep Et</a>
            <a href="/en" className="lang-button">EN</a>
          </nav>
        </header>

        <section className="hero">
          <div className="card">
            <div className="badge">Pet oteller için yönetim platformu</div>
            <h1 className="hero-title">
              Pet Otelinizi<br />Dijitalleştirin
            </h1>
            <p className="hero-text">
              Rezervasyon, müşteri takibi, konaklama yönetimi, operasyon ve gelir
              kontrolünü tek panelden yönetin.
            </p>
            <div className="hero-actions">
              <a href="#demo-form" className="primary-button">Demo Talep Et</a>
              <a href={whatsappLink} target="_blank" rel="noreferrer" className="secondary-button">
                WhatsApp ile İletişime Geç
              </a>
              <a href="#pricing" className="outline-button">Paketleri Gör</a>
            </div>
            <div className="hero-points">
              <span>✓ Kolay kullanım</span>
              <span>✓ Çoklu cihaz desteği</span>
              <span>✓ Büyümeye uygun yapı</span>
            </div>
          </div>

          <div className="dashboard-card">
            <div className="dashboard-label">PetOtelim Dashboard</div>
            <div className="stats-grid">
              {[
                ["Aktif Konaklama", "18"],
                ["Bugün Giriş", "6"],
                ["Bugün Çıkış", "4"],
                ["Aylık Ciro", "₺84.500"],
              ].map(([title, value]) => (
                <div key={title} className="stat-box">
                  <div className="stat-title">{title}</div>
                  <div className="stat-value">{value}</div>
                </div>
              ))}
            </div>
            <div className="benefit-box">
              <div className="stat-title">Öne çıkan fayda</div>
              <div style={{ marginTop: 8, fontSize: 18, fontWeight: 700 }}>
                Daha düzenli operasyon, daha net takip
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="section">
          <h2 className="section-title">Neler Yapabilirsiniz?</h2>
          <p className="section-subtitle">
            PetOtelim, pet otellerin günlük operasyonunu sadeleştirmek ve
            daha profesyonel hale getirmek için tasarlandı.
          </p>
          <div className="features-grid">
            {[
              ["🐶 Konaklama Yönetimi", "Giriş-çıkış süreçlerini ve aktif konaklamaları düzenli şekilde yönetin."],
              ["👤 Müşteri ve Pet Takibi", "Müşteri bilgilerini, evcil hayvan detaylarını ve geçmiş işlemleri tek yerde görün."],
              ["📊 Gelir ve Raporlama", "Günlük, haftalık ve aylık performansınızı daha net takip edin."],
              ["🧾 Tahsilat ve Takip", "Ödeme ve tahsilat akışlarını daha düzenli yönetin."],
              ["📅 Rezervasyon Akışı", "Yeni rezervasyonları hızlıca oluşturun ve yönetin."],
              ["💼 Büyümeye Uygun Yapı", "Küçük işletmeden çok lokasyonlu yapıya doğru ölçeklenin."],
            ].map(([title, text]) => (
              <div key={title} className="feature-card">
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="section">
          <h2 className="section-title">Neden PetOtelim?</h2>
          <p className="section-subtitle">
            Genel amaçlı sistemlerden farklı olarak, pet otel işletmelerinin gerçek
            operasyon mantığına göre düşünülmüş bir yapı sunar.
          </p>
          <div className="trust-grid">
            {[
              ["Gerçek kullanım odaklı", "Pet otel süreçlerine uygun sade ve işlevsel ekranlar sunar."],
              ["Kurumsal görünüm", "İşletmenize daha profesyonel bir operasyon düzeni kazandırır."],
              ["Geleceğe hazır", "Web, mobil ve çok kullanıcılı yapıya doğru gelişmeye uygundur."],
            ].map(([title, text]) => (
              <div key={title} className="trust-card">
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            ))}
          </div>
        </section>

<section id="pricing" className="section">
  <h2 className="section-title">Fiyatlandırma</h2>
  <p className="section-subtitle">
    PetOtelim iOS uygulaması App Store üzerinden indirilebilir.
  </p>
  <div className="pricing-grid">
    <div className="pricing-card">
      <h3>Ücretsiz Plan</h3>
      <div className="price">₺0</div>
      <div className="price-note">Temel özellikler</div>
      <ul className="pricing-list">
        <li>Konaklama yönetimi</li>
        <li>Müşteri ve pet kaydı</li>
        <li>Grooming ve kreş takibi</li>
        <li>Günlük AI limiti ile AI asistan</li>
      </ul>
    </div>
    <div className="pricing-card featured">
      <div className="pricing-badge">Önerilen</div>
      <h3>Premium</h3>
      <div className="price">₺599,99<span style={{fontSize: 16, fontWeight: 400}}>/ay</span></div>
      <div className="price-note">Tüm özellikler açık</div>
      <ul className="pricing-list">
        <li>Sınırsız AI asistan kullanımı</li>
        <li>Tüm modüller tam erişim</li>
        <li>Web dashboard erişimi</li>
        <li>Öncelikli destek</li>
      </ul>
    </div>
    <div className="pricing-card">
      <h3>Kurumsal</h3>
      <div className="price">Özel Teklif</div>
      <div className="price-note">Çok lokasyonlu yapılar için</div>
      <ul className="pricing-list">
        <li>Özel ihtiyaç analizi</li>
        <li>Genişletilmiş destek</li>
        <li>Özelleştirme seçenekleri</li>
      </ul>
    </div>
  </div>
  <p style={{textAlign: "center", marginTop: 24, color: "#666", fontSize: 14}}>
    Abonelik App Store üzerinden yönetilir. Otomatik yenileme, mevcut dönem bitmeden 24 saat önce iptal edilebilir.
  </p>
</section>

        <section id="about" className="section">
          <div className="about-card">
            <h2 className="section-title" style={{ marginBottom: 12 }}>
              Türkiye'de pet oteller için geliştirildi
            </h2>
            <p>
              PetOtelim, pet otel işletmelerinin gerçek operasyon ihtiyaçlarına
              göre tasarlanan, sade ve büyümeye uygun bir yönetim çözümüdür.
              Hedefi, işletme sahiplerinin daha düzenli, daha ölçülebilir ve
              daha profesyonel bir sistemle çalışmasını sağlamaktır.
            </p>
          </div>
        </section>

        <section id="faq" className="section">
          <h2 className="section-title">Sık Sorulan Sorular</h2>
          <div className="faq-grid">
            {[
              ["PetOtelim kimler için uygun?", "Pet otel, pet pansiyon ve benzeri konaklama odaklı işletmeler için uygundur."],
              ["Mobil cihazlarda çalışır mı?", "Evet, yapı çoklu cihaz kullanımına uygun olacak şekilde geliştirilmektedir."],
              ["Demo talep edebilir miyim?", "Evet, aşağıdaki formu doldurarak demo talebi oluşturabilirsiniz."],
              ["Fiyatlandırma net mi?", "Şu an web sitesinde örnek yapı yer alıyor. Nihai paketler daha sonra netleşecektir."],
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
            <div className="badge">Demo talep formu</div>
            <h2 className="section-title" style={{ marginBottom: 12 }}>
              PetOtelim demosu için başvurun
            </h2>
            <p className="section-subtitle">
              Bilgilerinizi bırakın, size en kısa sürede dönüş yapalım.
            </p>
            <form action="https://formspree.io/f/xyklgdnl" method="POST" className="form-grid">
              <div className="form-row">
                <div className="form-field">
                  <label htmlFor="name">Ad Soyad</label>
                  <input id="name" name="name" type="text" required placeholder="Ad Soyad" />
                </div>
                <div className="form-field">
                  <label htmlFor="business">İşletme Adı</label>
                  <input id="business" name="business" type="text" required placeholder="İşletme Adı" />
                </div>
              </div>
              <div className="form-row">
                <div className="form-field">
                  <label htmlFor="phone">Telefon</label>
                  <input id="phone" name="phone" type="tel" placeholder="05xx xxx xx xx (İsteğe bağlı)" />
                </div>
                <div className="form-field">
                  <label htmlFor="email">E-posta</label>
                  <input id="email" name="email" type="email" required placeholder="ornek@email.com" />
                </div>
              </div>
              <div className="form-field">
                <label htmlFor="message">Mesaj</label>
                <textarea id="message" name="message" rows={5} placeholder="İşletmeniz ve ihtiyaçlarınız hakkında kısa bilgi yazabilirsiniz." />
              </div>
              <input type="hidden" name="_subject" value="PetOtelim Demo Talebi" />
              <input type="hidden" name="_next" value="https://petotelim.app/thank-you" />
              <button type="submit" className="primary-button">Demo Başvurusu Gönder</button>
              <div className="form-note">
                Formu göndererek sizinle iletişime geçilmesini kabul etmiş olursunuz.
              </div>
            </form>
          </div>
        </section>

        <section className="cta-section">
          <h2 className="section-title" style={{ color: "white", marginTop: 0 }}>
            Hemen başlayın
          </h2>
          <p>
            PetOtelim ile işletmenizi daha düzenli, daha profesyonel ve daha verimli yönetin.
          </p>
          <a href={whatsappLink} target="_blank" rel="noreferrer" className="cta-button">
            WhatsApp ile İletişime Geç
          </a>
        </section>

        <footer className="footer">
          <div>
            <div>© 2026 PetOtelim. Tüm hakları saklıdır.</div>
            <div className="footer-brandline">
              PetOtelim — Pet oteller için modern yönetim sistemi
            </div>
          </div>
          <div className="footer-links">
            <a href="mailto:info@petotelim.app">info@petotelim.app</a>
            <a href="/privacy">Gizlilik Politikası</a>
            <a href="/terms">Kullanım Şartları</a>
            <a href="/en">English</a>
          </div>
        </footer>
      </div>
    </main>
  );
}