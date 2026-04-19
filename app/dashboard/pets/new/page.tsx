'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function NewPetPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [customers, setCustomers] = useState<any[]>([])
  const [form, setForm] = useState({
    name: '', species: 'dog', breed: '', gender: 'male',
    weight: '', color: '', is_neutered: false, is_aggressive: false,
    owner_full_name: '', owner_tckn: '', owner_phone: '', owner_address: '',
    microchip_no: '', passport_no: '', allergy_notes: '', medication_notes: '',
    food_brand: '', daily_meals: '', meal_portion: '',
    vet_name: '', vet_phone: '', notes: '',
    customer_id: '',
  })

  useEffect(() => {
    async function loadCustomers() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: business } = await supabase.from('businesses').select('id').eq('owner_user_id', user.id).single()
      const { data } = await supabase.from('customers').select('id, name').eq('business_id', business?.id).order('name')
      setCustomers(data ?? [])
    }
    loadCustomers()
  }, [])

  function set(field: string, value: string | boolean) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSave() {
    if (!form.name.trim()) { setError('Hayvan adi zorunludur.'); return }
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    const { data: business } = await supabase.from('businesses').select('id').eq('owner_user_id', user.id).single()
    const { error } = await supabase.from('pets').insert({
      business_id: business?.id,
      customer_id: form.customer_id || null,
      name: form.name.trim(),
      species: form.species,
      breed: form.breed || null,
      gender: form.gender,
      weight: form.weight ? parseFloat(form.weight) : null,
      color: form.color || null,
      is_neutered: form.is_neutered,
      is_aggressive: form.is_aggressive,
      owner_full_name: form.owner_full_name || null,
      owner_tckn: form.owner_tckn || null,
      owner_phone: form.owner_phone || null,
      owner_address: form.owner_address || null,
      microchip_no: form.microchip_no || null,
      passport_no: form.passport_no || null,
      allergy_notes: form.allergy_notes || null,
      medication_notes: form.medication_notes || null,
      food_brand: form.food_brand || null,
      daily_meals: form.daily_meals ? parseInt(form.daily_meals) : null,
      meal_portion: form.meal_portion ? parseInt(form.meal_portion) : null,
      vet_name: form.vet_name || null,
      vet_phone: form.vet_phone || null,
      notes: form.notes || null,
    })
    if (error) { setError(error.message); setLoading(false); return }
    router.push('/dashboard/pets')
    router.refresh()
  }

  const inputStyle = {width:'100%',fontSize:'15px',border:'none',outline:'none',backgroundColor:'transparent',color:'#000'}
  const rowStyle = {padding:'12px 16px',borderBottom:'1px solid #E5E5EA'}
  const lastRowStyle = {padding:'12px 16px'}
  const labelStyle = {display:'block',fontSize:'11px',color:'#6C6C70',marginBottom:'4px'} as React.CSSProperties
  const cardStyle = {backgroundColor:'#fff',borderRadius:'16px',overflow:'hidden',boxShadow:'0 1px 3px rgba(0,0,0,0.08)'}
  const sectionLabel = {fontSize:'13px',fontWeight:600,color:'#6C6C70',marginBottom:'8px',textTransform:'uppercase',letterSpacing:'0.5px'} as React.CSSProperties

  function Toggle({ field }: { field: string }) {
    const val = form[field as keyof typeof form] as boolean
    return (
      <div onClick={()=>set(field,!val)} style={{width:'51px',height:'31px',borderRadius:'16px',backgroundColor:val?'#34C759':'#E5E5EA',cursor:'pointer',position:'relative',flexShrink:0}}>
        <div style={{position:'absolute',top:'2px',left:val?'22px':'2px',width:'27px',height:'27px',borderRadius:'50%',backgroundColor:'#fff',boxShadow:'0 1px 3px rgba(0,0,0,0.2)',transition:'left 0.15s'}} />
      </div>
    )
  }

  function SegmentedControl({ field, options }: { field: string, options: {value:string,label:string}[] }) {
    return (
      <div style={{display:'flex',backgroundColor:'#F2F2F7',borderRadius:'10px',padding:'2px'}}>
        {options.map(o => (
          <button key={o.value} onClick={()=>set(field,o.value)} style={{flex:1,padding:'8px',borderRadius:'8px',border:'none',cursor:'pointer',fontSize:'13px',fontWeight:600,backgroundColor:form[field as keyof typeof form]===o.value?'#fff':'transparent',color:form[field as keyof typeof form]===o.value?'#000':'#6C6C70',boxShadow:form[field as keyof typeof form]===o.value?'0 1px 3px rgba(0,0,0,0.1)':'none'}}>
            {o.label}
          </button>
        ))}
      </div>
    )
  }

  return (
    <div style={{padding:'32px',maxWidth:'600px',paddingBottom:'64px'}}>
      <div style={{display:'flex',alignItems:'center',gap:'16px',marginBottom:'32px'}}>
        <button onClick={()=>router.back()} style={{background:'none',border:'none',fontSize:'16px',color:'#007AFF',cursor:'pointer',padding:'8px 0',fontWeight:500}}>Iptal</button>
        <h1 style={{fontSize:'20px',fontWeight:700,color:'#000',margin:0,flex:1,textAlign:'center'}}>Hayvan Formu</h1>
        <button onClick={handleSave} disabled={loading} style={{background:'none',border:'none',fontSize:'16px',color:loading?'#C7C7CC':'#007AFF',cursor:'pointer',padding:'8px 0',fontWeight:600}}>
          {loading?'Kaydediliyor...':'Kaydet'}
        </button>
      </div>

      <div style={{marginBottom:'20px'}}>
        <p style={sectionLabel}>Evcil Hayvan Bilgileri</p>
        <div style={cardStyle}>
          <div style={rowStyle}>
            <label style={labelStyle}>Evcil Hayvan Adi <span style={{color:'#FF3B30'}}>*</span></label>
            <input value={form.name} onChange={e=>set('name',e.target.value)} placeholder='Ad girin' style={inputStyle} />
          </div>
          <div style={rowStyle}>
            <label style={labelStyle}>Tur</label>
            <SegmentedControl field='species' options={[{value:'dog',label:'Kopek'},{value:'cat',label:'Kedi'},{value:'other',label:'Diger'}]} />
          </div>
          <div style={rowStyle}>
            <label style={labelStyle}>Irk</label>
            <input value={form.breed} onChange={e=>set('breed',e.target.value)} placeholder='Irk girin' style={inputStyle} />
          </div>
          <div style={rowStyle}>
            <label style={labelStyle}>Cinsiyet</label>
            <SegmentedControl field='gender' options={[{value:'male',label:'Erkek'},{value:'female',label:'Disi'}]} />
          </div>
          <div style={rowStyle}>
            <label style={labelStyle}>Kilo (kg)</label>
            <input type='number' value={form.weight} onChange={e=>set('weight',e.target.value)} placeholder='0.0' style={inputStyle} />
          </div>
          <div style={rowStyle}>
            <label style={labelStyle}>Renk</label>
            <input value={form.color} onChange={e=>set('color',e.target.value)} placeholder='Renk' style={inputStyle} />
          </div>
          <div style={{...rowStyle,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
            <span style={{fontSize:'15px',color:'#000'}}>Kisirlestirilmis</span>
            <Toggle field='is_neutered' />
          </div>
          <div style={{...lastRowStyle,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
            <span style={{fontSize:'15px',color:'#000'}}>Agresif egilim var</span>
            <Toggle field='is_aggressive' />
          </div>
        </div>
      </div>

      <div style={{marginBottom:'20px'}}>
        <p style={sectionLabel}>Fotograf</p>
        <div style={cardStyle}>
          <div style={{...lastRowStyle,display:'flex',gap:'12px'}}>
            <button style={{display:'flex',alignItems:'center',gap:'8px',padding:'10px 16px',borderRadius:'20px',border:'none',backgroundColor:'#F2F2F7',color:'#007AFF',fontSize:'14px',fontWeight:500,cursor:'pointer'}}>
              <span>🖼️</span> Galeriden Ekle
            </button>
            <button style={{display:'flex',alignItems:'center',gap:'8px',padding:'10px 16px',borderRadius:'20px',border:'none',backgroundColor:'#F2F2F7',color:'#007AFF',fontSize:'14px',fontWeight:500,cursor:'pointer'}}>
              <span>📷</span> Kamera
            </button>
          </div>
        </div>
      </div>

      <div style={{marginBottom:'20px'}}>
        <p style={sectionLabel}>Sahip Bilgileri</p>
        <div style={cardStyle}>
          <div style={rowStyle}>
            <label style={labelStyle}>Sahip (Mevcut Musteri)</label>
            <select value={form.customer_id} onChange={e=>set('customer_id',e.target.value)} style={{...inputStyle,color:form.customer_id?'#000':'#C7C7CC'}}>
              <option value=''>Secin</option>
              {customers.map(c=><option key={c.id} value={c.id}>{c.full_name}</option>)}
            </select>
          </div>
          <div style={rowStyle}>
            <label style={labelStyle}>Sahip Ad Soyad</label>
            <input value={form.owner_full_name} onChange={e=>set('owner_full_name',e.target.value)} placeholder='Ad Soyad' style={inputStyle} />
          </div>
          <div style={rowStyle}>
            <label style={labelStyle}>TCKN</label>
            <input value={form.owner_tckn} onChange={e=>set('owner_tckn',e.target.value)} placeholder='11 haneli TC' maxLength={11} style={inputStyle} />
          </div>
          <div style={rowStyle}>
            <label style={labelStyle}>Telefon</label>
            <input value={form.owner_phone} onChange={e=>set('owner_phone',e.target.value)} placeholder='05xx xxx xx xx' type='tel' style={inputStyle} />
          </div>
          <div style={lastRowStyle}>
            <label style={labelStyle}>Adres</label>
            <textarea value={form.owner_address} onChange={e=>set('owner_address',e.target.value)} placeholder='Adres' rows={3} style={{...inputStyle,resize:'none'}} />
          </div>
        </div>
      </div>

      <div style={{marginBottom:'20px'}}>
        <p style={sectionLabel}>Saglik Bilgileri</p>
        <div style={cardStyle}>
          <div style={rowStyle}>
            <label style={labelStyle}>Mikrocip No</label>
            <input value={form.microchip_no} onChange={e=>set('microchip_no',e.target.value)} placeholder='Numara' style={inputStyle} />
          </div>
          <div style={rowStyle}>
            <label style={labelStyle}>Pasaport No</label>
            <input value={form.passport_no} onChange={e=>set('passport_no',e.target.value)} placeholder='Numara' style={inputStyle} />
          </div>
          <div style={rowStyle}>
            <label style={labelStyle}>Alerji Notlari</label>
            <textarea value={form.allergy_notes} onChange={e=>set('allergy_notes',e.target.value)} placeholder='Alerjiler' rows={2} style={{...inputStyle,resize:'none'}} />
          </div>
          <div style={rowStyle}>
            <label style={labelStyle}>Ilac / Tedavi Notlari</label>
            <textarea value={form.medication_notes} onChange={e=>set('medication_notes',e.target.value)} placeholder='Kullanilan ilaclar' rows={2} style={{...inputStyle,resize:'none'}} />
          </div>
          <div style={rowStyle}>
            <label style={labelStyle}>Mama Markasi</label>
            <input value={form.food_brand} onChange={e=>set('food_brand',e.target.value)} placeholder='Marka adi' style={inputStyle} />
          </div>
          <div style={rowStyle}>
            <label style={labelStyle}>Gunluk Ogun Sayisi</label>
            <input type='number' value={form.daily_meals} onChange={e=>set('daily_meals',e.target.value)} placeholder='Orn: 2' style={inputStyle} />
          </div>
          <div style={lastRowStyle}>
            <label style={labelStyle}>Porsiyon Mama Miktari (gr)</label>
            <input type='number' value={form.meal_portion} onChange={e=>set('meal_portion',e.target.value)} placeholder='Orn: 200' style={inputStyle} />
          </div>
        </div>
      </div>

      <div style={{marginBottom:'20px'}}>
        <p style={sectionLabel}>Veteriner</p>
        <div style={cardStyle}>
          <div style={rowStyle}>
            <label style={labelStyle}>Veteriner Adi</label>
            <input value={form.vet_name} onChange={e=>set('vet_name',e.target.value)} placeholder='Ad' style={inputStyle} />
          </div>
          <div style={lastRowStyle}>
            <label style={labelStyle}>Veteriner Telefonu</label>
            <input value={form.vet_phone} onChange={e=>set('vet_phone',e.target.value)} placeholder='05xx xxx xx xx' type='tel' style={inputStyle} />
          </div>
        </div>
      </div>

      <div style={{marginBottom:'20px'}}>
        <p style={sectionLabel}>Ek Notlar</p>
        <div style={cardStyle}>
          <div style={lastRowStyle}>
            <textarea value={form.notes} onChange={e=>set('notes',e.target.value)} placeholder='Notlar' rows={4} style={{...inputStyle,resize:'none'}} />
          </div>
        </div>
      </div>

      <div style={{marginBottom:'20px'}}>
        <p style={sectionLabel}>Sozlesme Gorseli</p>
        <div style={cardStyle}>
          <div style={{...rowStyle,display:'flex',gap:'12px'}}>
            <button style={{display:'flex',alignItems:'center',gap:'8px',padding:'10px 16px',borderRadius:'20px',border:'none',backgroundColor:'#F2F2F7',color:'#007AFF',fontSize:'14px',fontWeight:500,cursor:'pointer'}}>
              <span>🖼️</span> Galeriden Sec
            </button>
            <button style={{display:'flex',alignItems:'center',gap:'8px',padding:'10px 16px',borderRadius:'20px',border:'none',backgroundColor:'#F2F2F7',color:'#007AFF',fontSize:'14px',fontWeight:500,cursor:'pointer'}}>
              <span>📷</span> Kamera ile Cek
            </button>
          </div>
          <div style={lastRowStyle}>
            <p style={{fontSize:'13px',color:'#6C6C70',margin:0}}>Sozlesme fotografi henuz eklenmedi.</p>
          </div>
        </div>
      </div>

      {error && (
        <div style={{backgroundColor:'#FFF0F0',color:'#FF3B30',fontSize:'13px',padding:'12px 16px',borderRadius:'12px'}}>
          {error}
        </div>
      )}
    </div>
  )
}