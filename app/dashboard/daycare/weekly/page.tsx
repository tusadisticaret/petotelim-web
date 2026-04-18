'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

const WEEKDAYS = [
  { label: 'Pazartesi', short: 'Pzt', value: 0 },
  { label: 'Sali', short: 'Sal', value: 1 },
  { label: 'Carsamba', short: 'Car', value: 2 },
  { label: 'Persembe', short: 'Per', value: 3 },
  { label: 'Cuma', short: 'Cum', value: 4 },
  { label: 'Cumartesi', short: 'Cmt', value: 5 },
  { label: 'Pazar', short: 'Paz', value: 6 },
]

function getWeekDates() {
  const today = new Date()
  const day = today.getDay()
  const monday = new Date(today)
  monday.setDate(today.getDate() - (day === 0 ? 6 : day - 1))
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })
}

function fmtDate(d: Date) {
  return d.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' })
}

function fmtDateFull(s: string) {
  return new Date(s + 'T12:00:00').toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function fmtCurrency(v: number) {
  return v.toLocaleString('tr-TR', { minimumFractionDigits: 2 })
}

export default function DaycareWeeklyPage() {
  const [selectedDay, setSelectedDay] = useState(0)
  const [packages, setPackages] = useState<any[]>([])
  const [periods, setCurrentPeriods] = useState<any[]>([])
  const [selectedPackage, setSelectedPackage] = useState<any>(null)

  const weekDates = getWeekDates()
  const today = new Date()
  const todayIdx = today.getDay() === 0 ? 6 : today.getDay() - 1

  useEffect(() => {
    setSelectedDay(todayIdx)
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: biz } = await supabase.from('businesses').select('id').eq('owner_user_id', user.id).single()
      const { data: pkgs } = await supabase
        .from('daycare_packages')
        .select('*, pets(id, name, species, breed, customers(full_name, phone))')
        .eq('business_id', biz?.id)
        .eq('is_active', true)
      setPackages(pkgs ?? [])
      const now = new Date()
      const fromDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
      const toDate = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]
      const { data: pds } = await supabase
        .from('daycare_periods')
        .select('*')
        .eq('business_id', biz?.id)
        .gte('period_start', fromDate)
        .lte('period_start', toDate)
        .order('period_start', { ascending: false })
      setCurrentPeriods(pds ?? [])
    }
    load()
  }, [])

  function weekdayText(mask: number) {
    return WEEKDAYS.filter(d => (mask & (1 << d.value)) !== 0).map(d => d.short).join(', ') || 'Belirtilmedi'
  }

  function packagesForDay(dayIdx: number) {
    return packages.filter(pkg => (pkg.weekdays_mask & (1 << dayIdx)) !== 0)
      .sort((a, b) => (a.pets?.name ?? '').localeCompare(b.pets?.name ?? '', 'tr'))
  }

  const dayPackages = packagesForDay(selectedDay)

  const cardStyle: React.CSSProperties = { backgroundColor: '#fff', borderRadius: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', marginBottom: '16px', padding: '20px' }
  const sectionTitle: React.CSSProperties = { fontSize: '17px', fontWeight: 600, color: '#000', margin: '0 0 14px' }

  return (
    <div style={{ padding: '32px', maxWidth: '800px', paddingBottom: '64px' }}>
      <h1 style={{ fontSize: '32px', fontWeight: 800, color: '#000', margin: '0 0 24px' }}>Haftalik Kres Tablosu</h1>

      {/* Haftalik Tablo */}
      <div style={cardStyle}>
        <p style={sectionTitle}>Haftalik Kres Tablosu</p>

        {packages.length === 0 ? (
          <div style={{ padding: '32px', textAlign: 'center' }}>
            <p style={{ fontSize: '32px', margin: '0 0 10px' }}>📅</p>
            <p style={{ fontSize: '14px', color: '#6C6C70', margin: 0 }}>Aktif kres plani olan evcil bulunmuyor</p>
          </div>
        ) : (
          <>
            {/* Gun secici */}
            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px', marginBottom: '16px' }}>
              {weekDates.map((d, i) => {
                const isToday = d.toDateString() === today.toDateString()
                const isSelected = selectedDay === i
                return (
                  <button key={i} onClick={() => setSelectedDay(i)} style={{ flexShrink: 0, padding: '8px 12px', borderRadius: '12px', border: isSelected ? '2px solid #007AFF' : isToday ? '2px solid #34C759' : '1px solid #E5E5EA', backgroundColor: isSelected ? '#EBF5FF' : isToday ? '#F0FFF4' : '#F2F2F7', cursor: 'pointer', textAlign: 'center', minWidth: '72px' }}>
                    <p style={{ fontSize: '13px', fontWeight: 700, color: isSelected ? '#007AFF' : '#000', margin: 0 }}>{WEEKDAYS[i].short}</p>
                    <p style={{ fontSize: '11px', color: '#6C6C70', margin: '2px 0 0' }}>{fmtDate(d)}</p>
                  </button>
                )
              })}
            </div>

            {/* Secili gun */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div>
                <p style={{ fontSize: '16px', fontWeight: 700, color: '#000', margin: 0 }}>{WEEKDAYS[selectedDay].label}</p>
                <p style={{ fontSize: '12px', color: '#6C6C70', margin: '2px 0 0' }}>{fmtDate(weekDates[selectedDay])}</p>
              </div>
              <p style={{ fontSize: '13px', color: '#6C6C70', margin: 0 }}>{dayPackages.length} kayit</p>
            </div>

            {dayPackages.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', backgroundColor: '#F2F2F7', borderRadius: '12px' }}>
                <p style={{ fontSize: '14px', color: '#6C6C70', margin: 0 }}>Bugun icin kayit yok</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '12px' }}>
                {dayPackages.map(pkg => {
                  const pet = pkg.pets
                  const isSelected = selectedPackage?.id === pkg.id
                  return (
                    <div key={pkg.id} onClick={() => setSelectedPackage(isSelected ? null : pkg)} style={{ backgroundColor: isSelected ? '#EBF5FF' : '#007AFF0A', borderRadius: '14px', padding: '14px', border: `1px solid ${isSelected ? '#007AFF50' : '#007AFF20'}`, cursor: 'pointer' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                        <span style={{ fontSize: '20px' }}>{pet?.species === 'cat' ? '🐱' : '🐶'}</span>
                        <div style={{ flex: 1 }}>
                          <p style={{ fontSize: '15px', fontWeight: 700, color: '#000', margin: 0 }}>{pet?.name ?? 'Isimsiz'}</p>
                          <p style={{ fontSize: '12px', color: '#6C6C70', margin: '2px 0 0' }}>{pet?.customers?.full_name ?? 'Sahip yok'}</p>
                        </div>
                        <p style={{ fontSize: '13px', fontWeight: 600, color: '#007AFF', margin: 0 }}>₺{fmtCurrency(pkg.price)}</p>
                      </div>
                      <div style={{ height: '1px', backgroundColor: '#007AFF20', marginBottom: '8px' }} />
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '12px' }}>📅</span>
                        <p style={{ fontSize: '12px', color: '#6C6C70', margin: 0 }}>{weekdayText(pkg.weekdays_mask)}</p>
                      </div>
                      {isSelected && (
                        <div style={{ marginTop: '10px', padding: '10px', backgroundColor: '#fff', borderRadius: '10px' }}>
                          <p style={{ fontSize: '12px', color: '#6C6C70', margin: '0 0 4px' }}>Baslangic: {fmtDateFull(pkg.start_date)}</p>
                          {pet?.customers?.phone && <p style={{ fontSize: '12px', color: '#6C6C70', margin: '2px 0 0' }}>Tel: {pet.customers.phone}</p>}
                          {pkg.main_address_text && <p style={{ fontSize: '12px', color: '#6C6C70', margin: '4px 0 0' }}>📍 {pkg.main_address_text}</p>}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* Kres Donemleri */}
      <div style={cardStyle}>
        <p style={sectionTitle}>Kres Donemleri</p>
        {periods.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <p style={{ fontSize: '14px', color: '#6C6C70', margin: 0 }}>Henuz donem olusmadir</p>
          </div>
        ) : periods.map((period, idx) => {
          const pkg = packages.find(p => p.id === period.package_id)
          const pet = pkg?.pets
          const isToday = period.period_start === new Date().toISOString().split('T')[0]
          return (
            <div key={period.id} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '12px 0', borderBottom: idx < periods.length - 1 ? '1px solid #E5E5EA' : 'none' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <p style={{ fontSize: '14px', fontWeight: 600, color: '#000', margin: 0 }}>{pet?.name ?? 'Isimsiz'}</p>
                  {isToday && <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', backgroundColor: '#E8F8FF', color: '#007AFF', fontWeight: 600 }}>Bugun basladi</span>}
                </div>
                <p style={{ fontSize: '12px', color: '#6C6C70', margin: 0 }}>{fmtDateFull(period.period_start)} → {fmtDateFull(period.period_end)}</p>
              </div>
              <p style={{ fontSize: '14px', fontWeight: 600, color: '#007AFF', margin: 0, fontVariantNumeric: 'tabular-nums' }}>₺{fmtCurrency(period.fee_snapshot)}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}