'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

const CAT_ICONS: Record<string, string> = {
  'Mama': '🐾', 'Aksesuar': '🏷️', 'Temizlik': '✨', 'Saglik': '💊', 'Diger': '📦'
}

const CATS = ['Tümü', 'Mama', 'Aksesuar', 'Temizlik', 'Saglik', 'Diger']
const TYPES = ['Tümü', 'Satilabilir', 'Sarf Malzemesi']
const STATUS_OPTS = ['Tümü', 'Kritik', 'Az', 'Normal']

export default function StockPage() {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [businessId, setBusinessId] = useState('')
  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState('Tümü')
  const [filterType, setFilterType] = useState('Tümü')
  const [filterStatus, setFilterStatus] = useState('Tümü')
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: '', category: 'Mama', item_type: 'Satilabilir', unit: 'adet', current_stock: '', min_stock_level: '', purchase_price: '', sale_price: '', notes: '' })

  useEffect(() => { load() }, [])

  async function load() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: biz } = await supabase.from('businesses').select('id').eq('user_id', user.id).single()
    setBusinessId(biz?.id ?? '')
    const { data } = await supabase.from('stock_items').select('*').eq('business_id', biz?.id).eq('is_active', true).order('name')
    setItems(data ?? [])
    setLoading(false)
  }

  function stockStatus(item: any): 'Kritik' | 'Az' | 'Normal' {
    const min = item.min_stock_level ?? 0
    if (min > 0 && item.current_stock <= min) return 'Kritik'
    if (item.current_stock <= 5) return 'Az'
    return 'Normal'
  }

  const filtered = items.filter(i => {
    const matchSearch = !search.trim() || i.name.toLowerCase().includes(search.toLowerCase())
    const matchCat = filterCat === 'Tümü' || (i.category ?? '') === filterCat
    const matchType = filterType === 'Tümü' || (i.item_type ?? '') === filterType
    const st = stockStatus(i)
    const matchStatus = filterStatus === 'Tümü' || st === filterStatus
    return matchSearch && matchCat && matchType && matchStatus
  })

  const criticalItems = items.filter(i => stockStatus(i) === 'Kritik')
  const totalValue = items.reduce((s, i) => s + (i.current_stock ?? 0) * (i.purchase_price ?? 0), 0)

  function openNew() {
    setEditItem(null)
    setForm({ name: '', category: 'Mama', item_type: 'Satilabilir', unit: 'adet', current_stock: '', min_stock_level: '', purchase_price: '', sale_price: '', notes: '' })
    setShowForm(true)
  }

  function openEdit(item: any) {
    setEditItem(item)
    setForm({ name: item.name, category: item.category ?? 'Mama', item_type: item.item_type ?? 'Satilabilir', unit: item.unit ?? 'adet', current_stock: String(item.current_stock ?? 0), min_stock_level: String(item.min_stock_level ?? 0), purchase_price: String(item.purchase_price ?? 0), sale_price: String(item.sale_price ?? 0), notes: item.notes ?? '' })
    setShowForm(true)
  }

  async function handleSave() {
    if (!form.name.trim()) return
    setSaving(true)
    const supabase = createClient()
    const payload = { business_id: businessId, name: form.name.trim(), category: form.category, item_type: form.item_type, unit: form.unit, current_stock: parseFloat(form.current_stock) || 0, min_stock_level: parseFloat(form.min_stock_level) || 0, purchase_price: parseFloat(form.purchase_price) || 0, sale_price: parseFloat(form.sale_price) || 0, notes: form.notes, is_active: true }
    if (editItem) {
      await supabase.from('stock_items').update(payload).eq('id', editItem.id)
    } else {
      await supabase.from('stock_items').insert(payload)
    }
    await load()
    setShowForm(false)
    setSaving(false)
  }

  async function handleDelete(id: string) {
    const supabase = createClient()
    await supabase.from('stock_items').update({ is_active: false }).eq('id', id)
    setItems(prev => prev.filter(i => i.id !== id))
  }

  function fmtCurrency(v: number) { return v.toLocaleString('tr-TR', { minimumFractionDigits: 0 }) }

  const inp: React.CSSProperties = { width: '100%', padding: '10px 14px', backgroundColor: '#F2F2F7', borderRadius: '10px', border: 'none', outline: 'none', fontSize: '15px', boxSizing: 'border-box', color: '#000' }
  const card: React.CSSProperties = { backgroundColor: '#fff', borderRadius: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', marginBottom: '16px', padding: '20px' }
  const statusColor = (s: string) => s === 'Kritik' ? '#FF9500' : s === 'Az' ? '#FF9500' : '#34C759'

  return (
    <div style={{ padding: '32px', maxWidth: '900px', paddingBottom: '64px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 800, color: '#000', margin: 0 }}>Stok Yonetimi</h1>
        <button onClick={openNew} style={{ padding: '10px 20px', borderRadius: '12px', backgroundColor: '#007AFF', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: 600 }}>+ Yeni Urun</button>
      </div>

      {/* Ozet */}
      <div style={card}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0' }}>
          {[
            { label: 'Toplam Urun', value: String(items.length), color: '#000' },
            { label: 'Kritik', value: String(criticalItems.length), color: '#FF9500' },
            { label: 'Az', value: String(items.filter(i => stockStatus(i) === 'Az').length), color: '#FF9500' },
            { label: 'Stok Degeri', value: `₺${fmtCurrency(totalValue)}`, color: '#007AFF' },
          ].map((cell, idx) => (
            <div key={idx} style={{ textAlign: 'center', borderRight: idx < 3 ? '1px solid #E5E5EA' : 'none', padding: '4px' }}>
              <p style={{ fontSize: '20px', fontWeight: 700, color: cell.color, margin: '0 0 4px' }}>{cell.value}</p>
              <p style={{ fontSize: '11px', color: '#6C6C70', margin: 0 }}>{cell.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Kritik Banner */}
      {criticalItems.length > 0 && (
        <div style={{ backgroundColor: '#FF950015', border: '1px solid #FF950040', borderRadius: '14px', padding: '14px 18px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '20px' }}>⚠️</span>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: '14px', fontWeight: 600, color: '#FF9500', margin: '0 0 2px' }}>Kritik Stok Uyarisi</p>
            <p style={{ fontSize: '12px', color: '#6C6C70', margin: 0 }}>{criticalItems.map(i => i.name).join(', ')}</p>
          </div>
          <span style={{ fontSize: '20px', fontWeight: 700, color: '#FF9500' }}>{criticalItems.length}</span>
        </div>
      )}

      {/* Filtreler */}
      <div style={card}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder='Urun ara...' style={{ ...inp, marginBottom: '12px' }} />
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '10px' }}>
          {CATS.map(c => <button key={c} onClick={() => setFilterCat(c)} style={{ padding: '5px 12px', borderRadius: '20px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 500, backgroundColor: filterCat === c ? '#007AFF' : '#F2F2F7', color: filterCat === c ? '#fff' : '#000' }}>{c}</button>)}
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '10px' }}>
          {TYPES.map(t => <button key={t} onClick={() => setFilterType(t)} style={{ padding: '5px 12px', borderRadius: '20px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 500, backgroundColor: filterType === t ? '#34C759' : '#F2F2F7', color: filterType === t ? '#fff' : '#000' }}>{t}</button>)}
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {STATUS_OPTS.map(s => <button key={s} onClick={() => setFilterStatus(s)} style={{ padding: '5px 12px', borderRadius: '20px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 500, backgroundColor: filterStatus === s ? '#FF9500' : '#F2F2F7', color: filterStatus === s ? '#fff' : '#000' }}>{s}</button>)}
        </div>
      </div>

      {/* Yeni/Duzenleme Formu */}
      {showForm && (
        <div style={card}>
          <p style={{ fontSize: '17px', fontWeight: 700, color: '#000', margin: '0 0 16px' }}>{editItem ? 'Urunu Duzenle' : 'Yeni Urun'}</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <p style={{ fontSize: '12px', color: '#6C6C70', margin: '0 0 6px' }}>Urun Adi</p>
              <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder='Urun adi' style={inp} />
            </div>
            <div>
              <p style={{ fontSize: '12px', color: '#6C6C70', margin: '0 0 6px' }}>Kategori</p>
              <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} style={inp}>
                {['Mama', 'Aksesuar', 'Temizlik', 'Saglik', 'Diger'].map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <p style={{ fontSize: '12px', color: '#6C6C70', margin: '0 0 6px' }}>Tur</p>
              <select value={form.item_type} onChange={e => setForm(p => ({ ...p, item_type: e.target.value }))} style={inp}>
                <option>Satilabilir</option>
                <option>Sarf Malzemesi</option>
              </select>
            </div>
            <div>
              <p style={{ fontSize: '12px', color: '#6C6C70', margin: '0 0 6px' }}>Birim</p>
              <select value={form.unit} onChange={e => setForm(p => ({ ...p, unit: e.target.value }))} style={inp}>
                {['adet', 'kg', 'g', 'litre', 'ml', 'paket', 'kutu', 'sise', 'rulo'].map(u => <option key={u}>{u}</option>)}
              </select>
            </div>
            <div>
              <p style={{ fontSize: '12px', color: '#6C6C70', margin: '0 0 6px' }}>Mevcut Stok</p>
              <input type='text' inputMode='decimal' value={form.current_stock} onChange={e => setForm(p => ({ ...p, current_stock: e.target.value }))} placeholder='0' style={inp} />
            </div>
            <div>
              <p style={{ fontSize: '12px', color: '#6C6C70', margin: '0 0 6px' }}>Min Stok Esigi</p>
              <input type='text' inputMode='decimal' value={form.min_stock_level} onChange={e => setForm(p => ({ ...p, min_stock_level: e.target.value }))} placeholder='0' style={inp} />
            </div>
            <div>
              <p style={{ fontSize: '12px', color: '#6C6C70', margin: '0 0 6px' }}>Alis Fiyati (₺)</p>
              <input type='text' inputMode='decimal' value={form.purchase_price} onChange={e => setForm(p => ({ ...p, purchase_price: e.target.value }))} placeholder='0' style={inp} />
            </div>
            <div>
              <p style={{ fontSize: '12px', color: '#6C6C70', margin: '0 0 6px' }}>Satis Fiyati (₺)</p>
              <input type='text' inputMode='decimal' value={form.sale_price} onChange={e => setForm(p => ({ ...p, sale_price: e.target.value }))} placeholder='0' style={inp} />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <p style={{ fontSize: '12px', color: '#6C6C70', margin: '0 0 6px' }}>Notlar</p>
              <input value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder='Not' style={inp} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={() => setShowForm(false)} style={{ flex: 1, padding: '12px', borderRadius: '12px', border: '1px solid #E5E5EA', backgroundColor: '#fff', cursor: 'pointer', fontSize: '14px', color: '#6C6C70' }}>Iptal</button>
            <button onClick={handleSave} disabled={saving || !form.name.trim()} style={{ flex: 1, padding: '12px', borderRadius: '12px', backgroundColor: '#007AFF', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: 600, opacity: saving ? 0.7 : 1 }}>Kaydet</button>
          </div>
        </div>
      )}

      {/* Liste */}
      <div style={{ backgroundColor: '#fff', borderRadius: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
        {loading ? <div style={{ padding: '48px', textAlign: 'center' }}><p style={{ color: '#6C6C70' }}>Yukleniyor...</p></div>
          : filtered.length === 0 ? (
            <div style={{ padding: '48px', textAlign: 'center' }}>
              <p style={{ fontSize: '32px', margin: '0 0 12px' }}>📦</p>
              <p style={{ fontSize: '14px', color: '#6C6C70', margin: 0 }}>Urun bulunamadi</p>
            </div>
          ) : filtered.map((item, idx) => {
            const st = stockStatus(item)
            return (
              <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 20px', borderBottom: idx < filtered.length - 1 ? '1px solid #E5E5EA' : 'none' }}>
                <div style={{ width: '44px', height: '44px', borderRadius: '12px', backgroundColor: '#F2F2F7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>
                  {CAT_ICONS[item.category] ?? '📦'}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                    <p style={{ fontSize: '15px', fontWeight: 600, color: '#000', margin: 0 }}>{item.name}</p>
                    <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '20px', backgroundColor: (item.item_type === 'Satilabilir' ? '#34C759' : '#007AFF') + '20', color: item.item_type === 'Satilabilir' ? '#34C759' : '#007AFF', fontWeight: 600 }}>{item.item_type ?? 'Satilabilir'}</span>
                    <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '20px', backgroundColor: statusColor(st) + '20', color: statusColor(st), fontWeight: 600 }}>{st}</span>
                  </div>
                  <p style={{ fontSize: '12px', color: '#6C6C70', margin: 0 }}>{item.category} • {item.current_stock} {item.unit} • Alis: ₺{fmtCurrency(item.purchase_price ?? 0)}{item.item_type === 'Satilabilir' ? ` • Satis: ₺${fmtCurrency(item.sale_price ?? 0)}` : ''}</p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => openEdit(item)} style={{ padding: '6px 14px', borderRadius: '8px', border: '1px solid #E5E5EA', backgroundColor: '#fff', color: '#007AFF', cursor: 'pointer', fontSize: '12px' }}>Duzenle</button>
                  <button onClick={() => handleDelete(item.id)} style={{ padding: '6px 14px', borderRadius: '8px', border: '1px solid #FF3B3040', backgroundColor: '#fff', color: '#FF3B30', cursor: 'pointer', fontSize: '12px' }}>Sil</button>
                </div>
              </div>
            )
          })}
      </div>
    </div>
  )
}