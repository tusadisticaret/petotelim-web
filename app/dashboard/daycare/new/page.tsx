'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const WEEKDAYS = [
  { label: 'Pazartesi', short: 'Pzt', value: 0 },
  { label: 'Sali', short: 'Sal', value: 1 },
  { label: 'Carsamba', short: 'Car', value: 2 },
  { label: 'Persembe', short: 'Per', value: 3 },
  { label: 'Cuma', short: 'Cum', value: 4 },
  { label: 'Cumartesi', short: 'Cmt', value: 5 },
  { label: 'Pazar', short: 'Paz', value: 6 },
]

export default function DaycareNewPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [search, setSearch] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [selectedPet, setSelectedPet] = useState<any>(null)
  const [businessId, setBusinessId] = useState('')
  const [existingPackage, setExistingPackage] = useState<any>(null)
  const [showPlans, setShowPlans] = useState(false)
  const [plans, setPlans] = useState<any[]>([])
  const [showWeekdayPicker, setShowWeekdayPicker] = useState(false)
  const [form, setForm] = useState({
    startDate: new Date().toISOString().split('T')[0],
    monthlyFee: '',
    weekdaysMask: 0,
    mainAddress: '',
    altAddress: '',
    notes: '',
  })

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: biz } = await supabase.from('businesses').select('id').eq('owner_user_id', user.id).single()
      setBusinessId(biz?.id ?? '')
    }
    load()
  }, [])

  useEffect(() => {
    if (!search.trim() || !businessId) { setSearchResults([]); return }
    const timer = setTimeout(async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('pets')
        .select('id, name, species, breed, customers(id, full_name)')
        .eq('business_id', businessId)
        .ilike('name', `%${search}%`)
        .limit(10)
      setSearchResults(data ?? [])
    }, 300)
    return () => clearTimeout(timer)
  }, [search, businessId])

  async function selectPet(pet: any) {
    setSelectedPet(pet)
    setSearch(pet.name)
    setSearchResults([])
    const supabase = createClient()
    const { data: pkgs } = await supabase
      .from('daycare_packages')
      .select('*')
      .eq('business_id', businessId)
      .eq('pet_id', pet.id)
      .order('start_date', { ascending: false })
    setPlans(pkgs ?? [])
    const active = pkgs?.find((p: any) => p.is_active)
    setExistingPackage(active ?? null)
    if (active) {
      setForm({
        startDate: active.start_date,
        monthlyFee: String(active.price),
        weekdaysMask: active.weekdays_mask,
        mainAddress: active.main_address_text ?? '',
        altAddress: active.alt_address_text ?? '',
        notes: active.notes ?? '',
      })
    }
  }

  function toggleWeekday(val: number) {
    setForm(prev => ({ ...prev, weekdaysMask: prev.weekdaysMask ^ (1 << val) }))
  }

  function weekdayText(mask: number) {
    const selected = WEEKDAYS.filter(d => (mask & (1 << d.value)) !== 0)
    if (selected.length === 0) return 'Gun secin'
    return selected.map(d => d.short).join(', ')
  }

  async function handleSave() {
    if (!selectedPet) { setError('Once bir hayvan secin.'); return }
    const fee = parseFloat(form.monthlyFee.replace(',', '.')) || 0
    if (fee <= 0) { setError('Aylik ucret 0\'dan buyuk olmali.'); return }
    if (form.weekdaysMask === 0) { setError('En az bir gun secmelisiniz.'); return }
    setLoading(true)
    setError('')
    const supabase = createClient()
    const anchorDay = new Date(form.startDate + 'T12:00:00').getDate()
    const payload = {
      business_id: businessId,
      pet_id: selectedPet.id,
      total_visits: 0,
      remaining_visits: 0,
      price: fee,
      notes: form.notes,
      is_active: true,
      start_date: form.startDate,
      anchor_day: anchorDay,
      weekdays_mask: form.weekdaysMask,
      main_address_text: form.mainAddress,
      alt_address_text: form.altAddress,
      main_latitude: null,
      main_longitude: null,
      alt_latitude: null,
      alt_longitude: null,
    }
    if (existingPackage) {
      const { error: err } = await supabase.from('daycare_packages').update(payload).eq('id', existingPackage.id)
      if (err) { setError(err.message); setLoading(false); return }
      setSuccess('Kres plani guncellendi.')
    } else {
      const { error: err } = await supabase.from('daycare_packages').insert(payload)
      if (err) { setError(err.message); setLoading(false); return }
      setSuccess('Kres plani kaydedildi.')
    }
    setLoading(false)
    const { data: pkgs } = await supabase.from('daycare_packages').select('*').eq('business_id', businessId).eq('pet_id', selectedPet.id).order('start_date', { ascending: false })
    setPlans(pkgs ?? [])
    setExistingPackage(pkgs?.find((p: any) => p.is_active) ?? null)
  }

  async function handleStop() {
    if (!existingPackage) return
    const supabase = createClient()
    await supabase.from('daycare_packages').update({ is_active: false }).eq('id', existingPackage.id)
    setExistingPackage(null)
    setSuccess('Plan durduruldu.')
    const { data: pkgs } = await supabase.from('daycare_packages').select('*').eq('business_id', businessId).eq('pet_id', selectedPet.id).order('start_date', { ascending: false })
    setPlans(pkgs ?? [])
  }

  function fmtDate(s: string) {
    return new Date(s + 'T12:00:00').toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }

  function fmtCurrency(v: number) {
    return v.toLocaleString('tr-TR', { minimumFractionDigits: 2 })
  }

  const cardStyle: React.CSSProperties = { backgroundColor: '#fff', borderRadius: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', marginBottom: '16px', padding: '20px' }
  const sectionTitle: React.CSSProperties = { fontSize: '17px', fontWeight: 700, color: '#000', margin: '0 0 14px' }
  const inputStyle: React.CSSProperties = { width: '100%', padding: '10px 14px', backgroundColor: '#F2F2F7', borderRadius: '10px', border: 'none', outline: 'none', fontSize: '15px', boxSizing: 'border-box', color: '#000' }

  return (
    <div style={{ padding: '32px', maxWidth: '600px', paddingBottom: '64px' }}>
      <h1 style={{ fontSize: '32px', fontWeight: 800, color: '#000', margin: '0 0 24px' }}>Yeni Kres</h1>

      {/* Kayittan Getir */}
      <div style={cardStyle}>
        <p style={sectionTitle}>Kayittan Getir</p>
        <div style={{ display: 'flex', gap: '10px', marginBottom: '8px' }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder='Hayvan adi / tur / irk'
            style={{ ...inputStyle, flex: 1 }}
          />
          <button
            onClick={() => { if (search.trim() && searchResults.length > 0) selectPet(searchResults[0]) }}
            style={{ padding: '10px 20px', borderRadius: '20px', border: 'none', backgroundColor: '#007AFF', color: '#fff', fontSize: '15px', fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}
          >
            Getir
          </button>
          <button
            onClick={() => { setSearch(''); setSearchResults([]); setSelectedPet(null); setExistingPackage(null); setPlans([]) }}
            style={{ padding: '10px 18px', borderRadius: '20px', border: 'none', backgroundColor: '#F2F2F7', color: '#007AFF', fontSize: '15px', fontWeight: 500, cursor: 'pointer', flexShrink: 0 }}
          >
            Temizle
          </button>
        </div>

        {searchResults.length > 0 && !selectedPet && (
          <div style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid #E5E5EA', marginTop: '8px' }}>
            {searchResults.map((pet, idx) => (
              <div key={pet.id} onClick={() => selectPet(pet)} style={{ padding: '10px 16px', borderBottom: idx < searchResults.length - 1 ? '1px solid #E5E5EA' : 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '18px' }}>{pet.species === 'cat' ? '🐱' : '🐶'}</span>
                <div>
                  <p style={{ fontSize: '14px', fontWeight: 600, color: '#000', margin: 0 }}>{pet.name}</p>
                  <p style={{ fontSize: '12px', color: '#6C6C70', margin: '2px 0 0' }}>{pet.breed ?? ''}</p>
                </div>
                {selectedPet?.id === pet.id && <span style={{ marginLeft: 'auto', color: '#34C759', fontSize: '18px' }}>✓</span>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Kres Plani */}
      <div style={cardStyle}>
        <p style={sectionTitle}>{existingPackage ? 'Kres Plani' : 'Yeni Kres Plani'}</p>
        {!selectedPet ? (
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <p style={{ fontSize: '48px', margin: '0 0 12px' }}>🐾</p>
            <p style={{ fontSize: '16px', color: '#6C6C70', margin: 0 }}>Once bir evcil hayvan sec</p>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '4px 0', marginBottom: '16px' }}>
              <span style={{ fontSize: '24px' }}>{selectedPet.species === 'cat' ? '🐱' : '🐶'}</span>
              <div>
                <p style={{ fontSize: '16px', fontWeight: 600, color: '#000', margin: 0 }}>{selectedPet.name}</p>
                <p style={{ fontSize: '13px', color: '#6C6C70', margin: '2px 0 0' }}>{selectedPet.breed ?? ''}</p>
              </div>
              <span style={{ color: '#C7C7CC', marginLeft: 'auto', fontSize: '16px' }}>›</span>
            </div>

            {/* Ana Konum */}
            <div style={{ marginBottom: '14px' }}>
              <p style={{ fontSize: '13px', color: '#6C6C70', margin: '0 0 8px' }}>Ana Konum (Ev)</p>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                <button style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '20px', border: 'none', backgroundColor: '#F2F2F7', color: '#007AFF', fontSize: '14px', fontWeight: 500, cursor: 'pointer' }}>
                  📍 Haritadan Sec
                </button>
                <button style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '20px', border: 'none', backgroundColor: '#F2F2F7', color: '#6C6C70', fontSize: '14px', fontWeight: 500, cursor: 'not-allowed' }}>
                  🗺️ Haritada Goster
                </button>
              </div>
              <input value={form.mainAddress} onChange={e => setForm(p => ({ ...p, mainAddress: e.target.value }))} placeholder='Adres' style={inputStyle} />
              <button style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '20px', border: 'none', backgroundColor: '#F2F2F7', color: '#6C6C70', fontSize: '14px', fontWeight: 500, cursor: 'pointer', marginTop: '8px' }}>
                ↗️ Paylas
              </button>
            </div>

            {/* Alt Konum */}
            <div style={{ marginBottom: '14px' }}>
              <p style={{ fontSize: '13px', color: '#6C6C70', margin: '0 0 8px' }}>Alternatif Konum (Is yeri)</p>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                <button style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '20px', border: 'none', backgroundColor: '#F2F2F7', color: '#007AFF', fontSize: '14px', fontWeight: 500, cursor: 'pointer' }}>
                  📍 Haritadan Sec
                </button>
                <button style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '20px', border: 'none', backgroundColor: '#F2F2F7', color: '#6C6C70', fontSize: '14px', fontWeight: 500, cursor: 'not-allowed' }}>
                  🗺️ Haritada Goster
                </button>
              </div>
              <input value={form.altAddress} onChange={e => setForm(p => ({ ...p, altAddress: e.target.value }))} placeholder='Adres' style={inputStyle} />
              <button style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '20px', border: 'none', backgroundColor: '#F2F2F7', color: '#6C6C70', fontSize: '14px', fontWeight: 500, cursor: 'pointer', marginTop: '8px' }}>
                ↗️ Paylas
              </button>
            </div>

            {/* Notlar */}
            <div>
              <p style={{ fontSize: '13px', color: '#6C6C70', margin: '0 0 6px' }}>Notlar</p>
              <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder='Plan notlari' rows={4} style={{ ...inputStyle, resize: 'none' }} />
            </div>
          </>
        )}
      </div>

      {/* Kres Baslat */}
      <div style={cardStyle}>
        <p style={sectionTitle}>Kres Baslat</p>

        {/* 3 kolon: Baslangic Tarihi | Haftanin Gunleri | Aylik Ucret */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '14px', color: '#6C6C70', margin: '0 0 8px', textAlign: 'center' }}>Baslangic Tarihi</p>
            <input
              type='date'
              value={form.startDate}
              onChange={e => setForm(p => ({ ...p, startDate: e.target.value }))}
              style={{ ...inputStyle, textAlign: 'center' }}
            />
          </div>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '14px', color: '#6C6C70', margin: '0 0 8px', textAlign: 'center' }}>Haftanin Gunleri</p>
            <button
              onClick={() => setShowWeekdayPicker(p => !p)}
              style={{ width: '100%', padding: '10px 14px', backgroundColor: '#F2F2F7', borderRadius: '10px', border: 'none', outline: 'none', fontSize: '15px', color: form.weekdaysMask ? '#000' : '#6C6C70', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxSizing: 'border-box' }}
            >
              <span style={{ flex: 1, textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{weekdayText(form.weekdaysMask)}</span>
              <span style={{ fontSize: '12px', color: '#6C6C70', flexShrink: 0 }}>▼</span>
            </button>
          </div>
        </div>

        {showWeekdayPicker && (
          <div style={{ backgroundColor: '#F2F2F7', borderRadius: '12px', padding: '12px', marginBottom: '14px' }}>
            <p style={{ fontSize: '13px', fontWeight: 600, color: '#000', margin: '0 0 10px' }}>Gunleri Sec</p>
            {WEEKDAYS.map(day => {
              const active = (form.weekdaysMask & (1 << day.value)) !== 0
              return (
                <div key={day.value} onClick={() => toggleWeekday(day.value)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: day.value < 6 ? '1px solid #E5E5EA' : 'none', cursor: 'pointer' }}>
                  <span style={{ fontSize: '15px', color: '#000' }}>{day.label}</span>
                  <div style={{ width: '51px', height: '31px', borderRadius: '16px', backgroundColor: active ? '#34C759' : '#E5E5EA', position: 'relative', flexShrink: 0 }}>
                    <div style={{ position: 'absolute', top: '2px', left: active ? '22px' : '2px', width: '27px', height: '27px', borderRadius: '50%', backgroundColor: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.2)', transition: 'left 0.15s' }} />
                  </div>
                </div>
              )
            })}
            <button onClick={() => setShowWeekdayPicker(false)} style={{ width: '100%', marginTop: '12px', padding: '12px', borderRadius: '12px', backgroundColor: '#007AFF', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '15px', fontWeight: 600 }}>Tamam</button>
          </div>
        )}

        <div style={{ marginBottom: '16px', textAlign: 'center' }}>
          <p style={{ fontSize: '14px', color: '#6C6C70', margin: '0 0 8px', textAlign: 'center' }}>Aylik Ucret (₺)</p>
          <input
            type='text'
            inputMode='decimal'
            value={form.monthlyFee}
            onChange={e => setForm(p => ({ ...p, monthlyFee: e.target.value }))}
            placeholder='0'
            style={{ ...inputStyle, textAlign: 'center', width: '200px', margin: '0 auto', display: 'block' }}
          />
        </div>

        {error && <div style={{ backgroundColor: '#FFF0F0', color: '#FF3B30', fontSize: '13px', padding: '12px 16px', borderRadius: '12px', marginBottom: '12px' }}>{error}</div>}
        {success && <div style={{ backgroundColor: '#F0FFF4', color: '#34C759', fontSize: '13px', padding: '12px 16px', borderRadius: '12px', marginBottom: '12px' }}>{success}</div>}

        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <button
            onClick={handleSave}
            disabled={loading}
            style={{ padding: '14px 40px', backgroundColor: '#007AFF', color: '#fff', borderRadius: '24px', border: 'none', cursor: 'pointer', fontSize: '17px', fontWeight: 700, opacity: loading ? 0.6 : 1, display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            ✓ {loading ? 'Kaydediliyor...' : existingPackage ? 'Plani Guncelle' : 'Kresi Baslat'}
          </button>
        </div>

        {existingPackage && (
          <>
            <div style={{ height: '1px', backgroundColor: '#E5E5EA', margin: '16px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <p style={{ fontSize: '13px', color: '#6C6C70', margin: 0 }}>Durum: AKTİF</p>
              <button onClick={handleStop} style={{ padding: '8px 16px', borderRadius: '10px', border: '1px solid #FF3B30', backgroundColor: '#fff', color: '#FF3B30', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                🛑 Kresi Durdur
              </button>
            </div>
          </>
        )}
      </div>

      {/* Kres Planlari */}
      <div style={{ backgroundColor: '#fff', borderRadius: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', marginBottom: '16px' }}>
        <button onClick={() => setShowPlans(p => !p)} style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <p style={{ fontSize: '17px', fontWeight: 700, color: '#000', margin: 0 }}>Kres Planlari</p>
            {plans.length > 0 && <span style={{ fontSize: '12px', fontWeight: 600, padding: '2px 8px', borderRadius: '20px', backgroundColor: '#007AFF20', color: '#007AFF' }}>{plans.length}</span>}
          </div>
          <span style={{ fontSize: '14px', color: '#6C6C70' }}>{showPlans ? '▲' : '▼'}</span>
        </button>

        {showPlans && (
          <div style={{ padding: '0 20px 16px' }}>
            {plans.length === 0 ? (
              <div style={{ padding: '32px', textAlign: 'center' }}>
                <p style={{ fontSize: '32px', margin: '0 0 10px' }}>📅</p>
                <p style={{ fontSize: '15px', fontWeight: 600, color: '#6C6C70', margin: 0 }}>Bu evcil icin kres plani yok</p>
              </div>
            ) : plans.map(pkg => (
              <div key={pkg.id} style={{ backgroundColor: '#EBF5FF', borderRadius: '14px', padding: '14px', marginBottom: '10px', border: '1px solid #007AFF30' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <p style={{ fontSize: '15px', fontWeight: 700, color: '#000', margin: 0 }}>{selectedPet?.name ?? ''}</p>
                      <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', backgroundColor: pkg.is_active ? '#F0FFF4' : '#F2F2F7', color: pkg.is_active ? '#34C759' : '#6C6C70', fontWeight: 600 }}>{pkg.is_active ? 'AKTIF' : 'PASIF'}</span>
                    </div>
                    <p style={{ fontSize: '13px', color: '#6C6C70', margin: '4px 0 0' }}>Gunler: {weekdayText(pkg.weekdays_mask)}</p>
                    <p style={{ fontSize: '12px', color: '#6C6C70', margin: '2px 0 0' }}>Baslangic: {fmtDate(pkg.start_date)}</p>
                  </div>
                  <p style={{ fontSize: '15px', fontWeight: 700, color: '#007AFF', margin: 0 }}>₺{fmtCurrency(pkg.price)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}