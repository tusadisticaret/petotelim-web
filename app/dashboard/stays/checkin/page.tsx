'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function CheckinPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [selectedPet, setSelectedPet] = useState<any>(null)
  const [businessId, setBusinessId] = useState<string>('')
  const [form, setForm] = useState({
    check_in_date: new Date().toISOString().split('T')[0],
    daily_price: '',
  })

  useEffect(() => {
    async function loadBusiness() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: business } = await supabase.from('businesses').select('id').eq('owner_user_id', user.id).single()
      setBusinessId(business?.id ?? '')
    }
    loadBusiness()
  }, [])

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

  function setField(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  function resetSelection() {
    setSearch('')
    setSearchResults([])
    setSelectedPet(null)
    setForm({ check_in_date: new Date().toISOString().split('T')[0], daily_price: '' })
  }

  async function handleStart() {
    if (!selectedPet) { setError('Once bir evcil hayvan secin.'); return }
    const daily = parseFloat(form.daily_price.replace(',', '.')) || 0
    if (daily <= 0) { setError('Gunluk ucret 0\'dan buyuk olmali.'); return }
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error } = await supabase.from('stays').insert({
      business_id: businessId,
      pet_id: selectedPet.id,
      check_in_date: form.check_in_date,
      actual_check_out_date: null,
      daily_price: daily,
    })
    if (error) { setError(error.message); setLoading(false); return }
    router.push('/dashboard/stays')
    router.refresh()
  }

  const dailyPrice = parseFloat(form.daily_price.replace(',', '.')) || 0
  const formattedPrice = dailyPrice.toLocaleString('tr-TR', { minimumFractionDigits: 2 })
  const formattedDate = form.check_in_date
    ? new Date(form.check_in_date + 'T12:00:00').toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : ''

  const cardStyle: React.CSSProperties = {
    backgroundColor: '#fff',
    borderRadius: '16px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
    marginBottom: '16px',
    padding: '20px',
  }

  const sectionTitleStyle: React.CSSProperties = {
    fontSize: '17px',
    fontWeight: 600,
    color: '#000',
    margin: '0 0 14px',
  }

  const fieldLabelStyle: React.CSSProperties = {
    fontSize: '15px',
    fontWeight: 400,
    color: '#6C6C70',
    margin: '0 0 8px',
    textAlign: 'center',
  }

  return (
    <div style={{ padding: '32px', maxWidth: '600px', paddingBottom: '64px' }}>
      <h1 style={{ fontSize: '32px', fontWeight: 800, color: '#000', margin: '0 0 24px' }}>
        Konaklama Girisi
      </h1>

      {/* Kayittan Getir */}
      <div style={cardStyle}>
        <p style={sectionTitleStyle}>Kayittan Getir</p>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder='Hayvan adi / sahip adi / telefon / TCKN'
            style={{
              flex: 1,
              padding: '8px 12px',
              backgroundColor: '#F2F2F7',
              borderRadius: '10px',
              border: 'none',
              outline: 'none',
              fontSize: '15px',
              color: '#000',
            }}
          />
          <button
            onClick={resetSelection}
            disabled={!search && !selectedPet}
            style={{
              padding: '8px 14px',
              borderRadius: '10px',
              border: '1px solid #E5E5EA',
              backgroundColor: '#fff',
              color: '#6C6C70',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
              flexShrink: 0,
              opacity: !search && !selectedPet ? 0.5 : 1,
            }}
          >
            Temizle
          </button>
        </div>

        {searchResults.length > 0 && !selectedPet && (
          <div style={{ marginTop: '10px', borderRadius: '12px', overflow: 'hidden', border: '1px solid #E5E5EA' }}>
            {searchResults.map((pet, idx) => (
              <div
                key={pet.id}
                onClick={() => { setSelectedPet(pet); setSearch(pet.name); setSearchResults([]) }}
                style={{
                  padding: '10px 16px',
                  borderBottom: idx < searchResults.length - 1 ? '1px solid #E5E5EA' : 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  backgroundColor: '#fff',
                }}
              >
                <span style={{ fontSize: '18px' }}>{pet.species === 'cat' ? '🐱' : '🐶'}</span>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '14px', fontWeight: 600, color: '#000', margin: 0 }}>{pet.name}</p>
                  <p style={{ fontSize: '12px', color: '#6C6C70', margin: '2px 0 0' }}>
                    {[pet.customers?.name, pet.breed].filter(Boolean).join(' • ')}
                  </p>
                </div>
                <span style={{ color: '#C7C7CC', fontSize: '14px' }}>›</span>
              </div>
            ))}
          </div>
        )}

        {search && searchResults.length === 0 && !selectedPet && (
          <p style={{ fontSize: '14px', color: '#6C6C70', marginTop: '10px', textAlign: 'center' }}>
            Kayit bulunamadi.
          </p>
        )}

        <p style={{ fontSize: '13px', color: '#6C6C70', margin: '12px 0 0' }}>
          Yeni musteri kaydi gerekiyorsa Evcil Hayvanlar bolumunden olusturunuz.
        </p>
      </div>

      {/* Secili Hayvan */}
      {selectedPet && (
        <div style={cardStyle}>
          <p style={sectionTitleStyle}>Secili Evcil</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '4px 0' }}>
            <span style={{ fontSize: '24px' }}>{selectedPet.species === 'cat' ? '🐱' : '🐶'}</span>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: '16px', fontWeight: 600, color: '#000', margin: 0 }}>{selectedPet.name}</p>
              <p style={{ fontSize: '14px', color: '#6C6C70', margin: '3px 0 0' }}>
                {[selectedPet.customers?.name, selectedPet.breed].filter(Boolean).join(' • ')}
              </p>
            </div>
            <span style={{ color: '#C7C7CC', fontSize: '16px' }}>›</span>
          </div>
        </div>
      )}

      {/* Konaklamayi Baslat */}
      <div style={cardStyle}>
        <p style={sectionTitleStyle}>Konaklamayi Baslat</p>

        {/* Giris Tarihi ve Gunluk Ucret - yan yana, esit genislikte */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px', alignItems: 'start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
            <p style={fieldLabelStyle}>Giris Tarihi</p>
            <input
              type='date'
              value={form.check_in_date}
              onChange={e => setField('check_in_date', e.target.value)}
              style={{
                width: '100%',
                padding: '8px 10px',
                backgroundColor: '#F2F2F7',
                borderRadius: '10px',
                border: 'none',
                outline: 'none',
                fontSize: '15px',
                fontWeight: 400,
                color: '#000',
                textAlign: 'center',
                boxSizing: 'border-box',
              }}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
            <p style={fieldLabelStyle}>Gunluk Ucret (₺)</p>
            <input
              type='text'
              inputMode='decimal'
              value={form.daily_price}
              onChange={e => setField('daily_price', e.target.value)}
              placeholder='Gunluk Ucret'
              style={{
                width: '100%',
                padding: '8px 10px',
                backgroundColor: '#F2F2F7',
                borderRadius: '10px',
                border: 'none',
                outline: 'none',
                fontSize: '15px',
                fontWeight: 400,
                color: '#000',
                textAlign: 'center',
                boxSizing: 'border-box',
              }}
            />
          </div>
        </div>

        {/* Onizleme */}
        <div style={{ backgroundColor: 'rgba(120,120,128,0.08)', borderRadius: '12px', padding: '12px 16px', marginBottom: '16px' }}>
          <p style={{ fontSize: '12px', color: '#6C6C70', margin: '0 0 10px' }}>Onizleme</p>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '15px', color: '#6C6C70' }}>Giris Tarihi</span>
            <span style={{ fontSize: '15px', color: '#000', fontVariantNumeric: 'tabular-nums' }}>{formattedDate}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '15px', color: '#6C6C70' }}>Gunluk Ucret</span>
            <span style={{ fontSize: '15px', fontWeight: 700, color: '#007AFF', fontVariantNumeric: 'tabular-nums' }}>₺{formattedPrice}</span>
          </div>
        </div>

        {/* Buton */}
        <button
          onClick={handleStart}
          disabled={loading}
          style={{
            width: '100%',
            backgroundColor: '#007AFF',
            color: '#fff',
            padding: '14px',
            borderRadius: '14px',
            border: 'none',
            cursor: 'pointer',
            fontSize: '17px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            opacity: loading ? 0.6 : 1,
          }}
        >
          <span style={{ fontSize: '14px' }}>▶</span>
          {loading ? 'Kaydediliyor...' : 'Konaklamayi Baslat'}
        </button>
      </div>

      {error && (
        <div style={{ backgroundColor: '#FFF0F0', color: '#FF3B30', fontSize: '13px', padding: '12px 16px', borderRadius: '12px' }}>
          {error}
        </div>
      )}
    </div>
  )
}