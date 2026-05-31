'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

const CATEGORIES = ['Tümü', 'Mama', 'Aksesuar', 'Temizlik', 'Saglik', 'Diger']

export default function QuickSalePage() {
  const [items, setItems] = useState<any[]>([])
  const [customers, setCustomers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [businessId, setBusinessId] = useState('')
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('Tümü')
  const [cart, setCart] = useState<{ item: any; qty: number; price: string }[]>([])
  const [customerName, setCustomerName] = useState('')
  const [customerSearch, setCustomerSearch] = useState('')
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false)
  const [discount, setDiscount] = useState('')
  const [notes, setNotes] = useState('')
  const [paymentStatus, setPaymentStatus] = useState<'paid' | 'pending'>('paid')
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: biz } = await supabase.from('businesses').select('id').eq('owner_user_id', user.id).single()
      setBusinessId(biz?.id ?? '')
      const [{ data: stockData }, { data: customerData }] = await Promise.all([
        supabase.from('stock_items').select('*').eq('business_id', biz?.id).eq('is_active', true).gt('current_stock', 0).order('name'),
        supabase.from('customers').select('id, full_name, phone, tckn').eq('business_id', biz?.id).order('full_name')
      ])
      setItems(stockData ?? [])
      setCustomers(customerData ?? [])
      setLoading(false)
    }
    load()
  }, [])

  // Dışarı tıklayınca dropdown kapat
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowCustomerDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const filteredCustomers = customers.filter(c => {
    if (!customerSearch.trim()) return false
    const q = customerSearch.toLowerCase()
    return (c.full_name ?? '').toLowerCase().includes(q) ||
      (c.phone ?? '').includes(q) ||
      (c.tckn ?? '').includes(q)
  })

  const filtered = items.filter(i => {
    const matchSearch = !search.trim() || i.name.toLowerCase().includes(search.toLowerCase())
    const matchCat = category === 'Tümü' || (i.category ?? '') === category
    return matchSearch && matchCat
  })

  function addToCart(item: any) {
    setCart(prev => {
      const idx = prev.findIndex(c => c.item.id === item.id)
      if (idx >= 0) {
        const updated = [...prev]
        if (updated[idx].qty < item.current_stock) updated[idx] = { ...updated[idx], qty: updated[idx].qty + 1 }
        return updated
      }
      return [...prev, { item, qty: 1, price: String(Math.round(item.sale_price ?? 0)) }]
    })
  }

  function updateQty(id: string, delta: number) {
    setCart(prev => prev.map(c => c.item.id === id ? { ...c, qty: Math.max(1, Math.min(c.qty + delta, c.item.current_stock)) } : c).filter(c => c.qty > 0))
  }

  function removeFromCart(id: string) {
    setCart(prev => prev.filter(c => c.item.id !== id))
  }

  function updatePrice(id: string, val: string) {
    setCart(prev => prev.map(c => c.item.id === id ? { ...c, price: val } : c))
  }

  function parseNum(s: string) { return parseFloat(s.replace(',', '.')) || 0 }

  const subTotal = cart.reduce((s, c) => s + c.qty * parseNum(c.price), 0)
  const discountVal = parseNum(discount)
  const grandTotal = Math.max(0, subTotal - discountVal)

  async function completeSale() {
    if (cart.length === 0) { setError('Sepet boş.'); return }
    for (const c of cart) {
      if (parseNum(c.price) <= 0) { setError(`${c.item.name} için geçersiz fiyat.`); return }
    }
    setSaving(true); setError(''); setSuccess('')
    const supabase = createClient()
    const owner = customerName.trim() || 'Hızlı Satış'
    const total = grandTotal
const { error: invErr } = await supabase.from('sales_invoices').insert({
  business_id: businessId,
  owner_full_name: owner,
  pet_name: '',
  total_amount: total,
  is_paid: paymentStatus === 'paid',
  paid_at: paymentStatus === 'paid' ? new Date().toISOString() : null,
  service_date: new Date().toISOString().split('T')[0],
  source_ref: 'quickSale',
  notes: notes.trim(),
})
    if (invErr) { setError(invErr.message); setSaving(false); return }
    for (const c of cart) {
      const newStock = c.item.current_stock - c.qty
      await supabase.from('stock_items').update({ current_stock: newStock }).eq('id', c.item.id)
      setItems(prev => prev.map(i => i.id === c.item.id ? { ...i, current_stock: newStock } : i).filter(i => i.current_stock > 0))
    }
    setCart([]); setCustomerName(''); setCustomerSearch(''); setDiscount(''); setNotes(''); setPaymentStatus('paid')
    setSuccess(`Satış tamamlandı. Toplam: ₺${grandTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`)
    setSaving(false)
  }

  const inp: React.CSSProperties = { width: '100%', padding: '10px 14px', backgroundColor: '#F2F2F7', borderRadius: '10px', border: 'none', outline: 'none', fontSize: '15px', boxSizing: 'border-box', color: '#000' }
  const card: React.CSSProperties = { backgroundColor: '#fff', borderRadius: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', marginBottom: '16px', padding: '20px' }

  return (
    <div style={{ padding: '32px', maxWidth: '900px', paddingBottom: '64px' }}>
      <h1 style={{ fontSize: '34px', fontWeight: 800, color: '#000', margin: '0 0 24px' }}>Hızlı Satış</h1>

      {/* Ürün Seç */}
      <div style={card}>
        <p style={{ fontSize: '17px', fontWeight: 700, color: '#000', margin: '0 0 14px' }}>Ürün Seç</p>
        <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Ürün ara..." style={{ ...inp, flex: 1 }} />
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '14px' }}>
          {CATEGORIES.map(cat => (
            <button key={cat} onClick={() => setCategory(cat)} style={{ padding: '6px 14px', borderRadius: '20px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 500, backgroundColor: category === cat ? '#007AFF' : '#F2F2F7', color: category === cat ? '#fff' : '#000' }}>
              {cat}
            </button>
          ))}
        </div>
        {loading ? (
          <p style={{ color: '#6C6C70', textAlign: 'center', padding: '24px 0' }}>Yükleniyor...</p>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '32px', textAlign: 'center' }}>
            <p style={{ fontSize: '28px', margin: '0 0 8px' }}>📦</p>
            <p style={{ color: '#6C6C70', fontSize: '14px', margin: 0 }}>Ürün bulunamadı</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px' }}>
            {filtered.map(item => (
              <div key={item.id} style={{ backgroundColor: '#F9F9F9', borderRadius: '14px', padding: '14px', border: '1px solid #E5E5EA' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <p style={{ fontSize: '14px', fontWeight: 600, color: '#000', margin: 0, flex: 1, lineHeight: 1.3 }}>{item.name}</p>
                  {item.current_stock <= 5 && <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '20px', backgroundColor: '#FF950020', color: '#FF9500', fontWeight: 600, flexShrink: 0, marginLeft: '6px' }}>Düşük Stok</span>}
                </div>
                <p style={{ fontSize: '12px', color: '#6C6C70', margin: '0 0 4px' }}>Stok: {item.current_stock} {item.unit}</p>
                <p style={{ fontSize: '16px', fontWeight: 700, color: '#000', margin: '0 0 10px' }}>₺{(item.sale_price ?? 0).toLocaleString('tr-TR', { minimumFractionDigits: 0 })}</p>
                <button onClick={() => addToCart(item)} style={{ width: '100%', padding: '8px', borderRadius: '10px', backgroundColor: '#007AFF', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
                  + Sepete Ekle
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Sepet */}
      <div style={card}>
        <p style={{ fontSize: '17px', fontWeight: 700, color: '#000', margin: '0 0 14px' }}>Sepet</p>
        {cart.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <p style={{ fontSize: '28px', margin: '0 0 8px' }}>🛒</p>
            <p style={{ color: '#6C6C70', fontSize: '14px', margin: 0 }}>Sepet boş</p>
          </div>
        ) : cart.map((c, idx) => (
          <div key={c.item.id} style={{ borderBottom: idx < cart.length - 1 ? '1px solid #E5E5EA' : 'none', paddingBottom: '14px', marginBottom: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
              <div>
                <p style={{ fontSize: '15px', fontWeight: 600, color: '#000', margin: '0 0 2px' }}>{c.item.name}</p>
                <p style={{ fontSize: '12px', color: '#6C6C70', margin: 0 }}>Stok: {c.item.current_stock} {c.item.unit}</p>
              </div>
              <button onClick={() => removeFromCart(c.item.id)} style={{ padding: '4px 12px', borderRadius: '8px', border: '1px solid #FF3B3040', backgroundColor: '#fff', color: '#FF3B30', cursor: 'pointer', fontSize: '12px' }}>Sil</button>
            </div>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: '#F2F2F7', borderRadius: '10px', padding: '6px 12px' }}>
                <button onClick={() => updateQty(c.item.id, -1)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', color: '#007AFF', padding: 0, lineHeight: 1 }}>−</button>
                <span style={{ fontSize: '16px', fontWeight: 600, minWidth: '24px', textAlign: 'center' }}>{c.qty}</span>
                <button onClick={() => updateQty(c.item.id, 1)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', color: '#007AFF', padding: 0, lineHeight: 1 }}>+</button>
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '11px', color: '#6C6C70', margin: '0 0 4px' }}>Birim Fiyat (₺)</p>
                <input type="text" inputMode="decimal" value={c.price} onChange={e => updatePrice(c.item.id, e.target.value)} style={{ ...inp, textAlign: 'right' }} />
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: '12px', color: '#6C6C70', margin: '0 0 2px' }}>Toplam</p>
                <p style={{ fontSize: '16px', fontWeight: 700, color: '#000', margin: 0 }}>₺{(c.qty * parseNum(c.price)).toLocaleString('tr-TR', { minimumFractionDigits: 0 })}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Satış Bilgileri */}
      <div style={card}>
        <p style={{ fontSize: '17px', fontWeight: 700, color: '#000', margin: '0 0 14px' }}>Satış Bilgileri</p>

        {/* Müşteri Arama */}
        <div style={{ marginBottom: '12px' }}>
          <p style={{ fontSize: '12px', color: '#6C6C70', margin: '0 0 6px' }}>Müşteri</p>
          <div ref={dropdownRef} style={{ position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#F2F2F7', borderRadius: '10px', padding: '10px 14px' }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#8E8E93" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              <input
                value={customerSearch}
                onChange={e => { setCustomerSearch(e.target.value); setCustomerName(e.target.value); setShowCustomerDropdown(true) }}
                onFocus={() => setShowCustomerDropdown(true)}
                placeholder="Hayvan adı / sahip adı / telefon"
                style={{ flex: 1, background: 'none', border: 'none', outline: 'none', fontSize: '15px', color: '#000' }}
              />
              {customerSearch && (
                <button onClick={() => { setCustomerSearch(''); setCustomerName(''); setShowCustomerDropdown(false) }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#8E8E93', fontSize: '16px', lineHeight: 1 }}>✕</button>
              )}
            </div>

            {/* Dropdown */}
            {showCustomerDropdown && filteredCustomers.length > 0 && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '4px', backgroundColor: '#fff', borderRadius: '12px', boxShadow: '0 4px 16px rgba(0,0,0,0.12)', zIndex: 100, overflow: 'hidden' }}>
                {filteredCustomers.slice(0, 5).map((c, idx) => (
                  <div
                    key={c.id}
                    onClick={() => { setCustomerName(c.full_name ?? ''); setCustomerSearch(c.full_name ?? ''); setShowCustomerDropdown(false) }}
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: idx < Math.min(filteredCustomers.length, 5) - 1 ? '1px solid #F2F2F7' : 'none', cursor: 'pointer' }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#F9F9F9')}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <div>
                      <p style={{ fontSize: '14px', fontWeight: 600, color: '#000', margin: '0 0 2px' }}>{c.full_name}</p>
                      {c.phone && <p style={{ fontSize: '12px', color: '#8E8E93', margin: 0 }}>{c.phone}</p>}
                    </div>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#C7C7CC" strokeWidth="2" strokeLinecap="round"><path d="m9 18 6-6-6-6"/></svg>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div style={{ marginBottom: '12px' }}>
          <p style={{ fontSize: '12px', color: '#6C6C70', margin: '0 0 6px' }}>Genel İndirim (₺)</p>
          <input type="text" inputMode="decimal" value={discount} onChange={e => setDiscount(e.target.value)} placeholder="0" style={inp} />
        </div>
        <div style={{ marginBottom: '12px' }}>
          <p style={{ fontSize: '12px', color: '#6C6C70', margin: '0 0 6px' }}>Ödeme Durumu</p>
          <div style={{ display: 'flex', backgroundColor: '#F2F2F7', borderRadius: '10px', padding: '2px' }}>
            {(['paid', 'pending'] as const).map(s => (
              <button key={s} onClick={() => setPaymentStatus(s)} style={{ flex: 1, padding: '8px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 600, backgroundColor: paymentStatus === s ? '#fff' : 'transparent', color: paymentStatus === s ? '#000' : '#6C6C70', boxShadow: paymentStatus === s ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}>
                {s === 'paid' ? 'Tahsil Edildi' : 'Bekliyor'}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p style={{ fontSize: '12px', color: '#6C6C70', margin: '0 0 6px' }}>Not</p>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Not" rows={3} style={{ ...inp, resize: 'none' }} />
        </div>
      </div>

      {/* Özet */}
      <div style={card}>
        <p style={{ fontSize: '17px', fontWeight: 700, color: '#000', margin: '0 0 14px' }}>Satış Özeti</p>
        {[
          { label: 'Toplam ürün adedi', value: String(cart.reduce((s, c) => s + c.qty, 0)) },
          { label: 'Ara toplam', value: `₺${subTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}` },
          { label: 'İndirim', value: `-₺${discountVal.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`, color: '#FF3B30' },
        ].map((row, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
            <span style={{ fontSize: '14px', color: '#6C6C70' }}>{row.label}</span>
            <span style={{ fontSize: '14px', fontWeight: 600, color: (row as any).color ?? '#000' }}>{row.value}</span>
          </div>
        ))}
        <div style={{ height: '1px', backgroundColor: '#E5E5EA', margin: '10px 0' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '16px', fontWeight: 700, color: '#000' }}>Genel Toplam</span>
          <span style={{ fontSize: '22px', fontWeight: 800, color: '#007AFF' }}>₺{grandTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</span>
        </div>
      </div>

      {error && <div style={{ backgroundColor: '#FFF0F0', color: '#FF3B30', padding: '12px 16px', borderRadius: '12px', marginBottom: '12px', fontSize: '14px' }}>{error}</div>}
      {success && <div style={{ backgroundColor: '#F0FFF4', color: '#34C759', padding: '12px 16px', borderRadius: '12px', marginBottom: '12px', fontSize: '14px' }}>{success}</div>}

      <button onClick={completeSale} disabled={saving || cart.length === 0} style={{ width: '100%', padding: '16px', borderRadius: '16px', backgroundColor: cart.length === 0 ? '#C7C7CC' : '#007AFF', color: '#fff', border: 'none', cursor: cart.length === 0 ? 'not-allowed' : 'pointer', fontSize: '17px', fontWeight: 700, opacity: saving ? 0.7 : 1 }}>
        ✓ {saving ? 'Kaydediliyor...' : 'Satışı Tamamla'}
      </button>
    </div>
  )
}