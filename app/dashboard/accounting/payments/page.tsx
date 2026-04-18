'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function PaymentsPage() {
  const [invoices, setInvoices] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'unpaid' | 'paid' | 'all'>('unpaid')
  const [marking, setMarking] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: biz } = await supabase.from('businesses').select('id').eq('user_id', user.id).single()
      const { data } = await supabase
        .from('sales_invoices')
        .select('*')
        .eq('business_id', biz?.id)
        .order('service_date', { ascending: false })
      setInvoices(data ?? [])
      setLoading(false)
    }
    load()
  }, [])

  async function markAsPaid(inv: any) {
    setMarking(inv.id)
    const supabase = createClient()
    await supabase.from('sales_invoices').update({
      is_paid: true,
      paid_at: new Date().toISOString(),
      amount_paid: inv.total_amount
    }).eq('id', inv.id)
    setInvoices(prev => prev.map(i => i.id === inv.id
      ? { ...i, is_paid: true, paid_at: new Date().toISOString(), amount_paid: inv.total_amount }
      : i
    ))
    setMarking(null)
  }

  function fmtCurrency(v: number) {
    return v.toLocaleString('tr-TR', { minimumFractionDigits: 2 })
  }

  function fmtDate(s: string) {
    if (!s) return ''
    return new Date(s.length === 10 ? s + 'T12:00:00' : s)
      .toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }

  const today = new Date().toISOString().split('T')[0]

  const unpaidInvoices = invoices.filter(i => !i.is_paid)
  const paidInvoices = invoices.filter(i => i.is_paid)

  const unpaidTotal = unpaidInvoices.reduce((s, i) => s + (i.total_amount ?? 0), 0)
  const paidTotal = paidInvoices.reduce((s, i) => s + (i.total_amount ?? 0), 0)

  const filtered = filter === 'unpaid' ? unpaidInvoices
    : filter === 'paid' ? paidInvoices
    : invoices

  function reminderLevel(inv: any): { text: string, color: string } {
    if (inv.is_paid) return { text: 'Odendi', color: '#34C759' }
    const diff = Math.floor((Date.now() - new Date(inv.service_date).getTime()) / (1000 * 60 * 60 * 24))
    if (diff >= 14) return { text: 'Kritik', color: '#FF3B30' }
    if (diff >= 7) return { text: 'Gecikmiş', color: '#FF3B30' }
    if (diff >= 3) return { text: 'Yaklaşıyor', color: '#FF9500' }
    return { text: 'Bekliyor', color: '#FF9500' }
  }

  const segBg = (active: boolean): React.CSSProperties => ({
    flex: 1, padding: '8px', borderRadius: '8px', border: 'none', cursor: 'pointer',
    fontSize: '13px', fontWeight: 600,
    backgroundColor: active ? '#fff' : 'transparent',
    color: active ? '#000' : '#6C6C70',
    boxShadow: active ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
  })

  return (
    <div style={{ padding: '32px', maxWidth: '900px', paddingBottom: '64px' }}>
      <h1 style={{ fontSize: '32px', fontWeight: 800, color: '#000', margin: '0 0 24px' }}>Odeme Takibi</h1>

      {/* Ozet Kartlari */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
        {[
          { icon: '🕐', label: 'Bekleyen Fatura', value: String(unpaidInvoices.length), color: '#FF9500' },
          { icon: '💳', label: 'Bekleyen Tutar', value: `₺${fmtCurrency(unpaidTotal)}`, color: '#FF3B30' },
          { icon: '✓', label: 'Odenen Fatura', value: String(paidInvoices.length), color: '#34C759' },
          { icon: '₺', label: 'Tahsil Edilen', value: `₺${fmtCurrency(paidTotal)}`, color: '#34C759' },
        ].map((item, idx) => (
          <div key={idx} style={{ backgroundColor: '#fff', borderRadius: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', padding: '16px' }}>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>{item.icon}</div>
            <p style={{ fontSize: '12px', color: '#6C6C70', margin: '0 0 4px' }}>{item.label}</p>
            <p style={{ fontSize: '20px', fontWeight: 700, color: item.color, margin: 0 }}>{item.value}</p>
          </div>
        ))}
      </div>

      {/* Filtre */}
      <div style={{ backgroundColor: '#fff', borderRadius: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', padding: '16px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', backgroundColor: '#F2F2F7', borderRadius: '10px', padding: '2px' }}>
          <button onClick={() => setFilter('unpaid')} style={segBg(filter === 'unpaid')}>Bekleyen</button>
          <button onClick={() => setFilter('paid')} style={segBg(filter === 'paid')}>Odendi</button>
          <button onClick={() => setFilter('all')} style={segBg(filter === 'all')}>Tumu</button>
        </div>
      </div>

      {/* Liste */}
      <div style={{ backgroundColor: '#fff', borderRadius: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '48px', textAlign: 'center' }}>
            <p style={{ color: '#6C6C70' }}>Yukleniyor...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center' }}>
            <p style={{ fontSize: '32px', margin: '0 0 12px' }}>💳</p>
            <p style={{ fontSize: '15px', fontWeight: 600, color: '#6C6C70', margin: 0 }}>
              {filter === 'unpaid' ? 'Bekleyen odeme yok 🎉' : filter === 'paid' ? 'Odenmis fatura yok' : 'Fatura bulunamadi'}
            </p>
          </div>
        ) : filtered.map((inv, idx) => {
          const reminder = reminderLevel(inv)
          return (
            <div key={inv.id} style={{ padding: '16px 20px', borderBottom: idx < filtered.length - 1 ? '1px solid #E5E5EA' : 'none' }}>
              {/* Ust satir */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '10px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: inv.is_paid ? '#34C75920' : '#FF950020', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>
                  {inv.is_paid ? '✓' : '🕐'}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '15px', fontWeight: 600, color: '#000', margin: '0 0 4px' }}>
                    {[inv.pet_name, inv.owner_full_name].filter(Boolean).join(' / ') || 'Isimsiz'}
                  </p>
                  <p style={{ fontSize: '12px', color: '#6C6C70', margin: '0 0 6px' }}>{fmtDate(inv.service_date)}</p>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', backgroundColor: (inv.is_paid ? '#34C759' : '#FF9500') + '20', color: inv.is_paid ? '#34C759' : '#FF9500', fontWeight: 600 }}>
                      {inv.is_paid ? 'Odendi' : 'Bekliyor'}
                    </span>
                    <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', backgroundColor: reminder.color + '20', color: reminder.color, fontWeight: 600 }}>
                      {reminder.text}
                    </span>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: '16px', fontWeight: 700, color: inv.is_paid ? '#34C759' : '#FF9500', margin: '0 0 4px' }}>
                    ₺{fmtCurrency(inv.is_paid ? (inv.amount_paid ?? inv.total_amount ?? 0) : (inv.total_amount ?? 0))}
                  </p>
                  {inv.is_paid && inv.paid_at && (
                    <p style={{ fontSize: '11px', color: '#6C6C70', margin: 0 }}>Odeme: {fmtDate(inv.paid_at)}</p>
                  )}
                </div>
              </div>

              {/* Alt butonlar */}
              <div style={{ display: 'flex', gap: '8px' }}>
                {!inv.is_paid && (
                  <button
                    onClick={() => markAsPaid(inv)}
                    disabled={marking === inv.id}
                    style={{ flex: 1, padding: '10px', borderRadius: '12px', backgroundColor: '#007AFF', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 600, opacity: marking === inv.id ? 0.6 : 1 }}
                  >
                    ✓ Odendi Isaretle
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}