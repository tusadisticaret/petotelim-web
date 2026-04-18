'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

type Filter = 'all' | 'today' | 'tomorrow' | 'overdue' | 'pending'

export default function ReservationsPage() {
  const [reservations, setReservations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [businessId, setBusinessId] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [pets, setPets] = useState<any[]>([])
  const [filteredPets, setFilteredPets] = useState<any[]>([])
  const [petSearch, setPetSearch] = useState('')
  const [selectedPet, setSelectedPet] = useState<any>(null)
  const [checkIn, setCheckIn] = useState(today())
  const [checkOut, setCheckOut] = useState(tomorrow())
  const [dailyPrice, setDailyPrice] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [alert, setAlert] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [checkinConfirm, setCheckinConfirm] = useState<any | null>(null)

  useEffect(() => { loadAll() }, [])

  useEffect(() => {
    if (!petSearch.trim()) { setFilteredPets([]); return }
    const q = petSearch.toLowerCase()
    setFilteredPets(pets.filter(p =>
      p.name?.toLowerCase().includes(q) ||
      (p.owner_name ?? p.customers?.full_name ?? '').toLowerCase().includes(q) ||
      (p.owner_phone ?? '').toLowerCase().includes(q)
    ).slice(0, 8))
  }, [petSearch, pets])

  async function loadAll() {
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: biz } = await supabase.from('businesses').select('id').eq('owner_user_id', user.id).single()
    const bid = biz?.id ?? ''
    setBusinessId(bid)

    const [{ data: resData }, { data: petsData }] = await Promise.all([
      supabase.from('stays').select(`
        id, pet_id, check_in_date, planned_check_out_date, daily_price, notes,
        pets(id, name, species, breed, owner_name, owner_phone, customers(full_name, phone))
      `).eq('business_id', bid).eq('is_reservation', true).order('check_in_date'),
      supabase.from('pets').select('id, name, species, breed, owner_name, owner_phone, customers(full_name, phone)').eq('business_id', bid).order('name')
    ])

    setReservations(resData ?? [])
    setPets(petsData ?? [])
    setLoading(false)
  }

  async function saveReservation() {
    if (!selectedPet) { setAlert('Evcil hayvan seç.'); return }
    if (!checkIn || !checkOut) { setAlert('Tarih gir.'); return }
    if (checkOut <= checkIn) { setAlert('Çıkış tarihi giriş tarihinden sonra olmalı.'); return }
    const price = parseFloat(dailyPrice.replace(',', '.'))
    if (!price || price <= 0) { setAlert('Günlük ücret gir.'); return }
    setSaving(true)
    const supabase = createClient()
    await supabase.from('stays').insert({
      business_id: businessId, pet_id: selectedPet.id,
      check_in_date: checkIn, planned_check_out_date: checkOut,
      actual_check_out_date: null, daily_price: price,
      washing_fee: 0, grooming_fee: 0, food_fee: 0, transfer_fee: 0,
      discount_tl: 0, notes: notes.trim(),
      invoice_number: null, invoice_file_url: null, is_reservation: true
    })
    setAlert('Rezervasyon kaydedildi.')
    setSaving(false)
    resetForm()
    await loadAll()
  }

  async function doCheckin(r: any) {
    const supabase = createClient()
    await supabase.from('stays').update({ is_reservation: false, planned_check_out_date: null }).eq('id', r.id)
    setCheckinConfirm(null)
    setAlert('Check-in yapıldı.')
    await loadAll()
  }

  async function deleteReservation(id: string) {
    const supabase = createClient()
    await supabase.from('stays').delete().eq('id', id).eq('is_reservation', true)
    setDeleteConfirm(null)
    setAlert('Rezervasyon silindi.')
    await loadAll()
  }

  function resetForm() {
    setSelectedPet(null); setPetSearch(''); setCheckIn(today())
    setCheckOut(tomorrow()); setDailyPrice(''); setNotes('')
  }

  const todayStr = today()
  const tomorrowStr = tomorrow()

  const filtered = reservations.filter(r => {
    const ci = r.check_in_date?.split('T')[0] ?? ''
    if (filter === 'today') return ci === todayStr
    if (filter === 'tomorrow') return ci === tomorrowStr
    if (filter === 'overdue') return ci < todayStr
    if (filter === 'pending') return ci > tomorrowStr
    return true
  })

  const nights = checkIn && checkOut
    ? Math.max(0, Math.ceil((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000))
    : 0
  const price = parseFloat(dailyPrice.replace(',', '.')) || 0
  const total = nights * price

  const card: React.CSSProperties = { backgroundColor: '#fff', borderRadius: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', marginBottom: '16px', padding: '20px' }
  const inp: React.CSSProperties = { width: '100%', padding: '10px 14px', backgroundColor: '#F2F2F7', borderRadius: '10px', border: 'none', outline: 'none', fontSize: '15px', boxSizing: 'border-box', color: '#000' }
  const filterChip = (f: Filter, label: string): React.CSSProperties => ({
    padding: '8px 18px', borderRadius: '20px', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: 600,
    backgroundColor: filter === f ? '#007AFF' : '#F2F2F7', color: filter === f ? '#fff' : '#000'
  })

  return (
    <div style={{ padding: '32px', maxWidth: '720px', paddingBottom: '64px' }}>
      <h1 style={{ fontSize: '32px', fontWeight: 800, margin: '0 0 24px' }}>Rezervasyonlar</h1>

      {alert && (
        <div style={{ ...card, backgroundColor: '#F2F2F7', padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <span style={{ fontSize: '14px' }}>{alert}</span>
          <button onClick={() => setAlert('')} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#6C6C70' }}>✕</button>
        </div>
      )}

      {/* Silme Onay */}
      {deleteConfirm && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '28px', maxWidth: '360px', width: '90%' }}>
            <p style={{ fontSize: '17px', fontWeight: 700, margin: '0 0 8px' }}>Rezervasyon silinsin mi?</p>
            <p style={{ fontSize: '14px', color: '#6C6C70', margin: '0 0 20px' }}>Bu işlem geri alınamaz.</p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setDeleteConfirm(null)} style={{ flex: 1, padding: '10px', borderRadius: '10px', border: 'none', backgroundColor: '#F2F2F7', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>İptal</button>
              <button onClick={() => deleteReservation(deleteConfirm)} style={{ flex: 1, padding: '10px', borderRadius: '10px', border: 'none', backgroundColor: '#FF3B30', color: '#fff', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>Sil</button>
            </div>
          </div>
        </div>
      )}

      {/* Check-in Onay */}
      {checkinConfirm && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '28px', maxWidth: '360px', width: '90%' }}>
            <p style={{ fontSize: '17px', fontWeight: 700, margin: '0 0 8px' }}>Check-in yapılsın mı?</p>
            <p style={{ fontSize: '14px', color: '#6C6C70', margin: '0 0 20px' }}>{checkinConfirm.pets?.name} için rezervasyon aktif konaklamaya dönüşecek.</p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setCheckinConfirm(null)} style={{ flex: 1, padding: '10px', borderRadius: '10px', border: 'none', backgroundColor: '#F2F2F7', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>İptal</button>
              <button onClick={() => doCheckin(checkinConfirm)} style={{ flex: 1, padding: '10px', borderRadius: '10px', border: 'none', backgroundColor: '#34C759', color: '#fff', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>Check-in Yap</button>
            </div>
          </div>
        </div>
      )}

      {/* Kayıttan Getir + Form */}
      <div style={card}>
        <p style={{ fontSize: '17px', fontWeight: 700, margin: '0 0 12px' }}>Kayıttan Getir</p>
        <div style={{ position: 'relative', marginBottom: '12px' }}>
          <div style={{ display: 'flex', gap: '10px' }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <input value={petSearch} onChange={e => setPetSearch(e.target.value)} placeholder='Hayvan adı / sahip adı / telefon' style={inp} />
              {filteredPets.length > 0 && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: '#fff', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.12)', zIndex: 10, marginTop: '4px', overflow: 'hidden' }}>
                  {filteredPets.map((pet, i) => (
                    <div key={pet.id} onClick={() => { setSelectedPet(pet); setPetSearch(pet.name); setFilteredPets([]) }} style={{ padding: '12px 16px', cursor: 'pointer', borderBottom: i < filteredPets.length - 1 ? '1px solid #F2F2F7' : 'none' }}>
                      <p style={{ fontSize: '15px', fontWeight: 600, margin: '0 0 2px' }}>{pet.name}</p>
                      <p style={{ fontSize: '12px', color: '#6C6C70', margin: 0 }}>{pet.customers?.full_name ?? pet.owner_name ?? ''} • {pet.species ?? ''}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <button onClick={resetForm} style={{ padding: '10px 16px', borderRadius: '10px', border: 'none', backgroundColor: '#F2F2F7', fontSize: '14px', fontWeight: 500, cursor: 'pointer' }}>Temizle</button>
          </div>
        </div>

        {selectedPet && (
          <div style={{ padding: '10px 14px', backgroundColor: '#F0F7FF', borderRadius: '10px', marginBottom: '12px' }}>
            <p style={{ fontSize: '14px', fontWeight: 600, margin: '0 0 2px' }}>{selectedPet.name}</p>
            <p style={{ fontSize: '12px', color: '#6C6C70', margin: 0 }}>{selectedPet.customers?.full_name ?? selectedPet.owner_name ?? 'Sahip yok'} • {selectedPet.species ?? ''}</p>
          </div>
        )}
      </div>

      {/* Rezervasyon Detayları */}
      <div style={card}>
        <p style={{ fontSize: '17px', fontWeight: 700, margin: '0 0 16px' }}>Rezervasyon Detayları</p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
          <div>
            <p style={{ fontSize: '13px', color: '#6C6C70', margin: '0 0 6px', textAlign: 'center' }}>Tahmini Giriş</p>
            <input type='date' value={checkIn} onChange={e => setCheckIn(e.target.value)} style={{ ...inp, textAlign: 'center' }} />
          </div>
          <div>
            <p style={{ fontSize: '13px', color: '#6C6C70', margin: '0 0 6px', textAlign: 'center' }}>Tahmini Çıkış</p>
            <input type='date' value={checkOut} onChange={e => setCheckOut(e.target.value)} style={{ ...inp, textAlign: 'center' }} />
          </div>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <p style={{ fontSize: '13px', color: '#6C6C70', margin: '0 0 6px', textAlign: 'center' }}>Günlük Ücret (₺)</p>
          <input type='number' value={dailyPrice} onChange={e => setDailyPrice(e.target.value)} placeholder='Günlük Ücret' style={{ ...inp, textAlign: 'center' }} />
        </div>

        {/* Toplam Önizleme */}
        <div style={{ backgroundColor: '#F2F2F7', borderRadius: '12px', padding: '14px', marginBottom: '16px' }}>
          <p style={{ fontSize: '12px', color: '#6C6C70', margin: '0 0 10px' }}>Toplam Önizleme</p>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontSize: '15px', color: '#6C6C70' }}>Gece</span>
            <span style={{ fontSize: '15px' }}>{nights}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontSize: '15px', color: '#6C6C70' }}>Günlük Ücret</span>
            <span style={{ fontSize: '15px' }}>{fmtMoney(price)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '15px', color: '#6C6C70' }}>Tahmini Toplam</span>
            <span style={{ fontSize: '15px', fontWeight: 700, color: '#007AFF' }}>{fmtMoney(total)}</span>
          </div>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <p style={{ fontSize: '13px', color: '#6C6C70', margin: '0 0 6px' }}>Not</p>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder='İsteğe bağlı not...' rows={3} style={{ ...inp, resize: 'vertical' }} />
        </div>

        <button onClick={saveReservation} disabled={saving || !selectedPet} style={{ width: '100%', padding: '14px', borderRadius: '14px', border: 'none', backgroundColor: saving || !selectedPet ? '#AEAEB2' : '#007AFF', color: '#fff', fontSize: '16px', fontWeight: 700, cursor: saving || !selectedPet ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
          📋 Rezervasyonu Kaydet
        </button>
      </div>

      {/* Bekleyen Rezervasyonlar */}
      <div style={card}>
        <p style={{ fontSize: '17px', fontWeight: 700, margin: '0 0 14px' }}>Bekleyen Rezervasyonlar</p>

        {/* Filtreler */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
          {([
            ['all', 'Tümü'],
            ['today', 'Bugün Giriş'],
            ['tomorrow', 'Yarın Giriş'],
            ['overdue', 'Geciken'],
            ['pending', 'Senkron Bekleyen'],
          ] as [Filter, string][]).map(([f, label]) => (
            <button key={f} onClick={() => setFilter(f)} style={filterChip(f, label)}>{label}</button>
          ))}
        </div>

        {loading ? (
          <p style={{ color: '#6C6C70', textAlign: 'center', padding: '24px 0' }}>Yükleniyor...</p>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 0' }}>
            <p style={{ fontSize: '32px', margin: '0 0 8px' }}>📅</p>
            <p style={{ fontSize: '14px', color: '#6C6C70', margin: 0 }}>Bu filtreye uygun rezervasyon yok</p>
          </div>
        ) : filtered.map(r => {
          const ownerName = r.pets?.owner_name || r.pets?.customers?.full_name || 'Sahip yok'
          const ci = r.check_in_date?.split('T')[0] ?? ''
          const co = r.planned_check_out_date?.split('T')[0] ?? ''
          const n = ci && co ? Math.max(0, Math.ceil((new Date(co).getTime() - new Date(ci).getTime()) / 86400000)) : 0
          const isOverdue = ci < todayStr
          const isToday = ci === todayStr

          return (
            <div key={r.id} style={{ padding: '14px', borderRadius: '14px', backgroundColor: '#F2F2F7', marginBottom: '10px', border: isOverdue ? '1px solid #FF3B3033' : isToday ? '1px solid #34C75933' : 'none' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <div>
                  <p style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 2px' }}>🐾 {r.pets?.name ?? 'İsimsiz'}</p>
                  <p style={{ fontSize: '13px', color: '#6C6C70', margin: 0 }}>{ownerName}{r.pets?.species ? ` • ${r.pets.species}` : ''}{r.pets?.breed ? ` • ${r.pets.breed}` : ''}</p>
                </div>
                {isOverdue && <span style={{ backgroundColor: '#FF3B3020', color: '#FF3B30', fontSize: '11px', fontWeight: 600, padding: '3px 8px', borderRadius: '8px' }}>Gecikti</span>}
                {isToday && !isOverdue && <span style={{ backgroundColor: '#34C75920', color: '#34C759', fontSize: '11px', fontWeight: 600, padding: '3px 8px', borderRadius: '8px' }}>Bugün</span>}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '10px' }}>
                <div style={{ backgroundColor: '#fff', padding: '8px 10px', borderRadius: '8px' }}>
                  <p style={{ fontSize: '10px', color: '#6C6C70', margin: '0 0 2px' }}>GİRİŞ</p>
                  <p style={{ fontSize: '13px', fontWeight: 600, margin: 0 }}>{fmtDate(ci)}</p>
                </div>
                <div style={{ backgroundColor: '#fff', padding: '8px 10px', borderRadius: '8px' }}>
                  <p style={{ fontSize: '10px', color: '#6C6C70', margin: '0 0 2px' }}>ÇIKIŞ</p>
                  <p style={{ fontSize: '13px', fontWeight: 600, margin: 0 }}>{fmtDate(co)}</p>
                </div>
                <div style={{ backgroundColor: '#fff', padding: '8px 10px', borderRadius: '8px' }}>
                  <p style={{ fontSize: '10px', color: '#6C6C70', margin: '0 0 2px' }}>TOPLAM</p>
                  <p style={{ fontSize: '13px', fontWeight: 700, color: '#007AFF', margin: 0 }}>{fmtMoney(n * r.daily_price)}</p>
                </div>
              </div>

              {r.notes?.trim() && <p style={{ fontSize: '12px', color: '#6C6C70', margin: '0 0 10px' }}>{r.notes}</p>}

              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => setCheckinConfirm(r)} style={{ flex: 2, padding: '9px', borderRadius: '10px', border: 'none', backgroundColor: '#34C759', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                  ✓ Check-in Yap
                </button>
                <button onClick={() => setDeleteConfirm(r.id)} style={{ flex: 1, padding: '9px', borderRadius: '10px', border: 'none', backgroundColor: '#fff', color: '#FF3B30', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                  🗑 Sil
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function today() { return new Date().toISOString().split('T')[0] }
function tomorrow() {
  const d = new Date(); d.setDate(d.getDate() + 1)
  return d.toISOString().split('T')[0]
}
function fmtDate(s?: string) {
  if (!s) return '?'
  const [y, m, d] = s.split('-')
  return `${d}.${m}.${y}`
}
function fmtMoney(v: number) {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 2 }).format(v)
}