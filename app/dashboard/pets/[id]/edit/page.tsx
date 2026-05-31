'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useParams, useRouter } from 'next/navigation'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ backgroundColor: '#fff', borderRadius: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', marginBottom: '16px', padding: '20px' }}>
      <p style={{ fontSize: '17px', fontWeight: 700, color: '#000', margin: '0 0 16px' }}>{title}</p>
      {children}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '14px' }}>
      <span style={{ fontSize: '12px', color: '#6C6C70', marginBottom: '6px', display: 'block' }}>{label}</span>
      {children}
    </div>
  )
}

export default function PetEditPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    name: '', species: 'Köpek', breed: '', gender: 'Erkek',
    weight: '', color: '', is_neutered: false, aggressive: false,
    owner_full_name: '', owner_tckn: '', owner_phone: '', owner_address: '',
    microchip_number: '', passport_number: '', allergy_notes: '', medicine_notes: '',
    food_brand: '', meals_per_day: '', portion_grams: '',
    vet_name: '', vet_phone: '', notes: ''
  })

  useEffect(() => { load() }, [id])

  async function load() {
    const supabase = createClient()
    const { data } = await supabase.from('pets').select('*').eq('id', id).single()
    if (data) {
      const s = (data.species ?? '').toLowerCase()
      setForm({
        name: data.name ?? '',
        species: s === 'dog' ? 'Köpek' : s === 'cat' ? 'Kedi' : s === 'köpek' ? 'Köpek' : s === 'kedi' ? 'Kedi' : 'Diğer',
        breed: data.breed ?? '',
        gender: data.gender === 'female' || data.gender === 'Dişi' ? 'Dişi' : 'Erkek',
        weight: data.weight ? String(data.weight) : '',
        color: data.color ?? '',
        is_neutered: data.is_neutered ?? data.sterilized ?? false,
        aggressive: data.aggressive ?? false,
        owner_full_name: data.owner_full_name ?? '',
        owner_tckn: data.owner_tckn ?? '',
        owner_phone: data.owner_phone ?? '',
        owner_address: data.owner_address ?? '',
        microchip_number: data.microchip_number ?? '',
        passport_number: data.passport_number ?? '',
        allergy_notes: data.allergy_notes ?? '',
        medicine_notes: data.medicine_notes ?? '',
        food_brand: data.food_brand ?? '',
        meals_per_day: data.meals_per_day ? String(data.meals_per_day) : '',
        portion_grams: data.portion_grams ? String(data.portion_grams) : '',
        vet_name: data.vet_name ?? '',
        vet_phone: data.vet_phone ?? '',
        notes: data.notes ?? ''
      })
    }
    setLoading(false)
  }

  async function handleSave() {
    if (!form.name.trim()) return
    setSaving(true)
    const supabase = createClient()
    const speciesMap: Record<string, string> = { 'Köpek': 'dog', 'Kedi': 'cat', 'Diğer': 'other' }
    await supabase.from('pets').update({
      name: form.name.trim(),
      species: speciesMap[form.species] ?? form.species,
      breed: form.breed.trim(),
      gender: form.gender === 'Dişi' ? 'female' : 'male',
      weight: parseFloat(form.weight) || null,
      color: form.color.trim(),
      is_neutered: form.is_neutered,
      sterilized: form.is_neutered,
      aggressive: form.aggressive,
      owner_full_name: form.owner_full_name.trim(),
      owner_tckn: form.owner_tckn.trim(),
      owner_phone: form.owner_phone.trim(),
      owner_address: form.owner_address.trim(),
      microchip_number: form.microchip_number.trim(),
      passport_number: form.passport_number.trim(),
      allergy_notes: form.allergy_notes.trim(),
      medicine_notes: form.medicine_notes.trim(),
      food_brand: form.food_brand.trim(),
      meals_per_day: parseInt(form.meals_per_day) || null,
      portion_grams: parseInt(form.portion_grams) || null,
      vet_name: form.vet_name.trim(),
      vet_phone: form.vet_phone.trim(),
      notes: form.notes.trim(),
    }).eq('id', id)
    setSaving(false)
    router.push(`/dashboard/pets/${id}`)
  }

  const inp: React.CSSProperties = { width: '100%', padding: '10px 14px', backgroundColor: '#F2F2F7', borderRadius: '10px', border: 'none', outline: 'none', fontSize: '15px', boxSizing: 'border-box', color: '#000' }
  const segmented = (options: string[], value: string, onChange: (v: string) => void) => (
    <div style={{ display: 'flex', backgroundColor: '#E5E5EA', borderRadius: '10px', padding: '2px' }}>
      {options.map(o => (
        <button key={o} onClick={() => onChange(o)} style={{ flex: 1, padding: '8px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: 600, backgroundColor: value === o ? '#fff' : 'transparent', color: '#000', boxShadow: value === o ? '0 1px 3px rgba(0,0,0,0.12)' : 'none' }}>
          {o}
        </button>
      ))}
    </div>
  )
  const toggle = (label: string, value: boolean, onChange: (v: boolean) => void) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #F2F2F7' }}>
      <span style={{ fontSize: '15px', color: '#000' }}>{label}</span>
      <div onClick={() => onChange(!value)} style={{ width: '51px', height: '31px', borderRadius: '16px', backgroundColor: value ? '#34C759' : '#E5E5EA', cursor: 'pointer', position: 'relative', transition: 'background 0.2s' }}>
        <div style={{ position: 'absolute', top: '2px', left: value ? '22px' : '2px', width: '27px', height: '27px', borderRadius: '50%', backgroundColor: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.3)', transition: 'left 0.2s' }} />
      </div>
    </div>
  )

  if (loading) return <div style={{ padding: '48px', textAlign: 'center' }}><p style={{ color: '#6C6C70' }}>Yükleniyor...</p></div>

  return (
    <div style={{ padding: '0', maxWidth: '600px', margin: '0 auto' }}>
      {/* Navbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #E5E5EA', backgroundColor: '#fff', position: 'sticky', top: 0, zIndex: 10 }}>
        <button onClick={() => router.back()} style={{ fontSize: '15px', color: '#007AFF', background: 'none', border: 'none', cursor: 'pointer' }}>İptal</button>
        <span style={{ fontSize: '17px', fontWeight: 700, color: '#000' }}>Hayvan Formu</span>
        <button onClick={handleSave} disabled={saving || !form.name.trim()} style={{ fontSize: '15px', fontWeight: 700, color: saving || !form.name.trim() ? '#C7C7CC' : '#007AFF', background: 'none', border: 'none', cursor: 'pointer' }}>Kaydet</button>
      </div>

      <div style={{ padding: '20px', paddingBottom: '48px' }}>
        {/* Evcil Hayvan Bilgileri */}
        <Section title="Evcil Hayvan Bilgileri">
          <Field label="Evcil Hayvan Adı">
            <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder='Ad' style={inp} />
          </Field>
          <Field label="Tür">
            {segmented(['Köpek', 'Kedi', 'Diğer'], form.species, v => setForm(p => ({ ...p, species: v })))}
          </Field>
          <Field label="Irk">
            <input value={form.breed} onChange={e => setForm(p => ({ ...p, breed: e.target.value }))} placeholder='Irk' style={inp} />
          </Field>
          <Field label="Cinsiyet">
            {segmented(['Erkek', 'Dişi'], form.gender, v => setForm(p => ({ ...p, gender: v })))}
          </Field>
          <Field label="Kilo (kg)">
            <input type='text' inputMode='decimal' value={form.weight} onChange={e => setForm(p => ({ ...p, weight: e.target.value }))} placeholder='0.0' style={inp} />
          </Field>
          <Field label="Renk">
            <input value={form.color} onChange={e => setForm(p => ({ ...p, color: e.target.value }))} placeholder='Renk' style={inp} />
          </Field>
          {toggle('Kısırlaştırılmış', form.is_neutered, v => setForm(p => ({ ...p, is_neutered: v })))}
          {toggle('Agresif eğilim var', form.aggressive, v => setForm(p => ({ ...p, aggressive: v })))}
        </Section>

        {/* Sahip Bilgileri */}
        <Section title="Sahip Bilgileri">
          <Field label="Sahip Adı Soyadı">
            <input value={form.owner_full_name} onChange={e => setForm(p => ({ ...p, owner_full_name: e.target.value }))} placeholder='Ad Soyad' style={inp} />
          </Field>
          <Field label="TCKN">
            <input value={form.owner_tckn} onChange={e => setForm(p => ({ ...p, owner_tckn: e.target.value }))} placeholder='TCKN' style={inp} />
          </Field>
          <Field label="Telefon">
            <input value={form.owner_phone} onChange={e => setForm(p => ({ ...p, owner_phone: e.target.value }))} placeholder='05xx xxx xx xx' style={inp} />
          </Field>
          <Field label="Adres">
            <textarea value={form.owner_address} onChange={e => setForm(p => ({ ...p, owner_address: e.target.value }))} placeholder='Adres' rows={3} style={{ ...inp, resize: 'none', fontFamily: 'inherit' }} />
          </Field>
        </Section>

        {/* Sağlık Bilgileri */}
        <Section title="Sağlık Bilgileri">
          <Field label="Mikroçip No">
            <input value={form.microchip_number} onChange={e => setForm(p => ({ ...p, microchip_number: e.target.value }))} placeholder='Mikroçip No' style={inp} />
          </Field>
          <Field label="Pasaport No">
            <input value={form.passport_number} onChange={e => setForm(p => ({ ...p, passport_number: e.target.value }))} placeholder='Pasaport No' style={inp} />
          </Field>
          <Field label="Alerji Notları">
            <textarea value={form.allergy_notes} onChange={e => setForm(p => ({ ...p, allergy_notes: e.target.value }))} placeholder='Alerji notları' rows={3} style={{ ...inp, resize: 'none', fontFamily: 'inherit' }} />
          </Field>
          <Field label="İlaç / Tedavi Notları">
            <textarea value={form.medicine_notes} onChange={e => setForm(p => ({ ...p, medicine_notes: e.target.value }))} placeholder='İlaç notları' rows={3} style={{ ...inp, resize: 'none', fontFamily: 'inherit' }} />
          </Field>
          <Field label="Mama Markası">
            <input value={form.food_brand} onChange={e => setForm(p => ({ ...p, food_brand: e.target.value }))} placeholder='Mama markası' style={inp} />
          </Field>
          <Field label="Günlük Öğün Sayısı">
            <input type='text' inputMode='numeric' value={form.meals_per_day} onChange={e => setForm(p => ({ ...p, meals_per_day: e.target.value }))} placeholder='1' style={inp} />
          </Field>
          <Field label="Porsiyon Mama Miktarı (gr)">
            <input type='text' inputMode='numeric' value={form.portion_grams} onChange={e => setForm(p => ({ ...p, portion_grams: e.target.value }))} placeholder='150' style={inp} />
          </Field>
        </Section>

        {/* Veteriner */}
        <Section title="Veteriner">
          <Field label="Veteriner Adı">
            <input value={form.vet_name} onChange={e => setForm(p => ({ ...p, vet_name: e.target.value }))} placeholder='Ad' style={inp} />
          </Field>
          <Field label="Veteriner Telefonu">
            <input value={form.vet_phone} onChange={e => setForm(p => ({ ...p, vet_phone: e.target.value }))} placeholder='05xx xxx xx xx' style={inp} />
          </Field>
        </Section>

        {/* Ek Notlar */}
        <Section title="Ek Notlar">
          <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder='Notlar' rows={5} style={{ ...inp, resize: 'none', fontFamily: 'inherit' }} />
        </Section>
      </div>
    </div>
  )
}