'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const WEEKDAYS = ['Pazartesi', 'Sali', 'Carsamba', 'Persembe', 'Cuma', 'Cumartesi', 'Pazar']

function getWeekDates() {
  const today = new Date()
  const day = today.getDay()
  const monday = new Date(today)
  monday.setDate(today.getDate() - (day === 0 ? 6 : day - 1))
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })
}

function fmtDate(d: Date) {
  return d.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' })
}

function fmtDateTime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Istanbul' })
}

function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

function speciesIcon(species: string) {
  const s = (species ?? '').toLowerCase()
  if (s === 'cat' || s === 'kedi') return '🐈'
  if (s === 'dog' || s === 'köpek' || s === 'kopek') return '🐕'
  return '🐇'
}

function speciesColor(species: string) {
  const s = (species ?? '').toLowerCase()
  if (s === 'cat' || s === 'kedi') return '#FF9500'
  if (s === 'dog' || s === 'köpek' || s === 'kopek') return '#007AFF'
  return '#9B59B6'
}

function speciesLabel(species: string) {
  const s = (species ?? '').toLowerCase()
  if (s === 'cat' || s === 'kedi') return 'Kedi'
  if (s === 'dog' || s === 'köpek' || s === 'kopek') return 'Köpek'
  return 'Diğer'
}

function speciesFromNum(num: number) {
  if (num === 1) return 'cat'
  if (num === 0) return 'dog'
  return 'other'
}

function speciesToNum(species: string) {
  const s = (species ?? '').toLowerCase()
  if (s === 'cat' || s === 'kedi') return 1
  if (s === 'dog' || s === 'köpek' || s === 'kopek') return 0
  return 2
}

function sizeLabel(size: number) {
  return size === 1 ? 'Büyük Irk' : 'Küçük Irk'
}

function SegBtn({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{ padding: '8px 16px', borderRadius: '10px', border: active ? 'none' : '1px solid #E5E5EA', backgroundColor: active ? '#007AFF' : '#F2F2F7', color: active ? '#fff' : '#000', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>
      {label}
    </button>
  )
}

function EditRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 20px', borderBottom: '1px solid #F2F2F7' }}>
      <span style={{ fontSize: '14px', color: '#6C6C70', width: '100px', flexShrink: 0 }}>{label}</span>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', flex: 1 }}>{children}</div>
    </div>
  )
}

