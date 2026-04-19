'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

// ============================================================
// AI ENGINE (iOS PO2_AIEngine.swift'in TypeScript karşılığı)
// ============================================================

type Risk = 'low' | 'medium' | 'high'
type Level = 'basic' | 'mid' | 'full'

interface AIInsight {
  title: string
  summary: string
  text: string
  risk: Risk
  level: Level
  suggestions: string[]
  warnings: string[]
}

interface CustomerAggregate {
  id: string
  customerName: string
  phone: string
  petNames: Set<string>
  totalRevenue: number
  visitCount: number
  lastActivityDate: Date | null
  activeProducts: Set<string>
  overdueAmount: number
  overdueInvoiceCount: number
  maxDelayDays: number
}

function customerKey(name: string, phone?: string): string {
  const n = name.toLowerCase().trim()
  const p = (phone ?? '').replace(/\D/g, '')
  return p ? `${n}|${p}` : n
}

function daysSince(date: Date | null): number {
  if (!date) return 999
  const diff = Date.now() - date.getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}

function money(v: number) {
  return v.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 2 })
}

function parseDate(s: string | null | undefined): Date | null {
  if (!s) return null
  return new Date(s)
}

// Finans AI
function generateFinanceInsight(invoices: any[], expenses: any[], monthStart: string): AIInsight {
  const paidInvoices = invoices.filter(i => i.is_paid && i.paid_at && i.paid_at >= monthStart)
  const filteredExpenses = expenses.filter(e => e.date >= monthStart.split('T')[0])
  const unpaidInvoices = invoices.filter(i => !i.is_paid)

  const totalIncome = paidInvoices.reduce((s, i) => s + (i.total_amount ?? 0), 0)
  const totalExpense = filteredExpenses.reduce((s, e) => s + (e.amount ?? 0), 0)
  const net = totalIncome - totalExpense
  const unpaidTotal = unpaidInvoices.reduce((s, i) => s + (i.total_amount ?? 0), 0)
  const today = new Date().toISOString().split('T')[0]
  const overdueCount = unpaidInvoices.filter(i => i.service_date < today).length
  const totalRecords = paidInvoices.length + filteredExpenses.length
  const expenseRatio = totalIncome > 0 ? totalExpense / totalIncome : 0

  const level: Level = totalRecords < 6 ? 'basic' : totalRecords < 20 ? 'mid' : 'full'
  const risk: Risk = (net < 0 || expenseRatio >= 0.85 || overdueCount >= 3) ? 'high'
    : (expenseRatio >= 0.60 || unpaidTotal > 0) ? 'medium' : 'low'

  const title = level === 'basic' ? 'AI Erken Gözlem' : level === 'mid' ? 'AI Finans Özeti' : 'AI Stratejik Yorum'
  const summary = `Gelir ${money(totalIncome)} • Gider ${money(totalExpense)} • Net ${money(net)}`

  const textParts: string[] = []
  const warnings: string[] = []
  const suggestions: string[] = []

  if (totalRecords < 6) {
    textParts.push('Henüz yeterli veri oluşmadı. Yorum erken aşamadadır.')
    suggestions.push('Gelir ve gider girişlerini düzenli tut.')
    suggestions.push('Fatura tahsilat tarihlerini eksiksiz işle.')
  } else {
    if (net > 0) textParts.push('Genel tablo şu an kârlı görünüyor.')
    else textParts.push('Bu dönemde giderler geliri aşmış durumda.')
    if (expenseRatio >= 0.85) warnings.push('Gider/gelir oranı kritik seviyede.')
    if (overdueCount > 0) warnings.push(`${overdueCount} adet gecikmiş fatura var.`)
    if (unpaidTotal > 0) warnings.push(`Bekleyen tahsilat toplamı ${money(unpaidTotal)}.`)
    if (overdueCount > 0) suggestions.push('Geciken faturalar için hatırlatma akışı uygula.')
    if (unpaidTotal > 0) suggestions.push('Bekleyen faturaları erken tahsilat için takip listesine al.')
  }

  if (warnings.length === 0) {
    warnings.push(risk === 'low' ? 'Belirgin finansal alarm görünmüyor.'
      : risk === 'medium' ? 'Orta seviyede finansal dikkat gerekiyor.'
      : 'Yüksek finansal risk sinyali var.')
  }

  return { title, summary, text: textParts.join(' '), risk, level, suggestions: suggestions.slice(0, 4), warnings: warnings.slice(0, 4) }
}

