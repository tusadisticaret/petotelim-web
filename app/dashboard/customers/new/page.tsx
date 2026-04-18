'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function NewCustomerPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    notes: '',
  })

  function handleChange(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSave() {
    if (!form.name.trim()) { setError('Ad soyad zorunludur.'); return }
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data: business } = await supabase
      .from('businesses')
      .select('id')
      .eq('owner_user_id', user.id)
      .single()

    const { error } = await supabase.from('customers').insert({
      business_id: business?.id,
      name: form.name.trim(),
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      address: form.address.trim() || null,
      notes: form.notes.trim() || null,
    })

    if (error) { setError(error.message); setLoading(false); return }
    router.push('/dashboard/customers')
    router.refresh()
  }

  const fields = [
    { key: 'name', label: 'Ad Soyad', placeholder: 'Ornek: Ahmet Yilmaz', type: 'text', required: true },
    { key: 'phone', label: 'Telefon', placeholder: '05XX XXX XX XX', type: 'tel', required: false },
    { key: 'email', label: 'E-posta', placeholder: 'ornek@email.com', type: 'email', required: false },
    { key: 'address', label: 'Adres', placeholder: 'Adres girin', type: 'text', required: false },
    { key: 'notes', label: 'Notlar', placeholder: 'Musteri hakkinda notlar', type: 'text', required: false },
  ]

  return (
    <div style={{padding:'32px',maxWidth:'600px'}}>
      <div style={{display:'flex',alignItems:'center',gap:'16px',marginBottom:'32px'}}>
        <button onClick={() => router.back()} style={{background:'none',border:'none',fontSize:'16px',color:'#007AFF',cursor:'pointer',padding:'8px 0',fontWeight:500}}>
          Iptal
        </button>
        <h1 style={{fontSize:'20px',fontWeight:700,color:'#000',margin:0,flex:1,textAlign:'center'}}>Yeni Musteri</h1>
        <button onClick={handleSave} disabled={loading} style={{background:'none',border:'none',fontSize:'16px',color: loading ? '#C7C7CC' : '#007AFF',cursor:'pointer',padding:'8px 0',fontWeight:600}}>
          {loading ? 'Kaydediliyor...' : 'Kaydet'}
        </button>
      </div>

      <div style={{marginBottom:'24px'}}>
        <p style={{fontSize:'13px',fontWeight:600,color:'#6C6C70',marginBottom:'8px',textTransform:'uppercase',letterSpacing:'0.5px'}}>Musteri Bilgileri</p>
        <div style={{backgroundColor:'#fff',borderRadius:'16px',overflow:'hidden',boxShadow:'0 1px 3px rgba(0,0,0,0.08)'}}>
          {fields.map((field, idx) => (
            <div key={field.key} style={{padding:'12px 16px',borderBottom: idx < fields.length - 1 ? '1px solid #E5E5EA' : 'none'}}>
              <label style={{display:'block',fontSize:'11px',color:'#6C6C70',marginBottom:'4px'}}>
                {field.label} {field.required && <span style={{color:'#FF3B30'}}>*</span>}
              </label>
              <input
                type={field.type}
                value={form[field.key as keyof typeof form]}
                onChange={e => handleChange(field.key, e.target.value)}
                placeholder={field.placeholder}
                style={{width:'100%',fontSize:'15px',border:'none',outline:'none',backgroundColor:'transparent',color:'#000'}}
              />
            </div>
          ))}
        </div>
      </div>

      {error && (
        <div style={{backgroundColor:'#FFF0F0',color:'#FF3B30',fontSize:'13px',padding:'12px 16px',borderRadius:'12px',marginBottom:'16px'}}>
          {error}
        </div>
      )}
    </div>
  )
}