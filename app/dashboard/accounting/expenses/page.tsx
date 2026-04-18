'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

const CATEGORIES = [
  { value: 'Personel Maasi', label: 'Personel Maasi', icon: '👤' },
  { value: 'Kira', label: 'Kira', icon: '🏢' },
  { value: 'Fatura', label: 'Fatura', icon: '⚡' },
  { value: 'Veteriner / Ilac', label: 'Veteriner / Ilac', icon: '💊' },
  { value: 'Mama / Malzeme', label: 'Mama / Malzeme', icon: '📦' },
  { value: 'Temizlik Malzemesi', label: 'Temizlik', icon: '✨' },
  { value: 'Vergi / Kurum Odemeleri', label: 'Vergi', icon: '📋' },
  { value: 'Diger', label: 'Diger', icon: '•••' },
]

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [businessId, setBusinessId] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ date: new Date().toISOString().split('T')[0], category: 'Diger', amount: '', note: '' })

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: biz } = await supabase.from('businesses').select('id').eq('user_id', user.id).single()
      setBusinessId(biz?.id ?? '')
      const { data } = await supabase.from('expenses').select('*').eq('business_id', biz?.id).order('date', { ascending: false })
      setExpenses(data ?? [])
      setLoading(false)
    }
    load()
  }, [])

  async function handleSave() {
    const amount = parseFloat(form.amount.replace(',', '.')) || 0
    if (amount <= 0) return
    setSaving(true)
    const supabase = createClient()
    const { data } = await supabase.from('expenses').insert({
      business_id: businessId,
      date: form.date,
      category: form.category,
      amount,
      note: form.note,
    }).select().single()
    if (data) setExpenses(prev => [data, ...prev])
    setForm({ date: new Date().toISOString().split('T')[0], category: 'Diger', amount: '', note: '' })
    setShowForm(false)
    setSaving(false)
  }

  async function handleDelete(id: string) {
    const supabase = createClient()
    await supabase.from('expenses').delete().eq('id', id)
    setExpenses(prev => prev.filter(e => e.id !== id))
  }

  function fmtCurrency(v: number) {
    return v.toLocaleString('tr-TR', { minimumFractionDigits: 2 })
  }

  function fmtDate(s: string) {
    return new Date(s + 'T12:00:00').toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }

  function catIcon(cat: string) {
    return CATEGORIES.find(c => c.value === cat)?.icon ?? '•••'
  }

  const total = expenses.reduce((s, e) => s + (e.amount ?? 0), 0)

  const inputStyle: React.CSSProperties = { width: '100%', padding: '10px 14px', backgroundColor: '#F2F2F7', borderRadius: '10px', border: 'none', outline: 'none', fontSize: '15px', boxSizing: 'border-box' }

  return (
    <div style={{ padding: '32px', maxWidth: '700px', paddingBottom: '64px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 800, color: '#000', margin: 0 }}>Giderler</h1>
        <button onClick={() => setShowForm(p => !p)} style={{ padding: '10px 20px', borderRadius: '12px', backgroundColor: '#007AFF', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: 600 }}>
          + Yeni Gider
        </button>
      </div>

      {/* Toplam */}
      <div style={{ backgroundColor: '#fff', borderRadius: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', padding: '20px', marginBottom: '16px' }}>
        <p style={{ fontSize: '13px', color: '#6C6C70', margin: '0 0 4px' }}>Toplam Gider</p>
        <p style={{ fontSize: '28px', fontWeight: 700, color: '#FF3B30', margin: 0 }}>₺{fmtCurrency(total)}</p>
        <p style={{ fontSize: '12px', color: '#6C6C70', margin: '4px 0 0' }}>{expenses.length} kayit</p>
      </div>

      {/* Yeni Gider Formu */}
      {showForm && (
        <div style={{ backgroundColor: '#fff', borderRadius: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', padding: '20px', marginBottom: '16px' }}>
          <p style={{ fontSize: '17px', fontWeight: 600, color: '#000', margin: '0 0 16px' }}>Yeni Gider</p>
          <div style={{ marginBottom: '12px' }}>
            <p style={{ fontSize: '12px', color: '#6C6C70', margin: '0 0 6px' }}>Tarih</p>
            <input type='date' value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} style={inputStyle} />
          </div>
          <div style={{ marginBottom: '12px' }}>
            <p style={{ fontSize: '12px', color: '#6C6C70', margin: '0 0 6px' }}>Kategori</p>
            <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} style={inputStyle}>
              {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div style={{ marginBottom: '12px' }}>
            <p style={{ fontSize: '12px', color: '#6C6C70', margin: '0 0 6px' }}>Tutar (₺)</p>
            <input type='text' inputMode='decimal' value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} placeholder='0,00' style={inputStyle} />
          </div>
          <div style={{ marginBottom: '16px' }}>
            <p style={{ fontSize: '12px', color: '#6C6C70', margin: '0 0 6px' }}>Not</p>
            <input value={form.note} onChange={e => setForm(p => ({ ...p, note: e.target.value }))} placeholder='Aciklama' style={inputStyle} />
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={() => setShowForm(false)} style={{ flex: 1, padding: '12px', borderRadius: '12px', border: '1px solid #E5E5EA', backgroundColor: '#fff', color: '#6C6C70', cursor: 'pointer', fontSize: '14px', fontWeight: 500 }}>Iptal</button>
            <button onClick={handleSave} disabled={saving} style={{ flex: 1, padding: '12px', borderRadius: '12px', backgroundColor: '#007AFF', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: 600, opacity: saving ? 0.6 : 1 }}>Kaydet</button>
          </div>
        </div>
      )}

      {/* Liste */}
      <div style={{ backgroundColor: '#fff', borderRadius: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '48px', textAlign: 'center' }}><p style={{ color: '#6C6C70' }}>Yukleniyor...</p></div>
        ) : expenses.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center' }}>
            <p style={{ fontSize: '32px', margin: '0 0 12px' }}>➖</p>
            <p style={{ fontSize: '14px', color: '#6C6C70', margin: 0 }}>Gider kaydi yok</p>
          </div>
        ) : expenses.map((exp, idx) => (
          <div key={exp.id} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 20px', borderBottom: idx < expenses.length - 1 ? '1px solid #E5E5EA' : 'none' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: '#FF3B3015', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>
              {catIcon(exp.category)}
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: '14px', fontWeight: 600, color: '#000', margin: 0 }}>{exp.category}</p>
              <p style={{ fontSize: '12px', color: '#6C6C70', margin: '2px 0 0' }}>{fmtDate(exp.date)}{exp.note ? ' • ' + exp.note : ''}</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <p style={{ fontSize: '14px', fontWeight: 700, color: '#FF3B30', margin: 0 }}>₺{fmtCurrency(exp.amount ?? 0)}</p>
              <button onClick={() => handleDelete(exp.id)} style={{ padding: '4px 10px', borderRadius: '8px', border: '1px solid #FF3B3040', backgroundColor: '#fff', color: '#FF3B30', cursor: 'pointer', fontSize: '12px' }}>Sil</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}