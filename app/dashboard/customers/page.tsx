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
    // Hepsini açık başlat
    setExpandedIds(new Set((data ?? []).map((c: any) => c.id)))
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

  function speciesIcon(species: string) {
    const sp = (species ?? '').toLowerCase()
    if (sp.includes('dog') || sp.includes('kopek') || sp.includes('köpek')) return { icon: '🐶', color: '#007AFF' }
    if (sp.includes('cat') || sp.includes('kedi')) return { icon: '🐱', color: '#FF9500' }
    return { icon: '🐾', color: '#6C6C70' }
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

  const filtered = customers.filter(c => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return c.full_name?.toLowerCase().includes(q) ||
      c.phone?.toLowerCase().includes(q) ||
      c.tckn?.toLowerCase().includes(q) ||
      c.pets?.some((p: any) => p.name?.toLowerCase().includes(q))
  })

  const card: React.CSSProperties = { backgroundColor: '#fff', borderRadius: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', marginBottom: '16px', padding: '16px 20px' }
  const inp: React.CSSProperties = { width: '100%', padding: '10px 14px', backgroundColor: '#F2F2F7', borderRadius: '10px', border: 'none', outline: 'none', fontSize: '15px', boxSizing: 'border-box', color: '#000' }

  return (
    <div style={{ padding: '32px', maxWidth: '720px', paddingBottom: '64px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 800, margin: 0 }}>Müşteriler</h1>
        <button onClick={() => router.push('/dashboard/pets/new')} style={{ padding: '10px 20px', borderRadius: '12px', border: 'none', backgroundColor: '#007AFF', color: '#fff', fontSize: '15px', fontWeight: 600, cursor: 'pointer' }}>
          + Yeni Müşteri
        </button>
      </div>

      {/* Arama */}
      <div style={{ ...card, padding: '16px' }}>
        <p style={{ fontSize: '15px', fontWeight: 600, margin: '0 0 10px' }}>Ara</p>
        <div style={{ display: 'flex', gap: '10px' }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder='Hayvan adı / sahip adı / telefon' style={inp} />
          <button onClick={() => setSearch('')} style={{ padding: '10px 16px', borderRadius: '10px', border: 'none', backgroundColor: '#F2F2F7', fontSize: '14px', cursor: 'pointer' }}>Temizle</button>
        </div>
      </div>

      {/* Liste */}
      <div style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <p style={{ fontSize: '15px', fontWeight: 600, margin: 0 }}>Müşteriler</p>
          <button onClick={loadCustomers} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px', borderRadius: '10px', border: 'none', backgroundColor: '#F2F2F7', fontSize: '13px', cursor: 'pointer' }}>
            🔄 Yenile
          </button>
        </div>

        {loading ? (
          <p style={{ color: '#6C6C70', textAlign: 'center', padding: '24px 0' }}>Yükleniyor...</p>
        ) : filtered.length === 0 ? (
          <p style={{ color: '#6C6C70', textAlign: 'center', padding: '24px 0' }}>Müşteri bulunamadı.</p>
        ) : filtered.map((customer, idx) => {
          const isExpanded = expandedIds.has(customer.id)
          const petCount = customer.pets?.length ?? 0
          const initial = customer.full_name?.charAt(0)?.toUpperCase() ?? '?'

          return (
            <div key={customer.id}>
              {idx > 0 && <div style={{ height: '1px', backgroundColor: '#F2F2F7', margin: '4px 0' }} />}
              <div style={{ padding: '10px 0' }}>
<div style={{ display: 'flex', alignItems: 'center', gap: '12px' }} onClick={() => toggleExpand(customer.id)}>
  <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#007AFF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '15px', fontWeight: 700, flexShrink: 0 }}>
    {initial}
  </div>
  <div style={{ flex: 1 }}>
    <p
      onClick={e => { e.stopPropagation(); router.push(`/dashboard/customers/${customer.id}`) }}
      style={{ fontSize: '15px', fontWeight: 600, margin: '0 0 2px', color: '#007AFF', cursor: 'pointer', display: 'inline-block' }}
    >
      {customer.full_name}
    </p>
    {customer.tckn && <p style={{ fontSize: '12px', color: '#6C6C70', margin: '0 0 1px' }}>TCKN: {customer.tckn}</p>}
    <p style={{ fontSize: '12px', color: '#6C6C70', margin: 0 }}>{customer.phone}</p>
  </div>
  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
    <span style={{ fontSize: '12px', color: '#6C6C70' }}>{petCount} hayvan</span>
    <span style={{ color: '#6C6C70', fontSize: '14px' }}>{isExpanded ? '▲' : '▼'}</span>
  </div>
</div>

                {/* Evcil hayvanlar */}
                {isExpanded && petCount > 0 && (
                  <div style={{ marginTop: '8px', paddingLeft: '48px' }}>
                    {customer.pets.map((pet: any) => {
                      const { icon, color } = speciesIcon(pet.species ?? '')
                      const age = calcAge(pet.birth_date)
                      const speciesLabel = pet.species?.toLowerCase().includes('dog') || pet.species?.toLowerCase().includes('kopek') ? 'Köpek' :
                        pet.species?.toLowerCase().includes('cat') || pet.species?.toLowerCase().includes('kedi') ? 'Kedi' : pet.species ?? ''
                      const genderLabel = pet.gender === 'male' || pet.gender === 'Erkek' ? 'Erkek' :
                        pet.gender === 'female' || pet.gender === 'Dişi' ? 'Dişi' : ''

                      return (
                        <div key={pet.id} onClick={() => router.push(`/dashboard/pets/${pet.id}`)} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', backgroundColor: '#EBF4FF', borderRadius: '12px', marginBottom: '6px', cursor: 'pointer' }}>
                          <span style={{ fontSize: '24px' }}>{icon}</span>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <p style={{ fontSize: '15px', fontWeight: 600, margin: 0 }}>{pet.name}</p>
                              <p style={{ fontSize: '13px', color: '#6C6C70', margin: 0 }}>{speciesLabel}{pet.breed ? ` • ${pet.breed}` : ''}</p>
                            </div>
                            {(genderLabel || age) && (
                              <p style={{ fontSize: '12px', color: '#6C6C70', margin: '2px 0 0' }}>
                                {[genderLabel, age].filter(Boolean).join(' • ')}
                              </p>
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