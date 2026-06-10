export default function TermsPage() {
  return (
    <main className="legal-page">
      <div className="legal-container">
        <a href="/" className="back-link">
          ← Ana sayfaya dön
        </a>

        <h1 className="legal-title">Kullanım Şartları</h1>

        <p>
          PetOtelim uygulamasını ve web sitesini kullanarak aşağıdaki kullanım
          şartlarını kabul etmiş sayılırsınız.
        </p>

        <h2>Genel Kullanım</h2>
        <p>
          PetOtelim, pet otel işletmecilerine yönelik bir yönetim uygulamasıdır.
          Uygulama; konaklama, tıraş, kreş, muhasebe ve AI asistan özelliklerini
          kapsamaktadır.
        </p>

        <h2>Premium Abonelik</h2>
        <p>
          PetOtelim, otomatik yenilenen aylık abonelik sunar:
        </p>
        <ul>
          <li><strong>Abonelik adı:</strong> Pet Otelim Premium</li>
          <li><strong>Abonelik süresi:</strong> 1 ay</li>
          <li><strong>Fiyat:</strong> 599,99 TL / ay</li>
          <li>
            <strong>Otomatik yenileme:</strong> Abonelik, mevcut dönem sona
            ermeden en az 24 saat önce iptal edilmediği sürece otomatik olarak
            yenilenir.
          </li>
          <li>
            <strong>Ücret tahsilatı:</strong> Yenileme ücreti, mevcut dönem
            sona ermeden 24 saat önce iTunes/App Store hesabınızdan tahsil
            edilir.
          </li>
          <li>
            <strong>İptal:</strong> Aboneliği istediğiniz zaman App Store hesap
            ayarlarınızdan iptal edebilirsiniz. İptal, mevcut dönem sonunda
            geçerli olur.
          </li>
          <li>
            <strong>Ücretsiz deneme:</strong> Ücretsiz deneme süresi varsa,
            kullanılmayan kısım satın alım onaylandığında geçersiz sayılır.
          </li>
        </ul>

        <h2>Abonelik Yönetimi</h2>
        <p>
          Aboneliğinizi yönetmek veya iptal etmek için: iPhone/iPad
          Ayarlar → Apple ID → Abonelikler yolunu izleyin.
        </p>

        <h2>İçerik ve Fikri Haklar</h2>
        <p>
          Uygulamada ve web sitesinde yer alan tüm içerikler, logolar ve marka
          unsurları ilgili haklara tabidir. İzinsiz kopyalanması veya ticari
          amaçla kullanılması yasaktır.
        </p>

        <h2>Hizmet Değişiklikleri</h2>
        <p>
          PetOtelim, uygulama özelliklerinde, abonelik fiyatlarında ve içeriğinde
          değişiklik yapma hakkını saklı tutar. Fiyat değişiklikleri önceden
          bildirilir.
        </p>

        <h2>Sorumluluk Sınırlaması</h2>
        <p>
          PetOtelim, uygulamanın kesintisiz veya hatasız çalışacağını garanti
          etmez. Uygulama kullanımından doğabilecek veri kayıpları için azami
          özen gösterilir.
        </p>

        <h2>Gizlilik</h2>
        <p>
          Kişisel verilerinizin işlenmesi hakkında bilgi almak için{" "}
          <a href="/privacy">Gizlilik Politikamızı</a> inceleyiniz.
        </p>

        <h2>İletişim</h2>
        <p>
          Kullanım şartlarıyla ilgili sorularınız için:{" "}
          <a href="mailto:info@petotelim.app">info@petotelim.app</a>
        </p>
      </div>
    </main>
  );
}