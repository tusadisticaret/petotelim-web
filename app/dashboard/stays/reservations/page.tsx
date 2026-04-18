'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function ReservationsPage() {
  const [reservations, setReservations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [businessId, setBusinessId] = useState('')
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
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
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

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
    const { data: biz } = await supabase.from('businesses').select('id').eq('user_id', user.id).single()
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

    if (editingId) {
      await supabase.from('stays').update({
        check_in_date: checkIn, planned_check_out_date: checkOut,
        daily_price: price, notes: notes.trim()
      }).eq('id', editingId)
      setAlert('Rezervasyon güncellendi.')
    } else {
      await supabase.from('stays').insert({
        business_id: businessId, pet_id: selectedPet.id,
        check_in_date: checkIn, planned_check_out_date: checkOut,
        actual_check_out_date: null, daily_price: price,
        washing_fee: 0, grooming_fee: 0, food_fee: 0, transfer_fee: 0,
        discount_tl: 0, notes: notes.trim(),
        invoice_number: null, invoice_file_url: null, is_reservation: true
      })
      setAlert('Rezervasyon oluşturuldu.')
    }

    setSaving(false)
    resetForm()
    await loadAll()
  }

  async function deleteReservation(id: string) {
    const supabase = createClient()
    await supabase.from('stays').delete().eq('id', id).eq('is_reservation', true)
    setDeleteConfirm(null)
    setAlert('Rezervasyon silindi.')
    await loadAll()
  }

  function editReservation(r: any) {
    setEditingId(r.id)
    const pet = { id: r.pet_id, name: r.pets?.name, species: r.pets?.species, breed: r.pets?.breed, owner_name: r.pets?.owner_name, customers: r.pets?.customers }
    setSelectedPet(pet)
    setPetSearch(r.pets?.name ?? '')
    setCheckIn(r.check_in_date?.split('T')[0] ?? today())
    setCheckOut(r.planned_check_out_date?.split('T')[0] ?? tomorrow())
    setDailyPrice(String(r.daily_price))
    setNotes(r.notes ?? '')
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function resetForm() {
    setShowForm(false); setEditingId(null); setSelectedPet(null)
    setPetSearch(''); setCheckIn(today()); setCheckOut(tomorrow())
    setDailyPrice(''); setNotes('')
  }

  const filtered = reservations.filter(r => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return r.pets?.name?.toLowerCase().includes(q) ||
      (r.pets?.owner_name ?? r.pets?.customers?.full_name ?? '').toLowerCase().includes(q)
  })

  const card: React.CSSProperties = { backgroundColor: '#fff', borderRadius: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', marginBottom: '16px', padding: '20px' }
  const inp: React.CSSProperties = { width: '100%', padding: '10px 14px', backgroundColor: '#F2F2F7', borderRadius: '10px', border: 'none', outline: 'none', fontSize: '15px', boxSizing: 'border-box', color: '#000' }
  const btn = (color = '#007AFF'): React.CSSProperties => ({ padding: '10px 20px', borderRadius: '10px', border: 'none', backgroundColor: color, color: color === '#F2F2F7' ? '#000' : '#fff', fontSize: '14px', fontWeight: 600, cursor: 'pointer' })

  const nights = checkIn && checkOut ? Math.max(0, Math.ceil((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000)) : 0

  return (
    <div style={{ padding: '32px', maxWidth: '780px', paddingBottom: '64px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 800, margin: 0 }}>Rezervasyonlar</h1>
        <button onClick={() => { resetForm(); setShowForm(true) }} style={{ ...btn('#007AFF'), display: 'flex', alignItems: 'center', gap: '6px' }}>
          + Yeni Rezervasyon
        </button>
      </div>

      {alert && (
        <div style={{ ...card, backgroundColor: '#F2F2F7', padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '14px' }}>{alert}</span>
          <button onClick={() => setAlert('')} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#6C6C70' }}>✕</button>
        </div>
      )}

      {deleteConfirm && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '28px', maxWidth: '360px', width: '90%' }}>
            <p style={{ fontSize: '17px', fontWeight: 700, margin: '0 0 8px' }}>Rezervasyon silinsin mi?</p>
            <p style={{ fontSize: '14px', color: '#6C6C70', margin: '0 0 20px' }}>Bu işlem geri alınamaz.</p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setDeleteConfirm(null)} style={{ ...btn('#F2F2F7'), flex: 1 }}>İptal</button>
              <button onClick={() => deleteReservation(deleteConfirm)} style={{ ...btn('#FF3B30'), flex: 1 }}>Sil</button>
            </div>
          </div>
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div style={card}>
          <p style={{ fontSize: '17px', fontWeight: 700, margin: '0 0 16px' }}>
            {editingId ? 'Rezervasyon Düzenle' : 'Yeni Rezervasyon'}
          </p>

          {/* Pet Arama */}
          <div style={{ position: 'relative', marginBottom: '12px' }}>
            <input value={petSearch} onChange={e => setPetSearch(e.target.value)} placeholder='Hayvan adı veya sahip adı' style={inp} />
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

          {selectedPet && (
            <div style={{ padding: '10px 14px', backgroundColor: '#F0F7FF', borderRadius: '10px', marginBottom: '12px' }}>
              <p style={{ fontSize: '14px', fontWeight: 600, margin: '0 0 2px' }}>{selectedPet.name}</p>
              <p style={{ fontSize: '12px', color: '#6C6C70', margin: 0 }}>{selectedPet.customers?.full_name ?? selectedPet.owner_name ?? 'Sahip yok'} • {selectedPet.species ?? ''}</p>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div>
              <p style={{ fontSize: '12px', color: '#6C6C70', margin: '0 0 4px' }}>Giriş Tarihi</p>
              <input type='date' value={checkIn} onChange={e => setCheckIn(e.target.value)} style={inp} />
            </div>
            <div>
              <p style={{ fontSize: '12px', color: '#6C6C70', margin: '0 0 4px' }}>Çıkış Tarihi</p>
              <input type='date' value={checkOut} onChange={e => setCheckOut(e.target.value)} style={inp} />
            </div>
          </div>

          <div style={{ marginBottom: '12px' }}>
            <p style={{ fontSize: '12px', color: '#6C6C70', margin: '0 0 4px' }}>Günlük Ücret (₺)</p>
            <input type='number' value={dailyPrice} onChange={e => setDailyPrice(e.target.value)} placeholder='0' style={inp} />
          </div>

          {nights > 0 && dailyPrice && (
            <div style={{ padding: '10px 14px', backgroundColor: '#F2F2F7', borderRadius: '10px', marginBottom: '12px', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '13px', color: '#6C6C70' }}>{nights} gece × {fmtMoney(parseFloat(dailyPrice) || 0)}</span>
              <span style={{ fontSize: '14px', fontWeight: 700, color: '#007AFF' }}>{fmtMoney((parseFloat(dailyPrice) || 0) * nights)}</span>
            </div>
          )}

          <input value={notes} onChange={e => setNotes(e.target.value)} placeholder='Not (opsiyonel)' style={{ ...inp, marginBottom: '16px' }} />

          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={resetForm} style={{ ...btn('#F2F2F7'), flex: 1 }}>İptal</button>
            <button onClick={saveReservation} disabled={saving} style={{ ...btn(saving ? '#AEAEB2' : '#007AFF'), flex: 2 }}>
              {saving ? 'Kaydediliyor...' : editingId ? '✓ Güncelle' : '+ Rezervasyon Oluştur'}
            </button>
          </div>
        </div>
      )}

      {/* Arama */}
      <div style={{ position: 'relative', marginBottom: '16px' }}>
        <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#6C6C70' }}>🔍</span>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder='Hayvan adı veya sahip ara' style={{ ...inp, paddingLeft: '40px' }} />
      </div>

      {/* Liste */}
      {loading ? (
        <div style={{ ...card, textAlign: 'center', padding: '48px' }}>
          <p style={{ color: '#6C6C70' }}>Yükleniyor...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ ...card, textAlign: 'center', padding: '48px' }}>
          <p style={{ fontSize: '32px', margin: '0 0 12px' }}>📅</p>
          <p style={{ fontSize: '15px', fontWeight: 600, color: '#6C6C70', margin: '0 0 6px' }}>Rezervasyon yok</p>
          <p style={{ fontSize: '13px', color: '#AEAEB2', margin: 0 }}>Yeni rezervasyon oluşturmak için sağ üstteki butona tıklayın.</p>
        </div>
      ) : filtered.map(r => {
        const ownerName = r.pets?.owner_name || r.pets?.customers?.full_name || 'Sahip yok'
        const nights = r.check_in_date && r.planned_check_out_date
          ? Math.max(0, Math.ceil((new Date(r.planned_check_out_date).getTime() - new Date(r.check_in_date).getTime()) / 86400000))
          : 0
        const total = nights * (r.daily_price ?? 0)

        return (
          <div key={r.id} style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
              <div>
                <p style={{ fontSize: '17px', fontWeight: 700, margin: '0 0 4px' }}>🐾 {r.pets?.name ?? 'İsimsiz'}</p>
                <p style={{ fontSize: '13px', color: '#6C6C70', margin: 0 }}>{ownerName} • {r.pets?.species ?? ''} {r.pets?.breed ? `• ${r.pets.breed}` : ''}</p>
              </div>
              <span style={{ backgroundColor: '#FFF3E0', color: '#FF9500', fontSize: '12px', fontWeight: 600, padding: '4px 10px', borderRadius: '20px' }}>Rezervasyon</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '12px' }}>
              <div style={{ padding: '10px', backgroundColor: '#F2F2F7', borderRadius: '10px' }}>
                <p style={{ fontSize: '11px', color: '#6C6C70', margin: '0 0 2px' }}>GİRİŞ</p>
                <p style={{ fontSize: '14px', fontWeight: 600, margin: 0 }}>{fmtDate(r.check_in_date)}</p>
              </div>
              <div style={{ padding: '10px', backgroundColor: '#F2F2F7', borderRadius: '10px' }}>
                <p style={{ fontSize: '11px', color: '#6C6C70', margin: '0 0 2px' }}>ÇIKIŞ</p>
                <p style={{ fontSize: '14px', fontWeight: 600, margin: 0 }}>{fmtDate(r.planned_check_out_date)}</p>
              </div>
              <div style={{ padding: '10px', backgroundColor: '#F2F2F7', borderRadius: '10px' }}>
                <p style={{ fontSize: '11px', color: '#6C6C70', margin: '0 0 2px' }}>TOPLAM</p>
                <p style={{ fontSize: '14px', fontWeight: 700, color: '#007AFF', margin: 0 }}>{fmtMoney(total)}</p>
              </div>
            </div>

            {r.notes?.trim() && <p style={{ fontSize: '13px', color: '#6C6C70', margin: '0 0 12px' }}>{r.notes}</p>}

            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => editReservation(r)} style={{ ...btn('#F2F2F7'), flex: 1, fontSize: '13px', padding: '8px' }}>✏️ Düzenle</button>
              <button onClick={() => setDeleteConfirm(r.id)} style={{ ...btn('#FFF0F0'), color: '#FF3B30', flex: 1, fontSize: '13px', padding: '8px' }}>🗑 Sil</button>
            </div>
          </div>
        )
      })}
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
  const d = s.split('T')[0]
  const [y, m, day] = d.split('-')
  return `${day}.${m}.${y}`
}
function fmtMoney(v: number) {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(v)
}