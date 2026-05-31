'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

const BUSINESS_ID = 'a59e232c-3334-43c7-94b4-7f3da311b01d'

const TYPE_OPTIONS = [
  { value: 'all', label: 'Tümü' },
  { value: 'stay', label: 'Günlük Konaklama' },
  { value: 'longstay', label: 'Uzun Konaklama' },
  { value: 'daycare', label: 'Gündüz Bakım' },
  { value: 'grooming', label: 'Grooming' },
  { value: 'quick', label: 'Hızlı Satış' },
  { value: 'urun', label: 'Ürün Satışı' },
  { value: 'karma', label: 'Karma' },
  { value: 'diger', label: 'Diğer' },
]

const STATUS_OPTIONS = [
  { value: 'all', label: 'Tümü' },
  { value: 'unpaid', label: 'Bekleyen' },
  { value: 'today', label: 'Bugün Tahsil' },
  { value: 'paid', label: 'Tahsil Edildi' },
]

function getTypeKey(sourceRef: string): string {
  if (!sourceRef) return 'diger'
  const lower = sourceRef.toLowerCase()
  if (lower.includes('longstay')) return 'longstay'
  if (lower.includes('stay')) return 'stay'
  if (sourceRef.includes('daycare')) return 'daycare'
  if (sourceRef.includes('grooming')) return 'grooming'
  if (sourceRef.includes('quickSale') || sourceRef.includes('quick')) return 'quick'
  if (sourceRef.includes('urun') || sourceRef.includes('product') || sourceRef.includes('stock')) return 'urun'
  if (sourceRef.includes('karma')) return 'karma'
  return 'diger'
}

function getTypeBadge(sourceRef: string): { label: string; color: string; bg: string } {
  const key = getTypeKey(sourceRef)
  switch (key) {
    case 'stay': return { label: 'GÜNLÜK', color: '#FF9500', bg: '#FF95001A' }
    case 'longstay': return { label: 'UZUN', color: '#AF52DE', bg: '#AF52DE1A' }
    case 'daycare': return { label: 'KREŞ', color: '#34C759', bg: '#34C7591A' }
    case 'grooming': return { label: 'GRMMG', color: '#007AFF', bg: '#007AFF1A' }
    case 'quick': return { label: 'SATIŞ', color: '#FF3B30', bg: '#FF3B301A' }
    case 'urun': return { label: 'ÜRÜN', color: '#5856D6', bg: '#5856D61A' }
    case 'karma': return { label: 'KARMA', color: '#FF9500', bg: '#FF95001A' }
    default: return { label: 'DİĞER', color: '#6C6C70', bg: '#6C6C701A' }
  }
}

function fmtCurrency(v: number) {
  return '₺' + v.toLocaleString('tr-TR', { minimumFractionDigits: 2 })
}

function fmtDate(s: string) {
  if (!s) return ''
  const d = new Date(s.length === 10 ? s + 'T12:00:00' : s)
  return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })
}

function daysDiff(dateStr: string): number {
  const d = new Date(dateStr.length === 10 ? dateStr + 'T12:00:00' : dateStr)
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  d.setHours(0, 0, 0, 0)
  return Math.floor((now.getTime() - d.getTime()) / 86400000)
}

function isToday(dateStr: string): boolean {
  if (!dateStr) return false
  const d = new Date(dateStr.length === 10 ? dateStr + 'T12:00:00' : dateStr)
  const now = new Date()
  return d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
}