// Konaklama AI
function generateStayInsight(stays: any[]): AIInsight {
  const today = new Date().toISOString().split('T')[0]
  const validStays = stays.filter(s => !s.is_deleted)
  const activeStays = validStays.filter(s => !s.is_reservation && !s.actual_checkout_date)
  const reservations = validStays.filter(s => s.is_reservation)
  const dueTodayCheckouts = activeStays.filter(s => s.actual_check_out_date === today)
  const overdueCheckouts = activeStays.filter(s => s.actual_check_out_date && s.actual_check_out_date < today)
  const totalRecords = activeStays.length + reservations.length

  const level: Level = totalRecords < 6 ? 'basic' : totalRecords < 20 ? 'mid' : 'full'
  const risk: Risk = (overdueCheckouts.length >= 3 || dueTodayCheckouts.length >= 5) ? 'high'
    : (overdueCheckouts.length > 0 || dueTodayCheckouts.length >= 2) ? 'medium' : 'low'

  const title = level === 'basic' ? 'AI Konaklama Gözlemi' : level === 'mid' ? 'AI Konaklama Özeti' : 'AI Konaklama Yorumu'
  const summary = `Aktif ${activeStays.length} • Rezervasyon ${reservations.length} • Bugün çıkış ${dueTodayCheckouts.length}`

  const textParts: string[] = []
  const warnings: string[] = []
  const suggestions: string[] = []

  if (totalRecords < 6) {
    textParts.push('Konaklama tarafında henüz sınırlı veri var.')
    if (activeStays.length > 0) textParts.push(`Şu an ${activeStays.length} aktif konaklama görünüyor.`)
  } else {
    textParts.push(`Şu anda ${activeStays.length} aktif konaklama kaydı bulunuyor.`)
    if (reservations.length > 0) textParts.push(`${reservations.length} adet rezervasyon bekliyor.`)
    if (dueTodayCheckouts.length > 0) textParts.push(`Bugün ${dueTodayCheckouts.length} çıkış planlanmış.`)
    if (overdueCheckouts.length > 0) warnings.push(`${overdueCheckouts.length} aktif kaydın planlı çıkış tarihi geçmiş.`)
    if (dueTodayCheckouts.length > 0) suggestions.push('Bugünkü çıkışlar için ödeme ve fatura akışını hazırla.')
    if (overdueCheckouts.length > 0) suggestions.push('Planlı çıkışı geçmiş kayıtları kontrol edip kapat.')
  }

  if (warnings.length === 0) {
    warnings.push(risk === 'low' ? 'Belirgin operasyonel alarm görünmüyor.'
      : risk === 'medium' ? 'Orta seviyede operasyonel dikkat gerekiyor.'
      : 'Yüksek operasyonel yoğunluk riski var.')
  }

  return { title, summary, text: textParts.join(' '), risk, level, suggestions: suggestions.slice(0, 4), warnings: warnings.slice(0, 4) }
}

// Kreş AI
function generateDaycareInsight(packages: any[]): AIInsight {
  const activePackages = packages.filter(p => p.is_active)
  const level: Level = activePackages.length < 3 ? 'basic' : activePackages.length < 10 ? 'mid' : 'full'
  const risk: Risk = activePackages.length === 0 ? 'medium' : 'low'

  const title = level === 'basic' ? 'AI Kreş Gözlemi' : level === 'mid' ? 'AI Kreş Özeti' : 'AI Kreş Yorumu'
  const summary = `Aktif plan ${activePackages.length}`

  const textParts: string[] = []
  const warnings: string[] = []
  const suggestions: string[] = []

  if (activePackages.length === 0) {
    textParts.push('Bu dönemde aktif kreş planı görünmüyor.')
    warnings.push('Kreş tarafında izlenecek aktif veri bulunmuyor.')
    suggestions.push('Kreş planlarını aktif kullanıma alıp dönem üretimini takip et.')
  } else {
    textParts.push(`Şu anda ${activePackages.length} aktif kreş planı görünüyor.`)
    suggestions.push('Kreş yoğunluğunu gün bazında izlemeye devam et.')
  }

  if (warnings.length === 0) warnings.push('Belirgin kreş riski görünmüyor.')

  return { title, summary, text: textParts.join(' '), risk, level, suggestions: suggestions.slice(0, 4), warnings: warnings.slice(0, 4) }
}

// Grooming AI
function generateGroomingInsight(reservations: any[], entries: any[]): AIInsight {
  const totalRecords = reservations.length + entries.length
  const level: Level = totalRecords < 6 ? 'basic' : totalRecords < 20 ? 'mid' : 'full'
  const risk: Risk = (reservations.length >= 8 && entries.length === 0) ? 'high'
    : (reservations.length > entries.length + 4) ? 'medium' : 'low'

  const title = level === 'basic' ? 'AI Grooming Gözlemi' : level === 'mid' ? 'AI Grooming Özeti' : 'AI Grooming Yorumu'
  const summary = `Rezervasyon ${reservations.length} • Hizmet ${entries.length}`

  const textParts: string[] = []
  const warnings: string[] = []
  const suggestions: string[] = []

  if (totalRecords === 0) {
    textParts.push('Bu dönemde grooming tarafında kayıt görünmüyor.')
    warnings.push('İzlenecek grooming verisi bulunmuyor.')
  } else {
    if (entries.length > 0) textParts.push(`Bu aralıkta ${entries.length} grooming hizmeti tamamlanmış.`)
    if (reservations.length > 0) textParts.push(`${reservations.length} adet grooming rezervasyonu bulunuyor.`)
    if (reservations.length > entries.length + 4) warnings.push('Rezervasyon-hizmet dönüşümünde gecikme olabilir.')
    if (reservations.length > entries.length) suggestions.push('Rezervasyonları aynı gün hizmete dönüştürme akışını hızlandır.')
  }

  if (warnings.length === 0) warnings.push('Belirgin grooming riski görünmüyor.')

  return { title, summary, text: textParts.join(' '), risk, level, suggestions: suggestions.slice(0, 4), warnings: warnings.slice(0, 4) }
}

