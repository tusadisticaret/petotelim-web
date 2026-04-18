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
  return d.toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

export default function GroomingReservationsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [businessId, setBusinessId] = useState('')
  const [pets, setPets] = useState<any[]>([])
  const [reservations, setReservations] = useState<any[]>([])
  const [selectedDay, setSelectedDay] = useState(0)
  const [search, setSearch] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [selectedPet, setSelectedPet] = useState<any>(null)
  const [showCreate, setShowCreate] = useState(true)
  const [form, setForm] = useState({
    kind: 'wash', species: 0, size: 0, serviceLevel: 0,
    date: new Date().toISOString().split('T')[0],
    time: '10:00', fee: '',
    petName: '', ownerName: '', notes: '',
  })

  const weekDates = getWeekDates()
  const today = new Date()
  const todayIdx = today.getDay() === 0 ? 6 : today.getDay() - 1

  useEffect(() => {
    setSelectedDay(todayIdx)
    async function load() {
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
    load()
  }, [])

  useEffect(() => {
    if (!search.trim() || !businessId) { setSearchResults([]); return }
    const timer = setTimeout(async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('pets')
        .select('id, name, species, breed, customers(id, name, phone)')
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

  async function handleCreate() {
    if (!form.petName.trim()) { setError('Once bir hayvan secin.'); return }
    const fee = parseFloat(form.fee.replace(',', '.')) || 0
    if (fee <= 0) { setError('Ucret 0\'dan buyuk olmali.'); return }
    setLoading(true)
    setError('')
    const supabase = createClient()
    const startAt = new Date(`${form.date}T${form.time}:00`).toISOString()
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
      start_at: startAt,
      fee,
    }).select().single()
    if (err) { setError(err.message); setLoading(false); return }
    setReservations(prev => [...prev, data].sort((a, b) => a.start_at.localeCompare(b.start_at)))
    setSuccess('Rezervasyon olusturuldu.')
    setSelectedPet(null)
    setSearch('')
    setForm(prev => ({ ...prev, fee: '', notes: '', petName: '', ownerName: '' }))
    setLoading(false)
  }

  async function handleDelete(id: string) {
    const supabase = createClient()
    await supabase.from('grooming_reservations').delete().eq('id', id)
    setReservations(prev => prev.filter(r => r.id !== id))
  }

  const dayReservations = reservations.filter(r => {
    const d = new Date(r.start_at)
    const target = weekDates[selectedDay]
    return d.toDateString() === target.toDateString()
  })

  const cardStyle: React.CSSProperties = { backgroundColor: '#fff', borderRadius: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', marginBottom: '16px', padding: '20px' }
  const sectionTitle: React.CSSProperties = { fontSize: '17px', fontWeight: 600, color: '#000', margin: '0 0 14px' }

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

  return (
    <div style={{ padding: '32px', maxWidth: '700px', paddingBottom: '64px' }}>
      <h1 style={{ fontSize: '32px', fontWeight: 800, color: '#000', margin: '0 0 24px' }}>Haftalik Rezervasyon</h1>

      {/* Hayvan Secimi */}
      <div style={cardStyle}>
        <p style={sectionTitle}>Evcil Hayvan Secimi</p>
        <div style={{ display: 'flex', gap: '10px', marginBottom: '8px' }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder='Hayvan adi / sahip adi / telefon' style={{ flex: 1, padding: '8px 12px', backgroundColor: '#F2F2F7', borderRadius: '10px', border: 'none', outline: 'none', fontSize: '15px' }} />
          <button onClick={() => { setSearch(''); setSearchResults([]); setSelectedPet(null); setForm(prev => ({ ...prev, petName: '', ownerName: '' })) }} style={{ padding: '8px 14px', borderRadius: '10px', border: '1px solid #E5E5EA', backgroundColor: '#fff', color: '#6C6C70', fontSize: '14px', cursor: 'pointer' }}>Temizle</button>
        </div>
        <p style={{ fontSize: '12px', color: '#6C6C70', margin: '8px 0 0' }}>Yeni musteri icin once Evcil Hayvanlar bolumunden kayit olusturunuz.</p>

        {searchResults.length > 0 && !selectedPet && (
          <div style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid #E5E5EA', marginTop: '10px' }}>
            {searchResults.map((pet, idx) => (
              <div key={pet.id} onClick={() => {
                setSelectedPet(pet)
                setSearch(pet.name)
                setSearchResults([])
                setField('petName', pet.name)
                setField('ownerName', pet.customers?.name ?? '')
                setField('species', pet.species === 'cat' ? 1 : pet.species === 'dog' ? 0 : 2)
              }} style={{ padding: '10px 16px', borderBottom: idx < searchResults.length - 1 ? '1px solid #E5E5EA' : 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '18px' }}>{pet.species === 'cat' ? '🐱' : '🐶'}</span>
                <div>
                  <p style={{ fontSize: '14px', fontWeight: 600, color: '#000', margin: 0 }}>{pet.name}</p>
                  <p style={{ fontSize: '12px', color: '#6C6C70', margin: '2px 0 0' }}>{pet.customers?.name ?? ''}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {selectedPet && (
          <div style={{ marginTop: '12px', padding: '12px 16px', backgroundColor: '#EBF5FF', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '24px' }}>{selectedPet.species === 'cat' ? '🐱' : '🐶'}</span>
            <div>
              <p style={{ fontSize: '14px', fontWeight: 600, color: '#007AFF', margin: 0 }}>{selectedPet.name}</p>
              <p style={{ fontSize: '12px', color: '#6C6C70', margin: '2px 0 0' }}>{selectedPet.customers?.name ?? ''}</p>
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

        {/* Gun Secici */}
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

        {/* Secili gun basligi */}
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '12px' }}>
            {dayReservations.map(res => (
              <div key={res.id} style={{ backgroundColor: '#EBF5FF', borderRadius: '14px', padding: '14px', border: '1px solid #007AFF30' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: '#007AFF20', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>
                    {res.species === 1 ? '🐱' : '🐶'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '15px', fontWeight: 700, color: '#000', margin: 0 }}>{res.pet_name}</p>
                    <p style={{ fontSize: '12px', color: '#6C6C70', margin: '2px 0 0' }}>{res.owner_name}</p>
                  </div>
                  <p style={{ fontSize: '14px', fontWeight: 600, color: '#007AFF', margin: 0 }}>₺{(res.fee ?? 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</p>
                </div>
                <div style={{ height: '1px', backgroundColor: '#007AFF20', marginBottom: '10px' }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
                  <span style={{ fontSize: '12px' }}>🕐</span>
                  <p style={{ fontSize: '13px', color: '#6C6C70', margin: 0 }}>
                    {fmtDateTime(res.start_at)} • {res.kind === 'trim' ? 'Tiras' : 'Yikama'} • {res.service_level === 1 ? 'VIP' : 'Normal'}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => router.push(`/dashboard/grooming/${res.kind}?reservation=${res.id}`)} style={{ flex: 1, padding: '8px', borderRadius: '10px', backgroundColor: '#007AFF', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
                    ▶ Baslat
                  </button>
                  <button onClick={() => handleDelete(res.id)} style={{ flex: 1, padding: '8px', borderRadius: '10px', backgroundColor: '#fff', color: '#FF3B30', border: '1px solid #FF3B30', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
                    × Iptal
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}