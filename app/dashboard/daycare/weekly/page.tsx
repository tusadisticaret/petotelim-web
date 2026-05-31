'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

const WEEKDAYS = [
  { label: 'Pazartesi', short: 'Pzt', value: 0 },
  { label: 'Sali',      short: 'Sal', value: 1 },
  { label: 'Carsamba',  short: 'Car', value: 2 },
  { label: 'Persembe',  short: 'Per', value: 3 },
  { label: 'Cuma',      short: 'Cum', value: 4 },
  { label: 'Cumartesi', short: 'Cmt', value: 5 },
  { label: 'Pazar',     short: 'Paz', value: 6 },
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

function fmtShort(d: Date) {
  return d.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' })
}

function fmtFull(s: string) {
  return new Date(s + 'T12:00:00').toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function fmtCurrency(v: number) {
  return v.toLocaleString('tr-TR', { minimumFractionDigits: 2 })
}

function speciesIcon(species: string) {
  const s = (species ?? '').toLowerCase()
  if (s === 'cat' || s === 'kedi') return '🐈'
  if (s === 'dog' || s === 'köpek' || s === 'kopek') return '🐕'
  return '🐇'
}

function speciesLabel(species: string) {
  const s = (species ?? '').toLowerCase()
  if (s === 'cat' || s === 'kedi') return 'Kedi'
  if (s === 'dog' || s === 'köpek' || s === 'kopek') return 'Köpek'
  if (s === 'other' || s === 'diğer' || s === 'diger') return 'Diğer'
  return species ?? ''
}

function Badge({ text, color }: { text: string; color: string }) {
  const colors: Record<string, { bg: string; fg: string }> = {
    green:  { bg: '#E8F5E9', fg: '#34C759' },
    red:    { bg: '#FFF0F0', fg: '#FF3B30' },
    orange: { bg: '#FFF4E5', fg: '#FF9500' },
    blue:   { bg: '#EBF5FF', fg: '#007AFF' },
    gray:   { bg: '#F2F2F7', fg: '#6C6C70' },
    cyan:   { bg: '#E5F9FF', fg: '#00C7BE' },
  }
  const c = colors[color] ?? colors.gray
  return (
    <span style={{ fontSize: '11px', fontWeight: 600, padding: '3px 10px', borderRadius: '20px', backgroundColor: c.bg, color: c.fg }}>
      {text}
    </span>
  )
}

export default function DaycareWeeklyPage() {
  const [selectedDay, setSelectedDay] = useState(0)
  const [packages, setPackages] = useState<any[]>([])
  const [periods, setPeriods] = useState<any[]>([])
  const [selectedPkg, setSelectedPkg] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [invoiceModal, setInvoiceModal] = useState<any>(null)
  const [paymentDate, setPaymentDate] = useState('')
  const [paymentLoading, setPaymentLoading] = useState(false)
  const [invoices, setInvoices] = useState<any[]>([])

  const weekDates = getWeekDates()
  const today = new Date()
  const todayIdx = today.getDay() === 0 ? 6 : today.getDay() - 1
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  useEffect(() => {
    setSelectedDay(todayIdx)
    load()
  }, [])

  useEffect(() => {
  setPaymentDate(todayStr)
}, [todayStr])

  async function load() {
    setLoading(true)
    const supabase = createClient()
    let user
    try { const { data } = await supabase.auth.getUser(); user = data.user } catch { return }
    if (!user) return
    const { data: biz } = await supabase.from('businesses').select('id').eq('owner_user_id', user.id).single()
    if (!biz) return

    const { data: pkgs } = await supabase
      .from('daycare_packages')
      .select('*, pets(id, name, species, breed, customers(full_name, phone))')
      .eq('business_id', biz.id)
      .eq('is_active', true)
    setPackages(pkgs ?? [])

const now = new Date()
const year = now.getFullYear()
const month = now.getMonth()
const fromDate = `${year}-${String(month + 1).padStart(2, '0')}-01`
const lastDay = new Date(year, month + 1, 0).getDate()
const toDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
const { data: pds } = await supabase
  .from('daycare_periods')
  .select('*')
  .eq('business_id', biz.id)
  .gte('period_start', fromDate)
  .lte('period_start', toDate)
  .order('period_start', { ascending: false })
setPeriods((pds ?? []).sort((a: any, b: any) => {
  if (a.period_start !== b.period_start) return b.period_start.localeCompare(a.period_start)
  const pkgA = (pkgs ?? []).find((p: any) => p.id === a.package_id)
  const pkgB = (pkgs ?? []).find((p: any) => p.id === b.package_id)
  return (pkgA?.pets?.name ?? '').localeCompare(pkgB?.pets?.name ?? '', 'tr')
}))

const { data: invs } = await supabase
  .from('sales_invoices')
  .select('id, source_ref, is_paid, total_amount, pet_name, owner_full_name, service_date')
  .eq('business_id', biz.id)
setInvoices(invs ?? [])
setLoading(false)
}

async function handleMarkPaid() {
  if (!invoiceModal) return
  console.log('💳 Tahsilat ekleniyor, invoice id:', invoiceModal.id, 'invoice:', invoiceModal)
  setPaymentLoading(true)
  const supabase = createClient()
  await supabase
    .from('sales_invoices')
    .update({ is_paid: true, paid_at: new Date(paymentDate + 'T12:00:00').toISOString() })
    .eq('id', invoiceModal.id)
  setPaymentLoading(false)
  setInvoiceModal(null)
  await load()
}

  function weekdayText(mask: number) {
    return WEEKDAYS.filter(d => (mask & (1 << d.value)) !== 0).map(d => d.short).join(', ') || 'Belirtilmedi'
  }

  function packagesForDay(dayIdx: number) {
    return packages
      .filter(pkg => (pkg.weekdays_mask & (1 << dayIdx)) !== 0)
      .sort((a, b) => (a.pets?.name ?? '').localeCompare(b.pets?.name ?? '', 'tr'))
  }

function periodBadge(period: any) {
  const invoice = invoices.find(inv =>
    inv.source_ref?.toLowerCase() === `daycare:${period.id}`.toLowerCase()
  )
  if (invoice?.is_paid) return { text: 'Ödendi', color: 'green', invoice }
  const start = new Date(period.period_start + 'T12:00:00')
  start.setHours(0, 0, 0, 0)
  const t = new Date(); t.setHours(0, 0, 0, 0)
  const isOverdue = start < t
  if (invoice) return { text: isOverdue ? 'Gecikmiş' : 'Bekliyor', color: isOverdue ? 'red' : 'orange', invoice }
  if (isOverdue) return { text: 'Gecikmiş', color: 'red', invoice: null }
  return { text: 'Fatura yok', color: 'gray', invoice: null }
}

  function packagePeriodBadge(pkg: any) {
    const pkgPeriods = periods.filter(p => p.package_id === pkg.id)
    if (pkgPeriods.length === 0) return { text: 'Fatura yok', color: 'gray' }
    const latest = pkgPeriods.sort((a, b) => b.period_start.localeCompare(a.period_start))[0]
    return periodBadge(latest)
  }

  const dayPackages = packagesForDay(selectedDay)

  const card: React.CSSProperties = { backgroundColor: '#fff', borderRadius: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', marginBottom: '16px', padding: '20px' }
  const sectionTitle: React.CSSProperties = { fontSize: '17px', fontWeight: 700, color: '#000', margin: '0 0 14px' }

  return (
  <div style={{ padding: '32px', maxWidth: '800px', paddingBottom: '64px' }}>

    {invoiceModal && (
      <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
        <div style={{ backgroundColor: '#fff', borderRadius: '20px', padding: '24px', maxWidth: '400px', width: '100%' }}>
{/* Başlık */}
<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
    <div style={{ width: '48px', height: '48px', backgroundColor: '#FFF0F0', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>🧾</div>
    <div>
      <p style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 4px' }}>Satış Faturası</p>
      <span style={{ fontSize: '12px', fontWeight: 600, padding: '3px 10px', borderRadius: '20px', backgroundColor: invoiceModal.is_paid ? '#E8F5E9' : '#F2F2F7', color: invoiceModal.is_paid ? '#34C759' : '#6C6C70' }}>
        {invoiceModal.is_paid ? 'TAHSİL EDİLDİ' : 'TASLAK'}
      </span>
    </div>
  </div>
  <span style={{ fontSize: '13px', color: '#6C6C70' }}>Gündüz Bakım</span>
</div>

{/* Müşteri bilgisi */}
<div style={{ backgroundColor: '#F9F9FB', borderRadius: '12px', padding: '14px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
    <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#E5E5EA', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>👤</div>
    <div>
      <p style={{ fontSize: '15px', fontWeight: 600, margin: '0 0 2px' }}>{invoiceModal.pet_name} ({invoiceModal.owner_full_name})</p>
      <p style={{ fontSize: '13px', color: '#6C6C70', margin: 0 }}>Adres...</p>
    </div>
  </div>
  {invoiceModal.service_date && (
    <p style={{ fontSize: '13px', color: '#6C6C70', margin: 0, flexShrink: 0 }}>
      {new Date(invoiceModal.service_date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
    </p>
  )}
</div>

          <div style={{ borderRadius: '12px', border: '1px solid #E5E5EA', overflow: 'hidden', marginBottom: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto', gap: '8px', padding: '10px 14px', backgroundColor: '#F2F2F7' }}>
              {['HİZMET/ÜRÜN', 'MİKTAR', 'BR. FİYAT', 'TOPLAM'].map(h => (
                <p key={h} style={{ fontSize: '11px', fontWeight: 600, color: '#6C6C70', margin: 0 }}>{h}</p>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto', gap: '8px', padding: '12px 14px' }}>
              <p style={{ fontSize: '14px', margin: 0 }}>Kreş Hizmeti</p>
              <p style={{ fontSize: '14px', color: '#6C6C70', margin: 0 }}>1,00 Adet</p>
              <p style={{ fontSize: '14px', margin: 0 }}>₺{fmtCurrency(invoiceModal.total_amount ?? 0)}</p>
              <p style={{ fontSize: '14px', margin: 0 }}>₺{fmtCurrency(invoiceModal.total_amount ?? 0)}</p>
            </div>
          </div>

          <div style={{ padding: '12px 14px', backgroundColor: '#F9F9FB', borderRadius: '12px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ fontSize: '13px', color: '#6C6C70' }}>Ara Toplam</span>
              <span style={{ fontSize: '13px' }}>₺{fmtCurrency(invoiceModal.total_amount ?? 0)}</span>
            </div>
            <div style={{ height: '1px', backgroundColor: '#E5E5EA', margin: '8px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '15px', fontWeight: 700 }}>Genel Toplam</span>
              <span style={{ fontSize: '15px', fontWeight: 700, color: '#007AFF' }}>₺{fmtCurrency(invoiceModal.total_amount ?? 0)}</span>
            </div>
          </div>

{/* Tahsilat */}
{!invoiceModal.is_paid && (
  <div style={{ backgroundColor: '#F9F9FB', borderRadius: '12px', padding: '14px', marginBottom: '16px' }}>
    <p style={{ fontSize: '11px', fontWeight: 600, color: '#6C6C70', margin: '0 0 10px', letterSpacing: '0.5px' }}>TAHSİLAT</p>
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
      <span style={{ fontSize: '16px' }}>📅</span>
      <span style={{ fontSize: '14px', color: '#6C6C70' }}>Tahsilat Tarihi</span>
      <input
        type='date'
        value={paymentDate}
        onChange={e => setPaymentDate(e.target.value)}
        style={{ marginLeft: 'auto', padding: '6px 12px', backgroundColor: '#F2F2F7', borderRadius: '8px', border: 'none', outline: 'none', fontSize: '14px', color: '#007AFF', fontWeight: 600 }}
      />
    </div>
    <button
      onClick={handleMarkPaid}
      disabled={paymentLoading}
      style={{ width: '100%', padding: '13px', borderRadius: '13px', border: 'none', backgroundColor: '#007AFF', color: '#fff', fontSize: '16px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', opacity: paymentLoading ? 0.6 : 1 }}
    >
      ✓ {paymentLoading ? 'Kaydediliyor...' : 'Tahsilat Ekle'}
    </button>
  </div>
)}

<button onClick={() => setInvoiceModal(null)} style={{ width: '100%', padding: '13px', borderRadius: '13px', border: 'none', backgroundColor: '#F2F2F7', color: '#000', fontSize: '16px', fontWeight: 600, cursor: 'pointer' }}>
  Kapat
</button>
        </div>
      </div>
    )}

    <h1 style={{ fontSize: '32px', fontWeight: 800, color: '#000', margin: '0 0 24px' }}>Haftalık Kreş Tablosu</h1>

      {/* Haftalık Tablo */}
      <div style={card}>
        <p style={sectionTitle}>Haftalık Kreş Tablosu</p>

        {loading ? (
          <div style={{ padding: '32px', textAlign: 'center', color: '#6C6C70' }}>Yükleniyor...</div>
        ) : packages.length === 0 ? (
          <div style={{ padding: '32px', textAlign: 'center' }}>
            <p style={{ fontSize: '32px', margin: '0 0 10px' }}>📅</p>
            <p style={{ fontSize: '14px', color: '#6C6C70', margin: 0 }}>Aktif kreş planı olan evcil bulunmuyor</p>
          </div>
        ) : (
          <>
            {/* Gün seçici */}
            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px', marginBottom: '16px' }}>
              {weekDates.map((d, i) => {
                const isSelected = selectedDay === i
                const isToday = d.toDateString() === today.toDateString()
                const hasPackages = packagesForDay(i).length > 0
                return (
                  <button key={i} onClick={() => setSelectedDay(i)} style={{
                    flexShrink: 0, padding: '8px 14px', borderRadius: '14px', cursor: 'pointer', textAlign: 'center', minWidth: '68px',
                    border: isSelected ? '2px solid #007AFF' : isToday ? '2px solid #34C75940' : '1px solid #E5E5EA',
                    backgroundColor: isSelected ? '#007AFF' : isToday ? '#F0FFF4' : '#F2F2F7',
                  }}>
                    <p style={{ fontSize: '13px', fontWeight: 700, color: isSelected ? '#fff' : hasPackages ? '#007AFF' : '#000', margin: 0 }}>{WEEKDAYS[i].short}</p>
                    <p style={{ fontSize: '11px', color: isSelected ? '#ffffffaa' : '#6C6C70', margin: '2px 0 0' }}>{fmtShort(d)}</p>
                  </button>
                )
              })}
            </div>

            {/* Seçili gün başlık */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <p style={{ fontSize: '17px', fontWeight: 700, color: '#000', margin: 0 }}>{WEEKDAYS[selectedDay].label}</p>
              <p style={{ fontSize: '13px', color: '#6C6C70', margin: 0 }}>{dayPackages.length} kayıt</p>
            </div>

            {dayPackages.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', backgroundColor: '#F2F2F7', borderRadius: '12px' }}>
                <p style={{ fontSize: '14px', color: '#6C6C70', margin: 0 }}>Bugün için kayıt yok</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {dayPackages.map(pkg => {
                  const pet = pkg.pets
                  const isSelected = selectedPkg?.id === pkg.id
                  const invoiceBadge = packagePeriodBadge(pkg)
                  const ownerLine = [
                    pet?.customers?.full_name ?? 'Sahip yok',
                    speciesLabel(pet?.species ?? ''),
                    pet?.breed ?? ''
                  ].filter(Boolean).join(' • ')

                  return (
                    <div key={pkg.id} onClick={() => setSelectedPkg(isSelected ? null : pkg)} style={{
                      backgroundColor: isSelected ? '#EBF5FF' : '#007AFF0A',
                      borderRadius: '14px', padding: '14px',
                      border: `${isSelected ? 2 : 1}px solid ${isSelected ? '#007AFF80' : '#007AFF20'}`,
                      cursor: 'pointer',
                      boxShadow: isSelected ? '0 0 0 4px rgba(0,122,255,0.08)' : 'none',
                    }}>
                      {/* Üst satır */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                        <span style={{ fontSize: '22px' }}>{speciesIcon(pet?.species ?? '')}</span>
                        <div style={{ flex: 1 }}>
                          <p style={{ fontSize: '16px', fontWeight: 700, color: '#000', margin: 0 }}>{pet?.name ?? 'İsimsiz'}</p>
                          <p style={{ fontSize: '12px', color: '#6C6C70', margin: '2px 0 0' }}>{ownerLine}</p>
                        </div>
                        <p style={{ fontSize: '14px', fontWeight: 700, color: '#007AFF', margin: 0 }}>₺{fmtCurrency(pkg.price)}</p>
                      </div>

                      {/* Badge satırı */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                        <Badge text='AKTİF' color='green' />
                        <Badge text={invoiceBadge.text} color={invoiceBadge.color} />
                      </div>

                      <div style={{ height: '1px', backgroundColor: '#007AFF20', marginBottom: '8px' }} />

                      {/* Günler */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '12px' }}>📅</span>
                        <p style={{ fontSize: '13px', color: '#6C6C70', margin: 0 }}>{weekdayText(pkg.weekdays_mask)}</p>
                      </div>

                      {/* Genişletilmiş detay */}
                      {isSelected && (
                        <div style={{ marginTop: '10px', padding: '12px', backgroundColor: '#fff', borderRadius: '10px' }}>
                          <p style={{ fontSize: '13px', color: '#6C6C70', margin: '0 0 4px' }}>Başlangıç: {fmtFull(pkg.start_date)}</p>
                          {pet?.customers?.phone && (
                            <p style={{ fontSize: '13px', color: '#6C6C70', margin: '4px 0 0' }}>Tel: {pet.customers.phone}</p>
                          )}
                          {pkg.main_address_text?.trim() && (
                            <p style={{ fontSize: '13px', color: '#6C6C70', margin: '4px 0 0' }}>📍 {pkg.main_address_text}</p>
                          )}
                          {pkg.notes?.trim() && (
                            <p style={{ fontSize: '13px', color: '#6C6C70', margin: '4px 0 0', fontStyle: 'italic' }}>{pkg.notes}</p>
                          )}
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

 {/* Kreş Dönemleri */}
      <div style={card}>
        <p style={sectionTitle}>Kreş Dönemleri</p>
        {periods.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <p style={{ fontSize: '14px', color: '#6C6C70', margin: 0 }}>Henüz dönem oluşmadı</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {periods.map(period => {
              const pkg = packages.find(p => p.id === period.package_id)
              const pet = pkg?.pets
              const isToday = period.period_start === todayStr || 
  new Date(period.period_start + 'T12:00:00').toLocaleDateString('tr-TR') === today.toLocaleDateString('tr-TR')
              const badge = periodBadge(period)
              const total = (period.fee_snapshot ?? 0) - (period.discount_tl ?? 0)

              return (
                <div key={period.id} style={{ backgroundColor: '#F9F9FB', borderRadius: '14px', padding: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                    <span style={{ fontSize: '28px', marginTop: '2px' }}>{speciesIcon(pet?.species ?? '')}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                        <p style={{ fontSize: '16px', fontWeight: 700, color: '#000', margin: 0 }}>{pet?.name ?? 'İsimsiz'}</p>
                        <p style={{ fontSize: '15px', fontWeight: 700, color: '#007AFF', margin: 0, fontVariantNumeric: 'tabular-nums' }}>₺{fmtCurrency(total)}</p>
                      </div>
                      <p style={{ fontSize: '13px', color: '#6C6C70', margin: '0 0 3px' }}>{pet?.customers?.full_name ?? 'Sahip yok'}</p>
                      <p style={{ fontSize: '12px', color: '#6C6C70', margin: '0 0 8px', fontVariantNumeric: 'tabular-nums' }}>
                        {fmtFull(period.period_start)} → {fmtFull(period.period_end)}
                      </p>
     <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
  <Badge text={badge.text} color={badge.color} />
  {isToday && <Badge text='Bugün başladı' color='cyan' />}
  {badge.invoice && (
    <button
      onClick={e => { e.stopPropagation(); setInvoiceModal(badge.invoice) }}
      style={{ fontSize: '11px', fontWeight: 600, padding: '3px 10px', borderRadius: '20px', backgroundColor: '#EBF5FF', color: '#007AFF', border: 'none', cursor: 'pointer' }}>
      Faturayı Aç
    </button>
  )}
  {period.discount_tl > 0 && (
    <span style={{ fontSize: '11px', color: '#FF3B30', fontWeight: 600 }}>
      -₺{fmtCurrency(period.discount_tl)}
    </span>
  )}
</div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}