'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function CustomersPage() {
  const router = useRouter()
  const [customers, setCustomers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  useEffect(() => { loadCustomers() }, [])

  async function loadCustomers() {
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: biz } = await supabase.from('businesses').select('id').eq('owner_user_id', user.id).single()
    if (!biz) return

    const { data } = await supabase
      .from('customers')
      .select('*, pets(id, name, species, breed, gender, birth_date)')
      .eq('business_id', biz.id)
      .order('full_name')

    setCustomers(data ?? [])
    setExpandedIds(new Set())
    setLoading(false)
  }

  function toggleExpand(id: string) {
    setExpandedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function speciesInfo(species: string) {
    const sp = (species ?? '').toLowerCase()
    if (sp.includes('dog') || sp.includes('kopek') || sp.includes('köpek')) return { emoji: '🐕', bgColor: '#EBF4FF', label: 'Köpek' }
    if (sp.includes('cat') || sp.includes('kedi')) return { emoji: '🐈', bgColor: '#FFF3E0', label: 'Kedi' }
    return { emoji: '🐇', bgColor: '#F3EFFF', label: species ?? 'Diğer' }
  }

  function calcAge(birthDate: string) {
    if (!birthDate) return null
    const birth = new Date(birthDate)
    const now = new Date()
    const years = now.getFullYear() - birth.getFullYear()
    const months = now.getMonth() - birth.getMonth()
    const totalMonths = years * 12 + months
    if (totalMonths < 12) return `${totalMonths} ay`
    return `${years} yaş`
  }

  function genderLabel(gender: string) {
    if (!gender) return ''
    const g = gender.toLowerCase()
    if (g === 'male' || g === 'erkek') return 'Erkek'
    if (g === 'female' || g === 'dişi' || g === 'disi') return 'Dişi'
    return gender
  }

  const filtered = customers.filter(c => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return c.full_name?.toLowerCase().includes(q) ||
      c.phone?.toLowerCase().includes(q) ||
      c.tckn?.toLowerCase().includes(q) ||
      c.pets?.some((p: any) => p.name?.toLowerCase().includes(q))
  })

  return (
    <div style={{ padding: '32px', maxWidth: '720px', paddingBottom: '64px' }}>
      <h1 style={{ fontSize: '34px', fontWeight: 800, margin: '0 0 24px', color: '#000' }}>Müşteriler</h1>

      {/* Arama Kutusu */}
      <div style={{ backgroundColor: '#fff', borderRadius: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', padding: '16px', marginBottom: '16px' }}>
        <p style={{ fontSize: '15px', fontWeight: 600, margin: '0 0 10px', color: '#000' }}>Ara</p>
        <div style={{ display: 'flex', gap: '10px' }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Hayvan adı / sahip adı / telefon"
            style={{
              flex: 1, padding: '10px 14px', backgroundColor: '#F2F2F7',
              borderRadius: '10px', border: '1px solid transparent', outline: 'none',
              fontSize: '15px', color: '#000', boxSizing: 'border-box'
            }}
            onFocus={e => (e.target.style.borderColor = '#007AFF')}
            onBlur={e => (e.target.style.borderColor = 'transparent')}
          />
          <button
            onClick={() => setSearch('')}
            style={{
              padding: '10px 16px', borderRadius: '20px', border: 'none',
              backgroundColor: '#F2F2F7', fontSize: '14px', fontWeight: 500,
              color: search ? '#007AFF' : '#8E8E93',
              cursor: 'pointer', whiteSpace: 'nowrap'
            }}
          >
            Temizle
          </button>
        </div>
      </div>

      {/* Müşteri Listesi */}
      <div style={{ backgroundColor: '#fff', borderRadius: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', padding: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <p style={{ fontSize: '15px', fontWeight: 600, margin: 0, color: '#000' }}>Müşteriler</p>
          <button
            onClick={loadCustomers}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '6px 14px', borderRadius: '20px', border: 'none',
              backgroundColor: '#F2F2F7', fontSize: '14px', fontWeight: 500,
              color: '#007AFF', cursor: 'pointer'
            }}
          >
            <span style={{ display: 'inline-block', fontSize: '13px' }}>↻</span> Yenile
          </button>
        </div>

        {loading ? (
          <p style={{ color: '#6C6C70', textAlign: 'center', padding: '32px 0' }}>Yükleniyor...</p>
        ) : filtered.length === 0 ? (
          <p style={{ color: '#6C6C70', textAlign: 'center', padding: '32px 0' }}>Müşteri bulunamadı.</p>
        ) : filtered.map((customer, idx) => {
          const isExpanded = expandedIds.has(customer.id)
          const petCount = customer.pets?.length ?? 0

          return (
            <div key={customer.id}>
              {idx > 0 && <div style={{ height: '1px', backgroundColor: '#E5E5EA', margin: '0' }} />}
              <div style={{ padding: '12px 0' }}>

                {/* Müşteri Satırı */}
                <div
                  style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', cursor: 'pointer' }}
                  onClick={() => toggleExpand(customer.id)}
                >
                  {/* iOS person.fill ikonu */}
                  <div style={{
                    width: '34px', height: '34px', borderRadius: '50%',
                    backgroundColor: '#EBF4FF', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', flexShrink: 0, marginTop: '2px'
                  }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="#007AFF">
                      <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
                    </svg>
                  </div>

                  <div style={{ flex: 1 }}>
<p
  onClick={e => { e.stopPropagation(); router.push(`/dashboard/customers/${customer.id}`) }}
  style={{ fontSize: '15px', fontWeight: 600, margin: '0 0 2px', color: '#007AFF', cursor: 'pointer', display: 'inline-block' }}
>
  {customer.full_name}
</p>
                    {customer.tckn && (
                      <p style={{ fontSize: '13px', color: '#8E8E93', margin: '0 0 1px' }}>TCKN: {customer.tckn}</p>
                    )}
                    {customer.phone && (
                      <p style={{ fontSize: '13px', color: '#8E8E93', margin: 0 }}>{customer.phone}</p>
                    )}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px', paddingTop: '2px' }}>
                    <span style={{ fontSize: '13px', color: '#8E8E93' }}>{petCount} hayvan</span>
                    <span style={{ fontSize: '16px', color: '#C7C7CC', lineHeight: 1 }}>{isExpanded ? '∧' : '∨'}</span>
                  </div>
                </div>

                {/* Evcil Hayvanlar */}
                {isExpanded && petCount > 0 && (
                  <div style={{ marginTop: '8px', paddingLeft: '46px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {customer.pets.map((pet: any) => {
                      const { emoji, bgColor, label: specLabel } = speciesInfo(pet.species ?? '')
                      const age = calcAge(pet.birth_date)
                      const gl = genderLabel(pet.gender)
                      const subtitle = [gl, age].filter(Boolean).join(' • ')

                      return (
                        <div
                          key={pet.id}
                          onClick={() => router.push(`/dashboard/pets/${pet.id}`)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '10px',
                            padding: '10px 12px', backgroundColor: '#EBF4FF',
                            borderRadius: '12px', cursor: 'pointer'
                          }}
                        >
                          <div style={{
                            width: '36px', height: '36px', borderRadius: '10px',
                            backgroundColor: bgColor, display: 'flex', alignItems: 'center',
                            justifyContent: 'center', fontSize: '20px', flexShrink: 0
                          }}>
                            {emoji}
                          </div>

                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <p style={{ fontSize: '15px', fontWeight: 600, margin: 0, color: '#000' }}>{pet.name}</p>
                              <p style={{ fontSize: '13px', color: '#8E8E93', margin: 0 }}>
                                {specLabel}{pet.breed ? ` • ${pet.breed}` : ''}
                              </p>
                            </div>
                            {subtitle && (
                              <p style={{ fontSize: '13px', color: '#8E8E93', margin: '2px 0 0' }}>{subtitle}</p>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}