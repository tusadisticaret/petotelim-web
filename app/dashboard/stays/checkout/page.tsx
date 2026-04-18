'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Stay = {
  id: string
  pet_id: string
  checkin_date: string
  checkout_date: string
  daily_price: number
  notes: string
  status: string
  pets: { name: string; species: string; breed: string }
  customers: { name: string; phone: string } | null
}

type Filter = 'allActive' | 'todayCheckout' | 'overdue'

export default function CheckoutPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [stays, setStays] = useState<Stay[]>([])
  const [filter, setFilter] = useState<Filter>('allActive')
  const [selected, setSelected] = useState<Stay | null>(null)
  const [businessId, setBusinessId] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [washFee, setWashFee] = useState('')
  const [groomFee, setGroomFee] = useState('')
  const [foodFee, setFoodFee] = useState('')
  const [transferFee, setTransferFee] = useState('')
  const [discountMode, setDiscountMode] = useState<'TL' | '%'>('TL')
  const [discountAmount, setDiscountAmount] = useState('')
  const [paymentStatus, setPaymentStatus] = useState<'Odendi' | 'Odenmedi'>('Odendi')
  const [paymentMethod, setPaymentMethod] = useState<'Nakit' | 'Kart' | 'Havale'>('Nakit')

  const today = new Date().toISOString().split('T')[0]

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: biz } = await supabase.from('businesses').select('id').eq('owner_user_id', user.id).single()
      setBusinessId(biz?.id ?? '')
      const { data } = await supabase
        .from('stays')
        .select('*, pets(name, species, breed), customers(name, phone)')
        .eq('business_id', biz?.id)
        .eq('status', 'active')
        .order('checkin_date', { ascending: true })
      setStays((data as any) ?? [])
    }
    load()
  }, [])

  function parsePrice(text: string) {
    return parseFloat(text.replace(',', '.')) || 0
  }

  function calcNights(stay: Stay) {
    const cin = new Date(stay.checkin_date)
    const cout = new Date(stay.checkout_date)
    const diff = Math.round((cout.getTime() - cin.getTime()) / (1000 * 60 * 60 * 24))
    return Math.max(1, diff === 0 ? 1 : diff)
  }

  function fmtDate(d: string) {
    return new Date(d + 'T12:00:00').toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }

  function fmtCurrency(v: number) {
    return v.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  function isOverdue(stay: Stay) {
    return stay.checkout_date < today
  }

  function isTodayCheckout(stay: Stay) {
    return stay.checkout_date === today
  }

  const filtered = stays.filter(s => {
    if (filter === 'todayCheckout') return isTodayCheckout(s)
    if (filter === 'overdue') return isOverdue(s)
    return true
  })

  function calcSubtotal(stay: Stay) {
    const nights = calcNights(stay)
    const stayTotal = nights * stay.daily_price
    return stayTotal + parsePrice(washFee) + parsePrice(groomFee) + parsePrice(foodFee) + parsePrice(transferFee)
  }

  function calcDiscount(subtotal: number) {
    if (discountMode === '%') {
      return subtotal * (Math.min(100, parsePrice(discountAmount)) / 100)
    }
    return Math.min(subtotal, parsePrice(discountAmount))
  }

  function calcTotal(stay: Stay) {
    const sub = calcSubtotal(stay)
    return Math.max(0, sub - calcDiscount(sub))
  }

  async function handleCheckout() {
    if (!selected) return
    setLoading(true)
    setError('')
    const supabase = createClient()
    const total = calcTotal(selected)
    const discount = calcDiscount(calcSubtotal(selected))
    const { error } = await supabase.from('stays').update({
      status: 'completed',
      actual_checkout_date: new Date().toISOString(),
      washing_fee: parsePrice(washFee),
      grooming_fee: parsePrice(groomFee),
      food_fee: parsePrice(foodFee),
      transfer_fee: parsePrice(transferFee),
      discount_tl: discount,
      total_amount: total,
      payment_status: paymentStatus === 'Odendi' ? 'paid' : 'unpaid',
      payment_method: paymentMethod,
    }).eq('id', selected.id)
    if (error) { setError(error.message); setLoading(false); return }
    setSuccess(`Cikis tamamlandi. Toplam: ₺${fmtCurrency(total)}`)
    setSelected(null)
    setStays(prev => prev.filter(s => s.id !== selected.id))
    setLoading(false)
  }

  const cardStyle: React.CSSProperties = { backgroundColor: '#fff', borderRadius: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', marginBottom: '16px', padding: '20px' }
  const sectionTitle: React.CSSProperties = { fontSize: '17px', fontWeight: 600, color: '#000', margin: '0 0 14px' }
  const labelStyle: React.CSSProperties = { fontSize: '13px', color: '#6C6C70' }
  const segBg = (active: boolean) => ({ flex: 1, padding: '8px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 600, backgroundColor: active ? '#fff' : 'transparent', color: active ? '#000' : '#6C6C70', boxShadow: active ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' } as React.CSSProperties)

  function FeeRow({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
        <span style={{ fontSize: '15px', color: '#6C6C70' }}>{label}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <input type='text' inputMode='decimal' value={value} onChange={e => onChange(e.target.value)} placeholder='0' style={{ width: '120px', padding: '6px 10px', backgroundColor: '#F2F2F7', borderRadius: '8px', border: 'none', outline: 'none', fontSize: '15px', textAlign: 'center' }} />
          <span style={{ fontSize: '14px', color: '#6C6C70' }}>₺</span>
        </div>
      </div>
    )
  }

  function AmountRow({ label, value, bold, red, blue }: { label: string; value: number; bold?: boolean; red?: boolean; blue?: boolean }) {
    return (
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
        <span style={{ fontSize: '15px', color: red ? '#FF3B30' : '#6C6C70' }}>{label}</span>
        <span style={{ fontSize: '15px', fontWeight: bold ? 700 : 400, color: red ? '#FF3B30' : blue ? '#007AFF' : '#000', fontVariantNumeric: 'tabular-nums' }}>
          {red ? '-' : ''}₺{fmtCurrency(value)}
        </span>
      </div>
    )
  }

  return (
    <div style={{ padding: '32px', maxWidth: '700px', paddingBottom: '64px' }}>
      <h1 style={{ fontSize: '32px', fontWeight: 800, color: '#000', margin: '0 0 24px' }}>Konaklama Cikisi</h1>

      {/* Aktif Konaklamalar */}
      <div style={cardStyle}>
        <p style={sectionTitle}>Aktif Konaklamalar</p>
        <div style={{ display: 'flex', backgroundColor: '#F2F2F7', borderRadius: '10px', padding: '2px', marginBottom: '16px' }}>
          {(['allActive', 'todayCheckout', 'overdue'] as Filter[]).map(f => (
            <button key={f} onClick={() => setFilter(f)} style={segBg(filter === f)}>
              {f === 'allActive' ? 'Aktif' : f === 'todayCheckout' ? 'Bugun Cikis' : 'Geciken'}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div style={{ padding: '32px', textAlign: 'center' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>🐾</div>
            <p style={{ fontSize: '15px', color: '#6C6C70', margin: 0 }}>
              {filter === 'allActive' ? 'Aktif konaklama yok.' : filter === 'todayCheckout' ? 'Bugun planlı cikisi olan yok.' : 'Geciken cikis yok.'}
            </p>
          </div>
        ) : filtered.map((stay, idx) => (
          <div
            key={stay.id}
            onClick={() => { setSelected(stay); setWashFee(''); setGroomFee(''); setFoodFee(''); setTransferFee(''); setDiscountAmount(''); }}
            style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 4px', borderBottom: idx < filtered.length - 1 ? '1px solid #E5E5EA' : 'none', cursor: 'pointer' }}
          >
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: isOverdue(stay) ? '#FF3B30' : stay.pets?.species === 'cat' ? '#FF9500' : '#007AFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>
              {stay.pets?.species === 'cat' ? '🐱' : '🐶'}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <p style={{ fontSize: '15px', fontWeight: 600, color: '#000', margin: 0 }}>{stay.pets?.name}</p>
                {isOverdue(stay) && <span style={{ fontSize: '11px', backgroundColor: '#FFF0F0', color: '#FF3B30', padding: '2px 8px', borderRadius: '20px', fontWeight: 600 }}>Gecikti</span>}
                {isTodayCheckout(stay) && !isOverdue(stay) && <span style={{ fontSize: '11px', backgroundColor: '#EBF5FF', color: '#007AFF', padding: '2px 8px', borderRadius: '20px', fontWeight: 600 }}>Bugun Cikis</span>}
              </div>
              <p style={{ fontSize: '12px', color: '#6C6C70', margin: '3px 0 0' }}>{stay.customers?.name ?? ''} • Giris: {fmtDate(stay.checkin_date)}</p>
              <p style={{ fontSize: '12px', color: '#6C6C70', margin: '2px 0 0' }}>Planlı Cikis: {fmtDate(stay.checkout_date)}</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              {stay.daily_price > 0 && <p style={{ fontSize: '12px', color: '#6C6C70', margin: 0 }}>₺{fmtCurrency(stay.daily_price)}/gun</p>}
              {selected?.id === stay.id
                ? <span style={{ fontSize: '18px' }}>✅</span>
                : <span style={{ fontSize: '16px', color: '#C7C7CC' }}>›</span>}
            </div>
          </div>
        ))}
      </div>

      {/* Secili Konaklama - Cikis Formu */}
      {selected && (
        <div style={cardStyle}>
          <p style={sectionTitle}>Cikis ve Fatura</p>

          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div>
              <p style={{ fontSize: '16px', fontWeight: 600, color: '#000', margin: 0 }}>{selected.pets?.name}</p>
              <p style={{ fontSize: '13px', color: '#6C6C70', margin: '3px 0 0' }}>{selected.customers?.name ?? ''}</p>
              <p style={{ fontSize: '12px', color: '#6C6C70', margin: '2px 0 0' }}>Giris: {fmtDate(selected.checkin_date)}</p>
              <p style={{ fontSize: '12px', color: '#6C6C70', margin: '2px 0 0' }}>Planlı Cikis: {fmtDate(selected.checkout_date)}</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: '13px', color: '#6C6C70', margin: 0 }}>{calcNights(selected)} gece</p>
              {selected.daily_price > 0 && <p style={{ fontSize: '12px', color: '#6C6C70', margin: '3px 0 0' }}>₺{fmtCurrency(selected.daily_price)}/gun</p>}
            </div>
          </div>

          <div style={{ height: '1px', backgroundColor: '#E5E5EA', marginBottom: '16px' }} />

          {/* Ek Hizmetler */}
          <p style={{ ...labelStyle, marginBottom: '10px' }}>Ek Hizmetler</p>
          <FeeRow label='Yikama' value={washFee} onChange={setWashFee} />
          <FeeRow label='Tiras / Grooming' value={groomFee} onChange={setGroomFee} />
          <FeeRow label='Mama' value={foodFee} onChange={setFoodFee} />
          <FeeRow label='Transfer' value={transferFee} onChange={setTransferFee} />

          <div style={{ height: '1px', backgroundColor: '#E5E5EA', margin: '16px 0' }} />

          {/* Indirim */}
          <p style={{ ...labelStyle, marginBottom: '10px' }}>Indirim</p>
          <div style={{ display: 'flex', backgroundColor: '#F2F2F7', borderRadius: '10px', padding: '2px', marginBottom: '10px' }}>
            {(['TL', '%'] as const).map(m => (
              <button key={m} onClick={() => setDiscountMode(m)} style={segBg(discountMode === m)}>{m}</button>
            ))}
          </div>
          <FeeRow label={discountMode === 'TL' ? 'Indirim Tutari' : 'Indirim Yuzdesi'} value={discountAmount} onChange={setDiscountAmount} />

          <div style={{ height: '1px', backgroundColor: '#E5E5EA', margin: '16px 0' }} />

          {/* Odeme */}
          <p style={{ ...labelStyle, marginBottom: '10px' }}>Odeme</p>
          <div style={{ display: 'flex', backgroundColor: '#F2F2F7', borderRadius: '10px', padding: '2px', marginBottom: '10px' }}>
            {(['Odendi', 'Odenmedi'] as const).map(m => (
              <button key={m} onClick={() => setPaymentStatus(m)} style={segBg(paymentStatus === m)}>{m}</button>
            ))}
          </div>
          <div style={{ display: 'flex', backgroundColor: '#F2F2F7', borderRadius: '10px', padding: '2px', marginBottom: '16px' }}>
            {(['Nakit', 'Kart', 'Havale'] as const).map(m => (
              <button key={m} onClick={() => setPaymentMethod(m)} style={segBg(paymentMethod === m)}>{m}</button>
            ))}
          </div>

          {/* Toplam Onizleme */}
          <div style={{ backgroundColor: 'rgba(120,120,128,0.08)', borderRadius: '12px', padding: '14px 16px', marginBottom: '16px' }}>
            <p style={{ fontSize: '12px', color: '#6C6C70', margin: '0 0 10px' }}>Toplam Onizleme</p>
            <AmountRow label='Konaklama' value={calcNights(selected) * selected.daily_price} />
            <AmountRow label='Ek Hizmetler' value={parsePrice(washFee) + parsePrice(groomFee) + parsePrice(foodFee) + parsePrice(transferFee)} />
            <AmountRow label='Ara Toplam' value={calcSubtotal(selected)} />
            {calcDiscount(calcSubtotal(selected)) > 0 && <AmountRow label='Indirim' value={calcDiscount(calcSubtotal(selected))} red />}
            <div style={{ height: '1px', backgroundColor: '#E5E5EA', margin: '8px 0' }} />
            <AmountRow label='Genel Toplam' value={calcTotal(selected)} bold blue />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
              <span style={{ fontSize: '15px', color: '#6C6C70' }}>Odeme Durumu</span>
              <span style={{ fontSize: '15px', fontWeight: 600, color: paymentStatus === 'Odendi' ? '#34C759' : '#FF9500' }}>{paymentStatus}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
              <span style={{ fontSize: '15px', color: '#6C6C70' }}>Odeme Yontemi</span>
              <span style={{ fontSize: '15px', fontWeight: 600, color: '#000' }}>{paymentMethod}</span>
            </div>
          </div>

          {error && <div style={{ backgroundColor: '#FFF0F0', color: '#FF3B30', fontSize: '13px', padding: '12px 16px', borderRadius: '12px', marginBottom: '12px' }}>{error}</div>}

          <button
            onClick={handleCheckout}
            disabled={loading}
            style={{ width: '100%', backgroundColor: '#007AFF', color: '#fff', padding: '14px', borderRadius: '14px', border: 'none', cursor: 'pointer', fontSize: '17px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', opacity: loading ? 0.6 : 1 }}
          >
            ✓ {loading ? 'Kaydediliyor...' : 'Cikisi Tamamla'}
          </button>
        </div>
      )}

      {success && (
        <div style={{ backgroundColor: '#F0FFF4', color: '#34C759', fontSize: '14px', padding: '14px 16px', borderRadius: '12px', fontWeight: 500 }}>
          {success}
        </div>
      )}
    </div>
  )
}