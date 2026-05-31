'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

const BUSINESS_ID = 'a59e232c-3334-43c7-94b4-7f3da311b01d'

const CATEGORIES = [
  { value: 'Personel Maaşı', label: 'Personel Maaşı', icon: '👤', color: '#007AFF', bg: '#007AFF15' },
  { value: 'Kira', label: 'Kira', icon: '🏢', color: '#FF9500', bg: '#FF950015' },
  { value: 'Fatura', label: 'Fatura', icon: '⚡', color: '#FFCC00', bg: '#FFCC0015' },
  { value: 'Veteriner / İlaç', label: 'Veteriner / İlaç', icon: '🏥', color: '#FF3B30', bg: '#FF3B3015' },
  { value: 'Mama / Malzeme', label: 'Mama / Malzeme', icon: '📦', color: '#34C759', bg: '#34C75915' },
  { value: 'Temizlik Malzemesi', label: 'Temizlik Malzemesi', icon: '✨', color: '#5AC8FA', bg: '#5AC8FA15' },
  { value: 'Vergi / Kurum Ödemeleri', label: 'Vergi / Kurum Ödemeleri', icon: '📋', color: '#AF52DE', bg: '#AF52DE15' },
  { value: 'Diğer', label: 'Diğer', icon: '···', color: '#8E8E93', bg: '#8E8E9315' },
]

function getCat(val: string) {
  return CATEGORIES.find(c => c.value === val) ??
    CATEGORIES.find(c => c.value.toLowerCase() === val?.toLowerCase()) ??
    CATEGORIES.find(c => c.label.toLowerCase() === val?.toLowerCase()) ??
    CATEGORIES[7]
}

function fmtCurrency(v: number) {
  return '₺' + v.toLocaleString('tr-TR', { minimumFractionDigits: 2 })
}

function fmtDate(s: string) {
  return new Date(s + 'T12:00:00').toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function groupByMonth(expenses: any[]) {
  const groups: { [key: string]: any[] } = {}
  expenses.forEach(e => {
    const d = new Date(e.date + 'T12:00:00')
    const key = d.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })
    if (!groups[key]) groups[key] = []
    groups[key].push(e)
  })
  return Object.entries(groups)
}

