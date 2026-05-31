'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

const CAT_COLORS: Record<string, string> = {
  'Mama': '#FF9500', 'Aksesuar': '#FF6B35', 'Temizlik': '#007AFF',
  'Saglik': '#FF3B30', 'Diger': '#8E8E93'
}
const CAT_ICONS: Record<string, string> = {
  'Mama': '🐾', 'Aksesuar': '🏷️', 'Temizlik': '✨', 'Saglik': '💊', 'Diger': '📦'
}
const CATS = ['Tümü', 'Mama', 'Aksesuar', 'Temizlik', 'Saglik', 'Diger']
const TYPES = ['Tümü', 'Satılabilir', 'Sarf Malzemesi']
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
  const [detailItem, setDetailItem] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [detailTab, setDetailTab] = useState<'hareketler' | 'girisler'>('hareketler')
  const [showGirisForm, setShowGirisForm] = useState(false)
  const [showHareketForm, setShowHareketForm] = useState(false)
  const [girisForm, setGirisForm] = useState({ date: new Date().toISOString().split('T')[0], quantity: '', purchase_price: '', supplier_note: '' })
  const [hareketForm, setHareketForm] = useState({ date: new Date().toISOString().split('T')[0], type: 'Satış', quantity: '', sale_price: '', note: '' })
  const [form, setForm] = useState({
    name: '', category: 'Mama', item_type: 'Satılabilir', unit: 'adet',
    current_stock: '', min_stock_level: '', purchase_price: '', sale_price: '', notes: ''
  })

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: biz } = await supabase.from('businesses').select('id').eq('owner_user_id', user.id).single()
    setBusinessId(biz?.id ?? '')
    const { data } = await supabase.from('stock_items').select('*').eq('business_id', biz?.id).order('name')
    setItems(data ?? [])
    setLoading(false)
  }

  function stockStatus(item: any): 'Kritik' | 'Az' | 'Normal' {
    const min = item.min_stock_level ?? 0
    if (min > 0 && item.current_stock <= min) return 'Kritik'
    const lowThreshold = min > 0 ? Math.max(min + 3, min * 1.5) : 5
    if (item.current_stock > min && item.current_stock <= lowThreshold) return 'Az'
    return 'Normal'
  }

  function statusColor(s: string) {
    if (s === 'Kritik') return '#FF9500'
    if (s === 'Az') return '#FFCC00'
    return '#34C759'
  }

  const activeItems = items.filter(i => i.is_active !== false)
  const criticalItems = activeItems.filter(i => stockStatus(i) === 'Kritik')
  const lowItems = activeItems.filter(i => stockStatus(i) === 'Az')
  const totalValue = activeItems.reduce((s, i) => s + (i.current_stock ?? 0) * (i.purchase_price ?? 0), 0)
  const totalPotentialProfit = activeItems.reduce((s, i) => s + (i.current_stock ?? 0) * Math.max(0, (i.sale_price ?? 0) - (i.purchase_price ?? 0)), 0)

  const filtered = activeItems.filter(i => {
    const matchSearch = !search.trim() || i.name.toLowerCase().includes(search.toLowerCase())
    const matchCat = filterCat === 'Tümü' || (i.category ?? '') === filterCat
    const matchType = filterType === 'Tümü' || (i.item_type ?? '') === filterType
    const st = stockStatus(i)
    const matchStatus = filterStatus === 'Tümü' || st === filterStatus
    return matchSearch && matchCat && matchType && matchStatus
  })

  function openNew() {
    setEditItem(null)
    setForm({ name: '', category: 'Mama', item_type: 'Satılabilir', unit: 'adet', current_stock: '', min_stock_level: '', purchase_price: '', sale_price: '', notes: '' })
    setShowForm(true)
  }

  function openEdit(item: any) {
    setDetailItem(null)
    setEditItem(item)
    setForm({
      name: item.name, category: item.category ?? 'Mama',
      item_type: item.item_type ?? 'Satılabilir', unit: item.unit ?? 'adet',
      current_stock: String(item.current_stock ?? 0),
      min_stock_level: String(item.min_stock_level ?? 0),
      purchase_price: String(item.purchase_price ?? 0),
      sale_price: String(item.sale_price ?? 0),
      notes: item.notes ?? ''
    })
    setShowForm(true)
  }

  async function handleSave() {
    if (!form.name.trim()) return
    setSaving(true)
    const supabase = createClient()
    const payload = {
      business_id: businessId, name: form.name.trim(), category: form.category,
      item_type: form.item_type, unit: form.unit,
      current_stock: parseFloat(form.current_stock) || 0,
      min_stock_level: parseFloat(form.min_stock_level) || 0,
      purchase_price: parseFloat(form.purchase_price) || 0,
      sale_price: parseFloat(form.sale_price) || 0,
      notes: form.notes, is_active: true
    }
    if (editItem) {
      await supabase.from('stock_items').update(payload).eq('id', editItem.id)
    } else {
      await supabase.from('stock_items').insert(payload)
    }
    await load()
    setShowForm(false)
    setSaving(false)
  }

  async function handleDelete() {
    const supabase = createClient()
    await supabase.from('stock_items').update({ is_active: false }).eq('id', detailItem.id)
    setShowDeleteConfirm(false)
    setDetailItem(null)
    setItems(prev => prev.map(i => i.id === detailItem.id ? { ...i, is_active: false } : i))
  }

  async function handleGirisSave() {
    if (!girisForm.quantity || parseFloat(girisForm.quantity) <= 0) return
    setSaving(true)
    const supabase = createClient()
    const qty = parseFloat(girisForm.quantity)
    const newStock = (detailItem.current_stock ?? 0) + qty
    await supabase.from('stock_items').update({ current_stock: newStock }).eq('id', detailItem.id)
    // stock_entries tablosuna kaydet
    await supabase.from('stock_entries').insert({
      business_id: businessId,
      item_id: detailItem.id,
      quantity: qty,
      purchase_price: parseFloat(girisForm.purchase_price) || 0,
      supplier_note: girisForm.supplier_note,
      date: girisForm.date
    }).then(() => {})
    setItems(prev => prev.map(i => i.id === detailItem.id ? { ...i, current_stock: newStock } : i))
    setDetailItem({ ...detailItem, current_stock: newStock })
    setShowGirisForm(false)
    setGirisForm({ date: new Date().toISOString().split('T')[0], quantity: '', purchase_price: '', supplier_note: '' })
    setSaving(false)
  }

  async function handleHareketSave() {
    if (!hareketForm.quantity || parseFloat(hareketForm.quantity) <= 0) return
    setSaving(true)
    const supabase = createClient()
    const qty = parseFloat(hareketForm.quantity)
    const newStock = Math.max(0, (detailItem.current_stock ?? 0) - qty)
    await supabase.from('stock_items').update({ current_stock: newStock }).eq('id', detailItem.id)
    setItems(prev => prev.map(i => i.id === detailItem.id ? { ...i, current_stock: newStock } : i))
    setDetailItem({ ...detailItem, current_stock: newStock })
    setShowHareketForm(false)
    setHareketForm({ date: new Date().toISOString().split('T')[0], type: 'Satış', quantity: '', sale_price: '', note: '' })
    setSaving(false)
  }

  function fmtCurrency(v: number) {
    return v.toLocaleString('tr-TR', { minimumFractionDigits: 0 })
  }

  function fmtDate(dateStr: string) {
    const d = new Date(dateStr)
    return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  const card: React.CSSProperties = {
    backgroundColor: '#fff', borderRadius: '16px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)', marginBottom: '16px', padding: '20px'
  }
  const inp: React.CSSProperties = {
    width: '100%', padding: '10px 14px', backgroundColor: '#F2F2F7',
    borderRadius: '10px', border: 'none', outline: 'none',
    fontSize: '15px', boxSizing: 'border-box', color: '#000'
  }

  return (
    <div style={{ padding: '32px', maxWidth: '900px', paddingBottom: '64px' }}>

      {/* Başlık */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '34px', fontWeight: 800, color: '#000', margin: 0 }}>Stok Yönetimi</h1>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={load} style={{ padding: '10px 18px', borderRadius: '20px', backgroundColor: '#F2F2F7', color: '#007AFF', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: 500 }}>↻ Yenile</button>
          <button onClick={openNew} style={{ padding: '10px 20px', borderRadius: '20px', backgroundColor: '#007AFF', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: 600 }}>+ Yeni Ürün</button>
        </div>
      </div>

      {/* Özet Kartı */}
      <div style={card}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)' }}>
          {[
            { label: 'Toplam Ürün', value: String(activeItems.length), color: '#000' },
            { label: 'Kritik', value: String(criticalItems.length), color: '#FF9500' },
            { label: 'Az', value: String(lowItems.length), color: '#FFCC00' },
            { label: 'Stok Değeri', value: `₺${fmtCurrency(totalValue)}`, color: '#007AFF' },
          ].map((cell, idx) => (
            <div key={idx} style={{ textAlign: 'center', borderRight: idx < 3 ? '1px solid #E5E5EA' : 'none', padding: '8px 4px' }}>
              <p style={{ fontSize: '22px', fontWeight: 700, color: cell.color, margin: '0 0 4px' }}>{cell.value}</p>
              <p style={{ fontSize: '12px', color: '#6C6C70', margin: 0 }}>{cell.label}</p>
            </div>
          ))}
        </div>
        <div style={{ borderTop: '1px solid #E5E5EA', marginTop: '14px', paddingTop: '12px', display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '13px', color: '#6C6C70' }}>Tahmini stok kâr potansiyeli</span>
          <span style={{ fontSize: '14px', fontWeight: 600, color: '#34C759' }}>₺{fmtCurrency(totalPotentialProfit)}</span>
        </div>
      </div>

      {/* Kritik Banner */}
      {criticalItems.length > 0 && (
        <div style={{ backgroundColor: '#FF950015', border: '1px solid #FF950040', borderRadius: '14px', padding: '14px 18px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '20px' }}>⚠️</span>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: '14px', fontWeight: 600, color: '#FF9500', margin: '0 0 2px' }}>Kritik Stok Uyarısı</p>
            <p style={{ fontSize: '12px', color: '#6C6C70', margin: 0 }}>{criticalItems.map(i => i.name).join(', ')}</p>
          </div>
          <span style={{ fontSize: '20px', fontWeight: 700, color: '#FF9500' }}>{criticalItems.length}</span>
        </div>
      )}

      {/* Filtreler */}
      <div style={card}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Ürün ara..." style={{ ...inp, marginBottom: '12px' }} />
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
          {CATS.map(c => <button key={c} onClick={() => setFilterCat(c)} style={{ padding: '5px 14px', borderRadius: '20px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 500, backgroundColor: filterCat === c ? '#007AFF' : '#F2F2F7', color: filterCat === c ? '#fff' : '#000' }}>{c}</button>)}
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
          {TYPES.map(t => <button key={t} onClick={() => setFilterType(t)} style={{ padding: '5px 14px', borderRadius: '20px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 500, backgroundColor: filterType === t ? '#34C759' : '#F2F2F7', color: filterType === t ? '#fff' : '#000' }}>{t}</button>)}
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {STATUS_OPTS.map(s => <button key={s} onClick={() => setFilterStatus(s)} style={{ padding: '5px 14px', borderRadius: '20px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 500, backgroundColor: filterStatus === s ? '#FF9500' : '#F2F2F7', color: filterStatus === s ? '#fff' : '#000' }}>{s}</button>)}
        </div>
      </div>

      {/* Ürün Listesi */}
      <div style={{ backgroundColor: '#fff', borderRadius: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '48px', textAlign: 'center' }}><p style={{ color: '#6C6C70' }}>Yükleniyor...</p></div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center' }}>
            <p style={{ fontSize: '32px', margin: '0 0 12px' }}>📦</p>
            <p style={{ fontSize: '14px', color: '#6C6C70', margin: 0 }}>Ürün bulunamadı</p>
          </div>
        ) : filtered.map((item, idx) => {
          const st = stockStatus(item)
          const catColor = CAT_COLORS[item.category] ?? '#8E8E93'
          return (
            <div key={item.id} onClick={() => { setDetailItem(item); setDetailTab('hareketler') }} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 20px', borderBottom: idx < filtered.length - 1 ? '1px solid #E5E5EA' : 'none', cursor: 'pointer' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '12px', backgroundColor: catColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>
                {CAT_ICONS[item.category] ?? '📦'}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                  <p style={{ fontSize: '15px', fontWeight: 600, color: '#000', margin: 0 }}>{item.name}</p>
                  <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', backgroundColor: (item.item_type === 'Satılabilir' ? '#34C759' : '#007AFF') + '20', color: item.item_type === 'Satılabilir' ? '#34C759' : '#007AFF', fontWeight: 600 }}>{item.item_type ?? 'Satılabilir'}</span>
                  <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', backgroundColor: statusColor(st) + '20', color: statusColor(st), fontWeight: 600 }}>{st}</span>
                </div>
                <p style={{ fontSize: '12px', color: '#6C6C70', margin: 0 }}>
                  {item.category} • {item.current_stock} {item.unit} • Alış: ₺{fmtCurrency(item.purchase_price ?? 0)}{item.item_type === 'Satılabilir' ? ` • Satış: ₺${fmtCurrency(item.sale_price ?? 0)}` : ''}
                </p>
              </div>
              <span style={{ color: '#C7C7CC', fontSize: '18px' }}>›</span>
            </div>
          )
        })}
      </div>

      {/* ── Detay Modal ── */}
      {detailItem && !showGirisForm && !showHareketForm && (
        <div onClick={() => setDetailItem(null)} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 1000 }}>
          <div onClick={e => e.stopPropagation()} style={{ backgroundColor: '#F2F2F7', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: '640px', maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}>

            {/* Scrollable içerik */}
            <div style={{ overflowY: 'auto', flex: 1, padding: '12px 16px 8px' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
                <div style={{ width: '40px', height: '4px', backgroundColor: '#C7C7CC', borderRadius: '2px' }} />
              </div>
              <h2 style={{ fontSize: '20px', fontWeight: 700, textAlign: 'center', margin: '0 0 16px' }}>{detailItem.name}</h2>

              {/* Ürün Özeti */}
              <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '16px', marginBottom: '12px' }}>
                <p style={{ fontSize: '15px', fontWeight: 700, margin: '0 0 12px' }}>Ürün Özeti</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)' }}>
                  {[
                    { emoji: detailItem.item_type === 'Satılabilir' ? '🐾' : '📦', label: detailItem.item_type ?? 'Satılabilir', sub: detailItem.category, color: detailItem.item_type === 'Satılabilir' ? '#34C759' : '#007AFF' },
                    { emoji: '📦', label: `${detailItem.current_stock} ${detailItem.unit}`, sub: 'Mevcut Stok', color: '#34C759' },
                    { emoji: stockStatus(detailItem) === 'Normal' ? '✅' : '⚠️', label: stockStatus(detailItem), sub: 'Stok Durumu', color: statusColor(stockStatus(detailItem)) },
                  ].map((cell, i) => (
                    <div key={i} style={{ textAlign: 'center', borderRight: i < 2 ? '1px solid #E5E5EA' : 'none', padding: '6px 8px' }}>
                      <p style={{ fontSize: '24px', margin: '0 0 6px' }}>{cell.emoji}</p>
                      <p style={{ fontSize: '14px', fontWeight: 600, color: cell.color, margin: '0 0 2px' }}>{cell.label}</p>
                      <p style={{ fontSize: '12px', color: '#8E8E93', margin: 0 }}>{cell.sub}</p>
                    </div>
                  ))}
                </div>
                {(detailItem.min_stock_level ?? 0) > 0 && (
                  <div style={{ borderTop: '1px solid #E5E5EA', marginTop: '12px', paddingTop: '10px' }}>
                    <p style={{ fontSize: '13px', color: '#6C6C70', margin: '0 0 2px' }}>Minimum stok: {detailItem.min_stock_level} {detailItem.unit}</p>
                    <p style={{ fontSize: '13px', fontWeight: 500, color: statusColor(stockStatus(detailItem)), margin: 0 }}>Stok seviyesi {stockStatus(detailItem).toLowerCase()}.</p>
                  </div>
                )}
              </div>

              {/* Fiyat / Kârlılık */}
              <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '16px', marginBottom: '12px' }}>
                <p style={{ fontSize: '15px', fontWeight: 700, margin: '0 0 4px' }}>Fiyat / Kârlılık</p>
                {[
                  { label: 'Alış fiyatı', value: `₺${fmtCurrency(detailItem.purchase_price ?? 0)}`, color: '#000' },
                  { label: 'Satış fiyatı', value: `₺${fmtCurrency(detailItem.sale_price ?? 0)}`, color: '#000' },
                  { label: 'Birim kâr', value: `₺${fmtCurrency(Math.max(0, (detailItem.sale_price ?? 0) - (detailItem.purchase_price ?? 0)))}`, color: '#34C759' },
                  { label: 'Stok değeri', value: `₺${fmtCurrency((detailItem.current_stock ?? 0) * (detailItem.purchase_price ?? 0))}`, color: '#000' },
                  { label: 'Tahmini stok kâr potansiyeli', value: `₺${fmtCurrency((detailItem.current_stock ?? 0) * Math.max(0, (detailItem.sale_price ?? 0) - (detailItem.purchase_price ?? 0)))}`, color: '#34C759' },
                  { label: 'Toplam satılan miktar', value: '0 adet', color: '#000' },
                  { label: 'Toplam satış cirosu', value: '₺0', color: '#007AFF' },
                ].map((row, i, arr) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: i < arr.length - 1 ? '1px solid #F2F2F7' : 'none' }}>
                    <span style={{ fontSize: '14px', color: '#8E8E93' }}>{row.label}</span>
                    <span style={{ fontSize: '14px', fontWeight: 600, color: row.color }}>{row.value}</span>
                  </div>
                ))}
              </div>

              {/* Hareketler / Girişler Tab */}
              <div style={{ backgroundColor: '#E5E5EA', borderRadius: '10px', padding: '2px', display: 'flex', marginBottom: '12px' }}>
                <button onClick={() => setDetailTab('hareketler')} style={{ flex: 1, padding: '8px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: 600, backgroundColor: detailTab === 'hareketler' ? '#fff' : 'transparent', color: '#000' }}>
                  Hareketler (0)
                </button>
                <button onClick={() => setDetailTab('girisler')} style={{ flex: 1, padding: '8px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: 600, backgroundColor: detailTab === 'girisler' ? '#fff' : 'transparent', color: '#000' }}>
                  Girişler (0)
                </button>
              </div>

              {/* Tab İçeriği */}
              <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '16px', marginBottom: '8px', minHeight: '100px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <p style={{ fontSize: '15px', fontWeight: 700, margin: '0 0 24px', alignSelf: 'flex-start' }}>
                  {detailTab === 'hareketler' ? 'Stok Hareketleri' : 'Stok Girişleri'}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '16px 0' }}>
                  <span style={{ fontSize: '36px', color: '#C7C7CC' }}>{detailTab === 'hareketler' ? '⇄' : '📥'}</span>
                  <p style={{ fontSize: '14px', color: '#8E8E93', margin: 0 }}>
                    {detailTab === 'hareketler' ? 'Henüz hareket kaydı yok' : 'Henüz giriş kaydı yok'}
                  </p>
                </div>
              </div>
            </div>

            {/* Alt Butonlar — sabit */}
            <div style={{ borderTop: '1px solid #E5E5EA', display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', backgroundColor: '#fff', borderRadius: '0 0 0 0', flexShrink: 0 }}>
              {[
                { emoji: '⊕', label: 'Giriş', color: '#007AFF', onClick: () => { setGirisForm({ date: new Date().toISOString().split('T')[0], quantity: '', purchase_price: String(detailItem.purchase_price ?? ''), supplier_note: '' }); setShowGirisForm(true) } },
                { emoji: '⇄', label: 'Hareket', color: '#007AFF', onClick: () => { setHareketForm({ date: new Date().toISOString().split('T')[0], type: 'Satış', quantity: '', sale_price: String(detailItem.sale_price ?? ''), note: '' }); setShowHareketForm(true) } },
                { emoji: '✏️', label: 'Düzenle', color: '#007AFF', onClick: () => openEdit(detailItem) },
                { emoji: '🗑', label: 'Sil', color: '#FF3B30', onClick: () => setShowDeleteConfirm(true) },
                { emoji: '✕', label: 'Kapat', color: '#8E8E93', onClick: () => setDetailItem(null) },
              ].map((btn, i) => (
                <button key={i} onClick={btn.onClick} style={{ padding: '12px 4px 16px', border: 'none', borderRight: i < 4 ? '1px solid #E5E5EA' : 'none', backgroundColor: '#fff', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                  <span style={{ fontSize: '20px' }}>{btn.emoji}</span>
                  <span style={{ fontSize: '11px', fontWeight: 500, color: btn.color }}>{btn.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Silme Onayı ── */}
      {showDeleteConfirm && detailItem && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }}>
          <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '24px', maxWidth: '300px', width: '90%', textAlign: 'center' }}>
            <p style={{ fontSize: '16px', fontWeight: 600, margin: '0 0 20px' }}>Ürünü silmek istediğinize emin misiniz?</p>
            <button onClick={handleDelete} style={{ width: '100%', padding: '14px', borderRadius: '12px', border: 'none', backgroundColor: '#F2F2F7', color: '#FF3B30', fontSize: '16px', fontWeight: 600, cursor: 'pointer', marginBottom: '8px' }}>
              Sil
            </button>
            <button onClick={() => setShowDeleteConfirm(false)} style={{ width: '100%', padding: '14px', borderRadius: '12px', border: 'none', backgroundColor: '#F2F2F7', color: '#007AFF', fontSize: '16px', cursor: 'pointer' }}>
              İptal
            </button>
          </div>
        </div>
      )}

      {/* ── Stok Girişi Formu ── */}
      {showGirisForm && detailItem && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 1100 }}>
          <div style={{ backgroundColor: '#F2F2F7', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: '640px', maxHeight: '90vh', overflowY: 'auto', padding: '0' }}>
            {/* Başlık bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', backgroundColor: '#F2F2F7' }}>
              <button onClick={() => setShowGirisForm(false)} style={{ padding: '8px 16px', borderRadius: '20px', border: 'none', backgroundColor: '#E5E5EA', fontSize: '15px', cursor: 'pointer' }}>İptal</button>
              <span style={{ fontSize: '17px', fontWeight: 600 }}>Stok Girişi</span>
              <button onClick={handleGirisSave} disabled={saving} style={{ padding: '8px 16px', borderRadius: '20px', border: 'none', backgroundColor: '#E5E5EA', fontSize: '15px', fontWeight: 600, cursor: 'pointer' }}>Kaydet</button>
            </div>

            <div style={{ padding: '0 16px 32px' }}>
              <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '16px', marginBottom: '12px' }}>
                <p style={{ fontSize: '17px', fontWeight: 700, margin: '0 0 8px' }}>Stok Girişi</p>
                <p style={{ fontSize: '13px', color: '#8E8E93', margin: '0 0 2px' }}>Ürün</p>
                <p style={{ fontSize: '15px', fontWeight: 600, margin: '0 0 16px' }}>{detailItem.name}</p>

                <p style={{ fontSize: '13px', color: '#8E8E93', margin: '0 0 6px' }}>Tarih</p>
                <input type="date" value={girisForm.date} onChange={e => setGirisForm(p => ({ ...p, date: e.target.value }))} style={{ ...inp, marginBottom: '16px', backgroundColor: '#F2F2F7', borderRadius: '10px' }} />

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                  <div>
                    <p style={{ fontSize: '13px', color: '#8E8E93', margin: '0 0 6px' }}>Miktar ({detailItem.unit})</p>
                    <input type="text" inputMode="decimal" value={girisForm.quantity} onChange={e => setGirisForm(p => ({ ...p, quantity: e.target.value }))} placeholder="0" style={{ ...inp, textAlign: 'center' }} />
                  </div>
                  <div>
                    <p style={{ fontSize: '13px', color: '#8E8E93', margin: '0 0 6px' }}>Birim Alış Fiyatı (₺)</p>
                    <input type="text" inputMode="decimal" value={girisForm.purchase_price} onChange={e => setGirisForm(p => ({ ...p, purchase_price: e.target.value }))} placeholder="0" style={{ ...inp, textAlign: 'center' }} />
                  </div>
                </div>

                <p style={{ fontSize: '13px', color: '#8E8E93', margin: '0 0 6px' }}>Tedarikçi / Fatura Notu</p>
                <input value={girisForm.supplier_note} onChange={e => setGirisForm(p => ({ ...p, supplier_note: e.target.value }))} placeholder="Örn: Petshop ABC, Fatura No: 123" style={{ ...inp, marginBottom: '16px' }} />
              </div>

              {/* Stok Önizleme */}
              <div style={{ backgroundColor: '#F2F2F7', borderRadius: '12px', padding: '14px 16px' }}>
                <p style={{ fontSize: '13px', color: '#8E8E93', margin: '0 0 6px' }}>Stok Önizleme</p>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '15px', color: '#8E8E93' }}>Mevcut Stok</span>
                  <span style={{ fontSize: '15px', fontWeight: 700 }}>{detailItem.current_stock} {detailItem.unit}</span>
                </div>
                {girisForm.quantity && parseFloat(girisForm.quantity) > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                    <span style={{ fontSize: '15px', color: '#8E8E93' }}>Girişten sonra</span>
                    <span style={{ fontSize: '15px', fontWeight: 700, color: '#34C759' }}>{(detailItem.current_stock ?? 0) + parseFloat(girisForm.quantity)} {detailItem.unit}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Stok Hareketi Formu ── */}
      {showHareketForm && detailItem && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 1100 }}>
          <div style={{ backgroundColor: '#F2F2F7', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: '640px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', backgroundColor: '#F2F2F7' }}>
              <button onClick={() => setShowHareketForm(false)} style={{ padding: '8px 16px', borderRadius: '20px', border: 'none', backgroundColor: '#E5E5EA', fontSize: '15px', cursor: 'pointer' }}>İptal</button>
              <span style={{ fontSize: '17px', fontWeight: 600 }}>Stok Hareketi</span>
              <button onClick={handleHareketSave} disabled={saving} style={{ padding: '8px 16px', borderRadius: '20px', border: 'none', backgroundColor: '#E5E5EA', fontSize: '15px', fontWeight: 600, cursor: 'pointer' }}>Kaydet</button>
            </div>

            <div style={{ padding: '0 16px 32px' }}>
              <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '16px', marginBottom: '12px' }}>
                <p style={{ fontSize: '17px', fontWeight: 700, margin: '0 0 8px' }}>Stok Hareketi</p>
                <p style={{ fontSize: '13px', color: '#8E8E93', margin: '0 0 2px' }}>Ürün</p>
                <p style={{ fontSize: '15px', fontWeight: 600, margin: '0 0 16px' }}>{detailItem.name}</p>

                <p style={{ fontSize: '13px', color: '#8E8E93', margin: '0 0 6px' }}>Tarih</p>
                <input type="date" value={hareketForm.date} onChange={e => setHareketForm(p => ({ ...p, date: e.target.value }))} style={{ ...inp, marginBottom: '16px' }} />

                <p style={{ fontSize: '13px', color: '#8E8E93', margin: '0 0 6px' }}>Kayıt Türü</p>
                <div style={{ backgroundColor: '#E5E5EA', borderRadius: '10px', padding: '2px', display: 'flex', marginBottom: '16px' }}>
                  {['Satış', 'Düzeltme'].map(t => (
                    <button key={t} onClick={() => setHareketForm(p => ({ ...p, type: t }))} style={{ flex: 1, padding: '8px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: 600, backgroundColor: hareketForm.type === t ? '#fff' : 'transparent', color: '#000' }}>{t}</button>
                  ))}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                  <div>
                    <p style={{ fontSize: '13px', color: '#8E8E93', margin: '0 0 6px' }}>Miktar ({detailItem.unit})</p>
                    <input type="text" inputMode="decimal" value={hareketForm.quantity} onChange={e => setHareketForm(p => ({ ...p, quantity: e.target.value }))} placeholder="0" style={{ ...inp, textAlign: 'center' }} />
                  </div>
                  <div>
                    <p style={{ fontSize: '13px', color: '#8E8E93', margin: '0 0 6px' }}>Satış Fiyatı (₺)</p>
                    <input type="text" inputMode="decimal" value={hareketForm.sale_price} onChange={e => setHareketForm(p => ({ ...p, sale_price: e.target.value }))} placeholder="0" style={{ ...inp, textAlign: 'center' }} />
                  </div>
                </div>

                <p style={{ fontSize: '13px', color: '#8E8E93', margin: '0 0 6px' }}>Not</p>
                <input value={hareketForm.note} onChange={e => setHareketForm(p => ({ ...p, note: e.target.value }))} placeholder="Açıklama..." style={inp} />
              </div>

              {/* Stok Önizleme */}
              <div style={{ backgroundColor: '#F2F2F7', borderRadius: '12px', padding: '14px 16px' }}>
                <p style={{ fontSize: '13px', color: '#8E8E93', margin: '0 0 6px' }}>Stok Önizleme</p>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '15px', color: '#8E8E93' }}>Mevcut Stok</span>
                  <span style={{ fontSize: '15px', fontWeight: 700 }}>{detailItem.current_stock} {detailItem.unit}</span>
                </div>
                {hareketForm.quantity && parseFloat(hareketForm.quantity) > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                    <span style={{ fontSize: '15px', color: '#8E8E93' }}>İşlemden sonra</span>
                    <span style={{ fontSize: '15px', fontWeight: 700, color: '#FF9500' }}>{Math.max(0, (detailItem.current_stock ?? 0) - parseFloat(hareketForm.quantity))} {detailItem.unit}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Ürün Form Modal ── */}
      {showForm && (
        <div onClick={() => setShowForm(false)} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 1000 }}>
          <div onClick={e => e.stopPropagation()} style={{ backgroundColor: '#F2F2F7', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: '640px', maxHeight: '90vh', overflowY: 'auto', padding: '24px' }}>
            <div style={{ width: '40px', height: '4px', backgroundColor: '#C7C7CC', borderRadius: '2px', margin: '0 auto 20px' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '22px', fontWeight: 700, margin: 0 }}>{editItem ? 'Ürünü Düzenle' : 'Yeni Ürün'}</h2>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => setShowForm(false)} style={{ padding: '8px 18px', borderRadius: '20px', border: 'none', backgroundColor: '#E5E5EA', fontSize: '14px', cursor: 'pointer' }}>İptal</button>
                <button onClick={handleSave} disabled={saving} style={{ padding: '8px 18px', borderRadius: '20px', border: 'none', backgroundColor: '#007AFF', color: '#fff', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>{saving ? 'Kaydediliyor...' : 'Kaydet'}</button>
              </div>
            </div>
            <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '16px', marginBottom: '12px' }}>
              <p style={{ fontSize: '13px', color: '#8E8E93', margin: '0 0 6px' }}>Ürün Adı</p>
              <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Ürün adı" style={inp} />
            </div>
            <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '16px', marginBottom: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {[
                  { label: 'Kategori', key: 'category', opts: ['Mama', 'Aksesuar', 'Temizlik', 'Saglik', 'Diger'] },
                  { label: 'Tür', key: 'item_type', opts: ['Satılabilir', 'Sarf Malzemesi'] },
                  { label: 'Birim', key: 'unit', opts: ['adet', 'kg', 'g', 'litre', 'ml', 'paket', 'kutu', 'şişe', 'rulo'] },
                ].map(f => (
                  <div key={f.key}>
                    <p style={{ fontSize: '13px', color: '#8E8E93', margin: '0 0 6px' }}>{f.label}</p>
                    <select value={(form as any)[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} style={inp}>
                      {f.opts.map(o => <option key={o}>{o}</option>)}
                    </select>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '16px', marginBottom: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {[
                  { label: 'Alış Fiyatı (₺)', key: 'purchase_price' },
                  { label: 'Satış Fiyatı (₺)', key: 'sale_price' },
                  { label: 'Mevcut Stok', key: 'current_stock' },
                  { label: 'Min Stok Eşiği', key: 'min_stock_level' },
                ].map(f => (
                  <div key={f.key}>
                    <p style={{ fontSize: '13px', color: '#8E8E93', margin: '0 0 6px' }}>{f.label}</p>
                    <input type="text" inputMode="decimal" value={(form as any)[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} placeholder="0" style={inp} />
                  </div>
                ))}
              </div>
            </div>
            <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '16px' }}>
              <p style={{ fontSize: '13px', color: '#8E8E93', margin: '0 0 6px' }}>Notlar</p>
              <input value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Not..." style={inp} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}