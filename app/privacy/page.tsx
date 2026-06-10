export default function PrivacyPage() {
  return (
    <main className="legal-page">
      <div className="legal-container">
        <a href="/" className="back-link">
          ← Ana sayfaya dön
        </a>

        <h1 className="legal-title">Gizlilik Politikası</h1>

        <p>
          Bu gizlilik politikası, PetOtelim mobil uygulaması ve web sitesi
          üzerinden toplanan bilgilerin nasıl işlendiğini açıklamaktadır.
        </p>

        <h2>Kapsam</h2>
        <p>
          Bu politika, PetOtelim iOS uygulaması ve web sitesi (petotelim.app)
          aracılığıyla toplanan kişisel verilere uygulanır.
        </p>

        <h2>Toplanan Bilgiler</h2>
        <p>Uygulama aşağıdaki bilgileri toplayabilir:</p>
        <ul>
          <li>Ad, soyad ve iletişim bilgileri (işletme kaydı sırasında)</li>
          <li>İşletme adı ve kapasitesi</li>
          <li>Evcil hayvan sahiplerine ait isim ve telefon numarası</li>
          <li>Konaklama, tıraş ve kreş kayıtları</li>
          <li>Fatura ve muhasebe verileri</li>
          <li>Uygulama kullanım istatistikleri</li>
        </ul>

        <h2>Bilgilerin Kullanımı</h2>
        <p>Toplanan bilgiler şu amaçlarla kullanılır:</p>
        <ul>
          <li>Pet otel yönetim hizmetinin sunulması</li>
          <li>Verilerin cihazlar arasında senkronizasyonu</li>
          <li>Müşteri ve rezervasyon yönetimi</li>
          <li>Fatura ve muhasebe işlemleri</li>
          <li>Uygulama performansının iyileştirilmesi</li>
        </ul>

        <h2>Abonelik ve Ödeme</h2>
        <p>
          PetOtelim Premium aboneliği App Store üzerinden işlenir. Ödeme
          bilgileriniz Apple tarafından yönetilir ve PetOtelim tarafından
          saklanmaz. Abonelik yönetimi ve iptali için App Store hesap
          ayarlarınızı kullanabilirsiniz.
        </p>

        <h2>Veri Depolama</h2>
        <p>
          Uygulama verileri Supabase altyapısı kullanılarak güvenli sunucularda
          saklanır. Veriler şifrelenerek iletilir ve depolanır.
        </p>

        <h2>Üçüncü Taraf Hizmetler</h2>
        <p>
          Uygulama aşağıdaki üçüncü taraf hizmetleri kullanabilir:
        </p>
        <ul>
          <li>Supabase (veri depolama ve senkronizasyon)</li>
          <li>Apple App Store (abonelik ve ödeme işlemleri)</li>
          <li>Anthropic Claude API (AI asistan özelliği)</li>
        </ul>

        <h2>Veri Güvenliği</h2>
        <p>
          Verilerinizin korunması için makul teknik ve organizasyonel önlemler
          alınmaktadır. Ancak internet üzerinden veri iletiminin mutlak güvenliği
          garanti edilemez.
        </p>

        <h2>Kullanıcı Hakları</h2>
        <p>
          Kişisel verilerinizle ilgili bilgi talep etme, düzeltme veya silme
          talebinde bulunma hakkına sahipsiniz. Talepleriniz için bizimle
          iletişime geçebilirsiniz.
        </p>

        <h2>İletişim</h2>
        <p>
          Gizlilik politikasıyla ilgili sorularınız için:{" "}
          <a href="mailto:info@petotelim.app">info@petotelim.app</a>
        </p>
      </div>
    </main>
  );
}