export default function ExpensesPage() {
  const [tab, setTab] = useState<'expenses' | 'recurring'>('expenses')
  const [expenses, setExpenses] = useState<any[]>([])
  const [recurring, setRecurring] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [showRecurringForm, setShowRecurringForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [collapsedMonths, setCollapsedMonths] = useState<Set<string>>(new Set())

  // Expense form
  const [eDate, setEDate] = useState(new Date().toISOString().slice(0, 10))
  const [eCat, setECat] = useState('Diğer')
  const [eAmount, setEAmount] = useState('')
  const [eNote, setENote] = useState('')

  // Recurring form
  const [rCat, setRCat] = useState('Diğer')
  const [rStart, setRStart] = useState(new Date().toISOString().slice(0, 10))
  const [rAmount, setRAmount] = useState('')
  const [rNote, setRNote] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const supabase = createClient()
    const { data: exps } = await supabase
      .from('expenses').select('*').eq('business_id', BUSINESS_ID).order('date', { ascending: false })
    setExpenses(exps ?? [])
const { data: recs } = await supabase
  .from('recurring_expenses').select('*').eq('business_id', BUSINESS_ID).order('start_date', { ascending: false })
    setRecurring(recs ?? [])
    setLoading(false)
  }

  async function saveExpense() {
    const amount = parseFloat(eAmount.replace(',', '.')) || 0
    if (amount <= 0) { alert('Geçerli bir tutar girin.'); return }
    setSaving(true)
    const supabase = createClient()
const { data } = await supabase.from('expenses').insert({
  business_id: BUSINESS_ID, date: eDate, category_raw: eCat, amount, note: eNote,
}).select().single()
    if (data) setExpenses(prev => [data, ...prev])
    setEDate(new Date().toISOString().slice(0, 10)); setECat('Diğer'); setEAmount(''); setENote('')
    setShowForm(false); setSaving(false)
  }

  async function saveRecurring() {
    const amount = parseFloat(rAmount.replace(',', '.')) || 0
    if (amount <= 0) { alert('Geçerli bir tutar girin.'); return }
    setSaving(true)
    const supabase = createClient()
const { data } = await supabase.from('recurring_expenses').insert({
  business_id: BUSINESS_ID, category_raw: rCat, start_date: rStart, amount, note: rNote, is_active: true,
    }).select().single()
    if (data) setRecurring(prev => [data, ...prev])
    setRCat('Diğer'); setRStart(new Date().toISOString().slice(0, 10)); setRAmount(''); setRNote('')
    setShowRecurringForm(false); setSaving(false)
  }

async function deleteExpense(id: string) {
    console.log('Deleting expense id:', id)
    const supabase = createClient()
    const { error } = await supabase.from('expenses').delete().eq('id', id)
    console.log('Delete error:', error)
    setExpenses(prev => prev.filter(e => e.id !== id))
}

  async function deleteRecurring(id: string) {
    const supabase = createClient()
    await supabase.from('recurring_expenses').delete().eq('id', id)
    setRecurring(prev => prev.filter(r => r.id !== id))
  }

  function toggleMonth(key: string) {
    setCollapsedMonths(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const grouped = groupByMonth(expenses)

  return (
    <div style={{ padding: '32px', maxWidth: '700px', paddingBottom: '80px' }}>
      {/* Başlık */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '34px', fontWeight: 800, color: '#000', margin: 0, letterSpacing: '-0.5px' }}>Giderler</h1>
        <button
          onClick={() => tab === 'expenses' ? setShowForm(true) : setShowRecurringForm(true)}
          style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#007AFF', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 300 }}
        >+</button>
      </div>

      {/* Segment Control */}
      <div style={{ backgroundColor: '#E5E5EA', borderRadius: '10px', padding: '2px', display: 'flex', marginBottom: '24px' }}>
        <button
          onClick={() => setTab('expenses')}
          style={{ flex: 1, padding: '8px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: 600, backgroundColor: tab === 'expenses' ? '#fff' : 'transparent', color: '#000', boxShadow: tab === 'expenses' ? '0 1px 3px rgba(0,0,0,0.12)' : 'none', transition: 'all 0.2s' }}
        >Giderler</button>
        <button
          onClick={() => setTab('recurring')}
          style={{ flex: 1, padding: '8px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: 600, backgroundColor: tab === 'recurring' ? '#fff' : 'transparent', color: '#000', boxShadow: tab === 'recurring' ? '0 1px 3px rgba(0,0,0,0.12)' : 'none', transition: 'all 0.2s' }}
        >Tekrarlayan</button>
      </div>

      {loading ? (
        <div style={{ padding: '60px', textAlign: 'center' }}><p style={{ color: '#8E8E93' }}>Yükleniyor...</p></div>
      ) : tab === 'expenses' ? (
        <>
          {grouped.length === 0 ? (
            <div style={{ padding: '60px', textAlign: 'center' }}>
              <p style={{ fontSize: '32px', margin: '0 0 10px' }}>➖</p>
              <p style={{ color: '#8E8E93', fontSize: '15px', margin: 0 }}>Gider kaydı yok</p>
            </div>
          ) : grouped.map(([month, items]) => {
            const monthTotal = items.reduce((s, e) => s + (e.amount ?? 0), 0)
            const isCollapsed = collapsedMonths.has(month)
            return (
              <div key={month} style={{ marginBottom: '16px' }}>
                {/* Ay başlığı */}
                <button
                  onClick={() => toggleMonth(month)}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 4px 8px', border: 'none', background: 'none', cursor: 'pointer' }}
                >
                  <span style={{ fontSize: '15px', fontWeight: 600, color: '#6C6C70' }}>{month.charAt(0).toUpperCase() + month.slice(1)}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '13px', color: '#6C6C70' }}>{items.length} kayıt • {fmtCurrency(monthTotal)}</span>
                    <span style={{ fontSize: '12px', color: '#8E8E93' }}>{isCollapsed ? '▼' : '▲'}</span>
                  </div>
                </button>

                {!isCollapsed && (
                  <div style={{ backgroundColor: '#fff', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
                    {items.map((exp, idx) => {
                      const cat = getCat(exp.category_raw)
                      return (
                        <div key={exp.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', borderBottom: idx < items.length - 1 ? '1px solid #F2F2F7' : 'none' }}>
                          <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: cat.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>
                            {cat.icon}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
<p style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#000' }}>{exp.category_raw}</p>
                            <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#8E8E93' }}>
                              {exp.note && exp.note.trim() ? exp.note : ''}
                            </p>
                          </div>
                          <div style={{ textAlign: 'right', flexShrink: 0 }}>
                            <p style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#FF3B30' }}>{fmtCurrency(exp.amount ?? 0)}</p>
                            <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#8E8E93' }}>{fmtDate(exp.date)}</p>
                          </div>
                          <button onClick={() => deleteExpense(exp.id)} style={{ padding: '4px 8px', borderRadius: '8px', border: '1px solid #FF3B3030', backgroundColor: 'transparent', color: '#FF3B30', cursor: 'pointer', fontSize: '12px', flexShrink: 0 }}>Sil</button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </>
      ) : (
        <>
          {recurring.length === 0 ? (
            <div style={{ padding: '60px', textAlign: 'center' }}>
              <p style={{ fontSize: '32px', margin: '0 0 10px' }}>🔄</p>
              <p style={{ color: '#8E8E93', fontSize: '15px', margin: 0 }}>Tekrarlayan gider yok</p>
            </div>
          ) : (
            <div style={{ backgroundColor: '#fff', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
              {recurring.map((rec, idx) => {
const cat = getCat(rec.category_raw)
                return (
                  <div key={rec.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', borderBottom: idx < recurring.length - 1 ? '1px solid #F2F2F7' : 'none' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: cat.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>
                      {cat.icon}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
<p style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#000' }}>{rec.category_raw}</p>
                      {rec.note && <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#8E8E93' }}>{rec.note}</p>}
                      <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#8E8E93' }}>Başlangıç: {fmtDate(rec.start_date)}</p>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <p style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#FF3B30' }}>{fmtCurrency(rec.amount ?? 0)}/ay</p>
                    </div>
                    <button onClick={() => deleteRecurring(rec.id)} style={{ padding: '4px 8px', borderRadius: '8px', border: '1px solid #FF3B3030', backgroundColor: 'transparent', color: '#FF3B30', cursor: 'pointer', fontSize: '12px', flexShrink: 0 }}>Sil</button>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* Yeni Gider Modal */}
      {showForm && (
        <div onClick={e => { if (e.target === e.currentTarget) setShowForm(false) }} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: '#F2F2F7', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: '700px', maxHeight: '90vh', overflowY: 'auto', padding: '0 0 40px' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #E5E5EA', backgroundColor: '#F2F2F7', position: 'sticky', top: 0, zIndex: 1 }}>
              <button onClick={() => setShowForm(false)} style={{ padding: '8px 16px', borderRadius: '10px', border: 'none', backgroundColor: '#fff', fontSize: '15px', cursor: 'pointer', fontWeight: 500, color: '#007AFF' }}>İptal</button>
              <span style={{ fontSize: '17px', fontWeight: 700 }}>Yeni Gider</span>
              <button onClick={saveExpense} disabled={saving} style={{ padding: '8px 16px', borderRadius: '10px', border: 'none', backgroundColor: '#fff', fontSize: '15px', cursor: 'pointer', fontWeight: 700, color: '#007AFF', opacity: saving ? 0.5 : 1 }}>Kaydet</button>
            </div>

            <div style={{ padding: '20px 16px 0' }}>
              {/* Form içeriği - iOS gibi tek satırlar */}
              <div style={{ backgroundColor: '#fff', borderRadius: '14px', overflow: 'hidden', marginBottom: '20px' }}>
                {/* Tarih */}
                <div style={{ display: 'flex', alignItems: 'center', padding: '14px 16px', borderBottom: '1px solid #F2F2F7' }}>
                  <span style={{ fontSize: '16px', marginRight: '10px' }}>📅</span>
                  <span style={{ fontSize: '15px', color: '#6C6C70', flex: 1 }}>Tarih</span>
                  <input type="date" value={eDate} onChange={e => setEDate(e.target.value)} style={{ border: 'none', fontSize: '15px', color: '#007AFF', outline: 'none', cursor: 'pointer', backgroundColor: 'transparent', fontWeight: 500 }} />
                </div>
                {/* Kategori seçili */}
                <div style={{ display: 'flex', alignItems: 'center', padding: '14px 16px', borderBottom: '1px solid #F2F2F7' }}>
                  <span style={{ fontSize: '16px', marginRight: '10px' }}>🏷️</span>
                  <span style={{ fontSize: '15px', color: '#6C6C70', flex: 1 }}>Kategori</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '14px' }}>{getCat(eCat).icon}</span>
                    <span style={{ fontSize: '15px', color: '#007AFF', fontWeight: 500 }}>{eCat}</span>
                  </div>
                </div>
              </div>

              {/* Kategori Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
                {CATEGORIES.map(cat => (
                  <button
                    key={cat.value}
                    onClick={() => setECat(cat.value)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '8px',
                      padding: '12px 14px', borderRadius: '12px',
                      border: eCat === cat.value ? `2px solid ${cat.color}` : '2px solid transparent',
                      backgroundColor: eCat === cat.value ? cat.bg : '#fff',
                      cursor: 'pointer', textAlign: 'left',
                    }}
                  >
                    <span style={{ fontSize: '18px' }}>{cat.icon}</span>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: eCat === cat.value ? cat.color : '#000' }}>{cat.label}</span>
                  </button>
                ))}
              </div>

              {/* Tutar + Not */}
              <div style={{ backgroundColor: '#fff', borderRadius: '14px', overflow: 'hidden', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', padding: '14px 16px', borderBottom: '1px solid #F2F2F7' }}>
                  <span style={{ fontSize: '16px', marginRight: '10px' }}>₺</span>
                  <span style={{ fontSize: '15px', color: '#6C6C70', flex: 1 }}>Tutar (₺)</span>
                  <input
                    type="number"
                    value={eAmount}
                    onChange={e => setEAmount(e.target.value)}
                    placeholder="0,00"
                    style={{ border: 'none', fontSize: '15px', color: '#000', outline: 'none', backgroundColor: 'transparent', textAlign: 'right', width: '120px' }}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', padding: '14px 16px' }}>
                  <span style={{ fontSize: '16px', marginRight: '10px' }}>☰</span>
                  <span style={{ fontSize: '15px', color: '#6C6C70', flex: 1 }}>Açıklama</span>
                  <input
                    value={eNote}
                    onChange={e => setENote(e.target.value)}
                    placeholder="Opsiyonel"
                    style={{ border: 'none', fontSize: '15px', color: '#000', outline: 'none', backgroundColor: 'transparent', textAlign: 'right', width: '160px' }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Yeni Tekrarlayan Gider Modal */}
      {showRecurringForm && (
        <div onClick={e => { if (e.target === e.currentTarget) setShowRecurringForm(false) }} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: '#F2F2F7', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: '700px', maxHeight: '90vh', overflowY: 'auto', padding: '0 0 40px' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #E5E5EA', backgroundColor: '#F2F2F7', position: 'sticky', top: 0, zIndex: 1 }}>
              <button onClick={() => setShowRecurringForm(false)} style={{ padding: '8px 16px', borderRadius: '10px', border: 'none', backgroundColor: '#fff', fontSize: '15px', cursor: 'pointer', fontWeight: 500, color: '#007AFF' }}>İptal</button>
              <span style={{ fontSize: '17px', fontWeight: 700 }}>Yeni Tekrarlayan Gider</span>
              <button onClick={saveRecurring} disabled={saving} style={{ padding: '8px 16px', borderRadius: '10px', border: 'none', backgroundColor: '#fff', fontSize: '15px', cursor: 'pointer', fontWeight: 700, color: '#007AFF', opacity: saving ? 0.5 : 1 }}>Kaydet</button>
            </div>

            <div style={{ padding: '20px 16px 0' }}>
              {/* Seçili kategori */}
              <div style={{ backgroundColor: '#fff', borderRadius: '14px', overflow: 'hidden', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', padding: '14px 16px' }}>
                  <span style={{ fontSize: '16px', marginRight: '10px' }}>🏷️</span>
                  <span style={{ fontSize: '15px', color: '#6C6C70', flex: 1 }}>Kategori</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '14px' }}>{getCat(rCat).icon}</span>
                    <span style={{ fontSize: '15px', color: '#007AFF', fontWeight: 500 }}>{rCat}</span>
                  </div>
                </div>
              </div>

              {/* Kategori Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
                {CATEGORIES.map(cat => (
                  <button
                    key={cat.value}
                    onClick={() => setRCat(cat.value)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '8px',
                      padding: '12px 14px', borderRadius: '12px',
                      border: rCat === cat.value ? `2px solid ${cat.color}` : '2px solid transparent',
                      backgroundColor: rCat === cat.value ? cat.bg : '#fff',
                      cursor: 'pointer', textAlign: 'left',
                    }}
                  >
                    <span style={{ fontSize: '18px' }}>{cat.icon}</span>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: rCat === cat.value ? cat.color : '#000' }}>{cat.label}</span>
                  </button>
                ))}
              </div>

              {/* Başlangıç + Tutar + Not */}
              <div style={{ backgroundColor: '#fff', borderRadius: '14px', overflow: 'hidden', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', padding: '14px 16px', borderBottom: '1px solid #F2F2F7' }}>
                  <span style={{ fontSize: '16px', marginRight: '10px' }}>📅</span>
                  <span style={{ fontSize: '15px', color: '#6C6C70', flex: 1 }}>Başlangıç Tarihi</span>
                  <input type="date" value={rStart} onChange={e => setRStart(e.target.value)} style={{ border: 'none', fontSize: '15px', color: '#007AFF', outline: 'none', cursor: 'pointer', backgroundColor: 'transparent', fontWeight: 500 }} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', padding: '14px 16px', borderBottom: '1px solid #F2F2F7' }}>
                  <span style={{ fontSize: '16px', marginRight: '10px' }}>₺</span>
                  <span style={{ fontSize: '15px', color: '#6C6C70', flex: 1 }}>Tutar (₺)</span>
                  <input
                    type="number"
                    value={rAmount}
                    onChange={e => setRAmount(e.target.value)}
                    placeholder="0,00"
                    style={{ border: 'none', fontSize: '15px', color: '#000', outline: 'none', backgroundColor: 'transparent', textAlign: 'right', width: '120px' }}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', padding: '14px 16px' }}>
                  <span style={{ fontSize: '16px', marginRight: '10px' }}>☰</span>
                  <span style={{ fontSize: '15px', color: '#6C6C70', flex: 1 }}>Açıklama</span>
                  <input
                    value={rNote}
                    onChange={e => setRNote(e.target.value)}
                    placeholder="Opsiyonel"
                    style={{ border: 'none', fontSize: '15px', color: '#000', outline: 'none', backgroundColor: 'transparent', textAlign: 'right', width: '160px' }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}