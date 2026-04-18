'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function SalesPage() {
  const [invoices, setInvoices] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'paid' | 'unpaid'>('all')
  const [selected, setSelected] = useState<any>(null)
  const [marking, setMarking] = useState(false)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: biz } = await supabase.from('businesses').select('id').eq('owner_user_id', user.id).single()
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
    setMarking(true)
    const supabase = createClient()
    await supabase.from('sales_invoices').update({ is_paid: true, paid_at: new Date().toISOString(), amount_paid: inv.total_amount }).eq('id', inv.id)
    setInvoices(prev => prev.map(i => i.id === inv.id ? { ...i, is_paid: true, paid_at: new Date().toISOString() } : i))
    setSelected(null)
    setMarking(false)
  }

  function fmtCurrency(v: number) {
    return v.toLocaleString('tr-TR', { minimumFractionDigits: 2 })
  }

  function fmtDate(s: string) {
    if (!s) return ''
    return new Date(s.length === 10 ? s + 'T12:00:00' : s).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }

  function sourceLabel(ref: string) {
    if (ref?.includes('stay')) return 'Konaklama'
    if (ref?.includes('daycare')) return 'Kres'
    if (ref?.includes('grooming')) return 'Grooming'
    if (ref?.includes('quick')) return 'Hizli Satis'
    return 'Diger'
  }

  const filtered = invoices.filter(i => {
    if (filter === 'paid') return i.is_paid
    if (filter === 'unpaid') return !i.is_paid
    return true
  })

  const segBg = (active: boolean): React.CSSProperties => ({
    flex: 1, padding: '8px', borderRadius: '8px', border: 'none', cursor: 'pointer',
    fontSize: '13px', fontWeight: 600,
    backgroundColor: active ? '#fff' : 'transparent',
    color: active ? '#000' : '#6C6C70',
    boxShadow: active ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
  })

  return (
    <div style={{ padding: '32px', maxWidth: '900px', paddingBottom: '64px' }}>
      <h1 style={{ fontSize: '32px', fontWeight: 800, color: '#000', margin: '0 0 24px' }}>Satislar</h1>

      <div style={{ backgroundColor: '#fff', borderRadius: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', marginBottom: '16px', padding: '20px' }}>
        <div style={{ display: 'flex', backgroundColor: '#F2F2F7', borderRadius: '10px', padding: '2px' }}>
          <button onClick={() => setFilter('all')} style={segBg(filter === 'all')}>Tumu</button>
          <button onClick={() => setFilter('paid')} style={segBg(filter === 'paid')}>Odendi</button>
          <button onClick={() => setFilter('unpaid')} style={segBg(filter === 'unpaid')}>Bekleyen</button>
        </div>
      </div>

      <div style={{ backgroundColor: '#fff', borderRadius: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '48px', textAlign: 'center' }}>
            <p style={{ fontSize: '14px', color: '#6C6C70' }}>Yukleniyor...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center' }}>
            <p style={{ fontSize: '32px', margin: '0 0 12px' }}>📄</p>
            <p style={{ fontSize: '14px', color: '#6C6C70', margin: 0 }}>Kayit yok</p>
          </div>
        ) : filtered.map((inv, idx) => (
          <div key={inv.id}>
            <div onClick={() => setSelected(selected?.id === inv.id ? null : inv)} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 20px', borderBottom: idx < filtered.length - 1 ? '1px solid #E5E5EA' : 'none', cursor: 'pointer' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: inv.is_paid ? '#34C75920' : '#FF950020', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>
                {inv.is_paid ? '✓' : '🕐'}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '15px', fontWeight: 600, color: '#000', margin: 0 }}>{inv.owner_full_name || inv.pet_name || 'Isimsiz'}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '3px' }}>
                  <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', backgroundColor: inv.is_paid ? '#34C75920' : '#FF950020', color: inv.is_paid ? '#34C759' : '#FF9500', fontWeight: 600 }}>{inv.is_paid ? 'Odendi' : 'Bekliyor'}</span>
                  <span style={{ fontSize: '11px', color: '#6C6C70' }}>{sourceLabel(inv.source_ref ?? '')}</span>
                  <span style={{ fontSize: '11px', color: '#6C6C70' }}>{fmtDate(inv.service_date)}</span>
                </div>
              </div>
              <p style={{ fontSize: '15px', fontWeight: 700, color: inv.is_paid ? '#34C759' : '#FF9500', margin: 0 }}>₺{fmtCurrency(inv.total_amount ?? 0)}</p>
            </div>

            {selected?.id === inv.id && (
              <div style={{ padding: '12px 20px 16px', backgroundColor: '#F9F9F9', borderBottom: idx < filtered.length - 1 ? '1px solid #E5E5EA' : 'none' }}>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '11px', color: '#6C6C70', margin: '0 0 2px' }}>Hayvan</p>
                    <p style={{ fontSize: '14px', color: '#000', margin: 0 }}>{inv.pet_name || '-'}</p>
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '11px', color: '#6C6C70', margin: '0 0 2px' }}>Hizmet Tarihi</p>
                    <p style={{ fontSize: '14px', color: '#000', margin: 0 }}>{fmtDate(inv.service_date)}</p>
                  </div>
                  {inv.is_paid && inv.paid_at && (
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: '11px', color: '#6C6C70', margin: '0 0 2px' }}>Odeme Tarihi</p>
                      <p style={{ fontSize: '14px', color: '#000', margin: 0 }}>{fmtDate(inv.paid_at)}</p>
                    </div>
                  )}
                </div>
                {!inv.is_paid && (
                  <button onClick={() => markAsPaid(inv)} disabled={marking} style={{ padding: '10px 20px', borderRadius: '12px', backgroundColor: '#007AFF', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: 600, opacity: marking ? 0.6 : 1 }}>
                    ✓ Odendi Isaretle
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}