export default function SatisPage() {
  const [invoices, setInvoices] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeOpen, setTypeOpen] = useState(false)
  const [statusOpen, setStatusOpen] = useState(false)
  const [bekleyenOpen, setBekleyenOpen] = useState(true)
  const [tahsilOpen, setTahsilOpen] = useState(true)
  const [newOpen, setNewOpen] = useState(false)
  const [marking, setMarking] = useState<string | null>(null)
  const [selectedInv, setSelectedInv] = useState<any | null>(null)

  const [newOwner, setNewOwner] = useState('')
  const [newPet, setNewPet] = useState('')
  const [newType, setNewType] = useState('diger')
  const [newDate, setNewDate] = useState(new Date().toISOString().slice(0, 10))
  const [newDesc, setNewDesc] = useState('')
  const [newAmount, setNewAmount] = useState('')
  const [newDiscount, setNewDiscount] = useState('')
  const [newNote, setNewNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [customerSearch, setCustomerSearch] = useState('')
  const [customers, setCustomers] = useState<any[]>([])

  const typeRef = useRef<HTMLDivElement>(null)
  const statusRef = useRef<HTMLDivElement>(null)

  useEffect(() => { load() }, [])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (typeRef.current && !typeRef.current.contains(e.target as Node)) setTypeOpen(false)
      if (statusRef.current && !statusRef.current.contains(e.target as Node)) setStatusOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function load() {
    setLoading(true)
    const supabase = createClient()
    const { data } = await supabase
      .from('sales_invoices')
      .select('*')
      .eq('business_id', BUSINESS_ID)
      .order('service_date', { ascending: false })
    setInvoices(data ?? [])
    const { data: pets } = await supabase
      .from('pets')
      .select('id, name, owner_full_name, owner_phone, species')
      .eq('business_id', BUSINESS_ID)
    setCustomers(pets ?? [])
    setLoading(false)
  }

  async function markAsPaid(inv: any) {
    setMarking(inv.id)
    const supabase = createClient()
    const now = new Date().toISOString()
    await supabase.from('sales_invoices').update({
      is_paid: true,
      paid_at: now,
      amount_paid: inv.total_amount,
    }).eq('id', inv.id)
    const updated = { ...inv, is_paid: true, paid_at: now }
    setInvoices(prev => prev.map(i => i.id === inv.id ? updated : i))
    if (selectedInv?.id === inv.id) setSelectedInv(updated)
    setMarking(null)
  }

  async function saveInvoice() {
    if (!newOwner.trim() && !newPet.trim()) { alert('Lütfen en az sahip adı veya hayvan adı girin.'); return }
    if (!newAmount || parseFloat(newAmount) <= 0) { alert('Lütfen geçerli bir tutar girin.'); return }
    if (!newDate) { alert('Lütfen tarih seçin.'); return }
    setSaving(true)
    const supabase = createClient()
    const amount = parseFloat(newAmount)
    const discount = parseFloat(newDiscount) || 0
    const total = Math.max(0, amount - discount)

    const sourceRefMap: Record<string, string> = {
      stay: 'stay:manual',
      longstay: 'longStay:manual',
      daycare: 'daycare:manual',
      grooming: 'grooming:manual',
      quick: 'quickSale:manual',
      urun: 'stock:manual',
      karma: 'manual',
      diger: 'manual',
    }

const prefix = sourceRefMap[newType] ?? 'manual'
const tempId = crypto.randomUUID()
const uniqueRef = `${prefix}:${tempId}`

const { data: inserted } = await supabase.from('sales_invoices').insert({
  business_id: BUSINESS_ID,
  owner_full_name: newOwner || null,
  pet_name: newPet || null,
  total_amount: total,
  is_paid: false,
  service_date: newDate,
  notes: newNote || '',
  source_ref: uniqueRef,
}).select().single()

    if (inserted) setInvoices(prev => [inserted, ...prev])
    setNewOpen(false)
    setNewOwner(''); setNewPet(''); setNewType('diger')
    setNewDate(new Date().toISOString().slice(0, 10))
    setNewDesc(''); setNewAmount(''); setNewDiscount(''); setNewNote('')
    setSaving(false)
  }

  const filtered = invoices.filter(inv => {
    const q = search.toLowerCase()
    const matchSearch = !q ||
      (inv.owner_full_name ?? '').toLowerCase().includes(q) ||
      (inv.pet_name ?? '').toLowerCase().includes(q)
    const matchType = typeFilter === 'all' || getTypeKey(inv.source_ref ?? '') === typeFilter
    let matchStatus = true
    if (statusFilter === 'unpaid') matchStatus = !inv.is_paid
    else if (statusFilter === 'paid') matchStatus = inv.is_paid
    else if (statusFilter === 'today') matchStatus = inv.is_paid && isToday(inv.paid_at ?? '')
    return matchSearch && matchType && matchStatus
  })

  const bekleyen = filtered.filter(i => !i.is_paid)
  const tahsil = filtered.filter(i => i.is_paid)
  const totalUnpaid = invoices.filter(i => !i.is_paid).reduce((s, i) => s + (i.total_amount ?? 0), 0)
  const unpaidCount = invoices.filter(i => !i.is_paid).length
  const typeLabel = TYPE_OPTIONS.find(o => o.value === typeFilter)?.label ?? 'Tür'
  const statusLabel = STATUS_OPTIONS.find(o => o.value === statusFilter)?.label ?? 'Durum'

  return (
    <div style={{ padding: '32px', maxWidth: '900px', paddingBottom: '80px' }}>
      <h1 style={{ fontSize: '34px', fontWeight: 800, color: '#000', margin: '0 0 20px', letterSpacing: '-0.5px' }}>
        Satış Faturaları
      </h1>

      <div style={{ position: 'relative', marginBottom: '12px' }}>
        <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', fontSize: '15px', color: '#8E8E93' }}>🔍</span>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="İçerisinde ara..." style={{ width: '100%', boxSizing: 'border-box', padding: '11px 14px 11px 38px', borderRadius: '12px', border: 'none', backgroundColor: '#F2F2F7', fontSize: '15px', color: '#000', outline: 'none' }} />
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', alignItems: 'center' }}>
        <div ref={typeRef} style={{ position: 'relative' }}>
          <button onClick={() => { setTypeOpen(o => !o); setStatusOpen(false) }} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 14px', borderRadius: '10px', border: '1.5px solid #E5E5EA', backgroundColor: typeFilter !== 'all' ? '#007AFF10' : '#fff', color: typeFilter !== 'all' ? '#007AFF' : '#000', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>
            <span style={{ fontSize: '13px' }}>⊜</span>{typeFilter === 'all' ? 'Tür' : typeLabel}<span style={{ fontSize: '10px', color: '#8E8E93' }}>▾</span>
          </button>
          {typeOpen && (
            <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 100, backgroundColor: '#fff', borderRadius: '14px', boxShadow: '0 4px 20px rgba(0,0,0,0.15)', minWidth: '200px', overflow: 'hidden' }}>
              {TYPE_OPTIONS.map((opt, i) => (
                <div key={opt.value}>
                  <button onClick={() => { setTypeFilter(opt.value); setTypeOpen(false) }} style={{ width: '100%', textAlign: 'left', padding: '13px 18px', border: 'none', cursor: 'pointer', backgroundColor: typeFilter === opt.value ? '#007AFF08' : '#fff', color: typeFilter === opt.value ? '#007AFF' : '#000', fontSize: '16px', fontWeight: typeFilter === opt.value ? 600 : 400, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    {opt.label}{typeFilter === opt.value && <span style={{ color: '#007AFF', fontSize: '14px' }}>✓</span>}
                  </button>
                  {i < TYPE_OPTIONS.length - 1 && <div style={{ height: '1px', backgroundColor: '#F2F2F7', margin: '0 18px' }} />}
                </div>
              ))}
            </div>
          )}
        </div>

        <div ref={statusRef} style={{ position: 'relative' }}>
          <button onClick={() => { setStatusOpen(o => !o); setTypeOpen(false) }} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 14px', borderRadius: '10px', border: '1.5px solid #E5E5EA', backgroundColor: statusFilter !== 'all' ? '#007AFF10' : '#fff', color: statusFilter !== 'all' ? '#007AFF' : '#000', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>
            <span style={{ fontSize: '13px' }}>☰</span>{statusFilter === 'all' ? 'Durum' : statusLabel}<span style={{ fontSize: '10px', color: '#8E8E93' }}>▾</span>
          </button>
          {statusOpen && (
            <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 100, backgroundColor: '#fff', borderRadius: '14px', boxShadow: '0 4px 20px rgba(0,0,0,0.15)', minWidth: '200px', overflow: 'hidden' }}>
              {STATUS_OPTIONS.map((opt, i) => (
                <div key={opt.value}>
                  <button onClick={() => { setStatusFilter(opt.value); setStatusOpen(false) }} style={{ width: '100%', textAlign: 'left', padding: '13px 18px', border: 'none', cursor: 'pointer', backgroundColor: statusFilter === opt.value ? '#007AFF08' : '#fff', color: statusFilter === opt.value ? '#007AFF' : '#000', fontSize: '16px', fontWeight: statusFilter === opt.value ? 600 : 400, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    {opt.label}{statusFilter === opt.value && <span style={{ color: '#007AFF', fontSize: '14px' }}>✓</span>}
                  </button>
                  {i < STATUS_OPTIONS.length - 1 && <div style={{ height: '1px', backgroundColor: '#F2F2F7', margin: '0 18px' }} />}
                </div>
              ))}
            </div>
          )}
        </div>

        <button onClick={() => setNewOpen(true)} style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 18px', borderRadius: '10px', border: 'none', backgroundColor: '#007AFF', color: '#fff', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}>
          + Yeni Fatura
        </button>
      </div>

      {unpaidCount > 0 && (
        <div style={{ backgroundColor: '#FFF3E0', border: '1px solid #FFD9A0', borderRadius: '14px', padding: '14px 18px', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '22px' }}>⏰</span>
            <div>
              <p style={{ margin: 0, fontSize: '12px', color: '#8E6A00', fontWeight: 500 }}>Tahsil Edilecek</p>
              <p style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: '#FF9500' }}>{fmtCurrency(totalUnpaid)}</p>
            </div>
          </div>
          <p style={{ margin: 0, fontSize: '13px', color: '#8E6A00', fontWeight: 500 }}>{unpaidCount} bekleyen fatura</p>
        </div>
      )}

      {loading ? (
        <div style={{ padding: '60px', textAlign: 'center' }}><p style={{ color: '#8E8E93', fontSize: '15px' }}>Yükleniyor...</p></div>
      ) : (
        <>
          {bekleyen.length > 0 && (
            <div style={{ marginBottom: '8px' }}>
              <button onClick={() => setBekleyenOpen(o => !o)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 4px', border: 'none', background: 'none', cursor: 'pointer' }}>
                <span style={{ fontSize: '17px', fontWeight: 700, color: '#000' }}>Bekleyen</span>
                <span style={{ fontSize: '14px', color: '#8E8E93' }}>{bekleyenOpen ? '▲' : '▼'}</span>
              </button>
              {bekleyenOpen && (
                <div style={{ backgroundColor: '#fff', borderRadius: '14px', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
                  {bekleyen.map((inv, idx) => (
                    <InvoiceRow key={inv.id} inv={inv} isLast={idx === bekleyen.length - 1} onOpen={() => setSelectedInv(inv)} />
                  ))}
                </div>
              )}
            </div>
          )}

          {tahsil.length > 0 && (
            <div style={{ marginTop: bekleyen.length > 0 ? '16px' : '0' }}>
              <button onClick={() => setTahsilOpen(o => !o)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 4px', border: 'none', background: 'none', cursor: 'pointer' }}>
                <span style={{ fontSize: '17px', fontWeight: 700, color: '#000' }}>Tahsil Edildi</span>
                <span style={{ fontSize: '14px', color: '#8E8E93' }}>{tahsilOpen ? '▲' : '▼'}</span>
              </button>
              {tahsilOpen && (
                <div style={{ backgroundColor: '#fff', borderRadius: '14px', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
                  {tahsil.map((inv, idx) => (
                    <InvoiceRow key={inv.id} inv={inv} isLast={idx === tahsil.length - 1} onOpen={() => setSelectedInv(inv)} />
                  ))}
                </div>
              )}
            </div>
          )}

          {filtered.length === 0 && (
            <div style={{ padding: '60px', textAlign: 'center' }}>
              <p style={{ fontSize: '32px', margin: '0 0 10px' }}>📄</p>
              <p style={{ color: '#8E8E93', fontSize: '15px', margin: 0 }}>Kayıt bulunamadı</p>
            </div>
          )}
        </>
      )}

      {/* Fatura Detay Modal */}
      {selectedInv && (

<InvoiceDetailModal
  inv={selectedInv}
  marking={marking === selectedInv.id}
  onMark={() => markAsPaid(selectedInv)}
  onClose={() => setSelectedInv(null)}
  onDelete={(id) => setInvoices(prev => prev.filter(i => i.id !== id))}
  onUpdate={(updated) => { setInvoices(prev => prev.map(i => i.id === updated.id ? updated : i)); setSelectedInv(updated) }}
/>
      )}

      {/* Yeni Fatura Modal */}
      {newOpen && (
        <div onClick={e => { if (e.target === e.currentTarget) setNewOpen(false) }} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ backgroundColor: '#F2F2F7', borderRadius: '20px', width: '100%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto', padding: '0 0 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px', borderBottom: '1px solid #E5E5EA', backgroundColor: '#F2F2F7', position: 'sticky', top: 0, zIndex: 1, borderRadius: '20px 20px 0 0' }}>
              <button onClick={() => setNewOpen(false)} style={{ padding: '8px 16px', borderRadius: '10px', border: 'none', backgroundColor: '#fff', fontSize: '15px', cursor: 'pointer', fontWeight: 500 }}>İptal</button>
              <span style={{ fontSize: '17px', fontWeight: 700 }}>Yeni Fatura</span>
              <button onClick={saveInvoice} disabled={saving} style={{ padding: '8px 16px', borderRadius: '10px', border: 'none', backgroundColor: '#fff', fontSize: '15px', cursor: 'pointer', fontWeight: 700, opacity: saving ? 0.5 : 1 }}>Kaydet</button>
            </div>
            <div style={{ padding: '20px 16px 0' }}>
              <p style={{ fontSize: '13px', fontWeight: 600, color: '#6C6C70', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Müşteri</p>
              <div style={{ backgroundColor: '#fff', borderRadius: '14px', overflow: 'hidden', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', padding: '14px 16px', borderBottom: '1px solid #F2F2F7', gap: '8px' }}>
                  <span style={{ color: '#8E8E93', fontSize: '15px' }}>🔍</span>
                  <input value={customerSearch} onChange={e => setCustomerSearch(e.target.value)} placeholder="Hayvan adı / sahip adı / telefon" style={{ flex: 1, border: 'none', fontSize: '15px', outline: 'none', backgroundColor: 'transparent' }} />
                  {customerSearch && <button onClick={() => setCustomerSearch('')} style={{ border: 'none', background: 'none', color: '#8E8E93', cursor: 'pointer', fontSize: '13px' }}>Temizle</button>}
                </div>
                {customerSearch.trim() && (() => {
                  const q = customerSearch.toLowerCase()
                  const filteredC = customers.filter(c =>
                    (c.owner_full_name ?? '').toLowerCase().includes(q) ||
                    (c.name ?? '').toLowerCase().includes(q) ||
                    (c.owner_phone ?? '').toLowerCase().includes(q)
                  ).slice(0, 5)
                  return filteredC.length === 0 ? (
                    <div style={{ padding: '12px 16px', borderBottom: '1px solid #F2F2F7' }}>
                      <p style={{ margin: 0, fontSize: '13px', color: '#8E8E93' }}>Kayıtlı müşteri bulunamadı</p>
                    </div>
                  ) : (
                    <>
                      {filteredC.map((c, i) => (
                        <button key={c.id} onClick={() => { setNewOwner(c.owner_full_name ?? ''); setNewPet(c.name ?? ''); setCustomerSearch('') }} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', border: 'none', borderBottom: i < filteredC.length - 1 ? '1px solid #F2F2F7' : 'none', backgroundColor: 'transparent', cursor: 'pointer', textAlign: 'left' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ fontSize: '20px' }}>{(() => { const s = (c.species ?? '').toLowerCase(); if (s === 'dog' || s === 'köpek') return '🐕'; if (s === 'cat' || s === 'kedi') return '🐈'; return '🐇' })()}</span>
                            <div>
                              <p style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#000' }}>{c.name}</p>
                              <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#8E8E93' }}>{c.owner_full_name}</p>
                            </div>
                          </div>
                          <span style={{ color: '#8E8E93', fontSize: '12px' }}>›</span>
                        </button>
                      ))}
                      <div style={{ height: '1px', backgroundColor: '#F2F2F7' }} />
                    </>
                  )
                })()}
                <input value={newOwner} onChange={e => setNewOwner(e.target.value)} placeholder="Sahip adı soyadı" style={{ width: '100%', boxSizing: 'border-box', padding: '14px 16px', border: 'none', borderBottom: '1px solid #F2F2F7', fontSize: '15px', outline: 'none', backgroundColor: 'transparent' }} />
                <input value={newPet} onChange={e => setNewPet(e.target.value)} placeholder="Evcil hayvan adı" style={{ width: '100%', boxSizing: 'border-box', padding: '14px 16px', border: 'none', fontSize: '15px', outline: 'none', backgroundColor: 'transparent' }} />
              </div>

              <p style={{ fontSize: '13px', fontWeight: 600, color: '#6C6C70', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Fatura</p>
              <div style={{ backgroundColor: '#fff', borderRadius: '14px', overflow: 'hidden', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', padding: '14px 16px', borderBottom: '1px solid #F2F2F7' }}>
                  <span style={{ fontSize: '15px', flex: 1 }}>Tip</span>
                  <select value={newType} onChange={e => setNewType(e.target.value)} style={{ border: 'none', fontSize: '15px', color: '#6C6C70', outline: 'none', cursor: 'pointer', backgroundColor: 'transparent' }}>
                    {TYPE_OPTIONS.filter(o => o.value !== 'all').map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', padding: '14px 16px' }}>
                  <span style={{ fontSize: '15px', flex: 1 }}>Tarih</span>
                  <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} style={{ border: 'none', fontSize: '15px', color: '#007AFF', outline: 'none', cursor: 'pointer', backgroundColor: 'transparent', fontWeight: 500 }} />
                </div>
              </div>

              <p style={{ fontSize: '13px', fontWeight: 600, color: '#6C6C70', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Hizmet Kalemi</p>
              <div style={{ backgroundColor: '#fff', borderRadius: '14px', overflow: 'hidden', marginBottom: '20px' }}>
                <input value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Açıklama" style={{ width: '100%', boxSizing: 'border-box', padding: '14px 16px', border: 'none', borderBottom: '1px solid #F2F2F7', fontSize: '15px', outline: 'none', backgroundColor: 'transparent' }} />
                <input value={newAmount} onChange={e => setNewAmount(e.target.value)} placeholder="Tutar (₺)" type="number" style={{ width: '100%', boxSizing: 'border-box', padding: '14px 16px', border: 'none', borderBottom: '1px solid #F2F2F7', fontSize: '15px', outline: 'none', backgroundColor: 'transparent' }} />
                <input value={newDiscount} onChange={e => setNewDiscount(e.target.value)} placeholder="İndirim (₺)" type="number" style={{ width: '100%', boxSizing: 'border-box', padding: '14px 16px', border: 'none', fontSize: '15px', outline: 'none', backgroundColor: 'transparent' }} />
              </div>

              <p style={{ fontSize: '13px', fontWeight: 600, color: '#6C6C70', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Notlar</p>
              <div style={{ backgroundColor: '#fff', borderRadius: '14px', overflow: 'hidden' }}>
                <textarea value={newNote} onChange={e => setNewNote(e.target.value)} placeholder="Not (opsiyonel)" rows={3} style={{ width: '100%', boxSizing: 'border-box', padding: '14px 16px', border: 'none', fontSize: '15px', outline: 'none', backgroundColor: 'transparent', resize: 'none', fontFamily: 'inherit' }} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function InvoiceRow({ inv, isLast, onOpen }: {
  inv: any
  isLast: boolean
  onOpen: () => void
}) {
  const badge = getTypeBadge(inv.source_ref ?? '')
  const diff = inv.service_date ? daysDiff(inv.service_date) : 0
  const isOverdue = !inv.is_paid && diff > 0
  const displayName = [inv.pet_name, inv.owner_full_name ? `(${inv.owner_full_name})` : ''].filter(Boolean).join(' ') || 'İsimsiz'

  return (
    <div onClick={onOpen} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '13px 16px', borderBottom: !isLast ? '1px solid #F2F2F7' : 'none', cursor: 'pointer' }}>
      <div style={{ width: '42px', height: '42px', borderRadius: '10px', flexShrink: 0, backgroundColor: inv.is_paid ? '#34C7591A' : '#FF3B301A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
        {inv.is_paid ? '📗' : '📕'}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#000' }}>Satış Faturası</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.3px', padding: '2px 7px', borderRadius: '6px', backgroundColor: badge.bg, color: badge.color }}>{badge.label}</span>
          <span style={{ fontSize: '13px', color: '#3C3C43CC' }}>{displayName}</span>
        </div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <p style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: inv.is_paid ? '#34C759' : '#FF3B30' }}>{fmtCurrency(inv.total_amount ?? 0)}</p>
        <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#8E8E93' }}>{fmtDate(inv.service_date)}</p>
        {isOverdue && <p style={{ margin: '1px 0 0', fontSize: '12px', color: '#FF3B30', fontWeight: 500 }}>{diff} gün gecikti</p>}
        {inv.is_paid && <p style={{ margin: '1px 0 0', fontSize: '12px', color: '#34C759', fontWeight: 500 }}>Tahsil edildi</p>}
      </div>
    </div>
  )
}

function InvoiceDetailModal({ inv, marking, onMark, onClose, onDelete, onUpdate }: {
  inv: any
  marking: boolean
  onMark: () => void
  onClose: () => void
  onDelete: (id: string) => void
  onUpdate: (updated: any) => void
}) {
  const badge = getTypeBadge(inv.source_ref ?? '')
  const kdv = (inv.total_amount ?? 0) * 20 / 120
  const [paidDate, setPaidDate] = useState(new Date().toISOString().slice(0, 10))
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showEdit, setShowEdit] = useState(false)

  // Edit state
  const [editOwner, setEditOwner] = useState(inv.owner_full_name ?? '')
  const [editPet, setEditPet] = useState(inv.pet_name ?? '')
  const [editType, setEditType] = useState(getTypeKey(inv.source_ref ?? ''))
  const [editDate, setEditDate] = useState(inv.service_date?.slice(0, 10) ?? new Date().toISOString().slice(0, 10))
  const [editDiscount, setEditDiscount] = useState('0')
  const [editNotes, setEditNotes] = useState(inv.notes ?? '')
  const [editLines, setEditLines] = useState<{ id: string; description: string; amount: string; locked: boolean; lockExplanation?: string }[]>([])
  const [editError, setEditError] = useState('')
  const [editSaving, setEditSaving] = useState(false)

  const TYPE_EDIT_OPTIONS = [
    { value: 'stay', label: 'Günlük Konaklama' },
    { value: 'longstay', label: 'Uzun Konaklama' },
    { value: 'daycare', label: 'Gündüz Bakım' },
    { value: 'grooming', label: 'Grooming' },
    { value: 'quick', label: 'Hızlı Satış' },
    { value: 'urun', label: 'Ürün Satışı' },
    { value: 'karma', label: 'Karma' },
    { value: 'diger', label: 'Diğer' },
  ]

  const PRESET_LINES = ['Günlük Konaklama', 'Kreş Hizmeti', 'Aylık Pansiyon', 'Yıkama', 'Tıraş', 'Mama', 'Transfer']

  const normalizedSourceRef = (inv.source_ref ?? '').split(':')[0]

  function isSystemLocked(desc: string): { locked: boolean; explanation?: string } {
    const d = desc.trim().toLowerCase()
    switch (normalizedSourceRef) {
      case 'stay':
        if (d.includes('günlük konaklama')) return { locked: true, explanation: 'Sistem kalemi • Checkout verisinden otomatik oluşturuldu.' }
        break
      case 'daycare':
        if (d === 'kreş hizmeti') return { locked: true, explanation: 'Sistem kalemi • Kreş dönemi ücretinden otomatik oluşturuldu.' }
        break
      case 'longStay':
        if (d === 'aylık pansiyon') return { locked: true, explanation: 'Sistem kalemi • Uzun süreli pansiyon döneminden otomatik oluşturuldu.' }
        break
      case 'grooming':
        if (d.includes('grooming')) return { locked: true, explanation: 'Sistem kalemi • Grooming hizmet kaydından otomatik oluşturuldu.' }
        break
    }
    return { locked: false }
  }

  function openEdit() {
    setEditOwner(inv.owner_full_name ?? '')
    setEditPet(inv.pet_name ?? '')
    setEditType(getTypeKey(inv.source_ref ?? ''))
    setEditDate(inv.service_date?.slice(0, 10) ?? new Date().toISOString().slice(0, 10))
    setEditNotes(inv.notes ?? '')
    setEditDiscount('0')
    // Başlangıç satırı: mevcut fatura tutarını bir satır olarak göster
    const desc = inv.notes && inv.notes.trim() ? inv.notes : badge.label
    const { locked, explanation } = isSystemLocked(desc)
    setEditLines([{ id: '1', description: desc, amount: String(inv.total_amount ?? 0), locked, lockExplanation: explanation }])
    setEditError('')
    setShowEdit(true)
  }

  function addLine() {
    setEditLines(prev => [...prev, { id: Date.now().toString(), description: '', amount: '', locked: false }])
  }

  function removeLine(id: string) {
    setEditLines(prev => prev.filter(l => l.id !== id))
    if (editLines.filter(l => !l.locked).length <= 1) {
      setEditLines(prev => [...prev, { id: Date.now().toString(), description: '', amount: '', locked: false }])
    }
  }

  function updateLine(id: string, field: 'description' | 'amount', value: string) {
    setEditLines(prev => prev.map(l => l.id === id ? { ...l, [field]: value } : l))
  }

  function addPresetLine(title: string) {
    setEditLines(prev => [...prev, { id: Date.now().toString(), description: title, amount: '', locked: false }])
  }

  const editSubTotal = editLines.reduce((sum, l) => sum + (parseFloat(l.amount) || 0), 0)
  const editDiscountNum = parseFloat(editDiscount) || 0
  const editTotal = Math.max(0, editSubTotal - editDiscountNum)

  async function handleEditSave() {
    const trimmedOwner = editOwner.trim()
    if (!trimmedOwner) { setEditError('Sahip adı soyadı boş olamaz.'); return }

    const validLines = editLines.filter(l => {
      if (l.locked) return true
      return l.description.trim() && parseFloat(l.amount) > 0
    })
    if (validLines.length === 0) { setEditError('En az bir geçerli satır olmalı.'); return }

    setEditSaving(true)
    const supabase = createClient()
    const { data: updated } = await supabase
      .from('sales_invoices')
      .update({
        owner_full_name: trimmedOwner || null,
        pet_name: editPet.trim() || null,
        total_amount: editTotal,
        notes: editNotes.trim() || '',
        service_date: editDate,
      })
      .eq('id', inv.id)
      .select()
      .single()
    setEditSaving(false)
    if (updated) {
      onUpdate(updated)
      setShowEdit(false)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    const supabase = createClient()
    await supabase.from('sales_invoices').delete().eq('id', inv.id)
    setDeleting(false)
    onDelete(inv.id)
    onClose()
  }

  // SONRA
function handlePrint() {
  const serviceDesc = inv.notes && inv.notes.trim() ? inv.notes : badge.label
  const total = inv.total_amount ?? 0
  const kdv = total * 20 / 120
  const faturaN = `FT-${inv.id?.replace(/-/g, '').slice(0, 8).toUpperCase()}`

  const html = `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="UTF-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, Arial, sans-serif; color: #000; padding: 40px; max-width: 700px; margin: 0 auto; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; }
  .title { text-align: right; }
  .title h1 { font-size: 22px; font-weight: 900; letter-spacing: 1px; margin-bottom: 4px; }
  .title p { font-size: 12px; color: #555; }
  .business { font-size: 14px; line-height: 1.6; }
  .business strong { font-size: 16px; }
  .divider { border: none; border-top: 1px solid #000; margin: 20px 0; }
  .customer { font-size: 13px; line-height: 1.8; margin-bottom: 24px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
  th { background: #f0f0f0; padding: 8px 12px; text-align: left; font-size: 12px; font-weight: 700; border-bottom: 2px solid #000; }
  th:last-child, td:last-child { text-align: right; }
  th:nth-child(2), td:nth-child(2) { text-align: center; }
  th:nth-child(3), td:nth-child(3) { text-align: right; }
  td { padding: 10px 12px; font-size: 13px; border-bottom: 1px solid #ddd; }
  .totals { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; margin-bottom: 16px; }
  .totals div { display: flex; gap: 40px; font-size: 13px; }
  .totals div span:last-child { min-width: 80px; text-align: right; }
  .grand-total { border-top: 2px solid #000; padding-top: 10px; margin-top: 6px; }
  .grand-total div { font-size: 16px; font-weight: 900; }
  .footer { text-align: center; font-size: 11px; color: #888; margin-top: 40px; }
  @media print { body { padding: 20px; } }
</style>
</head>
<body>
<div class="header">
  <div class="business">
    <strong>Pet Otelim</strong><br>
    Adres...<br>
    Tel: Telefon...<br>
    Vergi Dairesi / No...
  </div>
  <div class="title">
    <h1>SATIŞ FATURASI</h1>
    <p>Fatura No: ${faturaN}</p>
    <p>Düzenleme Tarihi: ${fmtDate(inv.service_date)}</p>
  </div>
</div>
<hr class="divider">
<div class="customer">
  <strong>Müşteri:</strong> ${inv.owner_full_name || '-'}<br>
  <strong>Evcil:</strong> ${inv.pet_name || '-'}<br>
  <strong>Dönem:</strong> ${fmtDate(inv.service_date)}
</div>
<table>
  <thead>
    <tr>
      <th>Kalem / Hizmet</th>
      <th>Adet</th>
      <th>Birim Fiyat</th>
      <th>Tutar</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>${serviceDesc}</td>
      <td>1</td>
      <td>₺${total.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</td>
      <td>₺${total.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</td>
    </tr>
  </tbody>
</table>
<div class="totals">
  <div><span>Ara Toplam:</span><span>₺${total.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</span></div>
  <div><span>KDV (%20, dahil):</span><span>₺${kdv.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</span></div>
  <div class="grand-total"><div><span>GENEL TOPLAM</span><span>₺${total.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</span></div></div>
</div>
<hr class="divider">
<div class="footer">Bu belge bilgilendirme amaçlıdır.</div>
</body>
</html>`

  const win = window.open('', '_blank')
  if (win) {
    win.document.write(html)
    win.document.close()
    win.focus()
    setTimeout(() => win.print(), 500)
  }
}

  const sourceHref = () => {
    const key = getTypeKey(inv.source_ref ?? '')
    switch (key) {
      case 'stay': return '/dashboard/stays/checkin'
      case 'longstay': return '/dashboard/stays'
      case 'daycare': return '/dashboard/daycare/new'
      case 'grooming': return '/dashboard/grooming'
      case 'quick': return '/dashboard/sales'
      default: return null
    }
  }

  const sourceLabel = () => {
  const key = getTypeKey(inv.source_ref ?? '')
  switch (key) {
    case 'stay': return 'Günlük Konaklamaya Git'
    case 'longstay': return 'Uzun Süreli Konaklamaya Git'
    case 'daycare': return 'Kreşe Git'
    case 'grooming': return "Grooming'e Git"
    case 'quick': return 'Hızlı Satışa Git'
    default: return null
  }
}

  const label = sourceLabel()
  const href = sourceHref()
  const serviceDesc = inv.notes && inv.notes.trim() ? inv.notes : badge.label

  return (
    <div onClick={e => { if (e.target === e.currentTarget) onClose() }} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
      <div style={{ backgroundColor: '#F2F2F7', borderRadius: '20px', width: '100%', maxWidth: '540px', maxHeight: '90vh', overflowY: 'auto', padding: '0 0 20px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px', borderBottom: '1px solid #E5E5EA', backgroundColor: '#F2F2F7', position: 'sticky', top: 0, zIndex: 1, borderRadius: '20px 20px 0 0' }}>
          <button onClick={onClose} style={{ padding: '8px 16px', borderRadius: '10px', border: 'none', backgroundColor: '#fff', fontSize: '15px', cursor: 'pointer', fontWeight: 500 }}>Kapat</button>
          <span style={{ fontSize: '17px', fontWeight: 700 }}>Satış Faturası</span>
          <div style={{ display: 'flex', gap: '8px' }}>
            {!inv.is_paid && (
              <button onClick={openEdit} style={{ width: '36px', height: '36px', borderRadius: '10px', border: 'none', backgroundColor: '#fff', fontSize: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✏️</button>
            )}
            <button onClick={handlePrint} style={{ width: '36px', height: '36px', borderRadius: '10px', border: 'none', backgroundColor: '#fff', fontSize: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>📤</button>
            <button onClick={() => setShowDeleteConfirm(true)} style={{ width: '36px', height: '36px', borderRadius: '10px', border: 'none', backgroundColor: '#fff', fontSize: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🗑️</button>
          </div>
        </div>

        <div style={{ padding: '16px' }}>
          {/* Fatura Başlığı */}
          <div style={{ backgroundColor: '#fff', borderRadius: '14px', padding: '16px', marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <span style={{ fontSize: '22px' }}>{inv.is_paid ? '📗' : '📕'}</span>
                <span style={{ fontSize: '18px', fontWeight: 700 }}>Satış Faturası</span>
              </div>
              <p style={{ margin: 0, fontSize: '14px', color: '#8E8E93' }}>{fmtDate(inv.service_date)}</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, padding: '4px 12px', borderRadius: '20px', backgroundColor: inv.is_paid ? '#34C75920' : '#8E8E9320', color: inv.is_paid ? '#34C759' : '#8E8E93' }}>
                {inv.is_paid ? 'TAHSİL EDİLDİ' : 'TASLAK'}
              </span>
              <p style={{ margin: '6px 0 0', fontSize: '12px', color: '#8E8E93' }}>{badge.label}</p>
            </div>
          </div>

          {/* Müşteri */}
          <div style={{ backgroundColor: '#fff', borderRadius: '14px', padding: '16px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#8E8E9320', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>👤</div>
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontSize: '15px', fontWeight: 600 }}>
                {inv.pet_name || '-'}{inv.owner_full_name ? ` (${inv.owner_full_name})` : ''}
              </p>
            </div>
            <p style={{ margin: 0, fontSize: '12px', color: '#8E8E93' }}>{fmtDate(inv.service_date)}</p>
          </div>

          {/* Hizmet Tablosu */}
          <div style={{ backgroundColor: '#fff', borderRadius: '14px', marginBottom: '12px', overflow: 'hidden' }}>
            <div style={{ display: 'flex', padding: '10px 14px', backgroundColor: '#F2F2F7', borderBottom: '1px solid #E5E5EA' }}>
              <span style={{ flex: 1, fontSize: '11px', fontWeight: 700, color: '#8E8E93' }}>HİZMET/ÜRÜN</span>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#8E8E93', width: '55px', textAlign: 'right' }}>MİKTAR</span>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#8E8E93', width: '70px', textAlign: 'right' }}>BR. FİYAT</span>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#8E8E93', width: '70px', textAlign: 'right' }}>TOPLAM</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', padding: '12px 14px', borderBottom: '1px solid #E5E5EA' }}>
              <span style={{ flex: 1, fontSize: '14px' }}>{serviceDesc}</span>
              <span style={{ fontSize: '13px', color: '#8E8E93', width: '55px', textAlign: 'right' }}>1,00 Adet</span>
              <span style={{ fontSize: '13px', width: '70px', textAlign: 'right' }}>{fmtCurrency(inv.total_amount ?? 0)}</span>
              <span style={{ fontSize: '13px', fontWeight: 600, width: '70px', textAlign: 'right' }}>{fmtCurrency(inv.total_amount ?? 0)}</span>
            </div>
          </div>

          {/* Toplam */}
          <div style={{ backgroundColor: '#fff', borderRadius: '14px', padding: '16px', marginBottom: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '13px', color: '#8E8E93' }}>ARA TOPLAM</span>
              <span style={{ fontSize: '14px' }}>{fmtCurrency(inv.total_amount ?? 0)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '13px', color: '#8E8E93' }}>KDV (%20 dahil)</span>
              <span style={{ fontSize: '14px' }}>{fmtCurrency(kdv)}</span>
            </div>
            <div style={{ height: '1px', backgroundColor: '#E5E5EA', margin: '8px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '15px', fontWeight: 700 }}>GENEL TOPLAM</span>
              <span style={{ fontSize: '18px', fontWeight: 700, color: '#007AFF' }}>{fmtCurrency(inv.total_amount ?? 0)}</span>
            </div>
          </div>

          {/* Kaynak */}
          {label && href && (
            <div style={{ backgroundColor: '#fff', borderRadius: '14px', padding: '16px', marginBottom: '12px' }}>
              <p style={{ margin: '0 0 10px', fontSize: '11px', fontWeight: 700, color: '#8E8E93', letterSpacing: '0.5px' }}>KAYNAK</p>
              <a href={href} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', borderRadius: '10px', border: '1.5px solid #007AFF', textDecoration: 'none', color: '#007AFF', fontSize: '15px', fontWeight: 600 }}>
                🔄 {label}
              </a>
            </div>
          )}

          {/* Tahsilat */}
          {!inv.is_paid ? (
            <div style={{ backgroundColor: '#fff', borderRadius: '14px', padding: '16px' }}>
              <p style={{ margin: '0 0 12px', fontSize: '11px', fontWeight: 700, color: '#8E8E93', letterSpacing: '0.5px' }}>TAHSİLAT</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 14px', backgroundColor: '#F2F2F7', borderRadius: '10px', marginBottom: '12px' }}>
                <span style={{ fontSize: '16px' }}>📅</span>
                <span style={{ fontSize: '15px', color: '#8E8E93' }}>Tahsilat Tarihi</span>
                <input type="date" value={paidDate} onChange={e => setPaidDate(e.target.value)} style={{ marginLeft: 'auto', border: 'none', fontSize: '15px', color: '#007AFF', outline: 'none', cursor: 'pointer', backgroundColor: 'transparent', fontWeight: 500 }} />
              </div>
              <button onClick={onMark} disabled={marking} style={{ width: '100%', padding: '16px', borderRadius: '14px', backgroundColor: '#007AFF', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '16px', fontWeight: 700, opacity: marking ? 0.6 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                ✓ Tahsilat Ekle
              </button>
            </div>
          ) : (
            <div style={{ backgroundColor: '#34C75915', borderRadius: '14px', padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '24px' }}>✅</span>
              <div>
                <p style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#34C759' }}>Tahsil Edildi</p>
                {inv.paid_at && <p style={{ margin: '3px 0 0', fontSize: '13px', color: '#8E8E93' }}>— {fmtDate(inv.paid_at)}</p>}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Düzenleme Modalı */}
      {showEdit && (
        <div onClick={e => { if (e.target === e.currentTarget) setShowEdit(false) }} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: '20px' }}>
          <div style={{ backgroundColor: '#F2F2F7', borderRadius: '20px', width: '100%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto', padding: '0 0 20px' }}>

            {/* Edit Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px', borderBottom: '1px solid #E5E5EA', backgroundColor: '#F2F2F7', position: 'sticky', top: 0, zIndex: 1, borderRadius: '20px 20px 0 0' }}>
              <button onClick={() => setShowEdit(false)} style={{ padding: '8px 16px', borderRadius: '10px', border: 'none', backgroundColor: '#fff', fontSize: '15px', cursor: 'pointer', fontWeight: 500 }}>İptal</button>
              <span style={{ fontSize: '17px', fontWeight: 700 }}>Fatura Düzenle</span>
              <button onClick={handleEditSave} disabled={editSaving} style={{ padding: '8px 16px', borderRadius: '10px', border: 'none', backgroundColor: '#fff', fontSize: '15px', cursor: 'pointer', fontWeight: 700, color: '#007AFF', opacity: editSaving ? 0.5 : 1 }}>Kaydet</button>
            </div>

            <div style={{ padding: '20px 16px 0' }}>

              {/* Müşteri */}
              <p style={{ fontSize: '13px', fontWeight: 600, color: '#6C6C70', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Müşteri</p>
              <div style={{ backgroundColor: '#fff', borderRadius: '14px', overflow: 'hidden', marginBottom: '20px' }}>
                <input value={editOwner} onChange={e => setEditOwner(e.target.value)} placeholder="Sahip adı soyadı" style={{ width: '100%', boxSizing: 'border-box', padding: '14px 16px', border: 'none', borderBottom: '1px solid #F2F2F7', fontSize: '15px', outline: 'none', backgroundColor: 'transparent' }} />
                <input value={editPet} onChange={e => setEditPet(e.target.value)} placeholder="Evcil hayvan adı" style={{ width: '100%', boxSizing: 'border-box', padding: '14px 16px', border: 'none', fontSize: '15px', outline: 'none', backgroundColor: 'transparent' }} />
              </div>

              {/* Fatura Bilgileri */}
              <p style={{ fontSize: '13px', fontWeight: 600, color: '#6C6C70', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Fatura Bilgileri</p>
              <div style={{ backgroundColor: '#fff', borderRadius: '14px', overflow: 'hidden', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', padding: '14px 16px', borderBottom: '1px solid #F2F2F7' }}>
                  <span style={{ fontSize: '15px', flex: 1 }}>Tip</span>
                  <select value={editType} onChange={e => setEditType(e.target.value)} style={{ border: 'none', fontSize: '15px', color: '#6C6C70', outline: 'none', cursor: 'pointer', backgroundColor: 'transparent' }}>
                    {TYPE_EDIT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div style={{ padding: '14px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '15px', flex: 1 }}>İndirim Tutarı</span>
                    <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '20px', backgroundColor: '#FF950020', color: '#FF9500' }}>TL</span>
                  </div>
                  <input value={editDiscount} onChange={e => setEditDiscount(e.target.value)} placeholder="Örn: 250" type="number" style={{ width: '100%', boxSizing: 'border-box', padding: '8px 0', border: 'none', borderBottom: '1px solid #F2F2F7', fontSize: '15px', outline: 'none', backgroundColor: 'transparent', marginBottom: '6px' }} />
                  <p style={{ margin: 0, fontSize: '11px', color: '#8E8E93' }}>Bu alan yüzde değil, doğrudan TL indirim tutarıdır.</p>
                </div>
              </div>

              {/* Satırlar */}
              <p style={{ fontSize: '13px', fontWeight: 600, color: '#6C6C70', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Satırlar</p>
              <div style={{ backgroundColor: '#fff', borderRadius: '14px', overflow: 'hidden', marginBottom: '20px' }}>
                {/* Hazır Kalemler */}
                <div style={{ padding: '14px 16px', borderBottom: '1px solid #F2F2F7' }}>
                  <p style={{ margin: '0 0 10px', fontSize: '12px', color: '#8E8E93' }}>Hazır Kalemler</p>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {PRESET_LINES.map(preset => (
                      <button key={preset} onClick={() => addPresetLine(preset)} style={{ padding: '6px 14px', borderRadius: '20px', border: '1px solid #E5E5EA', backgroundColor: '#F2F2F7', fontSize: '14px', color: '#007AFF', cursor: 'pointer', fontWeight: 500 }}>{preset}</button>
                    ))}
                  </div>
                </div>

                {/* Satır listesi */}
                {editLines.map((line, idx) => (
                  <div key={line.id} style={{ padding: '14px 16px', borderBottom: '1px solid #F2F2F7' }}>
                    {line.locked && (
                      <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '20px', backgroundColor: '#FF950020', color: '#FF9500', display: 'inline-block', marginBottom: '8px' }}>Sistem</span>
                    )}
                    <input
                      value={line.description}
                      onChange={e => updateLine(line.id, 'description', e.target.value)}
                      placeholder="Açıklama"
                      disabled={line.locked}
                      style={{ width: '100%', boxSizing: 'border-box', padding: '6px 0', border: 'none', borderBottom: '1px solid #F2F2F7', fontSize: '15px', outline: 'none', backgroundColor: 'transparent', color: line.locked ? '#8E8E93' : '#000', marginBottom: '8px' }}
                    />
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <span style={{ fontSize: '14px', color: '#8E8E93', flex: 1 }}>Tutar (₺)</span>
                      <input
                        value={line.amount}
                        onChange={e => updateLine(line.id, 'amount', e.target.value)}
                        placeholder="0"
                        type="number"
                        disabled={line.locked}
                        style={{ width: '120px', padding: '6px 0', border: 'none', borderBottom: '1px solid #F2F2F7', fontSize: '15px', outline: 'none', backgroundColor: 'transparent', textAlign: 'right', color: line.locked ? '#8E8E93' : '#000' }}
                      />
                    </div>
                    {line.lockExplanation && (
                      <p style={{ margin: '6px 0 0', fontSize: '11px', color: '#8E8E93' }}>{line.lockExplanation}</p>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                      {line.locked ? (
                        <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '20px', backgroundColor: '#FF950020', color: '#FF9500' }}>🔒 Sistem Kalemi</span>
                      ) : (
                        <button onClick={() => removeLine(line.id)} style={{ padding: '6px 14px', borderRadius: '10px', border: '1px solid #FF3B30', backgroundColor: 'transparent', color: '#FF3B30', fontSize: '13px', cursor: 'pointer' }}>Satırı Sil</button>
                      )}
                    </div>
                  </div>
                ))}

                {/* Yeni Satır Ekle */}
                <button onClick={addLine} style={{ width: '100%', padding: '14px 16px', border: 'none', backgroundColor: 'transparent', display: 'flex', alignItems: 'center', gap: '8px', color: '#007AFF', fontSize: '15px', cursor: 'pointer', fontWeight: 500 }}>
                  <span style={{ fontSize: '20px', lineHeight: 1 }}>⊕</span> Yeni Satır Ekle
                </button>
              </div>

              {/* Toplam Önizleme */}
              <p style={{ fontSize: '13px', fontWeight: 600, color: '#6C6C70', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Toplam Önizleme</p>
              <div style={{ backgroundColor: '#fff', borderRadius: '14px', padding: '16px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '14px', color: '#8E8E93' }}>Ara Toplam</span>
                  <span style={{ fontSize: '14px' }}>{fmtCurrency(editSubTotal)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '14px', color: '#8E8E93' }}>İndirim</span>
                  <span style={{ fontSize: '14px', color: '#FF3B30' }}>-{fmtCurrency(editDiscountNum)}</span>
                </div>
                <div style={{ height: '1px', backgroundColor: '#E5E5EA', margin: '8px 0' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '16px', fontWeight: 700 }}>Genel Toplam</span>
                  <span style={{ fontSize: '18px', fontWeight: 700, color: '#007AFF' }}>{fmtCurrency(editTotal)}</span>
                </div>
              </div>

              {/* Notlar */}
              <p style={{ fontSize: '13px', fontWeight: 600, color: '#6C6C70', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Notlar</p>
              <div style={{ backgroundColor: '#fff', borderRadius: '14px', overflow: 'hidden', marginBottom: '20px' }}>
                <textarea value={editNotes} onChange={e => setEditNotes(e.target.value)} placeholder="Not (opsiyonel)" rows={4} style={{ width: '100%', boxSizing: 'border-box', padding: '14px 16px', border: 'none', fontSize: '15px', outline: 'none', backgroundColor: 'transparent', resize: 'none', fontFamily: 'inherit' }} />
              </div>

              {editError && (
                <p style={{ color: '#FF3B30', fontSize: '13px', marginBottom: '12px' }}>{editError}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Silme Onayı */}
      {showDeleteConfirm && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
          <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '24px', maxWidth: '280px', width: '100%', textAlign: 'center' }}>
            <p style={{ margin: '0 0 8px', fontSize: '17px', fontWeight: 700 }}>Faturayı sil?</p>
            <p style={{ margin: '0 0 20px', fontSize: '13px', color: '#8E8E93' }}>Bu işlem geri alınamaz.</p>
            <button onClick={handleDelete} disabled={deleting} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: 'none', backgroundColor: '#FF3B30', color: '#fff', fontSize: '16px', fontWeight: 600, cursor: 'pointer', marginBottom: '8px', opacity: deleting ? 0.6 : 1 }}>Sil</button>
            <button onClick={() => setShowDeleteConfirm(false)} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: 'none', backgroundColor: '#F2F2F7', color: '#000', fontSize: '16px', fontWeight: 500, cursor: 'pointer' }}>İptal</button>
          </div>
        </div>
      )}
    </div>
  )
}