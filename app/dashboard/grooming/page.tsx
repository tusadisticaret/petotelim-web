import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function GroomingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: business } = await supabase
    .from('businesses')
    .select('id')
    .eq('owner_user_id', user.id)
    .single()

  const today = new Date().toISOString().split('T')[0]

  const { data: todayEntries } = await supabase
    .from('grooming_entries')
    .select('*')
    .eq('business_id', business?.id)
    .gte('service_date', today)
    .lte('service_date', today)
    .order('service_date', { ascending: false })

  const { data: reservations } = await supabase
    .from('grooming_reservations')
    .select('*')
    .eq('business_id', business?.id)
    .gte('start_at', new Date().toISOString().split('T')[0])
    .order('start_at', { ascending: true })
    .limit(5)

  const cardStyle = { backgroundColor: '#fff', borderRadius: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', marginBottom: '16px', overflow: 'hidden' } as React.CSSProperties

  const navItems = [
    { href: '/dashboard/grooming/wash', label: 'Yikama', icon: '💧', color: '#007AFF', desc: 'Yeni yikama girisi' },
    { href: '/dashboard/grooming/trim', label: 'Tiras', icon: '✂️', color: '#AF52DE', desc: 'Yeni tiras girisi' },
    { href: '/dashboard/grooming/reservations', label: 'Rezervasyon', icon: '📅', color: '#FF9500', desc: 'Haftalik plan' },
    { href: '/dashboard/grooming/history', label: 'Gecmis', icon: '🕐', color: '#34C759', desc: 'Gecmis kayitlar' },
  ]

  return (
    <div style={{ padding: '32px', maxWidth: '900px' }}>
      <h1 style={{ fontSize: '32px', fontWeight: 800, color: '#000', margin: '0 0 24px' }}>Bakim & Grooming</h1>

      {/* Nav kartlari */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px' }}>
        {navItems.map(item => (
          <Link key={item.href} href={item.href} style={{ textDecoration: 'none' }}>
            <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '12px', backgroundColor: item.color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', flexShrink: 0 }}>
                {item.icon}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '15px', fontWeight: 600, color: '#000', margin: 0 }}>{item.label}</p>
                <p style={{ fontSize: '12px', color: '#6C6C70', margin: '2px 0 0' }}>{item.desc}</p>
              </div>
              <span style={{ color: '#C7C7CC', fontSize: '16px' }}>›</span>
            </div>
          </Link>
        ))}
      </div>

      {/* Bugun */}
      <div style={cardStyle}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #E5E5EA' }}>
          <p style={{ fontSize: '17px', fontWeight: 600, color: '#000', margin: 0 }}>Bugunun Kayitlari</p>
        </div>
        {(!todayEntries || todayEntries.length === 0) ? (
          <div style={{ padding: '32px', textAlign: 'center' }}>
            <p style={{ fontSize: '32px', margin: '0 0 12px' }}>✂️</p>
            <p style={{ fontSize: '14px', color: '#6C6C70', margin: 0 }}>Bugune ait kayit yok</p>
          </div>
        ) : todayEntries.map((entry: any, idx: number) => (
          <div key={entry.id} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 20px', borderBottom: idx < todayEntries.length - 1 ? '1px solid #E5E5EA' : 'none' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: entry.kind === 'trim' ? '#AF52DE20' : '#007AFF20', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>
              {entry.kind === 'trim' ? '✂️' : '💧'}
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: '15px', fontWeight: 600, color: '#000', margin: 0 }}>{entry.pet_name}</p>
              <p style={{ fontSize: '12px', color: '#6C6C70', margin: '2px 0 0' }}>{entry.owner_name} • {entry.kind === 'trim' ? 'Tiras' : 'Yikama'} • {entry.service_level === 1 ? 'VIP' : 'Normal'}</p>
            </div>
            <p style={{ fontSize: '14px', fontWeight: 600, color: '#007AFF', margin: 0 }}>₺{(entry.fee ?? 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</p>
          </div>
        ))}
      </div>

      {/* Yaklasan Rezervasyonlar */}
      <div style={cardStyle}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #E5E5EA' }}>
          <p style={{ fontSize: '17px', fontWeight: 600, color: '#000', margin: 0 }}>Yaklasan Rezervasyonlar</p>
        </div>
        {(!reservations || reservations.length === 0) ? (
          <div style={{ padding: '32px', textAlign: 'center' }}>
            <p style={{ fontSize: '32px', margin: '0 0 12px' }}>📅</p>
            <p style={{ fontSize: '14px', color: '#6C6C70', margin: 0 }}>Yaklasan rezervasyon yok</p>
          </div>
        ) : reservations.map((res: any, idx: number) => {
          const dt = new Date(res.start_at)
          const dateStr = dt.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' })
          const timeStr = dt.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
          return (
            <div key={res.id} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 20px', borderBottom: idx < reservations.length - 1 ? '1px solid #E5E5EA' : 'none' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: res.kind === 'trim' ? '#AF52DE20' : '#007AFF20', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>
                {res.kind === 'trim' ? '✂️' : '💧'}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '15px', fontWeight: 600, color: '#000', margin: 0 }}>{res.pet_name}</p>
                <p style={{ fontSize: '12px', color: '#6C6C70', margin: '2px 0 0' }}>{res.owner_name} • {dateStr} {timeStr}</p>
              </div>
              <p style={{ fontSize: '14px', fontWeight: 600, color: '#007AFF', margin: 0 }}>₺{(res.fee ?? 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}