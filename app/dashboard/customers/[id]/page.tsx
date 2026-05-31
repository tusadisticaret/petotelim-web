'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useParams, useRouter } from 'next/navigation'

export default function CustomerDetailPage() {
  const params = useParams()
  const id = params?.id as string
  const router = useRouter()
  const [customer, setCustomer] = useState<any>(null)
  const [pets, setPets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ full_name: '', tckn: '', phone: '', email: '', address: '', notes: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (id) loadCustomer()
  }, [id])

  async function loadCustomer() {
    setError(null)
    const supabase = createClient()
    const { data: cust, error: custErr } = await supabase
      .from('customers')
      .select('*')
      .eq('id', id)
      .single()

    if (custErr || !cust) {
      setError('Müşteri bulunamadı. ID: ' + id)
      setLoading(false)
      return
    }

    const { data: petsData } = await supabase
      .from('pets')
      .select('id, name, species, breed')
      .eq('customer_id', id)

    setCustomer(cust)
    setPets(petsData ?? [])
    setForm({
      full_name: cust.full_name ?? '',
      tckn: cust.tckn ?? '',
      phone: cust.phone ?? '',
      email: cust.email ?? '',
      address: cust.address ?? '',
      notes: cust.notes ?? ''
    })
    setLoading(false)
  }

  async function handleSave() {
    setSaving(true)
    const supabase = createClient()
    const { error } = await supabase.from('customers').update(form).eq('id', id)
    if (!error) {
      setCustomer({ ...customer, ...form })
      setEditing(false)
    }
    setSaving(false)
  }

  function speciesInfo(species: string) {
    const sp = (species ?? '').toLowerCase()
    if (sp.includes('dog') || sp.includes('kopek') || sp.includes('köpek')) return { label: 'Köpek' }
    if (sp.includes('cat') || sp.includes('kedi')) return { label: 'Kedi' }
    return { label: species ?? 'Diğer' }
  }

  const val = (v: string) => v || 'Belirtilmedi'

  const card: React.CSSProperties = {
    backgroundColor: '#fff', borderRadius: '16px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)', marginBottom: '16px', padding: '16px 20px'
  }

  function InfoRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
    return (
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '10px 0', borderBottom: last ? 'none' : '1px solid #F2F2F7' }}>
        <span style={{ fontSize: '15px', color: '#8E8E93' }}>{label}</span>
        <span style={{ fontSize: '15px', color: '#000', textAlign: 'right', maxWidth: '60%' }}>{val(value)}</span>
      </div>
    )
  }

  if (loading) return <div style={{ padding: '32px' }}><p style={{ color: '#6C6C70' }}>Yükleniyor...</p></div>
  if (error) return <div style={{ padding: '32px' }}><p style={{ color: '#FF3B30' }}>{error}</p></div>
  if (!customer) return <div style={{ padding: '32px' }}><p style={{ color: '#FF3B30' }}>Müşteri bulunamadı.</p></div>

  // ── Düzenleme Modu ──────────────────────────────────────────────
  if (editing) {
    const fields = [
      { key: 'full_name', placeholder: 'Ad Soyad' },
      { key: 'tckn', placeholder: 'TCKN' },
      { key: 'phone', placeholder: 'Telefon' },
      { key: 'email', placeholder: 'E-posta' },
      { key: 'address', placeholder: 'Adres' },
      { key: 'notes', placeholder: 'Notlar' },
    ]
    return (
      <div style={{ padding: '32px', maxWidth: '640px', paddingBottom: '64px', backgroundColor: '#F2F2F7', minHeight: '100vh' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <button
            onClick={() => setEditing(false)}
            style={{ padding: '8px 18px', borderRadius: '20px', border: 'none', backgroundColor: '#E5E5EA', fontSize: '15px', fontWeight: 500, cursor: 'pointer', color: '#000' }}
          >
            İptal
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{ padding: '8px 18px', borderRadius: '20px', border: 'none', backgroundColor: '#E5E5EA', fontSize: '15px', fontWeight: 600, cursor: 'pointer', color: '#000' }}
          >
            {saving ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
        </div>

        <h1 style={{ fontSize: '34px', fontWeight: 800, margin: '0 0 24px', color: '#000' }}>Müşteri Düzenle</h1>

        <p style={{ fontSize: '13px', color: '#8E8E93', margin: '0 0 8px', paddingLeft: '4px' }}>Müşteri Bilgileri</p>
        <div style={card}>
          {fields.map((f, i) => (
            <input
              key={f.key}
              value={(form as any)[f.key]}
              onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
              placeholder={f.placeholder}
              style={{
                width: '100%', padding: '14px 0', backgroundColor: 'transparent',
                border: 'none', borderBottom: i < fields.length - 1 ? '1px solid #E5E5EA' : 'none',
                outline: 'none', fontSize: '15px', color: '#000', boxSizing: 'border-box'
              }}
            />
          ))}
        </div>
      </div>
    )
  }

  // ── Detay Modu ──────────────────────────────────────────────────
  return (
    <div style={{ padding: '32px', maxWidth: '640px', paddingBottom: '64px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <button
          onClick={() => router.back()}
          style={{ width: '36px', height: '36px', borderRadius: '50%', border: 'none', backgroundColor: '#F2F2F7', fontSize: '20px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000' }}
        >
          ‹
        </button>
        <button
          onClick={() => setEditing(true)}
          style={{ padding: '8px 18px', borderRadius: '20px', border: 'none', backgroundColor: '#F2F2F7', fontSize: '15px', fontWeight: 600, cursor: 'pointer', color: '#000' }}
        >
          Düzenle
        </button>
      </div>

      <h1 style={{ fontSize: '34px', fontWeight: 800, margin: '0 0 24px', color: '#000' }}>Müşteri Detayı</h1>

      <div style={card}>
        <p style={{ fontSize: '17px', fontWeight: 700, margin: '0 0 4px' }}>Müşteri Bilgileri</p>
        <InfoRow label="Ad Soyad" value={customer.full_name} />
        <InfoRow label="TCKN" value={customer.tckn} />
        <InfoRow label="Telefon" value={customer.phone} />
        <InfoRow label="E-posta" value={customer.email} />
        <InfoRow label="Adres" value={customer.address} />
        <InfoRow label="Notlar" value={customer.notes} last />
      </div>

      <div style={card}>
        <p style={{ fontSize: '17px', fontWeight: 700, margin: '0 0 12px' }}>Evcil Hayvanlar</p>
        {pets.length === 0 ? (
          <p style={{ color: '#6C6C70', fontSize: '14px' }}>Kayıtlı evcil hayvan yok.</p>
        ) : pets.map((pet, idx) => {
          const { label: specLabel } = speciesInfo(pet.species ?? '')
          return (
            <div key={pet.id}>
              {idx > 0 && <div style={{ height: '1px', backgroundColor: '#F2F2F7' }} />}
              <div
                onClick={() => router.push(`/dashboard/pets/${pet.id}`)}
                style={{ padding: '10px 0', cursor: 'pointer' }}
              >
                <p style={{ fontSize: '15px', fontWeight: 600, margin: '0 0 2px', color: '#000' }}>{pet.name}</p>
                <p style={{ fontSize: '13px', color: '#8E8E93', margin: 0 }}>
                  {specLabel}{pet.breed ? ` • ${pet.breed}` : ''}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}