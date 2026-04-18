'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function LongStayPage() {
  const [activePlans, setActivePlans] = useState<any[]>([])
  const [periods, setPeriods] = useState<any[]>([])
  const [pets, setPets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [businessId, setBusinessId] = useState('')

  const [search, setSearch] = useState('')
  const [filteredPets, setFilteredPets] = useState<any[]>([])
  const [selectedPet, setSelectedPet] = useState<any>(null)
  const [selectedPlan, setSelectedPlan] = useState<any>(null)

  const [startDate, setStartDate] = useState(today())
  const [monthlyFee, setMonthlyFee] = useState('')
  const [planNotes, setPlanNotes] = useState('')

  const [showActivePlans, setShowActivePlans] = useState(true)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [dateFrom, setDateFrom] = useState(daysAgo(90))
  const [dateTo, setDateTo] = useState(today())

  const [alert, setAlert] = useState('')
  const [showStopConfirm, setShowStopConfirm] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => { loadAll() }, [])

  useEffect(() => {
    if (!search.trim()) { setFilteredPets([]); return }
    const q = search.toLowerCase()
    setFilteredPets(pets.filter(p =>
      p.name?.toLowerCase().includes(q) ||
      (p.owner_name ?? p.customers?.full_name ?? '').toLowerCase().includes(q) ||
      (p.owner_phone ?? '').toLowerCase().includes(q) ||
      (p.breed ?? '').toLowerCase().includes(q)
    ).slice(0, 8))
  }, [search, pets])

  async function loadAll(from = dateFrom, to = dateTo) {
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: biz } = await supabase.from('businesses').select('id').eq('user_id', user.id).single()
    const bid = biz?.id ?? ''
    setBusinessId(bid)

    const [{ data: petsData }, { data: plansData }, { data: periodsData }] = await Promise.all([
      supabase.from('pets').select('id, name, species, breed, owner_name, owner_phone, customers(full_name, phone)').eq('business_id', bid).order('name'),
      supabase.from('long_stay_plans').select('id, business_id, pet_id, start_date, end_date, price_monthly, notes, is_active, pets(id, name, species, breed, customers(full_name, phone, tckn))').eq('business_id', bid).eq('is_active', true).order('start_date'),
      supabase.from('long_stay_periods').select('id, business_id, plan_id, pet_id, period_start, period_end, net_total, notes').eq('business_id', bid).gte('period_start', from).lte('period_start', to).order('period_start', { ascending: false })
    ])

    setPets(petsData ?? [])
    setActivePlans(plansData ?? [])
    setPeriods(periodsData ?? [])
    setLoading(false)
  }

  async function startPlan() {
    if (!selectedPet) { setAlert('Önce bir evcil hayvan seç.'); return }
    const fee = parseFloat(monthlyFee.replace(',', '.'))
    if (!fee || fee <= 0) { setAlert('Aylık ücret 0\'dan büyük olmalı.'); return }
    setSaving(true)
    const supabase = createClient()

    const { data: plan, error: planErr } = await supabase.from('long_stay_plans').insert({
      business_id: businessId, pet_id: selectedPet.id,
      start_date: startDate, price_monthly: fee,
      notes: planNotes.trim(), is_active: true
    }).select('id').single()

    if (planErr || !plan) { setAlert('Kaydetme hatası: ' + planErr?.message); setSaving(false); return }

    const periodEnd = calcFirstPeriodEnd(startDate)
    await supabase.from('long_stay_periods').insert({
      business_id: businessId, plan_id: plan.id, pet_id: selectedPet.id,
      period_start: startDate, period_end: periodEnd,
      net_total: fee, notes: planNotes.trim()
    })

    setAlert('Uzun süreli konaklama başlatıldı.')
    setSaving(false)
    resetForm()
    await loadAll()
  }

  async function stopPlan() {
    if (!selectedPlan) return
    const supabase = createClient()
    await supabase.from('long_stay_plans').update({ is_active: false, end_date: today() }).eq('id', selectedPlan.id)
    setAlert('Plan durduruldu.')
    setSelectedPlan(null)
    setShowStopConfirm(false)
    await loadAll()
  }

  function selectPet(pet: any) {
    setSelectedPet(pet)
    setSearch(pet.name)
    setFilteredPets([])
    const plan = activePlans.find(p => p.pet_id === pet.id)
    if (plan) {
      setSelectedPlan(plan)
      setStartDate(plan.start_date)
      setMonthlyFee(String(plan.price_monthly))
      setPlanNotes(plan.notes ?? '')
    } else {
      setSelectedPlan(null)
      setStartDate(today())
      setMonthlyFee('')
      setPlanNotes('')
    }
  }

  function resetForm() {
    setSearch(''); setSelectedPet(null); setSelectedPlan(null)
    setStartDate(today()); setMonthlyFee(''); setPlanNotes('')
  }

  const periodsForPet = selectedPet
    ? periods.filter(p => p.pet_id === selectedPet.id).sort((a, b) => b.period_start.localeCompare(a.period_start))
    : []

  const card: React.CSSProperties = { backgroundColor: '#fff', borderRadius: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', marginBottom: '16px', padding: '20px' }
  const inp: React.CSSProperties = { width: '100%', padding: '10px 14px', backgroundColor: '#F2F2F7', borderRadius: '10px', border: 'none', outline: 'none', fontSize: '15px', boxSizing: 'border-box', color: '#000' }
  const btn = (color = '#007AFF'): React.CSSProperties => ({ padding: '10px 20px', borderRadius: '10px', border: 'none', backgroundColor: color, color: '#fff', fontSize: '15px', fontWeight: 600, cursor: 'pointer' })

  return (
    <div style={{ padding: '32px', maxWidth: '780px', paddingBottom: '64px' }}>
      <h1 style={{ fontSize: '32px', fontWeight: 800, margin: '0 0 24px' }}>Uzun Süreli Konaklama</h1>

      {alert && (
        <div style={{ ...card, backgroundColor: '#F2F2F7', padding: '16px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '15px' }}>{alert}</span>
          <button onClick={() => setAlert('')} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#6C6C70' }}>✕</button>
        </div>
      )}

      {/* Stop Confirm */}
      {showStopConfirm && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '28px', maxWidth: '360px', width: '90%' }}>
            <p style={{ fontSize: '17px', fontWeight: 700, margin: '0 0 8px' }}>Plan durdurulsun mu?</p>
            <p style={{ fontSize: '14px', color: '#6C6C70', margin: '0 0 20px' }}>Bu işlem planı pasife alır.</p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setShowStopConfirm(false)} style={{ ...btn('#F2F2F7'), color: '#000', flex: 1 }}>İptal</button>
              <button onClick={stopPlan} style={{ ...btn('#FF3B30'), flex: 1 }}>Hemen Durdur</button>
            </div>
          </div>
        </div>
      )}

      {/* Kayıttan Getir */}
      <div style={card}>
        <p style={{ fontSize: '17px', fontWeight: 700, margin: '0 0 12px' }}>Kayıttan Getir</p>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder='Hayvan adı / sahip adı / telefon' style={inp} />
            {filteredPets.length > 0 && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: '#fff', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.12)', zIndex: 10, marginTop: '4px', overflow: 'hidden' }}>
                {filteredPets.map((pet, i) => (
                  <div key={pet.id} onClick={() => selectPet(pet)} style={{ padding: '12px 16px', cursor: 'pointer', borderBottom: i < filteredPets.length - 1 ? '1px solid #F2F2F7' : 'none', backgroundColor: selectedPet?.id === pet.id ? '#F0F7FF' : '#fff' }}>
                    <p style={{ fontSize: '15px', fontWeight: 600, margin: '0 0 2px' }}>{pet.name}</p>
                    <p style={{ fontSize: '13px', color: '#6C6C70', margin: 0 }}>{pet.customers?.full_name ?? pet.owner_name ?? ''} • {pet.species ?? ''} {pet.breed ? `• ${pet.breed}` : ''}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
          <button onClick={resetForm} style={{ ...btn('#F2F2F7'), color: '#000' }}>Temizle</button>
        </div>
      </div>

      {/* Yeni Giriş */}
      <div style={card}>
        <p style={{ fontSize: '17px', fontWeight: 700, margin: '0 0 16px' }}>Yeni Uzun Süreli Konaklama Girişi</p>

        {selectedPet ? (
          <div style={{ padding: '12px', backgroundColor: '#F0F7FF', borderRadius: '12px', marginBottom: '16px' }}>
            <p style={{ fontSize: '16px', fontWeight: 600, margin: '0 0 4px' }}>{selectedPet.name}</p>
            <p style={{ fontSize: '13px', color: '#6C6C70', margin: 0 }}>{selectedPet.customers?.full_name ?? selectedPet.owner_name ?? 'Sahip yok'} • {selectedPet.species ?? ''}</p>
          </div>
        ) : (
          <p style={{ color: '#6C6C70', fontSize: '14px', marginBottom: '16px' }}>Önce bir evcil hayvan seç.</p>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
          <div>
            <p style={{ fontSize: '13px', color: '#6C6C70', margin: '0 0 6px', textAlign: 'center' }}>Başlangıç Tarihi</p>
            <input type='date' value={startDate} onChange={e => setStartDate(e.target.value)} style={{ ...inp, textAlign: 'center' }} />
          </div>
          <div>
            <p style={{ fontSize: '13px', color: '#6C6C70', margin: '0 0 6px', textAlign: 'center' }}>Aylık Ücret (₺)</p>
            <input type='number' value={monthlyFee} onChange={e => setMonthlyFee(e.target.value)} placeholder='0' style={{ ...inp, textAlign: 'center' }} />
          </div>
        </div>

        <input value={planNotes} onChange={e => setPlanNotes(e.target.value)} placeholder='Not (opsiyonel)' style={{ ...inp, marginBottom: '16px' }} />

        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <button onClick={startPlan} disabled={!selectedPet || saving} style={{ ...btn(!selectedPet || saving ? '#AEAEB2' : '#007AFF'), paddingLeft: '32px', paddingRight: '32px' }}>
            {saving ? 'Kaydediliyor...' : '▶ Uzun Süreli Konaklamayı Başlat'}
          </button>
        </div>
      </div>

      {/* Aktif Planlar */}
      <div style={card}>
        <button onClick={() => setShowActivePlans(!showActivePlans)} style={{ background: 'none', border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '17px', fontWeight: 700 }}>Mevcut Uzun Süreli Konaklamalar</span>
            {activePlans.length > 0 && (
              <span style={{ backgroundColor: '#007AFF20', color: '#007AFF', fontSize: '12px', fontWeight: 600, padding: '2px 8px', borderRadius: '20px' }}>{activePlans.length}</span>
            )}
          </div>
          <span style={{ color: '#6C6C70', fontSize: '18px' }}>{showActivePlans ? '▲' : '▼'}</span>
        </button>

        {showActivePlans && (
          <div style={{ marginTop: '16px' }}>
            {loading ? (
              <p style={{ color: '#6C6C70', textAlign: 'center' }}>Yükleniyor...</p>
            ) : activePlans.length === 0 ? (
              <p style={{ color: '#6C6C70' }}>Şu anda aktif uzun süreli konaklama yok.</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '10px' }}>
                {activePlans.map(plan => {
                  const isSelected = selectedPlan?.id === plan.id
                  const ownerLine = [plan.pets?.customers?.full_name, plan.pets?.species === 'dog' ? 'Köpek' : plan.pets?.species === 'cat' ? 'Kedi' : plan.pets?.species, plan.pets?.breed].filter(Boolean).join(' • ')
                  return (
                    <div key={plan.id} onClick={() => {
                      setSelectedPlan(plan)
                      const pet = pets.find(p => p.id === plan.pet_id)
                      if (pet) selectPet(pet)
                    }} style={{ padding: '14px', borderRadius: '14px', backgroundColor: '#EBF4FF', border: `1px solid ${isSelected ? '#007AFF' : '#007AFF33'}`, cursor: 'pointer' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                        <span style={{ fontSize: '15px', fontWeight: 700 }}>🐾 {plan.pets?.name ?? 'İsimsiz'}</span>
                        <span style={{ fontSize: '14px', fontWeight: 600, color: '#007AFF' }}>{fmtMoney(plan.price_monthly)}</span>
                      </div>
                      <p style={{ fontSize: '13px', color: '#6C6C70', margin: '0 0 8px' }}>{ownerLine}</p>
                      <p style={{ fontSize: '12px', color: '#6C6C70', margin: 0 }}>📅 {fmtDate(plan.start_date)}{plan.end_date ? ` → ${fmtDate(plan.end_date)}` : ''}</p>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Geçmiş Dönemler */}
      {selectedPet && (
        <>
          {/* Tarih Aralığı */}
          <div style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: showDatePicker ? '16px' : 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>📅</span>
                <span style={{ fontSize: '15px', fontWeight: 600 }}>Gösterilen Dönem</span>
              </div>
              <button onClick={() => setShowDatePicker(!showDatePicker)} style={{ ...btn('#F2F2F7'), color: '#007AFF', padding: '6px 14px', fontSize: '13px' }}>
                {showDatePicker ? 'Kapat' : 'Değiştir'}
              </button>
            </div>

            {showDatePicker ? (
              <div>
                <div style={{ display: 'flex', gap: '16px', marginBottom: '12px', flexWrap: 'wrap' }}>
                  <div>
                    <p style={{ fontSize: '12px', color: '#6C6C70', margin: '0 0 4px' }}>Başlangıç</p>
                    <input type='date' value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ ...inp, width: 'auto' }} />
                  </div>
                  <div>
                    <p style={{ fontSize: '12px', color: '#6C6C70', margin: '0 0 4px' }}>Bitiş</p>
                    <input type='date' value={dateTo} onChange={e => setDateTo(e.target.value)} style={{ ...inp, width: 'auto' }} />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
                  {[
                    { label: 'Son 90 gün', action: () => { setDateFrom(daysAgo(90)); setDateTo(today()) } },
                    { label: 'Bu yıl', action: () => { setDateFrom(`${new Date().getFullYear()}-01-01`); setDateTo(today()) } },
                    { label: 'Tüm 2024', action: () => { setDateFrom('2024-01-01'); setDateTo('2024-12-31') } },
                  ].map(q => (
                    <button key={q.label} onClick={q.action} style={{ padding: '6px 12px', borderRadius: '8px', border: 'none', backgroundColor: '#F2F2F7', fontSize: '13px', cursor: 'pointer' }}>{q.label}</button>
                  ))}
                </div>
                <button onClick={async () => { setShowDatePicker(false); await loadAll(dateFrom, dateTo) }} style={{ ...btn('#007AFF'), width: '100%' }}>
                  Bu Aralığı Yükle
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
                <span style={{ fontSize: '13px', color: '#6C6C70' }}>{fmtDate(dateFrom)} — {fmtDate(dateTo)}</span>
                <span style={{ fontSize: '12px', color: '#AEAEB2' }}>{periodsForPet.length} dönem</span>
              </div>
            )}
          </div>

          {/* Dönem Listesi */}
          <div style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <p style={{ fontSize: '17px', fontWeight: 700, margin: 0 }}>Geçmiş Dönemler</p>
              {selectedPlan && selectedPlan.pet_id === selectedPet.id && (
                <button onClick={() => setShowStopConfirm(true)} style={{ ...btn('#FF3B30'), padding: '8px 16px', fontSize: '13px' }}>⛔ Planı Durdur</button>
              )}
            </div>

            {periodsForPet.length === 0 ? (
              <p style={{ color: '#6C6C70' }}>Bu dönemde konaklama kaydı yok.</p>
            ) : periodsForPet.map(period => {
              const title = (() => {
                const d = new Date(period.period_start)
                return `Aylık Konaklama (${d.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })})`
              })()
              return (
                <div key={period.id} style={{ padding: '14px', borderRadius: '12px', backgroundColor: '#F2F2F7', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                    <div>
                      <p style={{ fontSize: '14px', fontWeight: 600, margin: '0 0 2px' }}>{title}</p>
                      <p style={{ fontSize: '12px', color: '#6C6C70', margin: 0 }}>{fmtDate(period.period_start)} → {fmtDate(period.period_end)}</p>
                    </div>
                    <span style={{ fontSize: '14px', fontWeight: 700, color: '#007AFF' }}>{fmtMoney(period.net_total)}</span>
                  </div>
                  {period.notes?.trim() && <p style={{ fontSize: '12px', color: '#6C6C70', margin: '6px 0 0' }}>{period.notes}</p>}
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

// Helpers
function today() { return new Date().toISOString().split('T')[0] }
function daysAgo(n: number) {
  const d = new Date(); d.setDate(d.getDate() - n)
  return d.toISOString().split('T')[0]
}
function fmtDate(s?: string) {
  if (!s) return '?'
  const [y, m, d] = s.split('-')
  return `${d}.${m}.${y}`
}
function fmtMoney(v: number) {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(v)
}
function calcFirstPeriodEnd(startDate: string) {
  const d = new Date(startDate)
  d.setMonth(d.getMonth() + 1)
  d.setDate(d.getDate() - 1)
  return d.toISOString().split('T')[0]
}