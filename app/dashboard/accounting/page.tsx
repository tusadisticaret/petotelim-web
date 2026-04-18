import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function AccountingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: business } = await supabase.from('businesses').select('id').eq('owner_user_id', user.id).single()
  const bid = business?.id

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()

  const { data: allInvoices } = await supabase
    .from('sales_invoices')
    .select('*')
    .eq('business_id', bid)
    .order('service_date', { ascending: false })

  const { data: expenses } = await supabase
    .from('expenses')
    .select('*')
    .eq('business_id', bid)
    .order('date', { ascending: false })

  const invoices = allInvoices ?? []
  const expenseList = expenses ?? []

  const paidInvoices = invoices.filter((i: any) => i.is_paid)
  const unpaidInvoices = invoices.filter((i: any) => !i.is_paid)
  const todayPaid = paidInvoices.filter((i: any) => i.paid_at && i.paid_at >= todayStart)
  const monthPaid = paidInvoices.filter((i: any) => i.paid_at && i.paid_at >= monthStart)
  const monthExpenses = expenseList.filter((e: any) => e.date >= monthStart.split('T')[0])

  const todayIncome = todayPaid.reduce((s: number, i: any) => s + (i.total_amount ?? 0), 0)
  const monthIncome = monthPaid.reduce((s: number, i: any) => s + (i.total_amount ?? 0), 0)
  const monthExpenseTotal = monthExpenses.reduce((s: number, e: any) => s + (e.amount ?? 0), 0)
  const netProfit = monthIncome - monthExpenseTotal
  const unpaidTotal = unpaidInvoices.reduce((s: number, i: any) => s + (i.total_amount ?? 0), 0)

  const today = now.toISOString().split('T')[0]
  const overdueInvoices = unpaidInvoices.filter((i: any) => i.service_date < today)

  const recentPaid = paidInvoices
    .sort((a: any, b: any) => (b.paid_at ?? b.service_date).localeCompare(a.paid_at ?? a.service_date))
    .slice(0, 8)

  function fmtCurrency(v: number) {
    return v.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  function fmtDate(s: string) {
    return new Date(s + (s.length === 10 ? 'T12:00:00' : '')).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }

  function sourceLabel(ref: string) {
    if (ref?.includes('stay')) return 'Konaklama'
    if (ref?.includes('daycare')) return 'Kres'
    if (ref?.includes('grooming')) return 'Grooming'
    if (ref?.includes('quick')) return 'Hizli Satis'
    return 'Diger'
  }

  function sourceColor(ref: string) {
    if (ref?.includes('stay')) return '#007AFF'
    if (ref?.includes('daycare')) return '#34C759'
    if (ref?.includes('grooming')) return '#AF52DE'
    if (ref?.includes('quick')) return '#00BCD4'
    return '#6C6C70'
  }

  const cardStyle = { backgroundColor: '#fff', borderRadius: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', marginBottom: '16px' } as React.CSSProperties

  const navItems = [
    { href: '/dashboard/accounting/sales', label: 'Satislar', icon: '📄', desc: 'Fatura listesi', color: '#007AFF' },
    { href: '/dashboard/accounting/expenses', label: 'Giderler', icon: '➖', desc: 'Gider kayitlari', color: '#FF3B30' },
    { href: '/dashboard/accounting/payments', label: 'Musteriler', icon: '👥', color: '#FF9500', desc: 'Odeme takibi' },
  ]

  return (
    <div style={{ padding: '32px', maxWidth: '900px' }}>
      <h1 style={{ fontSize: '32px', fontWeight: 800, color: '#000', margin: '0 0 24px' }}>Muhasebe</h1>

      {/* Kisayollar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '24px' }}>
        {navItems.map(item => (
          <Link key={item.href} href={item.href} style={{ textDecoration: 'none' }}>
            <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '12px', backgroundColor: item.color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>
                {item.icon}
              </div>
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
      <div style={{ ...cardStyle, padding: '20px' }}>
        <p style={{ fontSize: '17px', fontWeight: 600, color: '#000', margin: '0 0 14px' }}>Bugun</p>
        <div style={{ display: 'flex', gap: '0' }}>
          {[
            { label: 'Tahsilat', value: `₺${fmtCurrency(todayIncome)}`, color: '#34C759' },
            { label: 'Fatura', value: String(todayPaid.length), color: '#007AFF' },
            { label: 'Bekleyen', value: String(unpaidInvoices.length), color: '#FF9500' },
          ].map((item, idx) => (
            <div key={idx} style={{ flex: 1, borderRight: idx < 2 ? '1px solid #E5E5EA' : 'none', paddingRight: idx < 2 ? '16px' : 0, paddingLeft: idx > 0 ? '16px' : 0 }}>
              <p style={{ fontSize: '12px', color: '#6C6C70', margin: '0 0 4px' }}>{item.label}</p>
              <p style={{ fontSize: '18px', fontWeight: 700, color: item.color, margin: 0 }}>{item.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Bu Ay */}
      <div style={{ ...cardStyle, padding: '20px' }}>
        <p style={{ fontSize: '17px', fontWeight: 600, color: '#000', margin: '0 0 14px' }}>Bu Ay</p>
        <div style={{ display: 'flex', gap: '0' }}>
          {[
            { label: 'Tahsilat', value: `₺${fmtCurrency(monthIncome)}`, color: '#34C759' },
            { label: 'Gider', value: `₺${fmtCurrency(monthExpenseTotal)}`, color: '#FF3B30' },
            { label: 'Net', value: `₺${fmtCurrency(netProfit)}`, color: netProfit >= 0 ? '#007AFF' : '#FF3B30' },
          ].map((item, idx) => (
            <div key={idx} style={{ flex: 1, borderRight: idx < 2 ? '1px solid #E5E5EA' : 'none', paddingRight: idx < 2 ? '16px' : 0, paddingLeft: idx > 0 ? '16px' : 0 }}>
              <p style={{ fontSize: '12px', color: '#6C6C70', margin: '0 0 4px' }}>{item.label}</p>
              <p style={{ fontSize: '18px', fontWeight: 700, color: item.color, margin: 0 }}>{item.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Riskler */}
      <div style={{ ...cardStyle, padding: '20px' }}>
        <p style={{ fontSize: '17px', fontWeight: 600, color: '#000', margin: '0 0 14px' }}>Riskler</p>
        {[
          { label: 'Geciken Faturalar', value: overdueInvoices.length, color: overdueInvoices.length > 0 ? '#FF3B30' : '#6C6C70' },
          { label: 'Bekleyen Tahsilat', value: `₺${fmtCurrency(unpaidTotal)}`, color: unpaidTotal > 0 ? '#FF9500' : '#6C6C70' },
        ].map((item, idx) => (
          <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: idx === 0 ? '1px solid #E5E5EA' : 'none' }}>
            <span style={{ fontSize: '15px', color: '#000' }}>{item.label}</span>
            <span style={{ fontSize: '15px', fontWeight: 600, color: item.color }}>{item.value}</span>
          </div>
        ))}
        <p style={{ fontSize: '13px', marginTop: '10px', margin: '10px 0 0', color: overdueInvoices.length > 0 ? '#FF3B30' : '#34C759' }}>
          {overdueInvoices.length > 0 ? '⚠️ Tahsilat riski var' : '✓ Belirgin finansal alarm gorunmuyor'}
        </p>
      </div>

      {/* Bekleyen Tahsilatlar */}
      <div style={{ ...cardStyle, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #E5E5EA', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ fontSize: '17px', fontWeight: 600, color: '#000', margin: 0 }}>Bekleyen Tahsilatlar</p>
            <p style={{ fontSize: '13px', color: unpaidTotal > 0 ? '#FF9500' : '#6C6C70', margin: '4px 0 0', fontWeight: 700 }}>₺{fmtCurrency(unpaidTotal)}</p>
          </div>
          <Link href='/dashboard/accounting/sales' style={{ padding: '8px 16px', borderRadius: '10px', border: '1px solid #E5E5EA', backgroundColor: '#fff', color: '#007AFF', fontSize: '13px', fontWeight: 500, textDecoration: 'none' }}>
            Faturalara Git ›
          </Link>
        </div>
        {unpaidInvoices.slice(0, 5).map((inv: any, idx: number) => (
          <div key={inv.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 20px', borderBottom: idx < Math.min(unpaidInvoices.length, 5) - 1 ? '1px solid #E5E5EA' : 'none' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: '#FF950015', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0 }}>🕐</div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: '14px', fontWeight: 600, color: '#000', margin: 0 }}>{inv.owner_full_name || inv.pet_name || 'Isimsiz'}</p>
              <p style={{ fontSize: '12px', color: '#6C6C70', margin: '2px 0 0' }}>{fmtDate(inv.service_date)}</p>
            </div>
            <p style={{ fontSize: '14px', fontWeight: 700, color: '#FF9500', margin: 0 }}>₺{fmtCurrency(inv.total_amount ?? 0)}</p>
          </div>
        ))}
      </div>

      {/* Son Tahsilatlar */}
      <div style={{ ...cardStyle, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #E5E5EA', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p style={{ fontSize: '17px', fontWeight: 600, color: '#000', margin: 0 }}>Son Tahsilatlar</p>
          <Link href='/dashboard/accounting/sales' style={{ padding: '8px 16px', borderRadius: '10px', border: '1px solid #E5E5EA', backgroundColor: '#fff', color: '#007AFF', fontSize: '13px', fontWeight: 500, textDecoration: 'none' }}>
            Tumunu Gor ›
          </Link>
        </div>
        {recentPaid.length === 0 ? (
          <div style={{ padding: '32px', textAlign: 'center' }}>
            <p style={{ fontSize: '14px', color: '#6C6C70', margin: 0 }}>Henuz tahsil edilmis fatura yok.</p>
          </div>
        ) : recentPaid.map((inv: any, idx: number) => {
          const ref = inv.source_ref ?? ''
          return (
            <div key={inv.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 20px', borderBottom: idx < recentPaid.length - 1 ? '1px solid #E5E5EA' : 'none' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: sourceColor(ref) + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0 }}>
                {ref.includes('stay') ? '🏨' : ref.includes('daycare') ? '🏠' : ref.includes('grooming') ? '✂️' : '🛒'}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '14px', fontWeight: 600, color: '#000', margin: 0 }}>{inv.owner_full_name || inv.pet_name || 'Isimsiz'}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                  <span style={{ fontSize: '11px', padding: '1px 8px', borderRadius: '20px', backgroundColor: sourceColor(ref) + '20', color: sourceColor(ref), fontWeight: 600 }}>{sourceLabel(ref)}</span>
                  <span style={{ fontSize: '11px', color: '#6C6C70' }}>{fmtDate(inv.paid_at ?? inv.service_date)}</span>
                </div>
              </div>
              <p style={{ fontSize: '14px', fontWeight: 700, color: '#34C759', margin: 0 }}>₺{fmtCurrency(inv.total_amount ?? 0)}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}