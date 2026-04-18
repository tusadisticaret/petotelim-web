import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: business } = await supabase.from('businesses').select('id, name').eq('user_id', user.id).single()
  const bid = business?.id

  const today = new Date().toISOString().split('T')[0]
  const now = new Date().toISOString()
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()

  const [
    { data: stays },
    { data: allInvoices },
    { data: pets },
    { data: customers },
    { data: grooming },
    { data: daycarePackages },
  ] = await Promise.all([
    supabase.from('stays').select('*').eq('business_id', bid).is('actual_checkout_date', null).neq('status', 'reservation'),
    supabase.from('sales_invoices').select('*').eq('business_id', bid),
    supabase.from('pets').select('id').eq('business_id', bid),
    supabase.from('customers').select('id').eq('business_id', bid),
    supabase.from('grooming_entries').select('*').eq('business_id', bid).gte('service_date', today),
    supabase.from('daycare_packages').select('*').eq('business_id', bid).eq('is_active', true),
  ])

  const activeStays = (stays ?? []).filter((s: any) => !s.is_reservation)
  const todayCheckouts = activeStays.filter((s: any) => s.checkout_date === today)
  const overdueStays = activeStays.filter((s: any) => s.checkout_date && s.checkout_date < today)

  const invoices = allInvoices ?? []
  const unpaidInvoices = invoices.filter((i: any) => !i.is_paid)
  const todayPaid = invoices.filter((i: any) => i.is_paid && i.paid_at && i.paid_at.startsWith(today))
  const monthPaid = invoices.filter((i: any) => i.is_paid && i.paid_at && i.paid_at >= monthStart)

  const todayRevenue = todayPaid.reduce((s: number, i: any) => s + (i.total_amount ?? 0), 0)
  const monthRevenue = monthPaid.reduce((s: number, i: any) => s + (i.total_amount ?? 0), 0)
  const unpaidTotal = unpaidInvoices.reduce((s: number, i: any) => s + (i.total_amount ?? 0), 0)

  function fmtCurrency(v: number) {
    return v.toLocaleString('tr-TR', { minimumFractionDigits: 2 })
  }

  function fmtDate(s: string) {
    if (!s) return ''
    return new Date(s + 'T12:00:00').toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' })
  }

  const recentPaid = invoices
    .filter((i: any) => i.is_paid && i.paid_at)
    .sort((a: any, b: any) => b.paid_at.localeCompare(a.paid_at))
    .slice(0, 5)

  const card = { backgroundColor: '#fff', borderRadius: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', marginBottom: '16px', padding: '20px' } as React.CSSProperties

  const quickLinks = [
    { href: '/dashboard/stays/checkin', label: 'Check-in', icon: '⬇️', color: '#007AFF' },
    { href: '/dashboard/stays/checkout', label: 'Check-out', icon: '⬆️', color: '#34C759' },
    { href: '/dashboard/daycare/new', label: 'Yeni Kres', icon: '🏠', color: '#FF9500' },
    { href: '/dashboard/grooming/wash', label: 'Yikama', icon: '💧', color: '#00BCD4' },
    { href: '/dashboard/grooming/trim', label: 'Tiras', icon: '✂️', color: '#AF52DE' },
    { href: '/dashboard/sales', label: 'Hizli Satis', icon: '🛒', color: '#FF3B30' },
  ]

  return (
    <div style={{ padding: '32px', maxWidth: '900px' }}>
      <div style={{ marginBottom: '28px' }}>
        <p style={{ fontSize: '14px', color: '#6C6C70', margin: '0 0 4px' }}>Hos geldiniz</p>
        <h1 style={{ fontSize: '32px', fontWeight: 800, color: '#000', margin: 0 }}>{business?.name ?? 'PetOtelim'}</h1>
        <p style={{ fontSize: '14px', color: '#6C6C70', margin: '4px 0 0' }}>
          {new Date().toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* Bugun Ozeti */}
      <div style={card}>
        <p style={{ fontSize: '17px', fontWeight: 700, color: '#000', margin: '0 0 16px' }}>Bugun</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0' }}>
          {[
            { label: 'Tahsilat', value: `₺${fmtCurrency(todayRevenue)}`, color: '#34C759' },
            { label: 'Aktif Konaklama', value: String(activeStays.length), color: '#007AFF' },
            { label: 'Bekleyen', value: String(unpaidInvoices.length), color: '#FF9500' },
          ].map((item, idx) => (
            <div key={idx} style={{ textAlign: 'center', borderRight: idx < 2 ? '1px solid #E5E5EA' : 'none' }}>
              <p style={{ fontSize: '22px', fontWeight: 700, color: item.color, margin: '0 0 4px' }}>{item.value}</p>
              <p style={{ fontSize: '12px', color: '#6C6C70', margin: 0 }}>{item.label}</p>
            </div>
          ))}
        </div>
        {(todayCheckouts.length > 0 || overdueStays.length > 0) && (
          <div style={{ marginTop: '14px', paddingTop: '14px', borderTop: '1px solid #E5E5EA' }}>
            {todayCheckouts.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <span style={{ fontSize: '12px', padding: '2px 10px', borderRadius: '20px', backgroundColor: '#007AFF20', color: '#007AFF', fontWeight: 600 }}>Bugun {todayCheckouts.length} cikis</span>
              </div>
            )}
            {overdueStays.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '12px', padding: '2px 10px', borderRadius: '20px', backgroundColor: '#FF3B3020', color: '#FF3B30', fontWeight: 600 }}>⚠️ {overdueStays.length} geciken cikis</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bu Ay */}
      <div style={card}>
        <p style={{ fontSize: '17px', fontWeight: 700, color: '#000', margin: '0 0 16px' }}>Bu Ay</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0' }}>
          {[
            { label: 'Gelir', value: `₺${fmtCurrency(monthRevenue)}`, color: '#34C759' },
            { label: 'Bekleyen', value: `₺${fmtCurrency(unpaidTotal)}`, color: '#FF9500' },
            { label: 'Musteri', value: String(customers?.length ?? 0), color: '#007AFF' },
            { label: 'Evcil', value: String(pets?.length ?? 0), color: '#AF52DE' },
          ].map((item, idx) => (
            <div key={idx} style={{ textAlign: 'center', borderRight: idx < 3 ? '1px solid #E5E5EA' : 'none' }}>
              <p style={{ fontSize: '18px', fontWeight: 700, color: item.color, margin: '0 0 4px' }}>{item.value}</p>
              <p style={{ fontSize: '11px', color: '#6C6C70', margin: 0 }}>{item.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Hizli Erisim */}
      <div style={card}>
        <p style={{ fontSize: '17px', fontWeight: 700, color: '#000', margin: '0 0 14px' }}>Hizli Erisim</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
          {quickLinks.map(link => (
            <Link key={link.href} href={link.href} style={{ textDecoration: 'none' }}>
              <div style={{ backgroundColor: '#F9F9F9', borderRadius: '14px', padding: '16px', display: 'flex', alignItems: 'center', gap: '10px', border: '1px solid #E5E5EA' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: link.color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>
                  {link.icon}
                </div>
                <p style={{ fontSize: '13px', fontWeight: 600, color: '#000', margin: 0 }}>{link.label}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Aktif Konaklamalar */}
      {activeStays.length > 0 && (
        <div style={{ ...card, overflow: 'hidden', padding: 0 }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #E5E5EA', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p style={{ fontSize: '17px', fontWeight: 700, color: '#000', margin: 0 }}>Aktif Konaklamalar</p>
            <Link href='/dashboard/stays' style={{ fontSize: '13px', color: '#007AFF', textDecoration: 'none' }}>Tumunu Gor ›</Link>
          </div>
          {activeStays.slice(0, 5).map((stay: any, idx: number) => (
            <div key={stay.id} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '12px 20px', borderBottom: idx < Math.min(activeStays.length, 5) - 1 ? '1px solid #E5E5EA' : 'none' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: '#007AFF15', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>🐾</div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '14px', fontWeight: 600, color: '#000', margin: 0 }}>{stay.pet_name || 'Isimsiz'}</p>
                <p style={{ fontSize: '12px', color: '#6C6C70', margin: '2px 0 0' }}>Cikis: {fmtDate(stay.checkout_date)}</p>
              </div>
              {stay.checkout_date && stay.checkout_date < today && (
                <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', backgroundColor: '#FF3B3020', color: '#FF3B30', fontWeight: 600 }}>Gecikti</span>
              )}
              {stay.checkout_date === today && (
                <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', backgroundColor: '#FF950020', color: '#FF9500', fontWeight: 600 }}>Bugun</span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Son Tahsilatlar */}
      {recentPaid.length > 0 && (
        <div style={{ ...card, overflow: 'hidden', padding: 0 }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #E5E5EA', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p style={{ fontSize: '17px', fontWeight: 700, color: '#000', margin: 0 }}>Son Tahsilatlar</p>
            <Link href='/dashboard/accounting/sales' style={{ fontSize: '13px', color: '#007AFF', textDecoration: 'none' }}>Tumunu Gor ›</Link>
          </div>
          {recentPaid.map((inv: any, idx: number) => (
            <div key={inv.id} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '12px 20px', borderBottom: idx < recentPaid.length - 1 ? '1px solid #E5E5EA' : 'none' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: '#34C75915', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0 }}>✓</div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '14px', fontWeight: 600, color: '#000', margin: 0 }}>{inv.owner_full_name || inv.pet_name || 'Isimsiz'}</p>
                <p style={{ fontSize: '12px', color: '#6C6C70', margin: '2px 0 0' }}>{fmtDate(inv.paid_at)}</p>
              </div>
              <p style={{ fontSize: '14px', fontWeight: 700, color: '#34C759', margin: 0 }}>₺{fmtCurrency(inv.total_amount ?? 0)}</p>
            </div>
          ))}
        </div>
      )}

      {/* Kreş & Grooming Ozeti */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <div style={card}>
          <p style={{ fontSize: '15px', fontWeight: 700, color: '#000', margin: '0 0 12px' }}>Aktif Kres</p>
          <p style={{ fontSize: '28px', fontWeight: 800, color: '#FF9500', margin: '0 0 4px' }}>{daycarePackages?.length ?? 0}</p>
          <p style={{ fontSize: '12px', color: '#6C6C70', margin: '0 0 12px' }}>aktif plan</p>
          <Link href='/dashboard/daycare/new' style={{ display: 'block', padding: '8px', borderRadius: '10px', backgroundColor: '#FF950015', color: '#FF9500', textAlign: 'center', textDecoration: 'none', fontSize: '13px', fontWeight: 600 }}>Yeni Plan ›</Link>
        </div>
        <div style={card}>
          <p style={{ fontSize: '15px', fontWeight: 700, color: '#000', margin: '0 0 12px' }}>Bugun Grooming</p>
          <p style={{ fontSize: '28px', fontWeight: 800, color: '#AF52DE', margin: '0 0 4px' }}>{grooming?.length ?? 0}</p>
          <p style={{ fontSize: '12px', color: '#6C6C70', margin: '0 0 12px' }}>kayit</p>
          <Link href='/dashboard/grooming/reservations' style={{ display: 'block', padding: '8px', borderRadius: '10px', backgroundColor: '#AF52DE15', color: '#AF52DE', textAlign: 'center', textDecoration: 'none', fontSize: '13px', fontWeight: 600 }}>Rezervasyonlar ›</Link>
        </div>
      </div>
    </div>
  )
}