// Müşteri aksiyon bundle
function buildCustomerBundle(invoices: any[], stays: any[]) {
  const map: Map<string, CustomerAggregate> = new Map()
  const today = new Date()

  function merge(name: string, phone: string, petName: string, revenue: number, date: Date | null, product: string, overdue = 0) {
    const key = customerKey(name, phone)
    const existing = map.get(key) ?? {
      id: key, customerName: name, phone, petNames: new Set<string>(),
      totalRevenue: 0, visitCount: 0, lastActivityDate: null,
      activeProducts: new Set<string>(), overdueAmount: 0, overdueInvoiceCount: 0, maxDelayDays: 0
    }
    if (petName) existing.petNames.add(petName)
    existing.totalRevenue += Math.max(0, revenue)
    existing.visitCount += 1
    existing.activeProducts.add(product)
    if (date && (!existing.lastActivityDate || date > existing.lastActivityDate)) existing.lastActivityDate = date
    if (overdue > 0) {
      existing.overdueAmount += overdue
      existing.overdueInvoiceCount += 1
      const days = Math.floor((today.getTime() - new Date(date ?? today).getTime()) / (1000 * 60 * 60 * 24))
      existing.maxDelayDays = Math.max(existing.maxDelayDays, days)
    }
    map.set(key, existing)
  }

  for (const inv of invoices) {
    const name = inv.owner_full_name?.trim() || 'Sahip yok'
    const pet = inv.pet_name?.trim() || ''
    merge(name, '', pet, inv.total_amount ?? 0, parseDate(inv.service_date), 'Fatura',
      !inv.is_paid ? (inv.total_amount ?? 0) : 0)
  }

  for (const stay of stays.filter(s => !s.is_deleted)) {
    const name = stay.owner_full_name?.trim() || 'Sahip yok'
    merge(name, stay.owner_phone ?? '', stay.pet_name ?? '', stay.total_amount ?? 0,
      parseDate(stay.actual_check_out_date), 'Konaklama')
  }

  const customers = Array.from(map.values())

  // VIP
  const vip = customers.map(c => {
    const days = daysSince(c.lastActivityDate)
    const recencyScore = Math.max(0, 100 - Math.min(100, days))
    const revenueScore = Math.min(100, c.totalRevenue / 150)
    const visitScore = Math.min(100, c.visitCount * 6)
    const productScore = c.activeProducts.size * 18
    const score = revenueScore * 0.45 + visitScore * 0.25 + recencyScore * 0.20 + productScore * 0.10
    return { ...c, vipScore: score, petNames: Array.from(c.petNames), activeProducts: Array.from(c.activeProducts) }
  }).filter(c => c.totalRevenue > 0).sort((a, b) => b.vipScore - a.vipScore).slice(0, 12)

  // Tahsilat
  const collection = customers.filter(c => c.overdueAmount > 0.01).map(c => ({
    ...c, petNames: Array.from(c.petNames),
    score: Math.min(100, c.overdueAmount / 50) * 0.60 + Math.min(100, c.maxDelayDays * 1.7) * 0.30
  })).sort((a, b) => b.score - a.score).slice(0, 15)

  // Bugün Ara
  const todayCalls = customers.filter(c => {
    const days = daysSince(c.lastActivityDate)
    return c.overdueAmount > 0 || days >= 45 || (c.activeProducts.size === 1 && c.totalRevenue >= 1000)
  }).map(c => {
    const days = daysSince(c.lastActivityDate)
    const reason = c.overdueAmount > 0 ? 'Vadesi geçmiş tahsilat var'
      : days >= 45 ? 'Uzun süredir işlem yok'
      : 'Tek hizmet kullanan değerli müşteri'
    return { ...c, petNames: Array.from(c.petNames), daysSince: days, reason, score: c.overdueAmount > 0 ? 80 : days / 2 }
  }).sort((a, b) => b.score - a.score).slice(0, 12)

  // Çapraz Satış
  const crossSell = customers.filter(c => {
    const products = c.activeProducts
    return products.size > 0 && products.size < 3
  }).map(c => {
    const products = Array.from(c.activeProducts)
    const hasStay = products.includes('Konaklama')
    const hasGrooming = products.includes('Grooming')
    const hasDaycare = products.includes('Kreş')
    const recommended = hasStay && !hasGrooming ? 'Grooming'
      : hasGrooming && !hasDaycare ? 'Kreş'
      : hasDaycare && !hasStay ? 'Konaklama' : 'Grooming'
    const score = Math.min(100, c.totalRevenue / 120) * 0.45 + Math.min(100, c.visitCount * 7) * 0.35
    return { ...c, petNames: Array.from(c.petNames), recommended, score, activeProducts: products }
  }).sort((a, b) => b.score - a.score).slice(0, 12)

  return {
    vip, collection, todayCalls, crossSell,
    summary: { vipCount: vip.length, collectionCount: collection.length, todayCallCount: todayCalls.length, crossSellCount: crossSell.length, collectionAmount: collection.reduce((s, c) => s + c.overdueAmount, 0) }
  }
}

// ============================================================
// COMPONENT
// ============================================================

