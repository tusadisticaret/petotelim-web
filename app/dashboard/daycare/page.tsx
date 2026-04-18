import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function DaycarePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: business } = await supabase
    .from('businesses')
    .select('id')
    .eq('owner_user_id', user.id)
    .single()

  const { data: activePackages } = await supabase
    .from('daycare_packages')
    .select('*, pets(name, species, breed, customers(full_name))')
    .eq('business_id', business?.id)
    .eq('is_active', true)
    .order('start_date', { ascending: false })

  const today = new Date().toISOString().split('T')[0]
  const { data: todayPeriods } = await supabase
    .from('daycare_periods')
    .select('*, daycare_packages(pets(name, species, customers(full_name)))')
    .eq('business_id', business?.id)
    .eq('period_start', today)

  function weekdayText(mask: number) {
    const days = ['Pzt', 'Sal', 'Car', 'Per', 'Cum', 'Cmt', 'Paz']
    return days.filter((_, i) => (mask & (1 << i)) !== 0).join(', ') || 'Belirtilmedi'
  }

  function fmtDate(s: string) {
    return new Date(s + 'T12:00:00').toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }

  function fmtCurrency(v: number) {
    return v.toLocaleString('tr-TR', { minimumFractionDigits: 2 })
  }

  const cardStyle = { backgroundColor: '#fff', borderRadius: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', marginBottom: '16px', overflow: 'hidden' } as React.CSSProperties

  return (
    <div style={{ padding: '32px', maxWidth: '900px' }}>
      <h1 style={{ fontSize: '32px', fontWeight: 800, color: '#000', margin: '0 0 24px' }}>Gunluk Bakim (Kres)</h1>

      {/* Nav */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px' }}>
        <Link href='/dashboard/daycare/new' style={{ textDecoration: 'none' }}>
          <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '12px', backgroundColor: '#007AFF20', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px' }}>➕</div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: '15px', fontWeight: 600, color: '#000', margin: 0 }}>Yeni Plan</p>
              <p style={{ fontSize: '12px', color: '#6C6C70', margin: '2px 0 0' }}>Kres plani olustur</p>
            </div>
            <span style={{ color: '#C7C7CC', fontSize: '16px' }}>›</span>
          </div>
        </Link>
        <Link href='/dashboard/daycare/weekly' style={{ textDecoration: 'none' }}>
          <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '12px', backgroundColor: '#34C75920', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px' }}>📆</div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: '15px', fontWeight: 600, color: '#000', margin: 0 }}>Haftalik Plan</p>
              <p style={{ fontSize: '12px', color: '#6C6C70', margin: '2px 0 0' }}>Haftalik tablo</p>
            </div>
            <span style={{ color: '#C7C7CC', fontSize: '16px' }}>›</span>
          </div>
        </Link>
      </div>

      {/* Bugun baslayan donemler */}
      <div style={cardStyle}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #E5E5EA' }}>
          <p style={{ fontSize: '17px', fontWeight: 600, color: '#000', margin: 0 }}>Bugun Baslayan Donemler</p>
        </div>
        {(!todayPeriods || todayPeriods.length === 0) ? (
          <div style={{ padding: '32px', textAlign: 'center' }}>
            <p style={{ fontSize: '32px', margin: '0 0 10px' }}>📅</p>
            <p style={{ fontSize: '14px', color: '#6C6C70', margin: 0 }}>Bugun baslayan donem yok</p>
          </div>
        ) : todayPeriods.map((period: any, idx: number) => {
          const pkg = period.daycare_packages
          const pet = pkg?.pets
          return (
            <div key={period.id} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 20px', borderBottom: idx < todayPeriods.length - 1 ? '1px solid #E5E5EA' : 'none' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#007AFF20', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>
                {pet?.species === 'cat' ? '🐱' : '🐶'}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '15px', fontWeight: 600, color: '#000', margin: 0 }}>{pet?.name ?? 'Isimsiz'}</p>
                <p style={{ fontSize: '12px', color: '#6C6C70', margin: '2px 0 0' }}>{pet?.customers?.full_name ?? ''} • {fmtDate(period.period_start)} → {fmtDate(period.period_end)}</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: '14px', fontWeight: 600, color: '#007AFF', margin: 0 }}>₺{fmtCurrency(period.fee_snapshot)}</p>
                <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', backgroundColor: '#F0FFF4', color: '#34C759', fontWeight: 600 }}>Bugun basliyor</span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Aktif planlar */}
      <div style={cardStyle}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #E5E5EA', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p style={{ fontSize: '17px', fontWeight: 600, color: '#000', margin: 0 }}>Aktif Kres Planlari</p>
          <p style={{ fontSize: '13px', color: '#6C6C70', margin: 0 }}>{activePackages?.length ?? 0} plan</p>
        </div>
        {(!activePackages || activePackages.length === 0) ? (
          <div style={{ padding: '32px', textAlign: 'center' }}>
            <p style={{ fontSize: '32px', margin: '0 0 10px' }}>🐾</p>
            <p style={{ fontSize: '14px', color: '#6C6C70', margin: 0 }}>Aktif kres plani yok</p>
          </div>
        ) : activePackages.map((pkg: any, idx: number) => {
          const pet = pkg.pets
          return (
            <div key={pkg.id} style={{ padding: '14px 20px', borderBottom: idx < activePackages.length - 1 ? '1px solid #E5E5EA' : 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ width: '44px', height: '44px', borderRadius: '50%', backgroundColor: pet?.species === 'cat' ? '#FF950020' : '#007AFF20', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>
                  {pet?.species === 'cat' ? '🐱' : '🐶'}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <p style={{ fontSize: '15px', fontWeight: 700, color: '#000', margin: 0 }}>{pet?.name ?? 'Isimsiz'}</p>
                    <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', backgroundColor: '#F0FFF4', color: '#34C759', fontWeight: 600 }}>AKTIF</span>
                  </div>
                  <p style={{ fontSize: '13px', color: '#6C6C70', margin: '0 0 4px' }}>{pet?.customers?.full_name ?? 'Sahip yok'}</p>
                  <p style={{ fontSize: '12px', color: '#6C6C70', margin: 0 }}>Gunler: {weekdayText(pkg.weekdays_mask)} • Baslangic: {fmtDate(pkg.start_date)}</p>
                </div>
                <p style={{ fontSize: '15px', fontWeight: 700, color: '#007AFF', margin: 0 }}>₺{fmtCurrency(pkg.price)}</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}