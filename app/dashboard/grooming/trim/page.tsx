'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function WashEntryPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [selectedPet, setSelectedPet] = useState<any>(null)
  const [businessId, setBusinessId] = useState('')
  const [form, setForm] = useState({
    species: 0, size: 0, serviceLevel: 0,
    date: new Date().toISOString().split('T')[0],
    fee: '', notes: '',
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
        .select('id, name, species, breed, customers(id, full_name, phone)')
        .eq('business_id', businessId)
        .or(`name.ilike.%${search}%,owner_full_name.ilike.%${search}%,owner_phone.ilike.%${search}%`)
        .limit(10)
      setSearchResults(data ?? [])
    }, 300)
    return () => clearTimeout(timer)
  }, [search, businessId])

  function setField(field: string, value: any) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSave() {
    if (!selectedPet) { setError('Once bir hayvan secin.'); return }
    const fee = parseFloat(form.fee.replace(',', '.')) || 0
    if (fee <= 0) { setError('Ucret 0\'dan buyuk olmali.'); return }
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error } = await supabase.from('grooming_entries').insert({
      business_id: businessId,
      pet_id: selectedPet.id,
      pet_name: selectedPet.name,
      owner_name: selectedPet.customers?.full_name ?? selectedPet.owner_full_name ?? '',
      kind: 'trim',
      species: form.species,
      size: form.size,
      service_level: form.serviceLevel,
      service_date: form.date,
      fee,
      notes: form.notes,
    })
    if (error) { setError(error.message); setLoading(false); return }
    router.push('/dashboard/grooming')
    router.refresh()
  }

  const cardStyle: React.CSSProperties = { backgroundColor: '#fff', borderRadius: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', marginBottom: '16px', padding: '20px' }
  const sectionTitle: React.CSSProperties = { fontSize: '17px', fontWeight: 600, color: '#000', margin: '0 0 14px' }

  function SegChoice({ title, options, value, onChange }: { title: string; options: { label: string; value: number }[]; value: number; onChange: (v: number) => void }) {
    return (
      <div style={{ marginBottom: '14px' }}>
        <p style={{ fontSize: '15px', fontWeight: 600, color: '#000', margin: '0 0 8px' }}>{title}</p>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {options.map(o => (
            <button key={o.value} onClick={() => onChange(o.value)} style={{ padding: '8px 16px', borderRadius: '10px', border: value === o.value ? 'none' : '1px solid #E5E5EA', backgroundColor: value === o.value ? '#007AFF' : '#F2F2F7', color: value === o.value ? '#fff' : '#000', fontSize: '14px', fontWeight: 600, cursor: 'pointer', minWidth: '86px' }}>
              {o.label}
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: '32px', maxWidth: '600px', paddingBottom: '64px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
        <button onClick={() => router.back()} style={{ background: 'none', border: 'none', fontSize: '16px', color: '#007AFF', cursor: 'pointer', fontWeight: 500 }}>Iptal</button>
        <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#000', margin: 0, flex: 1, textAlign: 'center' }}>Tiras Girisi</h1>
        <button onClick={handleSave} disabled={loading} style={{ background: 'none', border: 'none', fontSize: '16px', color: loading ? '#C7C7CC' : '#007AFF', cursor: 'pointer', fontWeight: 600 }}>
          {loading ? 'Kaydediliyor...' : 'Kaydet'}
        </button>
      </div>

      {/* Kayittan Getir */}
      <div style={cardStyle}>
        <p style={sectionTitle}>Kayittan Getir</p>
        <div style={{ display: 'flex', gap: '10px', marginBottom: '8px' }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder='Hayvan adi / sahip adi / telefon' style={{ flex: 1, padding: '8px 12px', backgroundColor: '#F2F2F7', borderRadius: '10px', border: 'none', outline: 'none', fontSize: '15px' }} />
          <button onClick={() => { setSearch(''); setSearchResults([]); setSelectedPet(null) }} style={{ padding: '8px 14px', borderRadius: '10px', border: '1px solid #E5E5EA', backgroundColor: '#fff', color: '#6C6C70', fontSize: '14px', cursor: 'pointer' }}>Temizle</button>
        </div>
        {searchResults.length > 0 && !selectedPet && (
          <div style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid #E5E5EA', marginBottom: '8px' }}>
            {searchResults.map((pet, idx) => (
              <div key={pet.id} onClick={() => { setSelectedPet(pet); setSearch(pet.name); setSearchResults([]); setField('species', pet.species === 'cat' ? 1 : pet.species === 'dog' ? 0 : 2) }} style={{ padding: '10px 16px', borderBottom: idx < searchResults.length - 1 ? '1px solid #E5E5EA' : 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '18px' }}>{pet.species === 'cat' ? '🐱' : '🐶'}</span>
                <div>
                  <p style={{ fontSize: '14px', fontWeight: 600, color: '#000', margin: 0 }}>{pet.name}</p>
                  <p style={{ fontSize: '12px', color: '#6C6C70', margin: '2px 0 0' }}>{pet.customers?.full_name ?? ''}</p>
                </div>
              </div>
            ))}
          </div>
        )}
        <p style={{ fontSize: '12px', color: '#6C6C70', margin: '8px 0 0' }}>Yeni musteri icin once Evcil Hayvanlar bolumunden kayit olusturunuz.</p>
      </div>

      {/* Secili Hayvan */}
      {selectedPet && (
        <div style={cardStyle}>
          <p style={sectionTitle}>Secilen Evcil Hayvan</p>
          <div style={{ backgroundColor: '#EBF5FF', borderRadius: '12px', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
            <span style={{ fontSize: '24px' }}>{selectedPet.species === 'cat' ? '🐱' : '🐶'}</span>
            <div>
              <p style={{ fontSize: '15px', fontWeight: 600, color: '#007AFF', margin: 0 }}>{selectedPet.name}</p>
              <p style={{ fontSize: '12px', color: '#6C6C70', margin: '2px 0 0' }}>{selectedPet.customers?.full_name ?? ''} {selectedPet.breed ? '• ' + selectedPet.breed : ''}</p>
            </div>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '11px', color: '#6C6C70', marginBottom: '4px' }}>Notlar</label>
            <textarea value={form.notes} onChange={e => setField('notes', e.target.value)} placeholder='Not ekleyin' rows={3} style={{ width: '100%', padding: '8px 12px', backgroundColor: '#F2F2F7', borderRadius: '10px', border: 'none', outline: 'none', fontSize: '14px', resize: 'none' }} />
          </div>
        </div>
      )}

      {/* Secimler */}
      <div style={cardStyle}>
        <p style={sectionTitle}>Secimler</p>
        <SegChoice title='Turu' options={[{ label: 'Kopek', value: 0 }, { label: 'Kedi', value: 1 }, { label: 'Diger', value: 2 }]} value={form.species} onChange={v => setField('species', v)} />
        <SegChoice title='Ebat' options={[{ label: 'Kucuk Irk', value: 0 }, { label: 'Buyuk Irk', value: 1 }]} value={form.size} onChange={v => setField('size', v)} />
        <SegChoice title='Hizmet Kalitesi' options={[{ label: 'Normal', value: 0 }, { label: 'VIP', value: 1 }]} value={form.serviceLevel} onChange={v => setField('serviceLevel', v)} />
      </div>

      {/* Baslat */}
      <div style={cardStyle}>
        <p style={sectionTitle}>Baslat</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <p style={{ fontSize: '12px', color: '#6C6C70', margin: '0 0 8px', textAlign: 'center' }}>Tarih</p>
            <input type='date' value={form.date} onChange={e => setField('date', e.target.value)} style={{ width: '100%', padding: '10px', backgroundColor: '#F2F2F7', borderRadius: '10px', border: 'none', outline: 'none', fontSize: '14px', textAlign: 'center', boxSizing: 'border-box' }} />
          </div>
          <div>
            <p style={{ fontSize: '12px', color: '#6C6C70', margin: '0 0 8px', textAlign: 'center' }}>Ucret (₺)</p>
            <input type='text' inputMode='decimal' value={form.fee} onChange={e => setField('fee', e.target.value)} placeholder='' style={{ width: '100%', padding: '10px', backgroundColor: '#F2F2F7', borderRadius: '10px', border: 'none', outline: 'none', fontSize: '14px', textAlign: 'center', boxSizing: 'border-box' }} />
          </div>
        </div>
      </div>

      {error && <div style={{ backgroundColor: '#FFF0F0', color: '#FF3B30', fontSize: '13px', padding: '12px 16px', borderRadius: '12px' }}>{error}</div>}
    </div>
  )
}