export default function AIPage() {
  const [loading, setLoading] = useState(true)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiResult, setAiResult] = useState('')
  const [prompt, setPrompt] = useState('')
  const [activeSection, setActiveSection] = useState<string | null>(null)
  const [customerTab, setCustomerTab] = useState<'vip' | 'call' | 'collection' | 'crosssell'>('vip')
  const [scoreTab, setScoreTab] = useState<'active' | 'warming' | 'churn' | 'lost'>('active')

  const [data, setData] = useState<any>({
    financeInsight: null, stayInsight: null, daycareInsight: null, groomingInsight: null,
    customerBundle: null, stats: null
  })

  useEffect(() => {
    loadAll()
  }, [])

  async function loadAll() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: biz } = await supabase.from('businesses').select('id').eq('owner_user_id', user.id).single()
    const bid = biz?.id
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
    const today = new Date().toISOString().split('T')[0]

    const [
      { data: invoices },
      { data: expenses },
      { data: stays },
      { data: daycarePackages },
      { data: groomingRes },
      { data: groomingEntries },
    ] = await Promise.all([
      supabase.from('sales_invoices').select('*').eq('business_id', bid).order('service_date', { ascending: false }),
      supabase.from('expenses').select('*').eq('business_id', bid).order('date', { ascending: false }),
      supabase.from('stays').select('*').eq('business_id', bid),
      supabase.from('daycare_packages').select('*').eq('business_id', bid),
      supabase.from('grooming_reservations').select('*').eq('business_id', bid),
      supabase.from('grooming_entries').select('*').eq('business_id', bid),
    ])

    const inv = invoices ?? []
    const exp = expenses ?? []
    const st = stays ?? []
    const dp = daycarePackages ?? []
    const gr = groomingRes ?? []
    const ge = groomingEntries ?? []

    const todayPaid = inv.filter((i: any) => i.is_paid && i.paid_at?.startsWith(today))
    const monthPaid = inv.filter((i: any) => i.is_paid && i.paid_at && i.paid_at >= monthStart)
    const unpaid = inv.filter((i: any) => !i.is_paid)
    const activeStays = st.filter((s: any) => !s.is_reservation && !s.actual_checkout_date)

    const stats = {
      todayRevenue: todayPaid.reduce((s: number, i: any) => s + (i.total_amount ?? 0), 0),
      monthIncome: monthPaid.reduce((s: number, i: any) => s + (i.total_amount ?? 0), 0),
      monthExpense: exp.filter((e: any) => e.date >= monthStart.split('T')[0]).reduce((s: number, e: any) => s + (e.amount ?? 0), 0),
      activeStays: activeStays.length,
      unpaidCount: unpaid.length,
      unpaidTotal: unpaid.reduce((s: number, i: any) => s + (i.total_amount ?? 0), 0),
      overdueCount: activeStays.filter((s: any) => s.actual_check_out_date && s.actual_check_out_date < today).length,
    }

    setData({
      financeInsight: generateFinanceInsight(inv, exp, monthStart),
      stayInsight: generateStayInsight(st),
      daycareInsight: generateDaycareInsight(dp),
      groomingInsight: generateGroomingInsight(gr, ge),
      customerBundle: buildCustomerBundle(inv, st),
      stats,
      invoices: inv, expenses: exp
    })
    setLoading(false)
  }

  async function askAI(q?: string) {
    const question = q ?? prompt.trim()
    if (!question) return
    setAiLoading(true)
    setAiResult('')
    const s = data.stats
    const systemCtx = s ? `Sen PetOtelim AI asistanisin. Veriler: Aktif konaklama: ${s.activeStays}, Gecikmus cikis: ${s.overdueCount}, Bekleyen fatura: ${s.unpaidCount} adet (${money(s.unpaidTotal)}), Bu ay gelir: ${money(s.monthIncome)}, Bu ay gider: ${money(s.monthExpense)}, Net: ${money(s.monthIncome - s.monthExpense)}. Turkce, kisa ve net yanit ver.` : 'Sen PetOtelim AI asistanisin. Turkce yanit ver.'
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 1000, system: systemCtx, messages: [{ role: 'user', content: question }] })
      })
      const d = await res.json()
      setAiResult(d.content?.map((c: any) => c.text || '').join('') || 'Yanit alinamadi.')
    } catch { setAiResult('Baglanti hatasi.') }
    setAiLoading(false)
  }

  function fmtCurrency(v: number) { return v.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) }
  function riskColor(r: Risk) { return r === 'high' ? '#FF3B30' : r === 'medium' ? '#FF9500' : '#34C759' }
  function riskLabel(r: Risk) { return r === 'high' ? 'Kritik' : r === 'medium' ? 'Takip' : 'Stabil' }
  function levelLabel(l: Level) { return l === 'basic' ? 'Erken Yorum' : l === 'mid' ? 'Standart' : 'Gelişmiş' }
  function levelColor(l: Level) { return l === 'basic' ? '#6C6C70' : l === 'mid' ? '#FF9500' : '#34C759' }

  const card: React.CSSProperties = { backgroundColor: '#fff', borderRadius: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', marginBottom: '16px', padding: '20px' }
  const badge = (text: string, color: string): React.CSSProperties => ({ fontSize: '11px', padding: '3px 10px', borderRadius: '20px', backgroundColor: color + '20', color, fontWeight: 600 })
  const inp: React.CSSProperties = { width: '100%', padding: '10px 14px', backgroundColor: '#F2F2F7', borderRadius: '12px', border: 'none', outline: 'none', fontSize: '15px', boxSizing: 'border-box', color: '#000' }

  const quickActions = [
    { label: 'Bugün ne yapmalıyım?', icon: '🎯' },
    { label: 'Finansal durumumu analiz et', icon: '📊' },
    { label: 'Gecikmiş tahsilatlar için ne yapmalıyım?', icon: '💳' },
    { label: 'Kreş ve grooming operasyonumu değerlendir', icon: '✂️' },
  ]

  function InsightCard({ insight, icon }: { insight: AIInsight, icon: string }) {
    return (
      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
          <span style={{ fontSize: '16px' }}>{icon}</span>
          <p style={{ fontSize: '15px', fontWeight: 700, color: '#000', margin: 0 }}>{insight.title}</p>
          <span style={{ marginLeft: 'auto', ...badge(riskLabel(insight.risk), riskColor(insight.risk)) }}>{riskLabel(insight.risk)}</span>
          <span style={badge(levelLabel(insight.level), levelColor(insight.level))}>{levelLabel(insight.level)}</span>
        </div>
        <p style={{ fontSize: '13px', fontWeight: 600, color: '#000', margin: '0 0 6px' }}>{insight.summary}</p>
        {insight.text && <p style={{ fontSize: '13px', color: '#3C3C3E', margin: '0 0 10px', lineHeight: 1.6 }}>{insight.text}</p>}
        {insight.warnings.length > 0 && (
          <div style={{ marginBottom: '8px' }}>
            <p style={{ fontSize: '12px', fontWeight: 600, color: '#6C6C70', margin: '0 0 4px' }}>Uyarılar</p>
            {insight.warnings.map((w, i) => (
              <div key={i} style={{ display: 'flex', gap: '6px', marginBottom: '3px' }}>
                <span style={{ color: '#FF9500', fontSize: '12px' }}>⚠️</span>
                <span style={{ fontSize: '13px', color: '#000' }}>{w}</span>
              </div>
            ))}
          </div>
        )}
        {insight.suggestions.length > 0 && (
          <div>
            <p style={{ fontSize: '12px', fontWeight: 600, color: '#6C6C70', margin: '0 0 4px' }}>Öneriler</p>
            {insight.suggestions.map((s, i) => (
              <div key={i} style={{ display: 'flex', gap: '6px', marginBottom: '3px' }}>
                <span style={{ color: '#34C759', fontSize: '12px' }}>✓</span>
                <span style={{ fontSize: '13px', color: '#000' }}>{s}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  if (loading) return (
    <div style={{ padding: '48px', textAlign: 'center' }}>
      <p style={{ fontSize: '28px', margin: '0 0 12px' }}>✨</p>
      <p style={{ color: '#6C6C70' }}>AI verileri yükleniyor...</p>
    </div>
  )

  const { financeInsight, stayInsight, daycareInsight, groomingInsight, customerBundle, stats } = data

  return (
    <div style={{ padding: '32px', maxWidth: '800px', paddingBottom: '64px' }}>

      {/* Hero */}
      <div style={{ ...card, background: 'linear-gradient(135deg, #F0E6FF, #E6F0FF)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', marginBottom: '16px' }}>
          <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: 'linear-gradient(135deg, #AF52DE, #007AFF)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '26px', flexShrink: 0 }}>✨</div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: '12px', color: '#6C6C70', margin: '0 0 2px' }}>Yapay Zeka Yönetim Paneli</p>
            <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#000', margin: '0 0 4px' }}>PetOtelim AI</h1>
            <p style={{ fontSize: '13px', color: '#6C6C70', margin: 0 }}>Deneme sürümü aktif. AI özellikleri kullanılabilir.</p>
          </div>
          <span style={badge('Premium', '#AF52DE')}>Premium</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', backgroundColor: 'rgba(255,255,255,0.6)', borderRadius: '12px', padding: '12px' }}>
          {[
            { label: 'Bugün Ciro', value: `₺${fmtCurrency(stats.todayRevenue)}`, color: '#34C759' },
            { label: 'Aktif Konaklama', value: String(stats.activeStays), color: '#007AFF' },
            { label: 'Bekleyen Tahsilat', value: `₺${fmtCurrency(stats.unpaidTotal)}`, color: '#FF9500' },
          ].map((item, idx) => (
            <div key={idx} style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '12px', color: '#6C6C70', margin: '0 0 3px' }}>{item.label}</p>
              <p style={{ fontSize: '16px', fontWeight: 700, color: item.color, margin: 0 }}>{item.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Risk uyarıları */}
      {(stats.overdueCount > 0 || stats.unpaidCount > 0) && (
        <div style={{ ...card, background: '#FFF9F0', border: '1px solid #FF950030' }}>
          <p style={{ fontSize: '15px', fontWeight: 700, color: '#000', margin: '0 0 8px' }}>⚠️ Dikkat Gerektiren Durumlar</p>
          {stats.overdueCount > 0 && <p style={{ fontSize: '13px', color: '#FF3B30', margin: '0 0 4px' }}>• {stats.overdueCount} gecikmiş çıkış var</p>}
          {stats.unpaidCount > 0 && <p style={{ fontSize: '13px', color: '#FF9500', margin: 0 }}>• {stats.unpaidCount} bekleyen fatura — ₺{fmtCurrency(stats.unpaidTotal)}</p>}
        </div>
      )}

      {/* Executive Summary */}
      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '12px', backgroundColor: '#5856D620', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>🏛️</div>
          <div>
            <p style={{ fontSize: '15px', fontWeight: 700, color: '#000', margin: 0 }}>AI Executive Summary</p>
            <p style={{ fontSize: '12px', color: '#6C6C70', margin: 0 }}>Yönetici Özeti</p>
          </div>
          <span style={{ marginLeft: 'auto', ...badge('Yönetici Özeti', '#5856D6') }}>Yönetici Özeti</span>
        </div>
        <p style={{ fontSize: '15px', fontWeight: 600, color: '#000', margin: '0 0 8px' }}>
          {[financeInsight, stayInsight, daycareInsight, groomingInsight].some((i: AIInsight) => i.risk === 'high') ? 'Bugün yakın takip gerekiyor'
            : [financeInsight, stayInsight, daycareInsight, groomingInsight].some((i: AIInsight) => i.risk === 'medium') ? 'Bugün kontrollü ilerleme öneriliyor'
            : 'Genel görünüm dengeli'}
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', marginBottom: '14px' }}>
          {[
            { label: 'Finans', insight: financeInsight },
            { label: 'Konaklama', insight: stayInsight },
            { label: 'Kreş', insight: daycareInsight },
            { label: 'Grooming', insight: groomingInsight },
          ].map(({ label, insight }) => (
            <div key={label} style={{ backgroundColor: '#F9F9F9', borderRadius: '10px', padding: '10px' }}>
              <p style={{ fontSize: '11px', color: '#6C6C70', margin: '0 0 3px' }}>{label}</p>
              <p style={{ fontSize: '14px', fontWeight: 700, color: riskColor(insight.risk), margin: 0 }}>{riskLabel(insight.risk)}</p>
            </div>
          ))}
        </div>
        {/* Ana Odaklar */}
        <p style={{ fontSize: '13px', fontWeight: 600, color: '#000', margin: '0 0 8px' }}>Bugünkü Ana Odaklar</p>
        {[
          { label: 'Finans Önceliği', insight: financeInsight },
          { label: 'Konaklama Önceliği', insight: stayInsight },
          { label: 'Kreş Önceliği', insight: daycareInsight },
        ].slice(0, 3).map(({ label, insight }) => (
          <div key={label} style={{ display: 'flex', gap: '10px', marginBottom: '6px', backgroundColor: '#F9F9F9', borderRadius: '10px', padding: '10px' }}>
            <div style={{ width: '4px', borderRadius: '2px', backgroundColor: riskColor(insight.risk), flexShrink: 0 }} />
            <div>
              <p style={{ fontSize: '11px', fontWeight: 600, color: '#6C6C70', margin: '0 0 2px' }}>{label}</p>
              <p style={{ fontSize: '13px', color: '#000', margin: 0 }}>{insight.warnings[0]}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Öncelikli Aksiyonlar */}
      <div style={card}>
        <p style={{ fontSize: '15px', fontWeight: 700, color: '#000', margin: '0 0 14px' }}>⚡ AI Öncelikli Aksiyonlar</p>
        {(() => {
          const actions: { title: string, detail: string, color: string, tag: string, href: string }[] = []
          if (financeInsight.risk === 'high') actions.push({ title: 'Tahsilat riskini hemen azalt', detail: financeInsight.warnings[0], color: '#FF3B30', tag: 'Yüksek', href: '/dashboard/accounting/payments' })
          else if (financeInsight.risk === 'medium') actions.push({ title: 'Finans takibini sıklaştır', detail: financeInsight.warnings[0], color: '#FF9500', tag: 'Orta', href: '/dashboard/accounting' })
          if (stayInsight.risk === 'high') actions.push({ title: 'Konaklama operasyonunu kontrol et', detail: stayInsight.warnings[0], color: '#FF3B30', tag: 'Yüksek', href: '/dashboard/stays' })
          else if (stayInsight.risk === 'medium') actions.push({ title: 'Bugünkü çıkış planını gözden geçir', detail: stayInsight.warnings[0], color: '#FF9500', tag: 'Orta', href: '/dashboard/stays/checkout' })
          if (daycareInsight.risk !== 'low') actions.push({ title: 'Kreş planlarını dengele', detail: daycareInsight.warnings[0], color: daycareInsight.risk === 'high' ? '#FF3B30' : '#FF9500', tag: daycareInsight.risk === 'high' ? 'Yüksek' : 'Orta', href: '/dashboard/daycare/new' })
          if (actions.length === 0) actions.push({ title: 'Genel görünüm stabil', detail: 'Belirgin öncelikli alarm görünmüyor.', color: '#34C759', tag: 'Normal', href: '/dashboard' })
          return actions.slice(0, 3).map((action, idx) => (
            <Link key={idx} href={action.href} style={{ textDecoration: 'none' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', backgroundColor: '#F9F9F9', borderRadius: '12px', padding: '12px', marginBottom: '8px' }}>
                <div style={{ width: '34px', height: '34px', borderRadius: '10px', backgroundColor: action.color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0 }}>
                  {action.color === '#34C759' ? '✓' : action.tag === 'Yüksek' ? '🔴' : '🟠'}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                    <p style={{ fontSize: '14px', fontWeight: 600, color: '#000', margin: 0 }}>{action.title}</p>
                    <span style={badge(action.tag, action.color)}>{action.tag}</span>
                  </div>
                  <p style={{ fontSize: '12px', color: '#6C6C70', margin: 0 }}>{action.detail}</p>
                </div>
                <span style={{ color: '#C7C7CC' }}>›</span>
              </div>
            </Link>
          ))
        })()}
      </div>

      {/* Ticari Fırsatlar */}
      <div style={card}>
        <p style={{ fontSize: '15px', fontWeight: 700, color: '#000', margin: '0 0 14px' }}>💡 AI Ticari Fırsatlar</p>
        {customerBundle.crossSell.length === 0 ? (
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <p style={{ fontSize: '13px', color: '#6C6C70', margin: 0 }}>Belirgin ticari fırsat sinyali yok. Düzenli veri oluştukça sistem daha güçlü öneriler üretir.</p>
          </div>
        ) : customerBundle.crossSell.slice(0, 4).map((c: any, idx: number) => (
          <div key={idx} style={{ display: 'flex', gap: '12px', backgroundColor: '#F9F9F9', borderRadius: '12px', padding: '12px', marginBottom: '8px' }}>
            <div style={{ width: '34px', height: '34px', borderRadius: '10px', backgroundColor: '#007AFF20', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0 }}>💡</div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: '14px', fontWeight: 600, color: '#000', margin: '0 0 2px' }}>{c.customerName}</p>
              <p style={{ fontSize: '12px', color: '#6C6C70', margin: 0 }}>{c.activeProducts.join(', ')} → öneri: {c.recommended}</p>
            </div>
            <span style={{ color: '#C7C7CC' }}>›</span>
          </div>
        ))}
      </div>

      {/* Müşteri & Gelir Aksiyon Paketi */}
      <div style={card}>
        <p style={{ fontSize: '15px', fontWeight: 700, color: '#000', margin: '0 0 4px' }}>👥 AI Müşteri & Gelir Aksiyon Paketi</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '14px' }}>
          {[
            { label: 'VIP', value: customerBundle.summary.vipCount, color: '#FF9500' },
            { label: 'Bugün Ara', value: customerBundle.summary.todayCallCount, color: '#FF9500' },
            { label: 'Tahsilat', value: customerBundle.summary.collectionCount, color: '#FF3B30' },
            { label: 'Risk Tutarı', value: `₺${fmtCurrency(customerBundle.summary.collectionAmount)}`, color: '#FF3B30' },
            { label: 'Çapraz Satış', value: customerBundle.summary.crossSellCount, color: '#007AFF' },
          ].map((item, idx) => (
            <div key={idx} style={{ backgroundColor: '#F9F9F9', borderRadius: '10px', padding: '10px' }}>
              <p style={{ fontSize: '11px', color: '#6C6C70', margin: '0 0 3px' }}>{item.label}</p>
              <p style={{ fontSize: '16px', fontWeight: 700, color: item.color, margin: 0 }}>{item.value}</p>
            </div>
          ))}
        </div>

        {/* Segment seçici */}
        <div style={{ display: 'flex', backgroundColor: '#F2F2F7', borderRadius: '10px', padding: '2px', marginBottom: '12px' }}>
          {(['vip', 'call', 'collection', 'crosssell'] as const).map(tab => (
            <button key={tab} onClick={() => setCustomerTab(tab)} style={{ flex: 1, padding: '7px 4px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 600, backgroundColor: customerTab === tab ? '#fff' : 'transparent', color: customerTab === tab ? '#000' : '#6C6C70', boxShadow: customerTab === tab ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}>
              {tab === 'vip' ? 'VIP' : tab === 'call' ? 'Ara' : tab === 'collection' ? 'Tahsilat' : 'Çapraz'}
            </button>
          ))}
        </div>

        {customerTab === 'vip' && (
          <div>
            <p style={{ fontSize: '13px', fontWeight: 600, color: '#000', margin: '0 0 8px' }}>VIP Müşteri Tespiti</p>
            {customerBundle.vip.length === 0 ? <p style={{ fontSize: '13px', color: '#6C6C70' }}>VIP müşteri bulunamadı.</p>
              : customerBundle.vip.slice(0, 6).map((c: any, idx: number) => (
                <div key={idx} style={{ display: 'flex', gap: '10px', backgroundColor: '#F9F9F9', borderRadius: '10px', padding: '10px', marginBottom: '6px' }}>
                  <div style={{ width: '4px', borderRadius: '2px', backgroundColor: '#FF9500', flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '14px', fontWeight: 600, color: '#000', margin: '0 0 2px' }}>{c.customerName}</p>
                    <p style={{ fontSize: '12px', color: '#6C6C70', margin: 0 }}>₺{fmtCurrency(c.totalRevenue)} • {c.visitCount} işlem • Skor {Math.round(c.vipScore)}</p>
                  </div>
                </div>
              ))}
          </div>
        )}
        {customerTab === 'call' && (
          <div>
            <p style={{ fontSize: '13px', fontWeight: 600, color: '#000', margin: '0 0 8px' }}>Bugün Aranacak</p>
            {customerBundle.todayCalls.length === 0 ? <p style={{ fontSize: '13px', color: '#6C6C70' }}>Bugün aranacak müşteri yok.</p>
              : customerBundle.todayCalls.slice(0, 6).map((c: any, idx: number) => (
                <div key={idx} style={{ display: 'flex', gap: '10px', backgroundColor: '#F9F9F9', borderRadius: '10px', padding: '10px', marginBottom: '6px' }}>
                  <div style={{ width: '4px', borderRadius: '2px', backgroundColor: '#FF9500', flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '14px', fontWeight: 600, color: '#000', margin: '0 0 2px' }}>{c.customerName}</p>
                    <p style={{ fontSize: '12px', color: '#6C6C70', margin: 0 }}>{c.reason}</p>
                  </div>
                </div>
              ))}
          </div>
        )}
        {customerTab === 'collection' && (
          <div>
            <p style={{ fontSize: '13px', fontWeight: 600, color: '#000', margin: '0 0 8px' }}>Tahsilat Öncelik Listesi</p>
            {customerBundle.collection.length === 0 ? <p style={{ fontSize: '13px', color: '#6C6C70' }}>Bekleyen tahsilat yok 🎉</p>
              : customerBundle.collection.slice(0, 6).map((c: any, idx: number) => (
                <div key={idx} style={{ display: 'flex', gap: '10px', backgroundColor: '#F9F9F9', borderRadius: '10px', padding: '10px', marginBottom: '6px' }}>
                  <div style={{ width: '4px', borderRadius: '2px', backgroundColor: '#FF3B30', flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '14px', fontWeight: 600, color: '#000', margin: '0 0 2px' }}>{c.customerName}</p>
                    <p style={{ fontSize: '12px', color: '#6C6C70', margin: 0 }}>₺{fmtCurrency(c.overdueAmount)} • {c.overdueInvoiceCount} fatura</p>
                  </div>
                  <span style={badge(`₺${fmtCurrency(c.overdueAmount)}`, '#FF3B30')}>{`₺${fmtCurrency(c.overdueAmount)}`}</span>
                </div>
              ))}
          </div>
        )}
        {customerTab === 'crosssell' && (
          <div>
            <p style={{ fontSize: '13px', fontWeight: 600, color: '#000', margin: '0 0 8px' }}>Çapraz Satış Adayları</p>
            {customerBundle.crossSell.length === 0 ? <p style={{ fontSize: '13px', color: '#6C6C70' }}>Çapraz satış adayı bulunamadı.</p>
              : customerBundle.crossSell.slice(0, 6).map((c: any, idx: number) => (
                <div key={idx} style={{ display: 'flex', gap: '10px', backgroundColor: '#F9F9F9', borderRadius: '10px', padding: '10px', marginBottom: '6px' }}>
                  <div style={{ width: '4px', borderRadius: '2px', backgroundColor: '#007AFF', flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '14px', fontWeight: 600, color: '#000', margin: '0 0 2px' }}>{c.customerName}</p>
                    <p style={{ fontSize: '12px', color: '#6C6C70', margin: 0 }}>{c.activeProducts.join(', ')} → {c.recommended}</p>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Müşteri Skor Motoru */}
      <div style={card}>
        <p style={{ fontSize: '15px', fontWeight: 700, color: '#000', margin: '0 0 14px' }}>📈 AI Müşteri Skor Motoru 2.0</p>
        <div style={{ display: 'flex', backgroundColor: '#F2F2F7', borderRadius: '10px', padding: '2px', marginBottom: '12px' }}>
          {(['active', 'warming', 'churn', 'lost'] as const).map(tab => (
            <button key={tab} onClick={() => setScoreTab(tab)} style={{ flex: 1, padding: '7px 4px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '11px', fontWeight: 600, backgroundColor: scoreTab === tab ? '#fff' : 'transparent', color: scoreTab === tab ? '#000' : '#6C6C70', boxShadow: scoreTab === tab ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}>
              {tab === 'active' ? 'Aktif' : tab === 'warming' ? 'Isınan' : tab === 'churn' ? 'Risk' : 'Kayıp'}
            </button>
          ))}
        </div>
        {(() => {
          const allCustomers = Array.from(new Map([...data.invoices ?? [], ...data.expenses ?? []].map((i: any) => [i.owner_full_name, i])).values())
          const bundle = buildCustomerBundle(data.invoices ?? [], [])
          const customers = bundle.vip
          const filtered = customers.filter((c: any) => {
            const days = daysSince(c.lastActivityDate)
            if (scoreTab === 'active') return days <= 30
            if (scoreTab === 'warming') return days > 30 && days <= 60
            if (scoreTab === 'churn') return days > 60 && days <= 120
            return days > 120
          })
          const segColor = scoreTab === 'active' ? '#34C759' : scoreTab === 'warming' ? '#007AFF' : scoreTab === 'churn' ? '#FF9500' : '#FF3B30'
          return filtered.length === 0
            ? <p style={{ fontSize: '13px', color: '#6C6C70' }}>Bu segmentte müşteri bulunamadı.</p>
            : filtered.slice(0, 8).map((c: any, idx: number) => (
              <div key={idx} style={{ display: 'flex', gap: '10px', backgroundColor: '#F9F9F9', borderRadius: '10px', padding: '10px', marginBottom: '6px' }}>
                <div style={{ width: '4px', borderRadius: '2px', backgroundColor: segColor, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '14px', fontWeight: 600, color: '#000', margin: '0 0 2px' }}>{c.customerName}</p>
                  <p style={{ fontSize: '12px', color: '#6C6C70', margin: 0 }}>₺{fmtCurrency(c.totalRevenue)} • {c.visitCount} işlem • {daysSince(c.lastActivityDate)} gün önce</p>
                </div>
                <span style={badge(`Skor ${Math.round(c.vipScore)}`, segColor)}>{Math.round(c.vipScore)}</span>
              </div>
            ))
        })()}
      </div>

      {/* Modül AI Gözlemleri */}
      <InsightCard insight={stayInsight} icon="✨" />
      <InsightCard insight={daycareInsight} icon="✨" />
      <InsightCard insight={groomingInsight} icon="✨" />
      <InsightCard insight={financeInsight} icon="✨" />

      {/* Hızlı Sorular */}
      <div style={card}>
        <p style={{ fontSize: '15px', fontWeight: 700, color: '#000', margin: '0 0 12px' }}>Hızlı Sorular</p>
        {quickActions.map((qa, idx) => (
          <button key={idx} onClick={() => { setPrompt(qa.label); askAI(qa.label) }} disabled={aiLoading} style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%', padding: '12px 14px', borderRadius: '12px', border: '1px solid #E5E5EA', backgroundColor: '#F9F9F9', cursor: aiLoading ? 'not-allowed' : 'pointer', textAlign: 'left', marginBottom: '8px', opacity: aiLoading ? 0.6 : 1 }}>
            <span style={{ fontSize: '20px' }}>{qa.icon}</span>
            <span style={{ fontSize: '14px', color: '#000', fontWeight: 500, flex: 1 }}>{qa.label}</span>
            <span style={{ color: '#C7C7CC' }}>›</span>
          </button>
        ))}
      </div>

      {/* Serbest Soru */}
      <div style={card}>
        <p style={{ fontSize: '15px', fontWeight: 700, color: '#000', margin: '0 0 12px' }}>Serbest Soru Sor</p>
        <textarea value={prompt} onChange={e => setPrompt(e.target.value)} placeholder='İşletmeniz hakkında herhangi bir soru sorun...' rows={3} style={{ ...inp, resize: 'none', marginBottom: '10px' }} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); askAI() } }} />
        <button onClick={() => askAI()} disabled={aiLoading || !prompt.trim()} style={{ width: '100%', padding: '13px', borderRadius: '12px', background: 'linear-gradient(135deg, #AF52DE, #007AFF)', color: '#fff', border: 'none', cursor: aiLoading || !prompt.trim() ? 'not-allowed' : 'pointer', fontSize: '15px', fontWeight: 700, opacity: aiLoading || !prompt.trim() ? 0.6 : 1 }}>
          {aiLoading ? '✨ Düşünüyor...' : '✨ Sor'}
        </button>
      </div>

      {/* Yanıt */}
      {(aiLoading || aiResult) && (
        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'linear-gradient(135deg, #AF52DE, #007AFF)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>✨</div>
            <p style={{ fontSize: '14px', fontWeight: 600, color: '#000', margin: 0 }}>AI Yanıtı</p>
          </div>
          {aiLoading ? <p style={{ fontSize: '14px', color: '#6C6C70' }}>⏳ Verileriniz analiz ediliyor...</p>
            : <p style={{ fontSize: '14px', color: '#000', lineHeight: 1.7, margin: 0, whiteSpace: 'pre-wrap' }}>{aiResult}</p>}
        </div>
      )}

      {/* Footer */}
      <div style={card}>
        <p style={{ fontSize: '14px', fontWeight: 600, color: '#000', margin: '0 0 8px' }}>AI Notu</p>
        <p style={{ fontSize: '12px', color: '#6C6C70', margin: '0 0 10px' }}>Bu bölüm operasyonel verileri yorumlar, öncelik sıralaması yapar ve ticari fırsat alanlarını görünür hale getirir. Nihai karar yine işletme sahibine aittir.</p>
        <div style={{ display: 'flex', gap: '8px' }}>
          {['Premium', 'AI Destekli', 'Operasyon + Ticaret'].map(t => (
            <span key={t} style={badge(t, '#AF52DE')}>{t}</span>
          ))}
        </div>
      </div>
    </div>
  )
}