export default function GroomingReservationsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [businessId, setBusinessId] = useState('')
  const [reservations, setReservations] = useState<any[]>([])
  const [selectedDay, setSelectedDay] = useState(0)
  const [search, setSearch] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [selectedPet, setSelectedPet] = useState<any>(null)
  const [showCreate, setShowCreate] = useState(true)
  const [editModal, setEditModal] = useState<any>(null)
  const [editForm, setEditForm] = useState({ kind: 'wash', species: 0, size: 0, serviceLevel: 0, date: todayStr(), time: '10:00', fee: '' })
  const [editLoading, setEditLoading] = useState(false)
  const [form, setForm] = useState({
    kind: 'wash', species: 0, size: 0, serviceLevel: 0,
    date: todayStr(), time: '10:00', fee: '',
    petName: '', ownerName: '', notes: '',
  })

  const weekDates = getWeekDates()
  const today = new Date()
  const todayIdx = today.getDay() === 0 ? 6 : today.getDay() - 1

  useEffect(() => {
    setSelectedDay(todayIdx)
    loadReservations()
  }, [])

  async function loadReservations() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: biz } = await supabase.from('businesses').select('id').eq('owner_user_id', user.id).single()
    setBusinessId(biz?.id ?? '')
    const { data: res } = await supabase
      .from('grooming_reservations')
      .select('*')
      .eq('business_id', biz?.id)
      .order('start_at', { ascending: true })
    setReservations(res ?? [])
  }

  useEffect(() => {
    if (!search.trim() || !businessId) { setSearchResults([]); return }
    const timer = setTimeout(async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('pets')
        .select('id, name, species, breed, customers(id, full_name, phone)')
        .eq('business_id', businessId)
        .ilike('name', `%${search}%`)
        .limit(10)
      setSearchResults(data ?? [])
    }, 300)
    return () => clearTimeout(timer)
  }, [search, businessId])

  function setField(field: string, value: any) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  function openEdit(res: any) {
    const d = new Date(res.start_at)
    const dateStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
    const timeStr = `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
    setEditForm({ kind: res.kind, species: res.species, size: res.size, serviceLevel: res.service_level, date: dateStr, time: timeStr, fee: String(res.fee ?? '') })
    setEditModal(res)
  }

async function handleEdit() {
  if (!editModal) return
  const fee = parseFloat(editForm.fee.replace(',', '.')) || 0
  if (fee <= 0) return
  const startAt = new Date(`${editForm.date}T${editForm.time}:00`)
  if (startAt < new Date()) { alert('Geçmiş tarih ve saate rezervasyon güncelleyemezsiniz.'); return }
  setEditLoading(true)
  const supabase = createClient()
  await supabase.from('grooming_reservations').update({
    kind: editForm.kind,
    species: editForm.species,
    size: editForm.size,
    service_level: editForm.serviceLevel,
    start_at: startAt.toISOString(),
    fee,
  }).eq('id', editModal.id)
  setEditModal(null)
  setEditLoading(false)
  await loadReservations()
}

 async function handleCreate() {
  if (!form.petName.trim()) { setError('Once bir hayvan secin.'); return }
  const fee = parseFloat(form.fee.replace(',', '.')) || 0
  if (fee <= 0) { setError('Ucret 0\'dan buyuk olmali.'); return }
  const startAt = new Date(`${form.date}T${form.time}:00`)
  if (startAt < new Date()) { setError('Geçmiş tarih ve saate rezervasyon oluşturamazsınız.'); return }
  setLoading(true)
  setError('')
  const supabase = createClient()
  const { data, error: err } = await supabase.from('grooming_reservations').insert({
    business_id: businessId,
    pet_id: selectedPet?.id ?? null,
    pet_name: form.petName,
    owner_name: form.ownerName,
    notes: form.notes,
    kind: form.kind,
    species: form.species,
    size: form.size,
    service_level: form.serviceLevel,
    start_at: startAt.toISOString(),
    fee,
  }).select().single()
  if (err) { setError(err.message); setLoading(false); return }
  setSuccess('Rezervasyon olusturuldu.')
  setSelectedPet(null)
  setSearch('')
  setForm(prev => ({ ...prev, fee: '', notes: '', petName: '', ownerName: '' }))
  setLoading(false)
  await loadReservations()
}

  async function handleDelete(id: string) {
    const supabase = createClient()
    await supabase.from('grooming_reservations').delete().eq('id', id)
    setReservations(prev => prev.filter(r => r.id !== id))
  }

  const dayReservations = reservations.filter(r => {
    const d = new Date(r.start_at)
    const target = weekDates[selectedDay]
    return d.toLocaleDateString('tr-TR', { timeZone: 'Europe/Istanbul' }) === target.toLocaleDateString('tr-TR')
  })

  const cardStyle: React.CSSProperties = { backgroundColor: '#fff', borderRadius: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', marginBottom: '16px', padding: '20px' }
  const sectionTitle: React.CSSProperties = { fontSize: '17px', fontWeight: 600, color: '#000', margin: '0 0 14px' }
  const inputStyle: React.CSSProperties = { width: '100%', padding: '10px 14px', backgroundColor: '#F2F2F7', borderRadius: '10px', border: 'none', outline: 'none', fontSize: '15px', boxSizing: 'border-box', color: '#000' }

  function SegChoice({ title, options, value, onChange }: { title: string; options: { label: string; value: any }[]; value: any; onChange: (v: any) => void }) {
    return (
      <div style={{ marginBottom: '14px' }}>
        <p style={{ fontSize: '15px', fontWeight: 600, color: '#000', margin: '0 0 8px' }}>{title}</p>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {options.map(o => (
            <button key={o.value} onClick={() => onChange(o.value)} style={{ padding: '8px 16px', borderRadius: '10px', border: value === o.value ? 'none' : '1px solid #E5E5EA', backgroundColor: value === o.value ? '#007AFF' : '#F2F2F7', color: value === o.value ? '#fff' : '#000', fontSize: '14px', fontWeight: 600, cursor: 'pointer', minWidth: '80px' }}>
              {o.label}
            </button>
          ))}
        </div>
      </div>
    )
  }

  function InfoRow({ label, value }: { label: string; value: string }) {
    return (
      <div style={{ display: 'flex', alignItems: 'flex-start', padding: '10px 0', borderBottom: '1px solid #E5E5EA' }}>
        <span style={{ fontSize: '14px', color: '#6C6C70', width: '140px', flexShrink: 0 }}>{label}</span>
        <span style={{ fontSize: '14px', color: '#000', flex: 1 }}>{value}</span>
      </div>
    )
  }

  return (
    <div style={{ padding: '32px', maxWidth: '700px', paddingBottom: '64px' }}>

      {/* Düzenleme Modalı */}
      {editModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ backgroundColor: '#fff', borderRadius: '20px', width: '100%', maxWidth: '480px', overflow: 'hidden' }}>
            {/* Başlık */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 20px', backgroundColor: editForm.kind === 'trim' ? '#F3EEFF' : '#EBF5FF' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: editForm.kind === 'trim' ? '#9B59B620' : '#007AFF20', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>
                {editForm.kind === 'trim' ? '✂️' : '💧'}
              </div>
              <div>
                <p style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: '#000' }}>Rezervasyon Düzenle</p>
                <p style={{ fontSize: '13px', color: '#6C6C70', margin: 0 }}>{editForm.kind === 'trim' ? 'Tıraş' : 'Yıkama'}</p>
              </div>
            </div>

            {/* İçerik */}
            <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
              <EditRow label='Hizmet Türü'>
                <SegBtn label='💧 Yıkama' active={editForm.kind === 'wash'} onClick={() => setEditForm(p => ({ ...p, kind: 'wash' }))} />
                <SegBtn label='✂️ Tıraş' active={editForm.kind === 'trim'} onClick={() => setEditForm(p => ({ ...p, kind: 'trim' }))} />
              </EditRow>
              <EditRow label='Tür'>
                <SegBtn label='Köpek' active={editForm.species === 0} onClick={() => setEditForm(p => ({ ...p, species: 0 }))} />
                <SegBtn label='Kedi' active={editForm.species === 1} onClick={() => setEditForm(p => ({ ...p, species: 1 }))} />
                <SegBtn label='Diğer' active={editForm.species === 2} onClick={() => setEditForm(p => ({ ...p, species: 2 }))} />
              </EditRow>
              <EditRow label='Ebat'>
                <SegBtn label='Küçük Irk' active={editForm.size === 0} onClick={() => setEditForm(p => ({ ...p, size: 0 }))} />
                <SegBtn label='Büyük Irk' active={editForm.size === 1} onClick={() => setEditForm(p => ({ ...p, size: 1 }))} />
              </EditRow>
              <EditRow label='Hizmet'>
                <SegBtn label='Normal' active={editForm.serviceLevel === 0} onClick={() => setEditForm(p => ({ ...p, serviceLevel: 0 }))} />
                <SegBtn label='VIP ⭐' active={editForm.serviceLevel === 1} onClick={() => setEditForm(p => ({ ...p, serviceLevel: 1 }))} />
              </EditRow>
              <EditRow label='Tarih'>
                <input type='date' value={editForm.date} onChange={e => setEditForm(p => ({ ...p, date: e.target.value }))} style={{ padding: '8px 12px', backgroundColor: '#F2F2F7', borderRadius: '10px', border: 'none', outline: 'none', fontSize: '14px' }} />
              </EditRow>
              <EditRow label='Saat'>
                <input type='time' value={editForm.time} onChange={e => setEditForm(p => ({ ...p, time: e.target.value }))} style={{ padding: '8px 12px', backgroundColor: '#F2F2F7', borderRadius: '10px', border: 'none', outline: 'none', fontSize: '14px' }} />
              </EditRow>
              <EditRow label='Ücret (₺)'>
                <input type='text' inputMode='decimal' value={editForm.fee} onChange={e => setEditForm(p => ({ ...p, fee: e.target.value }))} style={{ padding: '8px 12px', backgroundColor: '#F2F2F7', borderRadius: '10px', border: 'none', outline: 'none', fontSize: '14px', width: '120px', textAlign: 'center' }} />
              </EditRow>
            </div>

            {/* Alt Butonlar */}
            <div style={{ display: 'flex', gap: '12px', padding: '14px 20px', borderTop: '1px solid #F2F2F7' }}>
              <button onClick={() => setEditModal(null)} style={{ flex: 1, padding: '13px', borderRadius: '13px', border: 'none', backgroundColor: '#F2F2F7', color: '#6C6C70', fontSize: '15px', fontWeight: 600, cursor: 'pointer' }}>
                Vazgeç
              </button>
              <button onClick={handleEdit} disabled={editLoading} style={{ flex: 2, padding: '13px', borderRadius: '13px', border: 'none', backgroundColor: '#007AFF', color: '#fff', fontSize: '15px', fontWeight: 700, cursor: 'pointer', opacity: editLoading ? 0.6 : 1 }}>
                {editLoading ? 'Kaydediliyor...' : 'Kaydet'}
              </button>
            </div>
          </div>
        </div>
      )}

      <h1 style={{ fontSize: '32px', fontWeight: 800, color: '#000', margin: '0 0 24px' }}>Haftalik Rezervasyon</h1>

      {/* Hayvan Secimi */}
      <div style={cardStyle}>
        <p style={sectionTitle}>Evcil Hayvan Secimi</p>
        <div style={{ display: 'flex', gap: '10px', marginBottom: '8px' }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder='Hayvan adi / sahip adi / telefon' style={{ ...inputStyle, flex: 1 }} />
          <button onClick={() => { setSearch(''); setSearchResults([]); setSelectedPet(null); setForm(prev => ({ ...prev, petName: '', ownerName: '' })) }} style={{ padding: '8px 14px', borderRadius: '10px', border: '1px solid #E5E5EA', backgroundColor: '#fff', color: '#6C6C70', fontSize: '14px', cursor: 'pointer' }}>Temizle</button>
        </div>
        <p style={{ fontSize: '12px', color: '#6C6C70', margin: '8px 0 0' }}>Yeni musteri icin once Evcil Hayvanlar bolumunden kayit olusturunuz.</p>

        {searchResults.length > 0 && !selectedPet && (
          <div style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid #E5E5EA', marginTop: '10px' }}>
            <p style={{ fontSize: '13px', fontWeight: 600, color: '#6C6C70', margin: '0', padding: '10px 16px', backgroundColor: '#F9F9FB', borderBottom: '1px solid #E5E5EA' }}>Eşleşen Kayıtlar</p>
            {searchResults.map((pet, idx) => (
              <div key={pet.id} onClick={() => {
                setSelectedPet(pet)
                setSearch(pet.name)
                setSearchResults([])
                setField('petName', pet.name)
                setField('ownerName', pet.customers?.full_name ?? '')
                setField('species', speciesToNum(pet.species ?? ''))
              }} style={{ padding: '12px 16px', borderBottom: idx < searchResults.length - 1 ? '1px solid #E5E5EA' : 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px', backgroundColor: '#fff' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: speciesColor(pet.species ?? '') + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px' }}>
                  {speciesIcon(pet.species ?? '')}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '15px', fontWeight: 600, color: '#000', margin: 0 }}>{pet.name}</p>
                  <p style={{ fontSize: '12px', color: '#6C6C70', margin: '2px 0 0' }}>{[pet.customers?.full_name, speciesLabel(pet.species ?? ''), pet.breed].filter(Boolean).join(' • ')}</p>
                </div>
                <span style={{ fontSize: '20px', color: '#34C759' }}>✓</span>
              </div>
            ))}
          </div>
        )}

        {selectedPet && (
          <div style={{ marginTop: '14px' }}>
            <p style={{ fontSize: '15px', fontWeight: 700, color: '#000', margin: '0 0 10px' }}>Seçilen Evcil Hayvan</p>
            <div style={{ backgroundColor: '#F2F4F8', borderRadius: '14px', padding: '4px 14px', overflow: 'hidden' }}>
              <InfoRow label='Hayvan Adı' value={selectedPet.name} />
              <InfoRow label='Sahip Adı Soyadı' value={selectedPet.customers?.full_name ?? '-'} />
              <InfoRow label='Türü' value={speciesLabel(selectedPet.species ?? '')} />
              <InfoRow label='Irkı' value={selectedPet.breed ?? '-'} />
              <div style={{ display: 'flex', alignItems: 'flex-start', padding: '10px 0' }}>
                <span style={{ fontSize: '14px', color: '#6C6C70', width: '140px', flexShrink: 0 }}>Notlar</span>
                <textarea value={form.notes} onChange={e => setField('notes', e.target.value)} placeholder='Not ekleyin' rows={3} style={{ flex: 1, padding: '8px 12px', backgroundColor: '#fff', borderRadius: '10px', border: '1px solid #E5E5EA', outline: 'none', fontSize: '14px', resize: 'none', boxSizing: 'border-box' }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Rezervasyon Olustur */}
      <div style={cardStyle}>
        <button onClick={() => setShowCreate(p => !p)} style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 0, marginBottom: showCreate ? '16px' : 0 }}>
          <p style={{ fontSize: '17px', fontWeight: 600, color: '#000', margin: 0 }}>Rezervasyon Olustur</p>
          <span style={{ fontSize: '12px', color: '#6C6C70' }}>{showCreate ? '▲' : '▼'}</span>
        </button>

        {showCreate && (
          <>
            <SegChoice title='Hizmet Turu' options={[{ label: 'Yikama', value: 'wash' }, { label: 'Tiras', value: 'trim' }]} value={form.kind} onChange={v => setField('kind', v)} />
            <SegChoice title='Turu' options={[{ label: 'Kopek', value: 0 }, { label: 'Kedi', value: 1 }, { label: 'Diger', value: 2 }]} value={form.species} onChange={v => setField('species', v)} />
            <SegChoice title='Ebat' options={[{ label: 'Kucuk Irk', value: 0 }, { label: 'Buyuk Irk', value: 1 }]} value={form.size} onChange={v => setField('size', v)} />
            <SegChoice title='Hizmet Kalitesi' options={[{ label: 'Normal', value: 0 }, { label: 'VIP', value: 1 }]} value={form.serviceLevel} onChange={v => setField('serviceLevel', v)} />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '16px' }}>
              <div>
                <p style={{ fontSize: '12px', color: '#6C6C70', margin: '0 0 6px', textAlign: 'center' }}>Tarih</p>
                <input type='date' value={form.date} onChange={e => setField('date', e.target.value)} style={{ width: '100%', padding: '8px', backgroundColor: '#F2F2F7', borderRadius: '10px', border: 'none', outline: 'none', fontSize: '13px', textAlign: 'center', boxSizing: 'border-box' }} />
              </div>
              <div>
                <p style={{ fontSize: '12px', color: '#6C6C70', margin: '0 0 6px', textAlign: 'center' }}>Saat</p>
                <input type='time' value={form.time} onChange={e => setField('time', e.target.value)} style={{ width: '100%', padding: '8px', backgroundColor: '#F2F2F7', borderRadius: '10px', border: 'none', outline: 'none', fontSize: '13px', textAlign: 'center', boxSizing: 'border-box' }} />
              </div>
              <div>
                <p style={{ fontSize: '12px', color: '#6C6C70', margin: '0 0 6px', textAlign: 'center' }}>Ucret (₺)</p>
                <input type='text' inputMode='decimal' value={form.fee} onChange={e => setField('fee', e.target.value)} placeholder='' style={{ width: '100%', padding: '8px', backgroundColor: '#F2F2F7', borderRadius: '10px', border: 'none', outline: 'none', fontSize: '13px', textAlign: 'center', boxSizing: 'border-box' }} />
              </div>
            </div>

            {error && <div style={{ backgroundColor: '#FFF0F0', color: '#FF3B30', fontSize: '13px', padding: '12px 16px', borderRadius: '12px', marginBottom: '12px' }}>{error}</div>}
            {success && <div style={{ backgroundColor: '#F0FFF4', color: '#34C759', fontSize: '13px', padding: '12px 16px', borderRadius: '12px', marginBottom: '12px' }}>{success}</div>}

            <button onClick={handleCreate} disabled={loading} style={{ width: '100%', backgroundColor: '#007AFF', color: '#fff', padding: '14px', borderRadius: '14px', border: 'none', cursor: 'pointer', fontSize: '16px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', opacity: loading ? 0.6 : 1 }}>
              ＋ {loading ? 'Kaydediliyor...' : 'Rezervasyon Olustur'}
            </button>
          </>
        )}
      </div>

      {/* Haftalik Tablo */}
      <div style={cardStyle}>
        <p style={sectionTitle}>Haftalik Rezervasyon Tablosu</p>

        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px', marginBottom: '16px' }}>
          {weekDates.map((d, i) => {
            const isToday = d.toDateString() === today.toDateString()
            const isSelected = selectedDay === i
            return (
              <button key={i} onClick={() => setSelectedDay(i)} style={{ flexShrink: 0, padding: '8px 12px', borderRadius: '12px', border: isSelected ? '2px solid #007AFF' : isToday ? '2px solid #34C759' : '1px solid #E5E5EA', backgroundColor: isSelected ? '#EBF5FF' : isToday ? '#F0FFF4' : '#F2F2F7', cursor: 'pointer', textAlign: 'center', minWidth: '72px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                  <p style={{ fontSize: '13px', fontWeight: 600, color: isSelected ? '#007AFF' : '#000', margin: 0 }}>{WEEKDAYS[i].slice(0, 3)}</p>
                  {isToday && <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#34C759' }} />}
                </div>
                <p style={{ fontSize: '11px', color: '#6C6C70', margin: '2px 0 0' }}>{fmtDate(d)}</p>
              </button>
            )
          })}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div>
            <p style={{ fontSize: '16px', fontWeight: 700, color: '#000', margin: 0 }}>{WEEKDAYS[selectedDay]}</p>
            <p style={{ fontSize: '12px', color: '#6C6C70', margin: '2px 0 0' }}>{fmtDate(weekDates[selectedDay])}</p>
          </div>
          <p style={{ fontSize: '13px', color: '#6C6C70', margin: 0 }}>{dayReservations.length} rezervasyon</p>
        </div>

        {dayReservations.length === 0 ? (
          <div style={{ padding: '32px', textAlign: 'center' }}>
            <p style={{ fontSize: '32px', margin: '0 0 10px' }}>📅</p>
            <p style={{ fontSize: '14px', fontWeight: 600, color: '#000', margin: 0 }}>Rezervasyon yok</p>
            <p style={{ fontSize: '13px', color: '#6C6C70', margin: '6px 0 0' }}>Secili gun icin henuz kayit yok.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {dayReservations.map(res => {
              const sp = speciesFromNum(res.species)
              return (
                <div key={res.id} style={{ backgroundColor: '#EBF5FF', borderRadius: '14px', padding: '14px', border: '1px solid #007AFF30' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '10px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: speciesColor(sp) + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', flexShrink: 0 }}>
                      {speciesIcon(sp)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: '15px', fontWeight: 700, color: '#000', margin: '0 0 2px' }}>{res.pet_name}</p>
                      <p style={{ fontSize: '12px', color: '#6C6C70', margin: 0 }}>
                        {[res.owner_name, speciesLabel(sp), sizeLabel(res.size)].filter(Boolean).join(' • ')}
                      </p>
                    </div>
                    <p style={{ fontSize: '14px', fontWeight: 600, color: '#007AFF', margin: 0, flexShrink: 0 }}>₺{(res.fee ?? 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</p>
                  </div>
                  <div style={{ height: '1px', backgroundColor: '#007AFF20', marginBottom: '10px' }} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
                    <span style={{ fontSize: '12px' }}>🕐</span>
                    <p style={{ fontSize: '13px', color: '#6C6C70', margin: 0 }}>
                      {fmtDateTime(res.start_at)} • {res.kind === 'trim' ? 'Tıraş' : 'Yıkama'} • {res.service_level === 1 ? 'VIP' : 'Normal'}
                    </p>
                  </div>
                  {res.notes?.trim() && (
                    <p style={{ fontSize: '12px', color: '#6C6C70', margin: '0 0 10px', fontStyle: 'italic' }}>{res.notes}</p>
                  )}
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => router.push(`/dashboard/grooming/${res.kind}?reservation=${res.id}`)} style={{ flex: 1, padding: '9px', borderRadius: '10px', backgroundColor: '#007AFF', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
                      ▶ Başlat
                    </button>
                    <button onClick={() => openEdit(res)} style={{ flex: 1, padding: '9px', borderRadius: '10px', backgroundColor: '#F2F2F7', color: '#007AFF', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
                      ✏ Düzenle
                    </button>
                    <button onClick={() => handleDelete(res.id)} style={{ flex: 1, padding: '9px', borderRadius: '10px', backgroundColor: '#FFF0F0', color: '#FF3B30', border: '1px solid #FF3B3020', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
                      × İptal Et
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}