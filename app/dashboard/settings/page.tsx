'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function SettingsPage() {
  const [businessName, setBusinessName] = useState('')
  const [address, setAddress] = useState('')
  const [phone, setPhone] = useState('')
  const [taxInfo, setTaxInfo] = useState('')
  const [dogCapacity, setDogCapacity] = useState(0)
  const [catCapacity, setCatCapacity] = useState(0)
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [aiActive, setAiActive] = useState(true)
  const [aiPlan, setAiPlan] = useState('Premium')
  const [saving, setSaving] = useState(false)
  const [alert, setAlert] = useState('')
  const [businessId, setBusinessId] = useState('')
  const [uploading, setUploading] = useState(false)

  useEffect(() => { loadSettings() }, [])

  async function loadSettings() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: biz } = await supabase.from('businesses').select('*').eq('owner_user_id', user.id).single()
    if (!biz) return
    setBusinessId(biz.id)
    setBusinessName(biz.name ?? '')
    setAddress(biz.address ?? '')
    setPhone(biz.phone ?? '')
    setTaxInfo(biz.tax_info ?? '')
    setDogCapacity(biz.dog_capacity ?? 0)
    setCatCapacity(biz.cat_capacity ?? 0)
    setLogoUrl(biz.logo_url ?? null)
    setAiActive(biz.ai_active ?? true)
    setAiPlan(biz.ai_plan ?? 'Premium')
  }

  async function saveBusinessInfo() {
    setSaving(true)
    const supabase = createClient()
    await supabase.from('businesses').update({
      name: businessName.trim(),
      address: address.trim(),
      phone: phone.trim(),
      tax_info: taxInfo.trim(),
      dog_capacity: dogCapacity,
      cat_capacity: catCapacity,
    }).eq('id', businessId)
    setAlert('İşletme bilgileri kaydedildi.')
    setSaving(false)
  }

  async function saveAiSettings() {
    setSaving(true)
    const supabase = createClient()
    await supabase.from('businesses').update({
      ai_active: aiActive,
      ai_plan: aiPlan.trim(),
    }).eq('id', businessId)
    setAlert('AI ayarları kaydedildi.')
    setSaving(false)
  }

  async function uploadLogo(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files?.[0] || !businessId) return
    const file = e.target.files[0]
    setUploading(true)
    const supabase = createClient()
    const ext = file.name.split('.').pop()
    const path = `logos/${businessId}.${ext}`
    const ab = await file.arrayBuffer()
    await supabase.storage.from('pet-media').upload(path, new Uint8Array(ab), { contentType: file.type, upsert: true })
    const { data: urlData } = await supabase.storage.from('pet-media').createSignedUrl(path, 3600 * 24 * 365)
    if (urlData?.signedUrl) {
      await supabase.from('businesses').update({ logo_url: path }).eq('id', businessId)
      setLogoUrl(urlData.signedUrl)
    }
    setUploading(false)
    setAlert('Logo yüklendi.')
    e.target.value = ''
  }

  async function deleteLogo() {
    const supabase = createClient()
    await supabase.from('businesses').update({ logo_url: null }).eq('id', businessId)
    setLogoUrl(null)
    setAlert('Logo silindi.')
  }

  const card: React.CSSProperties = { backgroundColor: '#fff', borderRadius: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', marginBottom: '20px', padding: '20px' }
  const inp: React.CSSProperties = { width: '100%', padding: '12px 14px', backgroundColor: '#F2F2F7', borderRadius: '10px', border: 'none', outline: 'none', fontSize: '15px', boxSizing: 'border-box', color: '#000', marginBottom: '10px' }

  return (
    <div style={{ padding: '32px', maxWidth: '640px', paddingBottom: '64px' }}>
      <h1 style={{ fontSize: '32px', fontWeight: 800, margin: '0 0 24px' }}>Ayarlar</h1>

      {alert && (
        <div style={{ backgroundColor: '#F0FFF4', border: '1px solid #34C75940', borderRadius: '12px', padding: '12px 16px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '14px', color: '#34C759', fontWeight: 500 }}>✓ {alert}</span>
          <button onClick={() => setAlert('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6C6C70', fontSize: '16px' }}>✕</button>
        </div>
      )}

      {/* İşletme Bilgileri */}
      <div style={card}>
        <p style={{ fontSize: '17px', fontWeight: 700, margin: '0 0 16px' }}>İşletme Bilgileri</p>
        <input value={businessName} onChange={e => setBusinessName(e.target.value)} placeholder='İşletme Adı' style={inp} />
        <textarea value={address} onChange={e => setAddress(e.target.value)} placeholder='Adres' rows={3} style={{ ...inp, resize: 'vertical' }} />
        <input value={phone} onChange={e => setPhone(e.target.value)} placeholder='Telefon' style={inp} />
        <input value={taxInfo} onChange={e => setTaxInfo(e.target.value)} placeholder='Vergi Dairesi / No' style={{ ...inp, marginBottom: '16px' }} />
        <button onClick={saveBusinessInfo} disabled={saving} style={{ padding: '10px 24px', borderRadius: '12px', border: 'none', backgroundColor: '#007AFF', color: '#fff', fontSize: '15px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
          ✓ Kaydet
        </button>
      </div>

      {/* Logo */}
      <div style={card}>
        <p style={{ fontSize: '17px', fontWeight: 700, margin: '0 0 16px' }}>Logo</p>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
          <div style={{ width: '160px', height: '160px', borderRadius: '16px', backgroundColor: '#F2F2F7', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            {logoUrl
              ? <img src={logoUrl} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              : <div style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: '28px', margin: '0 0 4px' }}>🖼️</p>
                  <p style={{ fontSize: '13px', color: '#6C6C70', margin: 0 }}>Logo yok</p>
                </div>
            }
          </div>
        </div>
        <p style={{ fontSize: '13px', color: '#6C6C70', textAlign: 'center', margin: '0 0 16px' }}>Yüklediğin logo PDF faturalarında görünecek.</p>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 20px', borderRadius: '12px', backgroundColor: '#007AFF', color: '#fff', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>
            🖼️ Logo Seç
            <input type='file' accept='image/*' onChange={uploadLogo} style={{ display: 'none' }} />
          </label>
          {logoUrl && (
            <button onClick={deleteLogo} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 20px', borderRadius: '12px', backgroundColor: '#FFF0F0', color: '#FF3B30', fontSize: '14px', fontWeight: 600, border: 'none', cursor: 'pointer' }}>
              🗑️ Logoyu Sil
            </button>
          )}
        </div>
        {uploading && <p style={{ fontSize: '13px', color: '#6C6C70', textAlign: 'center', marginTop: '8px' }}>Yükleniyor...</p>}
      </div>

      {/* Kapasite */}
      <div style={card}>
        <p style={{ fontSize: '17px', fontWeight: 700, margin: '0 0 16px' }}>Kapasite</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '14px', color: '#6C6C70', margin: '0 0 8px' }}>Köpek Kapasitesi</p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
              <button onClick={() => setDogCapacity(Math.max(0, dogCapacity - 1))} style={{ width: '36px', height: '36px', borderRadius: '50%', border: 'none', backgroundColor: '#F2F2F7', fontSize: '20px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
              <span style={{ fontSize: '24px', fontWeight: 700, minWidth: '32px', textAlign: 'center' }}>{dogCapacity}</span>
              <button onClick={() => setDogCapacity(dogCapacity + 1)} style={{ width: '36px', height: '36px', borderRadius: '50%', border: 'none', backgroundColor: '#F2F2F7', fontSize: '20px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '14px', color: '#6C6C70', margin: '0 0 8px' }}>Kedi Kapasitesi</p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
              <button onClick={() => setCatCapacity(Math.max(0, catCapacity - 1))} style={{ width: '36px', height: '36px', borderRadius: '50%', border: 'none', backgroundColor: '#F2F2F7', fontSize: '20px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
              <span style={{ fontSize: '24px', fontWeight: 700, minWidth: '32px', textAlign: 'center' }}>{catCapacity}</span>
              <button onClick={() => setCatCapacity(catCapacity + 1)} style={{ width: '36px', height: '36px', borderRadius: '50%', border: 'none', backgroundColor: '#F2F2F7', fontSize: '20px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
            </div>
          </div>
        </div>
        <button onClick={saveBusinessInfo} disabled={saving} style={{ width: '100%', padding: '10px', borderRadius: '12px', border: 'none', backgroundColor: '#007AFF', color: '#fff', fontSize: '15px', fontWeight: 600, cursor: 'pointer' }}>
          ✓ Kapasiteyi Kaydet
        </button>
      </div>

      {/* AI Asistan Ayarları */}
      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '14px', backgroundColor: '#FFF3E0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>✨</div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: '17px', fontWeight: 700, margin: '0 0 2px' }}>AI Asistan Ayarları</p>
            <p style={{ fontSize: '13px', color: '#6C6C70', margin: 0 }}>Plan, trial, erişim ve günlük AI limitlerini buradan yönetebilirsin.</p>
          </div>
          <span style={{ backgroundColor: '#FFF3E0', color: '#FF9500', fontSize: '12px', fontWeight: 600, padding: '4px 10px', borderRadius: '20px' }}>Trial</span>
        </div>

        {/* Erişim Durumu */}
<div style={{ backgroundColor: '#F2F2F7', borderRadius: '12px', padding: '14px', marginBottom: '16px' }}>
  <p style={{ fontSize: '15px', fontWeight: 600, margin: '0 0 4px' }}>Erişim Durumu</p>
  <p style={{ fontSize: '13px', color: '#6C6C70', margin: '0 0 12px' }}>
    {aiPlan === 'Free' ? 'Free plan aktif. Sınırlı AI özelliklerine erişim.' :
     aiPlan === 'Premium' ? 'Premium plan aktif. AI özellikleri sınırsız açık.' :
     aiPlan === 'Business AI' ? 'Business AI planı aktif. AI özellikleri sınırsız ve kurumsal paket görünümünde.' :
     'Trial aktif. Kalan süre: 30 gün.'}
  </p>
<div style={{ display: 'flex', gap: '8px' }}>
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
    <span style={{ fontSize: '11px', color: '#6C6C70' }}>Plan</span>
    <span style={{ backgroundColor: aiPlan === 'Free' ? '#F2F2F7' : aiPlan === 'Premium' ? '#AF52DE20' : '#007AFF20', color: aiPlan === 'Free' ? '#6C6C70' : aiPlan === 'Premium' ? '#AF52DE' : '#007AFF', fontSize: '13px', fontWeight: 600, padding: '4px 12px', borderRadius: '20px' }}>
      {aiPlan || 'Trial'}
    </span>
  </div>
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
    <span style={{ fontSize: '11px', color: '#6C6C70' }}>Trial</span>
    <span style={{ backgroundColor: '#F2F2F7', color: '#6C6C70', fontSize: '13px', fontWeight: 600, padding: '4px 12px', borderRadius: '20px' }}>
      {aiPlan === 'Free' ? '30 gun' : 'Pasif'}
    </span>
  </div>
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
    <span style={{ fontSize: '11px', color: '#6C6C70' }}>Limit</span>
    <span style={{ backgroundColor: '#007AFF20', color: '#007AFF', fontSize: '13px', fontWeight: 600, padding: '4px 12px', borderRadius: '20px' }}>
      {aiPlan === 'Free' ? '50' : 'Sinirsiz'}
    </span>
  </div>
</div>
</div>

        {/* Plan Yönetimi */}
        <p style={{ fontSize: '15px', fontWeight: 600, margin: '0 0 10px' }}>Plan Yönetimi</p>
        <div style={{ display: 'flex', backgroundColor: '#F2F2F7', borderRadius: '12px', padding: '4px', marginBottom: '16px' }}>
          {['Free', 'Premium', 'Business AI'].map(p => (
            <button key={p} onClick={() => setAiPlan(p)} style={{ flex: 1, padding: '8px', borderRadius: '8px', border: 'none', backgroundColor: aiPlan === p ? '#fff' : 'transparent', fontSize: '13px', fontWeight: aiPlan === p ? 700 : 400, cursor: 'pointer', boxShadow: aiPlan === p ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}>
              {p}
            </button>
          ))}
        </div>

        {/* AI Asistan Aktif toggle */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
          <div>
            <p style={{ fontSize: '15px', fontWeight: 600, margin: '0 0 2px' }}>AI Asistan Aktif</p>
            <p style={{ fontSize: '12px', color: '#6C6C70', margin: 0 }}>Kapalı olduğunda AI ekranı kilitli görünür.</p>
          </div>
          <div onClick={() => setAiActive(!aiActive)} style={{ width: '51px', height: '31px', borderRadius: '20px', backgroundColor: aiActive ? '#34C759' : '#E5E5EA', cursor: 'pointer', position: 'relative', transition: 'background-color 0.2s' }}>
            <div style={{ position: 'absolute', top: '2px', left: aiActive ? '22px' : '2px', width: '27px', height: '27px', borderRadius: '50%', backgroundColor: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.2)', transition: 'left 0.2s' }} />
          </div>
        </div>
      </div>

      {/* Çıkış Yap */}
      <div style={card}>
        <p style={{ fontSize: '17px', fontWeight: 700, margin: '0 0 4px' }}>Hesap</p>
        <p style={{ fontSize: '13px', color: '#6C6C70', margin: '0 0 16px' }}>Oturumu kapat ve giriş ekranına dön.</p>
        <button onClick={async () => { const s = createClient(); await s.auth.signOut(); window.location.href = '/login' }} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: 'none', backgroundColor: '#FFF0F0', color: '#FF3B30', fontSize: '15px', fontWeight: 600, cursor: 'pointer' }}>
          Çıkış Yap
        </button>
      </div>
    </div>
  )
}