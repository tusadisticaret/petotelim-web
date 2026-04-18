'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

type Entry = {
  id: string
  pet_name: string
  owner_name: string
  kind: string
  species: number
  size: number
  service_level: number
  service_date: string
  fee: number
  notes: string
}

type GroupMode = 'byName' | 'byDate' | 'byService'

export default function GroomingHistoryPage() {
  const [loading, setLoading] = useState(true)
  const [entries, setEntries] = useState<Entry[]>([])
  const [search, setSearch] = useState('')
  const [groupMode, setGroupMode] = useState<GroupMode>('byName')
  const [businessId, setBusinessId] = useState('')
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() - 90)
    return d.toISOString().split('T')[0]
  })
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split('T')[0])
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set())
  const [selectedEntry, setSelectedEntry] = useState<Entry | null>(null)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: biz } = await supabase.from('businesses').select('id').eq('owner_user_id', user.id).single()
      setBusinessId(biz?.id ?? '')
      const { data } = await supabase
        .from('grooming_entries')
        .select('*')
        .eq('business_id', biz?.id)
        .gte('service_date', dateFrom)
        .lte('service_date', dateTo)
        .order('service_date', { ascending: false })
      setEntries(data ?? [])
      setLoading(false)
    }
    load()
  }, [])

  async function reload() {
    if (!businessId) return
    setLoading(true)
    const supabase = createClient()
    const { data } = await supabase
      .from('grooming_entries')
      .select('*')
      .eq('business_id', businessId)
      .gte('service_date', dateFrom)
      .lte('service_date', dateTo)
      .order('service_date', { ascending: false })
    setEntries(data ?? [])
    setLoading(false)
    setShowDatePicker(false)
  }

  function fmtDate(iso: string) {
    return new Date(iso + 'T12:00:00').toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }

  function fmtCurrency(v: number) {
    return v.toLocaleString('tr-TR', { minimumFractionDigits: 2 })
  }

  const filtered = entries.filter(e => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return e.pet_name?.toLowerCase().includes(q) || e.owner_name?.toLowerCase().includes(q) || e.notes?.toLowerCase().includes(q)
  })

  function groupBy(key: GroupMode) {
    const groups: Record<string, Entry[]> = {}
    filtered.forEach(e => {
      let k = ''
      if (key === 'byName') k = e.pet_name?.trim() || 'Isimsiz'
      else if (key === 'byDate') {
        const d = new Date(e.service_date + 'T12:00:00')
        k = d.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })
      } else k = e.kind === 'trim' ? 'Tiras' : 'Yikama'
      if (!groups[k]) groups[k] = []
      groups[k].push(e)
    })
    return groups
  }

  function toggleGroup(key: string) {
    setOpenGroups(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const groups = groupBy(groupMode)
  const groupKeys = Object.keys(groups).sort((a, b) => a.localeCompare(b, 'tr'))

  const cardStyle: React.CSSProperties = { backgroundColor: '#fff', borderRadius: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', marginBottom: '16px', padding: '20px' }
  const sectionTitle: React.CSSProperties = { fontSize: '17px', fontWeight: 600, color: '#000', margin: '0 0 14px' }

  function segBg(active: boolean): React.CSSProperties {
    return { flex: 1, padding: '8px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 600, backgroundColor: active ? '#fff' : 'transparent', color: active ? '#000' : '#6C6C70', boxShadow: active ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }
  }

  return (
    <div style={{ padding: '32px', maxWidth: '700px', paddingBottom: '64px' }}>
      <h1 style={{ fontSize: '32px', fontWeight: 800, color: '#000', margin: '0 0 24px' }}>Grooming Gecmisi</h1>

      {/* Ara ve Filtrele */}
      <div style={cardStyle}>
        <p style={sectionTitle}>Ara ve Filtrele</p>
        <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder='Hayvan adi / sahip adi' style={{ flex: 1, padding: '8px 12px', backgroundColor: '#F2F2F7', borderRadius: '10px', border: 'none', outline: 'none', fontSize: '15px' }} />
          <button onClick={() => setSearch('')} disabled={!search} style={{ padding: '8px 14px', borderRadius: '10px', border: '1px solid #E5E5EA', backgroundColor: '#fff', color: '#6C6C70', fontSize: '14px', cursor: 'pointer', opacity: search ? 1 : 0.5 }}>Temizle</button>
        </div>
        <div style={{ height: '1px', backgroundColor: '#E5E5EA', marginBottom: '14px' }} />
        <p style={{ fontSize: '12px', color: '#6C6C70', margin: '0 0 8px' }}>Gruplama</p>
        <div style={{ display: 'flex', backgroundColor: '#F2F2F7', borderRadius: '10px', padding: '2px' }}>
          {([['byName', 'Ada gore'], ['byDate', 'Tarihe gore'], ['byService', 'Hizmete gore']] as [GroupMode, string][]).map(([val, label]) => (
            <button key={val} onClick={() => setGroupMode(val)} style={segBg(groupMode === val)}>{label}</button>
          ))}
        </div>
      </div>

      {/* Tarih Araligi */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: showDatePicker ? '14px' : 0 }}>
          <span style={{ fontSize: '16px' }}>📅</span>
          <p style={{ fontSize: '15px', fontWeight: 600, color: '#000', margin: 0, flex: 1 }}>Gosterilen Donem</p>
          <button onClick={() => setShowDatePicker(p => !p)} style={{ padding: '6px 14px', borderRadius: '10px', border: '1px solid #E5E5EA', backgroundColor: '#fff', color: '#007AFF', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}>
            {showDatePicker ? 'Kapat' : 'Degistir'}
          </button>
        </div>

        {showDatePicker ? (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
              <p style={{ fontSize: '12px', color: '#6C6C70', margin: 0, width: '60px' }}>Baslangic</p>
              <input type='date' value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ flex: 1, padding: '8px 12px', backgroundColor: '#F2F2F7', borderRadius: '10px', border: 'none', outline: 'none', fontSize: '14px' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
              <p style={{ fontSize: '12px', color: '#6C6C70', margin: 0, width: '60px' }}>Bitis</p>
              <input type='date' value={dateTo} onChange={e => setDateTo(e.target.value)} style={{ flex: 1, padding: '8px 12px', backgroundColor: '#F2F2F7', borderRadius: '10px', border: 'none', outline: 'none', fontSize: '14px' }} />
            </div>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
              {[['Son 30 gun', -30], ['Son 90 gun', -90], ['Bu yil', 0]].map(([label, days]) => (
                <button key={label} onClick={() => {
                  if (days === 0) {
                    const year = new Date().getFullYear()
                    setDateFrom(`${year}-01-01`)
                  } else {
                    const d = new Date()
                    d.setDate(d.getDate() + (days as number))
                    setDateFrom(d.toISOString().split('T')[0])
                  }
                  setDateTo(new Date().toISOString().split('T')[0])
                }} style={{ flex: 1, padding: '8px', borderRadius: '10px', border: 'none', backgroundColor: '#F2F2F7', color: '#000', fontSize: '12px', fontWeight: 500, cursor: 'pointer' }}>
                  {label}
                </button>
              ))}
            </div>
            <button onClick={reload} style={{ width: '100%', padding: '12px', borderRadius: '12px', backgroundColor: '#007AFF', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: 600 }}>
              🔄 Bu Araligi Yukle
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
            <p style={{ fontSize: '13px', color: '#6C6C70', margin: 0, fontVariantNumeric: 'tabular-nums' }}>{fmtDate(dateFrom)} — {fmtDate(dateTo)}</p>
            <p style={{ fontSize: '12px', color: '#6C6C70', margin: 0 }}>{entries.length} kayit</p>
          </div>
        )}
      </div>

      {/* Gecmis */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <p style={sectionTitle}>Grooming Gecmisi</p>
          <p style={{ fontSize: '13px', color: '#6C6C70', margin: 0 }}>{filtered.length} kayit</p>
        </div>

        {loading ? (
          <div style={{ padding: '32px', textAlign: 'center' }}>
            <p style={{ fontSize: '14px', color: '#6C6C70', margin: 0 }}>Yukleniyor...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '32px', textAlign: 'center' }}>
            <p style={{ fontSize: '32px', margin: '0 0 10px' }}>✂️</p>
            <p style={{ fontSize: '15px', fontWeight: 600, color: '#000', margin: 0 }}>Kayit yok</p>
            <p style={{ fontSize: '13px', color: '#6C6C70', margin: '6px 0 0' }}>Bu filtreye uygun grooming kaydi bulunamadi.</p>
          </div>
        ) : groupKeys.map((key, ki) => (
          <div key={key}>
            <button onClick={() => toggleGroup(key)} style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0' }}>
              <p style={{ fontSize: '15px', fontWeight: 600, color: '#000', margin: 0 }}>{key}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <p style={{ fontSize: '13px', color: '#6C6C70', margin: 0 }}>{groups[key].length} kayit</p>
                <span style={{ fontSize: '11px', color: '#6C6C70' }}>{openGroups.has(key) ? '▲' : '▼'}</span>
              </div>
            </button>

            {openGroups.has(key) && (
              <div style={{ paddingBottom: '8px' }}>
                {groups[key].map(entry => (
                  <div key={entry.id} onClick={() => setSelectedEntry(selectedEntry?.id === entry.id ? null : entry)} style={{ backgroundColor: '#F2F2F7', borderRadius: '12px', padding: '12px 14px', marginBottom: '8px', cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: entry.species === 1 ? '#FF950020' : '#007AFF20', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>
                        {entry.species === 1 ? '🐱' : '🐶'}
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: '14px', fontWeight: 600, color: '#000', margin: 0 }}>{entry.pet_name}</p>
                        <p style={{ fontSize: '12px', color: '#6C6C70', margin: '2px 0 0' }}>{entry.owner_name}</p>
                      </div>
                      <span style={{ fontSize: '11px', fontWeight: 600, padding: '3px 10px', borderRadius: '20px', backgroundColor: entry.kind === 'trim' ? '#AF52DE20' : '#007AFF20', color: entry.kind === 'trim' ? '#AF52DE' : '#007AFF' }}>
                        {entry.kind === 'trim' ? 'Tiras' : 'Yikama'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <p style={{ fontSize: '13px', color: '#6C6C70', margin: 0 }}>
                        {fmtDate(entry.service_date)} • {entry.service_level === 1 ? 'VIP' : 'Normal'}
                      </p>
                      <p style={{ fontSize: '14px', fontWeight: 600, color: '#000', margin: 0, fontVariantNumeric: 'tabular-nums' }}>₺{fmtCurrency(entry.fee)}</p>
                    </div>
                    {entry.notes?.trim() && (
                      <p style={{ fontSize: '12px', color: '#6C6C70', margin: '6px 0 0' }}>{entry.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
            {ki < groupKeys.length - 1 && <div style={{ height: '1px', backgroundColor: '#E5E5EA', margin: '4px 0' }} />}
          </div>
        ))}
      </div>
    </div>
  )
}