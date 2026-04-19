'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useParams, useRouter } from 'next/navigation'

export default function CustomerDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const [customer, setCustomer] = useState<any>(null)
  const [pets, setPets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadCustomer() }, [id])

  async function loadCustomer() {
    const supabase = createClient()
    const [{ data: cust }, { data: petsData }] = await Promise.all([
      supabase.from('customers').select('*').eq('id', id).single(),
      supabase.from('pets').select('id, name, species, breed, birth_date').eq('customer_id', id)
    ])
    setCustomer(cust)
    setPets(petsData ?? [])
    setLoading(false)
  }

  function speciesIcon(species: string) {
    const sp = (species ?? '').toLowerCase()
    if (sp.includes('dog') || sp.includes('kopek')) return { icon: '🐶', color: '#007AFF' }
    if (sp.includes('cat') || sp.includes('kedi')) return { icon: '🐱', color: '#FF9500' }
    return { icon: '🐾', color: '#6C6C70' }
  }

  const card: React.CSSProperties = { backgroundColor: '#fff', borderRadius: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', marginBottom: '16px', padding: '20px' }

  function row(label: string, value: string) {
    return (
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '8px 0', borderBottom: '1px solid #F2F2F7' }}>
        <span style={{ fontSize: '14px', color: '#6C6C70', minWidth: '100px' }}>{label}</span>
        <span style={{ fontSize: '14px', color: '#000', textAlign: 'right', flex: 1 }}>{value || 'Belirtilmedi'}</span>
      </div>
    )
  }

  if (loading) return <div style={{ padding: '32px' }}><p style={{ color: '#6C6C70' }}>Yükleniyor...</p></div>
  if (!customer) return <div style={{ padding: '32px' }}><p style={{ color: '#FF3B30' }}>Müşteri bulunamadı.</p></div>

  return (
    <div style={{ padding: '32px', maxWidth: '640px', paddingBottom: '64px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <button onClick={() => router.back()} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '24px', color: '#007AFF', padding: 0 }}>‹</button>
        <h1 style={{ fontSize: '28px', fontWeight: 800, margin: 0 }}>Müşteri Detayı</h1>
      </div>

      <div style={card}>
        <p style={{ fontSize: '17px', fontWeight: 700, margin: '0 0 12px' }}>Müşteri Bilgileri</p>
        {row('Ad Soyad', customer.full_name)}
        {row('TCKN', customer.tckn)}
        {row('Telefon', customer.phone)}
        {row('E-posta', customer.email)}
        {row('Adres', customer.address)}
        {row('Notlar', customer.notes)}
      </div>

      <div style={card}>
        <p style={{ fontSize: '17px', fontWeight: 700, margin: '0 0 12px' }}>Evcil Hayvanlar</p>
        {pets.length === 0 ? (
          <p style={{ color: '#6C6C70', fontSize: '14px' }}>Kayıtlı evcil hayvan yok.</p>
        ) : pets.map(pet => {
          const { icon, color } = speciesIcon(pet.species ?? '')
          return (
            <div key={pet.id} onClick={() => router.push(`/dashboard/pets/${pet.id}`)} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', backgroundColor: '#F0F7FF', borderRadius: '12px', marginBottom: '8px', cursor: 'pointer' }}>
              <span style={{ fontSize: '28px' }}>{icon}</span>
              <div>
                <p style={{ fontSize: '15px', fontWeight: 600, margin: '0 0 2px' }}>{pet.name}</p>
                <p style={{ fontSize: '13px', color: '#6C6C70', margin: 0 }}>{pet.breed ?? ''}</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}