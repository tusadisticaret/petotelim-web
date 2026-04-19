'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function AccountingPage() {
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: biz } = await supabase.from('businesses').select('id').eq('owner_user_id', user.id).single()
    const bid = biz?.id
    if (!bid) return

    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
    const today = now.toISOString().split('T')[0]

    const [
      { data: invoices },
      { data: groomings },
      { data: daycarePeriods },
      { data: activeStays },
    ] = await Promise.all([
      supabase.from('sales_invoices').select('*').eq('business_id', bid).order('created_at', { ascending: false }),
      supabase.from('grooming_entries').select('fee, service_date, pet_name, owner_name, kind').eq('business_id', bid).gte('service_date', monthStart),
      supabase.from('daycare_periods').select('net_total, period_start, period_end').eq('business_id', bid).gte('period_start', monthStart),
      supabase.from('stays').select('id, daily_price, check_in_date, actual_check_out_date, washing_fee, grooming_fee, food_fee, transfer_fee, discount_tl, pets(name, customers(full_name))').eq('business_id', bid).eq('is_reservation', false),
    ])

    // Bu ay tamamlanan konaklamalar
    const completedStays = (activeStays ?? []).filter((s: any) => s.actual_check_out_date && s.actual_check_out_date >= monthStart)
    const stayIncome = completedStays.reduce((sum: number, s: any) => {
      const nights = Math.max(1, Math.ceil((new Date(s.actual_check_out_date).getTime() - new Date(s.check_in_date).getTime()) / 86400000))
      const lodging = nights * (s.daily_price ?? 0)
      const extras = (s.washing_fee ?? 0) + (s.grooming_fee ?? 0) + (s.food_fee ?? 0) + (s.transfer_fee ?? 0)
      const discount = s.discount_tl ?? 0
      return sum + Math.max(0, lodging + extras - discount)
    }, 0)

    const groomingIncome = (groomings ?? []).reduce((sum: number, g: any) => sum + (g.fee ?? 0), 0)
    const daycareIncome = (daycarePeriods ?? []).reduce((sum: number, d: any) => sum + (d.net_total ?? 0), 0)
    const invoiceIncome = (invoices ?? []).filter((i: any) => i.created_at >= monthStart).reduce((sum: number, i: any) => sum + parseFloat(i.total ?? 0), 0)

    const monthIncome = stayIncome + groomingIncome + daycareIncome

    // Bugün
    const todayStays = completedStays.filter((s: any) => s.actual_check_out_date?.split('T')[0] === today)
    const todayGroomings = (groomings ?? []).filter((g: any) => g.service_date?.split('T')[0] === today || g.service_date?.startsWith(today))
    const todayIncome = todayStays.reduce((sum: number, s: any) => {
      const nights = Math.max(1, Math.ceil((new Date(s.actual_check_out_date).getTime() - new Date(s.check_in_date).getTime()) / 86400000))
      return sum + nights * (s.daily_price ?? 0)
    }, 0) + todayGroomings.reduce((sum: number, g: any) => sum + (g.fee ?? 0), 0)

    // Aktif konaklamalar
    const currentActiveStays = (activeStays ?? []).filter((s: any) => !s.actual_check_out_date)

    // Son işlemler
    const recentGroomings = (groomings ?? []).slice(0, 5).map((g: any) => ({
      name: g.pet_name || g.owner_name || 'Isimsiz',
      type: g.kind === 0 ? 'Yikama' : 'Tiras',
      amount: g.fee ?? 0,
      date: g.service_date,
      color: '#AF52DE'
    }))

    const recentCompletedStays = completedStays.slice(0, 5).map((s: any) => {
      const nights = Math.max(1, Math.ceil((new Date(s.actual_check_out_date).getTime() - new Date(s.check_in_date).getTime()) / 86400000))
      const total = nights * (s.daily_price ?? 0)
      return {
        name: s.pets?.name || 'Isimsiz',
        type: 'Konaklama',
        amount: total,
        date: s.actual_check_out_date,
        color: '#007AFF'
      }
    })

    const recent = [...recentGroomings, ...recentCompletedStays]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 8)

    setStats({ monthIncome, todayIncome, stayIncome, groomingIncome, daycareIncome, currentActiveStays: currentActiveStays.length, recent, groomingCount: (groomings ?? []).length })
    setLoading(false)
  }

  function fmt(v: number) {
    return v.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  function fmtDate(s: string) {
    if (!s) return '?'
    return new Date(s).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }

  const card: React.CSSProperties = { backgroundColor: '#fff', borderRadius: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', marginBottom: '16px' }

  const navItems = [
    { href: '/dashboard/accounting/sales', label: 'Satislar', icon: '📄', desc: 'Fatura listesi', color: '#007AFF' },
    { href: '/dashboard/accounting/expenses', label: 'Giderler', icon: '➖', desc: 'Gider kayitlari', color: '#FF3B30' },
    { href: '/dashboard/accounting/payments', label: 'Musteriler', icon: '👥', desc: 'Odeme takibi', color: '#FF9500' },
  ]

  if (loading) return <div style={{ padding: '32px' }}><p style={{ color: '#6C6C70' }}>Yukleniyor...</p></div>

  return (
    <div style={{ padding: '32px', maxWidth: '900px', paddingBottom: '64px' }}>
      <h1 style={{ fontSize: '32px', fontWeight: 800, margin: '0 0 24px' }}>Muhasebe</h1>

      {/* Kisayollar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '24px' }}>
        {navItems.map(item => (
          <Link key={item.href} href={item.href} style={{ textDecoration: 'none' }}>
            <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '12px', backgroundColor: item.color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>{item.icon}</div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '14px', fontWeight: 600, color: '#000', margin: 0 }}>{item.label}</p>
                <p style={{ fontSize: '12px', color: '#6C6C70', margin: '2px 0 0' }}>{item.desc}</p>
              </div>
              <span style={{ color: '#C7C7CC' }}>›</span>
            </div>
          </Link>
        ))}
      </div>

      {/* Bugun */}
      <div style={{ ...card, padding: '20px' }}>
        <p style={{ fontSize: '17px', fontWeight: 600, margin: '0 0 14px' }}>Bugun</p>
        <div style={{ display: 'flex' }}>
          {[
            { label: 'Tahsilat', value: `₺${fmt(stats.todayIncome)}`, color: '#34C759' },
            { label: 'Aktif Konaklama', value: String(stats.currentActiveStays), color: '#007AFF' },
            { label: 'Grooming', value: String(stats.groomingCount), color: '#AF52DE' },
          ].map((item, idx) => (
            <div key={idx} style={{ flex: 1, borderRight: idx < 2 ? '1px solid #E5E5EA' : 'none', paddingRight: idx < 2 ? '16px' : 0, paddingLeft: idx > 0 ? '16px' : 0 }}>
              <p style={{ fontSize: '12px', color: '#6C6C70', margin: '0 0 4px' }}>{item.label}</p>
              <p style={{ fontSize: '18px', fontWeight: 700, color: item.color, margin: 0 }}>{item.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Bu Ay */}
      <div style={{ ...card, padding: '20px' }}>
        <p style={{ fontSize: '17px', fontWeight: 600, margin: '0 0 14px' }}>Bu Ay Gelir</p>
        <div style={{ display: 'flex', marginBottom: '16px' }}>
          <div style={{ flex: 1, borderRight: '1px solid #E5E5EA', paddingRight: '16px' }}>
            <p style={{ fontSize: '12px', color: '#6C6C70', margin: '0 0 4px' }}>Toplam</p>
            <p style={{ fontSize: '22px', fontWeight: 700, color: '#34C759', margin: 0 }}>₺{fmt(stats.monthIncome)}</p>
          </div>
          <div style={{ flex: 1, paddingLeft: '16px' }}>
            <p style={{ fontSize: '12px', color: '#6C6C70', margin: '0 0 4px' }}>Konaklama</p>
            <p style={{ fontSize: '18px', fontWeight: 700, color: '#007AFF', margin: 0 }}>₺{fmt(stats.stayIncome)}</p>
          </div>
        </div>
        <div style={{ display: 'flex' }}>
          <div style={{ flex: 1, borderRight: '1px solid #E5E5EA', paddingRight: '16px' }}>
            <p style={{ fontSize: '12px', color: '#6C6C70', margin: '0 0 4px' }}>Grooming</p>
            <p style={{ fontSize: '18px', fontWeight: 700, color: '#AF52DE', margin: 0 }}>₺{fmt(stats.groomingIncome)}</p>
          </div>
          <div style={{ flex: 1, paddingLeft: '16px' }}>
            <p style={{ fontSize: '12px', color: '#6C6C70', margin: '0 0 4px' }}>Kres</p>
            <p style={{ fontSize: '18px', fontWeight: 700, color: '#34C759', margin: 0 }}>₺{fmt(stats.daycareIncome)}</p>
          </div>
        </div>
      </div>

      {/* Son Islemler */}
      <div style={{ ...card, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #E5E5EA' }}>
          <p style={{ fontSize: '17px', fontWeight: 600, margin: 0 }}>Son Islemler</p>
        </div>
        {stats.recent.length === 0 ? (
          <div style={{ padding: '32px', textAlign: 'center' }}>
            <p style={{ fontSize: '14px', color: '#6C6C70', margin: 0 }}>Bu ay islem yok.</p>
          </div>
        ) : stats.recent.map((item: any, idx: number) => (
          <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 20px', borderBottom: idx < stats.recent.length - 1 ? '1px solid #E5E5EA' : 'none' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: item.color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0 }}>
              {item.type === 'Konaklama' ? '🏨' : item.type === 'Yikama' ? '🚿' : '✂️'}
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: '14px', fontWeight: 600, margin: 0 }}>{item.name}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                <span style={{ fontSize: '11px', padding: '1px 8px', borderRadius: '20px', backgroundColor: item.color + '20', color: item.color, fontWeight: 600 }}>{item.type}</span>
                <span style={{ fontSize: '11px', color: '#6C6C70' }}>{fmtDate(item.date)}</span>
              </div>
            </div>
            <p style={{ fontSize: '14px', fontWeight: 700, color: '#34C759', margin: 0 }}>₺{fmt(item.amount)}</p>
          </div>
        ))}
      </div>
    </div>
  )
}