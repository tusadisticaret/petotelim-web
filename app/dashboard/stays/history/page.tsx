'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

type Stay = {
  id: string
  pet_id: string
  check_in_date: string
  actual_check_out_date: string
  planned_check_out_date: string | null
  daily_price: number
  washing_fee: number
  grooming_fee: number
  food_fee: number
  transfer_fee: number
  discount_tl: number
  notes: string
  is_reservation: boolean
  pets: {
    name: string
    species: string
    breed: string | null
    owner_full_name: string | null
    owner_phone: string | null
    customers: { full_name: string | null; phone: string | null } | null
  } | null
}

type GroupMode = 'name' | 'owner' | 'date'
type StayType = 'all' | 'daily' | 'long'
type PeriodPreset = 'all' | 'last30' | 'last90' | 'thisYear'

function fmtDate(d: string | null) {
  if (!d) return '—'
  const clean = d.includes('T') ? d : d + 'T12:00:00'
  const date = new Date(clean)
  if (isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function fmtCurrency(v: number) {
  return v.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function calcNights(stay: Stay) {
  const cin = new Date(stay.check_in_date)
  const cout = new Date(stay.actual_check_out_date)
  const diff = Math.round((cout.getTime() - cin.getTime()) / (1000 * 60 * 60 * 24))
  return Math.max(1, diff === 0 ? 1 : diff)
}

function calcTotal(stay: Stay) {
  const nights = calcNights(stay)
  const subtotal = nights * stay.daily_price + stay.washing_fee + stay.grooming_fee + stay.food_fee + stay.transfer_fee
  return Math.max(0, subtotal - stay.discount_tl)
}

function ownerName(stay: Stay) {
  return stay.pets?.customers?.full_name ?? stay.pets?.owner_full_name ?? 'Sahip yok'
}

function speciesIcon(species: string) {
  const s = species.toLowerCase()
  if (s === 'cat' || s === 'kedi') return '🐈'
  if (s === 'dog' || s === 'köpek' || s === 'kopek') return '🐕'
  return '🐇'
}

function speciesColor(species: string) {
  const s = species.toLowerCase()
  if (s === 'cat' || s === 'kedi') return '#FF9500'
  if (s === 'dog' || s === 'köpek' || s === 'kopek') return '#007AFF'
  return '#9B59B6'
}

function speciesLabel(species: string) {
  const s = species.toLowerCase()
  if (s === 'cat' || s === 'kedi') return 'Kedi'
  if (s === 'dog' || s === 'köpek' || s === 'kopek') return 'Köpek'
  return 'Diğer'
}

export default function StayHistoryPage() {
  const [stays, setStays] = useState<Stay[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [groupMode, setGroupMode] = useState<GroupMode>('name')
  const [stayType, setStayType] = useState<StayType>('all')
  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>('last90')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const [expandedStays, setExpandedStays] = useState<Set<string>>(new Set())

  const today = new Date()

  useEffect(() => {
    loadStays()
  }, [periodPreset, fromDate, toDate])

  async function loadStays() {
    setLoading(true)
    const supabase = createClient()
    let user
    try {
      const { data } = await supabase.auth.getUser()
      user = data.user
    } catch {
      setLoading(false)
      return
    }
    if (!user) { setLoading(false); return }

    const { data: bizData } = await supabase.from('businesses').select('id').eq('owner_user_id', user.id).single()
    const bizId = bizData?.id ?? ''
    if (!bizId) { setLoading(false); return }

    let from: Date
    const to: Date = new Date(today)

    if (periodPreset === 'all') {
      from = new Date('2020-01-01')
    } else if (periodPreset === 'last30') {
      from = new Date(today); from.setDate(from.getDate() - 30)
    } else if (periodPreset === 'last90') {
      from = new Date(today); from.setDate(from.getDate() - 90)
    } else if (periodPreset === 'thisYear') {
      from = new Date(today.getFullYear(), 0, 1)
    } else {
      from = fromDate ? new Date(fromDate) : new Date(today)
      if (!fromDate) from.setDate(from.getDate() - 90)
    }

    const { data } = await supabase
      .from('stays')
      .select('*, pets(name, species, breed, owner_full_name, owner_phone, customers(full_name, phone))')
      .eq('business_id', bizId)
      .eq('is_reservation', false)
      .not('actual_check_out_date', 'is', null)
      .gte('actual_check_out_date', from.toISOString())
      .lte('actual_check_out_date', to.toISOString())
      .order('actual_check_out_date', { ascending: false })

    setStays((data as any) ?? [])
    setLoading(false)
  }

  function applyPreset(preset: PeriodPreset) {
    setPeriodPreset(preset)
    setShowDatePicker(false)
  }

  const filtered = stays.filter(s => {
    const q = search.toLowerCase()
    if (q) {
      const petName = (s.pets?.name ?? '').toLowerCase()
      const owner = ownerName(s).toLowerCase()
      if (!petName.includes(q) && !owner.includes(q)) return false
    }
    if (stayType === 'daily' && s.planned_check_out_date) return false
    if (stayType === 'long' && !s.planned_check_out_date) return false
    return true
  })

  type GroupItem = { key: string; label: string; stays: Stay[]; totalNights: number; totalRevenue: number }

  function buildGroups(): GroupItem[] {
    const map = new Map<string, Stay[]>()

    filtered.forEach(s => {
      let key = ''
      if (groupMode === 'name') key = s.pets?.name ?? 'Bilinmiyor'
      else if (groupMode === 'owner') key = ownerName(s)
      else if (groupMode === 'date') {
        const d = new Date(s.actual_check_out_date)
        key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      }
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(s)
    })

    return Array.from(map.entries()).map(([key, stays]) => {
      let label = key
      if (groupMode === 'date') {
        const [year, month] = key.split('-')
        const monthName = new Date(parseInt(year), parseInt(month) - 1, 1).toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })
        label = monthName.charAt(0).toUpperCase() + monthName.slice(1)
      }
      const totalNights = stays.reduce((a, s) => a + calcNights(s), 0)
      const totalRevenue = stays.reduce((a, s) => a + calcTotal(s), 0)
      return { key, label, stays, totalNights, totalRevenue }
    }).sort((a, b) => {
      if (groupMode === 'date') return b.key.localeCompare(a.key)
      return a.label.localeCompare(b.label, 'tr')
    })
  }

  const groups = buildGroups()
  const totalNights = filtered.reduce((a, s) => a + calcNights(s), 0)

  function toggleGroup(key: string) {
    setExpandedGroups(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function toggleStay(id: string) {
    setExpandedStays(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function periodLabel() {
    if (periodPreset === 'all') return 'Tüm zamanlar'
    if (periodPreset === 'last30') return 'Son 30 gün'
    if (periodPreset === 'last90') return 'Son 90 gün'
    if (periodPreset === 'thisYear') return 'Bu yıl'
    return 'Özel aralık'
  }

  function periodRange() {
    let from: Date
    const to = new Date(today)
    if (periodPreset === 'all') return 'Tüm kayıtlar'
    if (periodPreset === 'last30') { from = new Date(today); from.setDate(from.getDate() - 30) }
    else if (periodPreset === 'last90') { from = new Date(today); from.setDate(from.getDate() - 90) }
    else if (periodPreset === 'thisYear') { from = new Date(today.getFullYear(), 0, 1) }
    else { return `${fmtDate(fromDate)} — ${fmtDate(toDate)}` }
    return `${fmtDate(from.toISOString().split('T')[0])} — ${fmtDate(to.toISOString().split('T')[0])}`
  }

  const card: React.CSSProperties = { backgroundColor: '#fff', borderRadius: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', marginBottom: '16px', padding: '20px' }
  const sectionTitle: React.CSSProperties = { fontSize: '17px', fontWeight: 700, color: '#000', margin: '0 0 14px' }
  const segBg = (active: boolean): React.CSSProperties => ({ padding: '8px 16px', borderRadius: '20px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 600, backgroundColor: active ? '#007AFF' : '#F2F2F7', color: active ? '#fff' : '#000', transition: 'all 0.15s', whiteSpace: 'nowrap' })
  const labelStyle: React.CSSProperties = { fontSize: '12px', color: '#6C6C70', marginBottom: '6px' }

  return (
    <div style={{ padding: '32px', maxWidth: '700px', paddingBottom: '64px' }}>
      <h1 style={{ fontSize: '32px', fontWeight: 800, color: '#000', margin: '0 0 24px' }}>Konaklama Geçmişi</h1>

      <div style={card}>
        <p style={sectionTitle}>Ara ve Filtrele</p>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          <input
            type='text'
            placeholder='Hayvan adı / sahip adı soyadı...'
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ flex: 1, padding: '10px 14px', backgroundColor: '#F2F2F7', borderRadius: '10px', border: 'none', outline: 'none', fontSize: '15px' }}
          />
          <button
            onClick={() => setSearch('')}
            style={{ padding: '10px 16px', backgroundColor: '#F2F2F7', borderRadius: '10px', border: 'none', cursor: 'pointer', fontSize: '14px', color: '#6C6C70', fontWeight: 600 }}
          >
            Temizle
          </button>
        </div>

        <p style={labelStyle}>Gruplama</p>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
          {([['name', 'Ada göre'], ['owner', 'Sahibine göre'], ['date', 'Tarihe göre']] as [GroupMode, string][]).map(([val, label]) => (
            <button key={val} onClick={() => setGroupMode(val as GroupMode)} style={segBg(groupMode === val)}>{label}</button>
          ))}
        </div>

        <p style={labelStyle}>Kayıt tipi</p>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
          {([['all', 'Tümü'], ['daily', 'Günlük'], ['long', 'Uzun']] as [StayType, string][]).map(([val, label]) => (
            <button key={val} onClick={() => setStayType(val as StayType)} style={segBg(stayType === val)}>{label}</button>
          ))}
        </div>
      </div>

      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '18px' }}>📅</span>
            <span style={{ fontSize: '16px', fontWeight: 700, color: '#000' }}>Gösterilen Dönem</span>
          </div>
          <button
            onClick={() => setShowDatePicker(!showDatePicker)}
            style={{ padding: '6px 14px', backgroundColor: '#F2F2F7', borderRadius: '20px', border: 'none', cursor: 'pointer', fontSize: '14px', color: '#007AFF', fontWeight: 600 }}
          >
            {showDatePicker ? 'Kapat' : 'Değiştir'}
          </button>
        </div>

        {!showDatePicker && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '14px', color: '#6C6C70' }}>{periodRange()}</span>
            <span style={{ fontSize: '13px', color: '#6C6C70', fontWeight: 600 }}>{filtered.length} kayıt</span>
          </div>
        )}

        {showDatePicker && (
          <div>
            <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
              <div style={{ flex: 1 }}>
                <p style={labelStyle}>Başlangıç</p>
                <input type='date' value={fromDate} onChange={e => { setFromDate(e.target.value); setPeriodPreset('all') }}
                  style={{ width: '100%', padding: '8px 12px', backgroundColor: '#F2F2F7', borderRadius: '10px', border: 'none', outline: 'none', fontSize: '15px', color: '#007AFF', fontWeight: 600, boxSizing: 'border-box' }} />
              </div>
              <div style={{ flex: 1 }}>
                <p style={labelStyle}>Bitiş</p>
                <input type='date' value={toDate} onChange={e => { setToDate(e.target.value); setPeriodPreset('all') }}
                  style={{ width: '100%', padding: '8px 12px', backgroundColor: '#F2F2F7', borderRadius: '10px', border: 'none', outline: 'none', fontSize: '15px', color: '#007AFF', fontWeight: 600, boxSizing: 'border-box' }} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
              {([['last30', 'Son 30 gün'], ['last90', 'Son 90 gün'], ['thisYear', 'Bu yıl'], ['all', 'Tüm zamanlar']] as [PeriodPreset, string][]).map(([val, label]) => (
                <button key={val} onClick={() => applyPreset(val as PeriodPreset)}
                  style={{ padding: '7px 14px', borderRadius: '20px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 600, backgroundColor: periodPreset === val ? '#007AFF' : '#F2F2F7', color: periodPreset === val ? '#fff' : '#6C6C70' }}>
                  {label}
                </button>
              ))}
            </div>

            <button onClick={() => { loadStays(); setShowDatePicker(false) }}
              style={{ width: '100%', backgroundColor: '#007AFF', color: '#fff', padding: '13px', borderRadius: '13px', border: 'none', cursor: 'pointer', fontSize: '16px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              🔄 Bu Aralığı Yükle
            </button>
          </div>
        )}
      </div>

      <div style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <p style={{ ...sectionTitle, margin: 0 }}>Konaklama Geçmişi</p>
          {!loading && <span style={{ fontSize: '13px', color: '#6C6C70', fontWeight: 600 }}>{totalNights} gece toplam</span>}
        </div>

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#6C6C70', fontSize: '15px' }}>Yükleniyor...</div>
        ) : groups.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>🐾</div>
            <p style={{ fontSize: '15px', color: '#6C6C70', margin: 0 }}>Bu dönemde kayıt bulunamadı.</p>
          </div>
        ) : groups.map(group => {
          const isOpen = expandedGroups.has(group.key)
          return (
            <div key={group.key} style={{ marginBottom: '4px' }}>
              <button onClick={() => toggleGroup(group.key)}
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 4px', background: 'none', border: 'none', cursor: 'pointer', borderBottom: '1px solid #F2F2F7' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {groupMode === 'date' && <span style={{ fontSize: '16px' }}>📅</span>}
                  <span style={{ fontSize: '16px', fontWeight: 700, color: '#000' }}>{group.label}</span>
                  <span style={{ fontSize: '13px', color: '#6C6C70' }}>({group.totalNights} gece)</span>
                </div>
                <span style={{ fontSize: '18px', color: '#C7C7CC', display: 'inline-block', transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>⌄</span>
              </button>

              {isOpen && group.stays.map(stay => {
                const isStayOpen = expandedStays.has(stay.id)
                const nights = calcNights(stay)
                const total = calcTotal(stay)
                const color = speciesColor(stay.pets?.species ?? '')
                const isLong = !!stay.planned_check_out_date

                return (
                  <div key={stay.id} style={{ marginLeft: '12px', marginTop: '4px', backgroundColor: '#F9F9FB', borderRadius: '12px', overflow: 'hidden', marginBottom: '6px' }}>
                    <button onClick={() => toggleStay(stay.id)}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>
                        {speciesIcon(stay.pets?.species ?? '')}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '15px', fontWeight: 600, color: '#000' }}>
                            {stay.pets?.name ?? '—'} / {ownerName(stay).split(' ')[0]}{ownerName(stay).split(' ').length > 1 ? ' ' + ownerName(stay).split(' ')[1]?.charAt(0) + '.' : ''}
                          </span>
                          <span style={{ fontSize: '11px', backgroundColor: isLong ? '#E8F5E9' : '#EBF5FF', color: isLong ? '#34C759' : '#007AFF', padding: '2px 8px', borderRadius: '20px', fontWeight: 600 }}>
                            {isLong ? 'UZUN' : 'GÜNLÜK'}
                          </span>
                        </div>
                        <p style={{ fontSize: '12px', color: '#6C6C70', margin: '3px 0 0' }}>
                          {speciesLabel(stay.pets?.species ?? '')} • {stay.pets?.breed ?? 'Irk yok'}
                        </p>
                        <p style={{ fontSize: '12px', color: '#6C6C70', margin: '2px 0 0' }}>
                          {fmtDate(stay.check_in_date)} → {fmtDate(stay.actual_check_out_date)} ({nights} gece)
                        </p>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <p style={{ fontSize: '15px', fontWeight: 700, color: '#007AFF', margin: 0 }}>₺{fmtCurrency(total)}</p>
                        <span style={{ fontSize: '18px', color: '#C7C7CC', display: 'block', transform: isStayOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>⌄</span>
                      </div>
                    </button>

                    {isStayOpen && (
                      <div style={{ padding: '0 12px 12px', borderTop: '1px solid #E5E5EA' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '10px' }}>
                          {[
                            ['Konaklama', `${nights} × ₺${fmtCurrency(stay.daily_price)}`],
                            ['Yıkama', stay.washing_fee > 0 ? `₺${fmtCurrency(stay.washing_fee)}` : '—'],
                            ['Grooming', stay.grooming_fee > 0 ? `₺${fmtCurrency(stay.grooming_fee)}` : '—'],
                            ['Mama', stay.food_fee > 0 ? `₺${fmtCurrency(stay.food_fee)}` : '—'],
                            ['Transfer', stay.transfer_fee > 0 ? `₺${fmtCurrency(stay.transfer_fee)}` : '—'],
                            ['İndirim', stay.discount_tl > 0 ? `-₺${fmtCurrency(stay.discount_tl)}` : '—'],
                          ].map(([label, value]) => (
                            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                              <span style={{ color: '#6C6C70' }}>{label}</span>
                              <span style={{ fontWeight: 600, color: label === 'İndirim' ? '#FF3B30' : '#000' }}>{value}</span>
                            </div>
                          ))}
                        </div>
                        <div style={{ height: '1px', backgroundColor: '#E5E5EA', margin: '10px 0' }} />
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px', fontWeight: 700 }}>
                          <span style={{ color: '#6C6C70' }}>Toplam</span>
                          <span style={{ color: '#007AFF' }}>₺{fmtCurrency(total)}</span>
                        </div>
                        {stay.notes?.trim() && (
                          <p style={{ fontSize: '12px', color: '#6C6C70', margin: '8px 0 0', fontStyle: 'italic' }}>Not: {stay.notes}</p>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}