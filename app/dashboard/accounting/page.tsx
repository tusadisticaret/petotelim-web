'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import {
  ComposedChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'

const BUSINESS_ID = 'a59e232c-3334-43c7-94b4-7f3da311b01d'

type PeriodFilter = 'today' | 'thisMonth' | 'last3Months' | 'custom'

function todayLocalStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

function fmtCurrency(v: number) {
  return v.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtDate(s: string) {
  if (!s) return '?'
  const str = s.length === 10 ? s + 'T12:00:00' : s
  const d = new Date(str)
  return d.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Europe/Istanbul' })
}

function shortMoney(v: number) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`
  return `${v.toFixed(0)}`
}

function getDateRange(filter: PeriodFilter, customFrom?: string, customTo?: string): { from: string; to: string } {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth()
  const today = todayLocalStr()
  if (filter === 'today') return { from: today, to: today }
  if (filter === 'thisMonth') return { from: `${y}-${String(m+1).padStart(2,'0')}-01`, to: today }
  if (filter === 'custom') return { from: customFrom ?? today, to: customTo ?? today }
  const from3 = new Date(y, m - 2, 1)
  return { from: `${from3.getFullYear()}-${String(from3.getMonth()+1).padStart(2,'0')}-01`, to: today }
}

function calcIncomeBySource(invoices: any[]) {
  const stay = invoices.filter(i => i.source_ref?.startsWith('stay:')).reduce((s: number, i: any) => s + parseFloat(i.total_amount ?? 0), 0)
  const longStay = invoices.filter(i => i.source_ref?.startsWith('longstay:')).reduce((s: number, i: any) => s + parseFloat(i.total_amount ?? 0), 0)
  const daycare = invoices.filter(i => i.source_ref?.startsWith('daycare:')).reduce((s: number, i: any) => s + parseFloat(i.total_amount ?? 0), 0)
  const grooming = invoices.filter(i => i.source_ref?.startsWith('grooming')).reduce((s: number, i: any) => s + parseFloat(i.total_amount ?? 0), 0)
  const quickSale = invoices.filter(i => i.source_ref?.startsWith('quicksale:') || i.source_ref?.startsWith('quick_sale:')).reduce((s: number, i: any) => s + parseFloat(i.total_amount ?? 0), 0)
  const other = invoices.filter(i =>
    !i.source_ref?.startsWith('stay:') && !i.source_ref?.startsWith('longstay:') &&
    !i.source_ref?.startsWith('daycare:') && !i.source_ref?.startsWith('grooming') &&
    !i.source_ref?.startsWith('quicksale:') && !i.source_ref?.startsWith('quick_sale:')
  ).reduce((s: number, i: any) => s + parseFloat(i.total_amount ?? 0), 0)
  return { stay, longStay, daycare, grooming, quickSale, other }
}

function calcRecurringForPeriod(recurring: any[], fromDate: Date, toDate: Date): number {
  let total = 0
  for (const r of recurring) {
    if (!r.is_active) continue
    const start = new Date(r.start_date)
    if (start > toDate) continue
    const effectiveFrom = start > fromDate ? start : fromDate
    const fromYear = effectiveFrom.getFullYear()
    const fromMonth = effectiveFrom.getMonth()
    const toYear = toDate.getFullYear()
    const toMonth = toDate.getMonth()
    const months = (toYear - fromYear) * 12 + (toMonth - fromMonth) + 1
    total += parseFloat(r.amount ?? 0) * Math.max(1, months)
  }
  return total
}

export default function AccountingPage() {
  const [period, setPeriod] = useState<PeriodFilter>('thisMonth')
  const [customFrom, setCustomFrom] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 90)
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
  })
  const [customTo, setCustomTo] = useState(todayLocalStr)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [loading, setLoading] = useState(true)
  const [incomeBySource, setIncomeBySource] = useState({ stay: 0, longStay: 0, daycare: 0, grooming: 0, quickSale: 0, other: 0 })
  const [paidCount, setPaidCount] = useState(0)
  const [pendingInvoices, setPendingInvoices] = useState<any[]>([])
  const [recentPaid, setRecentPaid] = useState<any[]>([])
  const [monthlyTrend, setMonthlyTrend] = useState<{ label: string; shortLabel: string; income: number; expense: number }[]>([])
  const [showIncome, setShowIncome] = useState(true)
  const [showExpenses, setShowExpenses] = useState(true)
  const [totalExpenseInRange, setTotalExpenseInRange] = useState(0)
  const [totalInvoiceCount, setTotalInvoiceCount] = useState(0)
  const [totalExpenseCount, setTotalExpenseCount] = useState(0)
  const [expenseByCategory, setExpenseByCategory] = useState<Record<string, number>>({})
  const [selectedExpenseCategory, setSelectedExpenseCategory] = useState<string | null>(null)
  const [expenseDetails, setExpenseDetails] = useState<any[]>([])
  const [recurringDetails, setRecurringDetails] = useState<any[]>([])

  useEffect(() => { loadData() }, [])
  useEffect(() => { if (period !== 'custom') loadData() }, [period])

  async function loadData(cFrom?: string, cTo?: string) {
    setLoading(true)
    const supabase = createClient()
    const { from, to } = getDateRange(period, cFrom ?? customFrom, cTo ?? customTo)

    const { data: paidInvoices } = await supabase
      .from('sales_invoices').select('id, source_ref, total_amount, owner_full_name, pet_name, paid_at, type_raw')
      .eq('business_id', BUSINESS_ID).eq('is_paid', true)
      .gte('paid_at', from + 'T00:00:00').lte('paid_at', to + 'T23:59:59')

    setIncomeBySource(calcIncomeBySource(paidInvoices ?? []))
    setPaidCount((paidInvoices ?? []).length)

const { data: expensesInRange } = await supabase
  .from('expenses').select('amount, category_raw, note, date')
  .eq('business_id', BUSINESS_ID).gte('date', from).lte('date', to)
setExpenseDetails(expensesInRange ?? [])

const { data: recurringAll } = await supabase
  .from('recurring_expenses').select('amount, start_date, is_active, category_raw, note')
  .eq('business_id', BUSINESS_ID)
setRecurringDetails(recurringAll ?? [])

    const manualTotal = (expensesInRange ?? []).reduce((s: number, e: any) => s + parseFloat(e.amount ?? 0), 0)
    const recurringTotal = calcRecurringForPeriod(recurringAll ?? [], new Date(from + 'T00:00:00'), new Date(to + 'T23:59:59'))
    setTotalExpenseInRange(manualTotal + recurringTotal)

    const categoryTotals: Record<string, number> = {}
    for (const e of (expensesInRange ?? [])) {
      const cat = e.category_raw ?? 'Diğer'
      categoryTotals[cat] = (categoryTotals[cat] ?? 0) + parseFloat(e.amount ?? 0)
    }
    for (const r of (recurringAll ?? []).filter((r: any) => r.is_active)) {
      const start = new Date(r.start_date)
      const fromDate = new Date(from + 'T00:00:00')
      const toDate = new Date(to + 'T23:59:59')
      if (start > toDate) continue
      const effectiveFrom = start > fromDate ? start : fromDate
      const months = (toDate.getFullYear() - effectiveFrom.getFullYear()) * 12 + (toDate.getMonth() - effectiveFrom.getMonth()) + 1
      categoryTotals[r.category_raw] = (categoryTotals[r.category_raw] ?? 0) + parseFloat(r.amount ?? 0) * Math.max(1, months)
    }
    setExpenseByCategory(categoryTotals)
    
const { data: pending } = await supabase
  .from('sales_invoices').select('id, owner_full_name, pet_name, total_amount, created_at, service_date')
  .eq('business_id', BUSINESS_ID).eq('is_paid', false)
  .order('service_date', { ascending: false })
  .order('source_ref', { ascending: true })
    setPendingInvoices(pending ?? [])

    const { count: invCount } = await supabase
      .from('sales_invoices')
      .select('*', { count: 'exact', head: true })
      .eq('business_id', BUSINESS_ID)
    setTotalInvoiceCount(invCount ?? 0)

    const { count: expCount } = await supabase
      .from('expenses')
      .select('*', { count: 'exact', head: true })
      .eq('business_id', BUSINESS_ID)
setTotalExpenseCount(expCount ?? 0)

    const { data: paid } = await supabase
      .from('sales_invoices').select('id, owner_full_name, pet_name, total_amount, paid_at, type_raw')
      .eq('business_id', BUSINESS_ID).eq('is_paid', true).order('paid_at', { ascending: false }).limit(8)
    setRecentPaid(paid ?? [])

    await loadMonthlyTrend(supabase, recurringAll ?? [])
    setLoading(false)
  }

  async function loadMonthlyTrend(supabase: any, recurringAll: any[]) {
    const now = new Date()
    const months: { label: string; shortLabel: string; income: number; expense: number }[] = []

    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const y = d.getFullYear()
      const m = d.getMonth()
      const fromStr = `${y}-${String(m+1).padStart(2,'0')}-01`
      const lastDay = new Date(y, m + 1, 0).getDate()
      const toStr = `${y}-${String(m+1).padStart(2,'0')}-${String(lastDay).padStart(2,'0')}`
      const monthEnd = new Date(y, m + 1, 0)

      const label = d.toLocaleDateString('tr-TR', { month: 'long', year: '2-digit' })
      const shortLabel = d.toLocaleDateString('tr-TR', { month: 'short' })

      const { data: inv } = await supabase
        .from('sales_invoices').select('total_amount')
        .eq('business_id', BUSINESS_ID).eq('is_paid', true)
        .gte('paid_at', fromStr + 'T00:00:00').lte('paid_at', toStr + 'T23:59:59')

      const income = (inv ?? []).reduce((s: number, i: any) => s + parseFloat(i.total_amount ?? 0), 0)

      const { data: exp } = await supabase
        .from('expenses').select('amount')
        .eq('business_id', BUSINESS_ID).gte('date', fromStr).lte('date', toStr)

      const manualExp = (exp ?? []).reduce((s: number, e: any) => s + parseFloat(e.amount ?? 0), 0)
      const recurringExp = calcRecurringForPeriod(recurringAll, new Date(fromStr + 'T00:00:00'), monthEnd)
      const expense = manualExp + recurringExp

      months.push({ label, shortLabel, income, expense })
    }

    setMonthlyTrend(months)
  }

  const totalIncome = Object.values(incomeBySource).reduce((a, b) => a + b, 0)
  const netProfit = totalIncome - totalExpenseInRange
  const { from, to } = getDateRange(period, customFrom, customTo)

  const periodLabels: Record<PeriodFilter, string> = {
    today: 'Bugün', thisMonth: 'Bu Ay', last3Months: 'Son 3 Ay', custom: 'Özel Aralık',
  }

  const card: React.CSSProperties = {
    backgroundColor: '#fff', borderRadius: '16px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)', marginBottom: '16px', padding: '20px'
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null
    return (
      <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '10px 14px', boxShadow: '0 4px 16px rgba(0,0,0,0.12)', fontSize: '13px', minWidth: '140px' }}>
        <p style={{ margin: '0 0 6px', fontWeight: 700, color: '#000' }}>{payload[0]?.payload?.label}</p>
        {payload.map((p: any, i: number) => (
          <p key={i} style={{ margin: '2px 0', color: p.color, fontWeight: 600 }}>
            {p.name}: ₺{fmtCurrency(p.value)}
          </p>
        ))}
      </div>
    )
  }

  if (loading) return <div style={{ padding: '32px', color: '#6C6C70' }}>Yükleniyor...</div>

  return (
    <div style={{ padding: '32px', maxWidth: '800px', paddingBottom: '64px' }}>
      <h1 style={{ fontSize: '32px', fontWeight: 800, margin: '0 0 24px' }}>Muhasebe</h1>

      {/* Dönem Filtresi */}
      <div style={card}>
        <p style={{ fontSize: '15px', fontWeight: 700, margin: '0 0 12px', color: '#000' }}>Dönem Filtresi</p>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '10px' }}>
          {(['today', 'thisMonth', 'last3Months', 'custom'] as PeriodFilter[]).map(p => (
            <button key={p} onClick={() => { setPeriod(p); if (p === 'custom') setShowDatePicker(true); else setShowDatePicker(false) }}
              style={{ padding: '8px 16px', borderRadius: '20px', border: period === p ? 'none' : '1px solid #E5E5EA', backgroundColor: period === p ? '#007AFF' : '#F2F2F7', color: period === p ? '#fff' : '#000', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>
              {periodLabels[p]}
            </button>
          ))}
        </div>
        {period === 'custom' && (
          <div style={{ marginTop: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>📅</span>
                <p style={{ fontSize: '14px', fontWeight: 600, color: '#000', margin: 0 }}>Gösterilen Dönem</p>
              </div>
              <button onClick={() => setShowDatePicker(p => !p)}
                style={{ padding: '6px 14px', borderRadius: '10px', border: '1px solid #E5E5EA', backgroundColor: '#fff', color: '#007AFF', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}>
                {showDatePicker ? 'Kapat' : 'Değiştir'}
              </button>
            </div>
            {showDatePicker ? (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                  <p style={{ fontSize: '12px', color: '#6C6C70', margin: 0, width: '70px' }}>Başlangıç</p>
                  <input type='date' value={customFrom} onChange={e => setCustomFrom(e.target.value)}
                    style={{ flex: 1, padding: '8px 12px', backgroundColor: '#F2F2F7', borderRadius: '10px', border: 'none', outline: 'none', fontSize: '14px' }} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
                  <p style={{ fontSize: '12px', color: '#6C6C70', margin: 0, width: '70px' }}>Bitiş</p>
                  <input type='date' value={customTo} onChange={e => setCustomTo(e.target.value)}
                    style={{ flex: 1, padding: '8px 12px', backgroundColor: '#F2F2F7', borderRadius: '10px', border: 'none', outline: 'none', fontSize: '14px' }} />
                </div>
                <button onClick={() => { setShowDatePicker(false); loadData(customFrom, customTo) }}
                  style={{ width: '100%', padding: '12px', borderRadius: '12px', backgroundColor: '#007AFF', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: 600 }}>
                  🔄 Bu Aralığı Yükle
                </button>
              </div>
            ) : (
              <p style={{ fontSize: '12px', color: '#6C6C70', margin: 0 }}>{fmtDate(customFrom)} – {fmtDate(customTo)}</p>
            )}
          </div>
        )}
        {period !== 'custom' && (
          <p style={{ fontSize: '12px', color: '#6C6C70', margin: 0 }}>{fmtDate(from)} – {fmtDate(to)}</p>
        )}
      </div>

      {/* Kısayollar */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
        <Link href='/dashboard/accounting/sales' style={{ textDecoration: 'none' }}>
          <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
            <div style={{ fontSize: '28px', marginBottom: '8px' }}>📄</div>
            <p style={{ fontSize: '16px', fontWeight: 700, color: '#000', margin: '0 0 4px' }}>Satış Faturaları</p>
            <p style={{ fontSize: '13px', color: '#6C6C70', margin: 0 }}>{totalInvoiceCount} kayıt</p>

          </div>
        </Link>
        <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <div style={{ fontSize: '28px', marginBottom: '8px' }}>➖</div>
          <p style={{ fontSize: '16px', fontWeight: 700, color: '#000', margin: '0 0 4px' }}>Giderler</p>
          <p style={{ fontSize: '13px', color: '#6C6C70', margin: 0 }}>{totalExpenseCount} kayıt</p>

        </div>
      </div>

      {/* Net Kâr */}
      <div style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <p style={{ fontSize: '11px', fontWeight: 700, color: '#6C6C70', margin: '0 0 4px', letterSpacing: '0.5px' }}>NET KÂR</p>
            <p style={{ fontSize: '32px', fontWeight: 800, color: netProfit >= 0 ? '#000' : '#FF3B30', margin: 0, fontVariantNumeric: 'tabular-nums' }}>
              ₺{fmtCurrency(netProfit)}
            </p>
            {netProfit < 0 && <p style={{ fontSize: '12px', color: '#FF3B30', margin: '4px 0 0', fontWeight: 600 }}>⚠ Zarardasın</p>}
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '11px', color: '#6C6C70', margin: '0 0 2px' }}>GELİR</p>
            <p style={{ fontSize: '15px', fontWeight: 700, color: '#34C759', margin: '0 0 6px', fontVariantNumeric: 'tabular-nums' }}>₺{fmtCurrency(totalIncome)}</p>
            <p style={{ fontSize: '11px', color: '#6C6C70', margin: '0 0 2px' }}>GİDER</p>
            <p style={{ fontSize: '15px', fontWeight: 700, color: '#FF3B30', margin: 0, fontVariantNumeric: 'tabular-nums' }}>₺{fmtCurrency(totalExpenseInRange)}</p>
          </div>
        </div>
        {(totalIncome > 0 || totalExpenseInRange > 0) && (() => {
          const total = Math.max(totalIncome, totalExpenseInRange)
          return (
            <div style={{ marginTop: '16px' }}>
              <div style={{ height: '8px', borderRadius: '4px', backgroundColor: '#F2F2F7', overflow: 'hidden', display: 'flex' }}>
                <div style={{ width: `${(totalIncome / total) * 100}%`, backgroundColor: '#34C759', borderRadius: '4px 0 0 4px', transition: 'width 0.3s' }} />
                <div style={{ width: `${(totalExpenseInRange / total) * 100}%`, backgroundColor: '#FF3B30', borderRadius: '0 4px 4px 0', transition: 'width 0.3s' }} />
              </div>
              <div style={{ display: 'flex', gap: '16px', marginTop: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#34C759' }} />
                  <span style={{ fontSize: '11px', color: '#6C6C70' }}>Gelir</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#FF3B30' }} />
                  <span style={{ fontSize: '11px', color: '#6C6C70' }}>Gider</span>
                </div>
              </div>
            </div>
          )
        })()}
      </div>

      {/* Toplam Gelir / Gider */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
        <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#34C759', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', color: '#fff' }}>↓</div>
            <p style={{ fontSize: '12px', color: '#6C6C70', margin: 0 }}>{paidCount} kayıt</p>
          </div>
          <p style={{ fontSize: '11px', color: '#6C6C70', margin: '0 0 4px', letterSpacing: '0.5px' }}>TOPLAM GELİR</p>
          <p style={{ fontSize: '20px', fontWeight: 800, color: '#34C759', margin: 0, fontVariantNumeric: 'tabular-nums' }}>₺{fmtCurrency(totalIncome)}</p>
        </div>
        <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#FF3B30', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', color: '#fff' }}>↑</div>
            <p style={{ fontSize: '12px', color: '#6C6C70', margin: 0 }}>{totalExpenseCount} kayıt</p>
          </div>
          <p style={{ fontSize: '11px', color: '#6C6C70', margin: '0 0 4px', letterSpacing: '0.5px' }}>TOPLAM GİDER</p>
          <p style={{ fontSize: '20px', fontWeight: 800, color: '#FF3B30', margin: 0, fontVariantNumeric: 'tabular-nums' }}>₺{fmtCurrency(totalExpenseInRange)}</p>
        </div>
      </div>

      {/* Bekleyen Tahsilatlar */}
      {pendingInvoices.length > 0 && (
        <div style={{ backgroundColor: '#FFF8F0', borderRadius: '16px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', marginBottom: '16px', border: '1px solid #FF950030' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={{ fontSize: '15px', fontWeight: 700, color: '#000', margin: '0 0 4px' }}>Bekleyen Tahsilatlar</p>
              <p style={{ fontSize: '24px', fontWeight: 800, color: '#FF9500', margin: '0 0 4px', fontVariantNumeric: 'tabular-nums' }}>
                ₺{fmtCurrency(pendingInvoices.reduce((s, i) => s + parseFloat(i.total_amount ?? 0), 0))}
              </p>
              <p style={{ fontSize: '13px', color: '#6C6C70', margin: 0 }}>{pendingInvoices.length} bekleyen fatura</p>
              {pendingInvoices.reduce((s, i) => s + parseFloat(i.total_amount ?? 0), 0) >= 10000 && (
                <p style={{ fontSize: '12px', color: '#FF3B30', fontWeight: 600, margin: '4px 0 0' }}>Tahsilat riski yüksek</p>
              )}
            </div>
            <Link href='/dashboard/accounting/sales' style={{ textDecoration: 'none' }}>
              <button style={{ padding: '8px 16px', borderRadius: '20px', backgroundColor: '#F2F2F7', border: 'none', color: '#007AFF', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>› Faturalara Git</button>
            </Link>
          </div>
        </div>
      )}

      {/* Son Tahsilatlar */}
      {recentPaid.length > 0 && (
        <div style={{ backgroundColor: '#fff', borderRadius: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', marginBottom: '16px', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #E5E5EA', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ fontSize: '15px', fontWeight: 700, color: '#000', margin: 0 }}>Son Tahsilatlar</p>
              <p style={{ fontSize: '12px', color: '#6C6C70', margin: '2px 0 0' }}>{recentPaid.length} kayıt gösteriliyor</p>
            </div>
            <Link href='/dashboard/accounting/sales' style={{ textDecoration: 'none' }}>
              <button style={{ padding: '6px 14px', borderRadius: '20px', backgroundColor: '#F2F2F7', border: 'none', color: '#007AFF', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>› Tümünü Gör</button>
            </Link>
          </div>
          {recentPaid.map((inv, idx) => (
            <div key={inv.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 20px', borderBottom: idx < recentPaid.length - 1 ? '1px solid #F2F2F7' : 'none' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: '#007AFF20', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0 }}>📄</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: '14px', fontWeight: 600, color: '#000', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {inv.owner_full_name}{inv.pet_name ? ` (${inv.pet_name})` : ''}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                  <span style={{ fontSize: '11px', padding: '1px 8px', borderRadius: '20px', backgroundColor: '#6C6C7020', color: '#6C6C70', fontWeight: 600 }}>{inv.type_raw ?? 'Diğer'}</span>
                  <span style={{ fontSize: '11px', color: '#6C6C70' }}>{fmtDate(inv.paid_at ?? '')}</span>
                </div>
              </div>
              <p style={{ fontSize: '14px', fontWeight: 700, color: '#34C759', margin: 0, fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>₺{fmtCurrency(parseFloat(inv.total_amount ?? 0))}</p>
            </div>
          ))}
        </div>
      )}

      {/* Bekleyen Faturalar */}
      {pendingInvoices.length > 0 && (
        <div style={{ backgroundColor: '#fff', borderRadius: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', marginBottom: '16px', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #E5E5EA' }}>
            <p style={{ fontSize: '15px', fontWeight: 700, color: '#000', margin: 0 }}>Bekleyen Faturalar</p>
            <p style={{ fontSize: '12px', color: '#6C6C70', margin: '2px 0 0' }}>{pendingInvoices.length} fatura</p>
          </div>
          {pendingInvoices.slice(0, 8).map((inv, idx) => (
            <div key={inv.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 20px', borderBottom: idx < Math.min(pendingInvoices.length, 8) - 1 ? '1px solid #F2F2F7' : 'none' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#FF950020', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>🕐</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: '14px', fontWeight: 600, color: '#000', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {inv.owner_full_name}{inv.pet_name ? ` (${inv.pet_name})` : ''}
                </p>
                <p style={{ fontSize: '12px', color: '#6C6C70', margin: '2px 0 0' }}>{fmtDate(inv.service_date ?? inv.created_at ?? '')}</p>
              </div>
              <p style={{ fontSize: '14px', fontWeight: 700, color: '#FF9500', margin: 0, fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>₺{fmtCurrency(parseFloat(inv.total_amount ?? 0))}</p>
            </div>
          ))}
        </div>
      )}

      {/* Gelirler */}
      <div style={{ backgroundColor: '#fff', borderRadius: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', marginBottom: '16px', overflow: 'hidden' }}>
        <button onClick={() => setShowIncome(p => !p)} style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', padding: '16px 20px' }}>
          <div style={{ width: '4px', height: '20px', borderRadius: '2px', backgroundColor: '#34C759', flexShrink: 0 }} />
          <p style={{ fontSize: '16px', fontWeight: 800, color: '#000', margin: 0 }}>GELİRLER</p>
          <span style={{ marginLeft: 'auto', fontSize: '14px', color: '#6C6C70' }}>{showIncome ? '∧' : '∨'}</span>
        </button>
        {showIncome && (
          <div style={{ padding: '0 20px 20px' }}>
            <p style={{ fontSize: '11px', fontWeight: 700, color: '#6C6C70', margin: '0 0 12px', letterSpacing: '0.5px' }}>GELİR KATEGORİLERİ</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              {[
                { icon: '🛏️', label: 'Konaklama', value: incomeBySource.stay },
                { icon: '📅', label: 'Uzun Süreli', value: incomeBySource.longStay },
                { icon: '🏠', label: 'Kreş', value: incomeBySource.daycare },
                { icon: '✂️', label: 'Grooming', value: incomeBySource.grooming },
                { icon: '🛒', label: 'Hızlı Satış', value: incomeBySource.quickSale },
                { icon: '➕', label: 'Diğer Gelirler', value: incomeBySource.other },
              ].map((item, idx) => (
                <div key={idx} style={{ backgroundColor: '#F9F9FB', borderRadius: '14px', padding: '16px' }}>
                  <p style={{ fontSize: '24px', margin: '0 0 8px' }}>{item.icon}</p>
                  <p style={{ fontSize: '14px', color: '#000', margin: '0 0 4px' }}>{item.label}</p>
                  <p style={{ fontSize: '16px', fontWeight: 700, color: item.value > 0 ? '#34C759' : '#C7C7CC', margin: '0 0 8px', fontVariantNumeric: 'tabular-nums' }}>₺{fmtCurrency(item.value)}</p>
                  <div style={{ height: '4px', borderRadius: '2px', backgroundColor: '#E5E5EA', overflow: 'hidden' }}>
                    <div style={{ height: '100%', borderRadius: '2px', backgroundColor: item.value > 0 ? '#34C759' : '#E5E5EA', width: `${totalIncome > 0 ? Math.min(100, (item.value / totalIncome) * 100) : 0}%`, transition: 'width 0.3s' }} />
                  </div>
                  <p style={{ fontSize: '11px', color: '#8E8E93', margin: '4px 0 0' }}>
                    {totalIncome > 0 ? `${Math.round((item.value / totalIncome) * 100)}%` : '0%'}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Giderler */}
      <div style={{ backgroundColor: '#fff', borderRadius: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', marginBottom: '16px', overflow: 'hidden' }}>
        <button onClick={() => setShowExpenses(p => !p)} style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', padding: '16px 20px' }}>
          <div style={{ width: '4px', height: '20px', borderRadius: '2px', backgroundColor: '#FF3B30', flexShrink: 0 }} />
          <p style={{ fontSize: '16px', fontWeight: 800, color: '#000', margin: 0 }}>GİDERLER</p>
          <span style={{ marginLeft: 'auto', fontSize: '14px', color: '#6C6C70' }}>{showExpenses ? '∧' : '∨'}</span>
        </button>
        {showExpenses && (
          <div style={{ padding: '0 20px 20px' }}>
            <p style={{ fontSize: '11px', fontWeight: 700, color: '#6C6C70', margin: '0 0 12px', letterSpacing: '0.5px' }}>GİDER KATEGORİLERİ</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              {[
                { icon: '👤', label: 'Personel Maaşı', key: 'Personel Maaşı' },
                { icon: '🏢', label: 'Kira', key: 'Kira' },
                { icon: '⚡', label: 'Fatura', key: 'Fatura' },
                { icon: '🏥', label: 'Veteriner / İlaç', key: 'Veteriner / İlaç' },
                { icon: '📦', label: 'Mama / Malzeme', key: 'Mama / Malzeme' },
                { icon: '✨', label: 'Temizlik Malzemesi', key: 'Temizlik Malzemesi' },
                { icon: '📋', label: 'Vergi / Kurum Ödemeleri', key: 'Vergi / Kurum Ödemeleri' },
                { icon: '⋯', label: 'Diğer', key: 'Diğer' },
              // SONRA
              ].map((item, idx) => {
                const value = expenseByCategory[item.key] ?? 0
                return (
                  <div key={idx} onClick={() => setSelectedExpenseCategory(item.key)} style={{ backgroundColor: '#F9F9FB', borderRadius: '14px', padding: '16px', cursor: 'pointer' }}>
                    <p style={{ fontSize: '24px', margin: '0 0 8px' }}>{item.icon}</p>
                    <p style={{ fontSize: '14px', color: '#000', margin: '0 0 4px' }}>{item.label}</p>
                    <p style={{ fontSize: '16px', fontWeight: 700, color: value > 0 ? '#FF3B30' : '#C7C7CC', margin: '0 0 8px', fontVariantNumeric: 'tabular-nums' }}>
                      ₺{fmtCurrency(value)}
                    </p>
                    <div style={{ height: '4px', borderRadius: '2px', backgroundColor: '#E5E5EA', overflow: 'hidden' }}>
                      <div style={{ height: '100%', borderRadius: '2px', backgroundColor: value > 0 ? '#FF3B30' : '#E5E5EA', width: `${totalExpenseInRange > 0 ? Math.min(100, (value / totalExpenseInRange) * 100) : 0}%`, transition: 'width 0.3s' }} />
                    </div>
                    <p style={{ fontSize: '11px', color: '#8E8E93', margin: '4px 0 0' }}>
                      {totalExpenseInRange > 0 ? `${Math.round((value / totalExpenseInRange) * 100)}%` : '0%'}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Aylık Trend Grafiği */}
      <div style={{ backgroundColor: '#fff', borderRadius: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', padding: '20px', marginBottom: '16px' }}>
        <p style={{ fontSize: '15px', fontWeight: 700, color: '#000', margin: '0 0 20px' }}>Aylık Trend (Son 12 Ay)</p>
        {monthlyTrend.every(m => m.income === 0 && m.expense === 0) ? (
          <p style={{ fontSize: '14px', color: '#6C6C70', textAlign: 'center', padding: '20px 0' }}>Gösterilecek veri yok.</p>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={240}>
              <ComposedChart data={monthlyTrend} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#34C759" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#34C759" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#FF3B30" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#FF3B30" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4 4" stroke="#F2F2F7" vertical={false} />
                <XAxis dataKey="shortLabel" tick={{ fontSize: 11, fill: '#8E8E93' }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={shortMoney} tick={{ fontSize: 11, fill: '#8E8E93' }} axisLine={false} tickLine={false} width={40} />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone" dataKey="income" name="Gelir"
                  stroke="#34C759" strokeWidth={2.5} fill="url(#incomeGradient)"
                  dot={{ fill: '#34C759', strokeWidth: 2, r: 4, stroke: '#fff' }}
                  activeDot={{ r: 6, stroke: '#34C759', strokeWidth: 2, fill: '#fff' }}
                />
                <Area
                  type="monotone" dataKey="expense" name="Gider"
                  stroke="#FF3B30" strokeWidth={2.5} fill="url(#expenseGradient)"
                  dot={{ fill: '#FF3B30', strokeWidth: 2, r: 4, stroke: '#fff' }}
                  activeDot={{ r: 6, stroke: '#FF3B30', strokeWidth: 2, fill: '#fff' }}
                />
              </ComposedChart>
            </ResponsiveContainer>
            <div style={{ display: 'flex', gap: '20px', marginTop: '12px', justifyContent: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '24px', height: '3px', backgroundColor: '#34C759', borderRadius: '2px' }} />
                <span style={{ fontSize: '12px', color: '#6C6C70' }}>Gelir</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '24px', height: '3px', backgroundColor: '#FF3B30', borderRadius: '2px' }} />
                <span style={{ fontSize: '12px', color: '#6C6C70' }}>Gider</span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Gider Kategori Detay Modal */}
      {selectedExpenseCategory && (
        <div
          onClick={e => { if (e.target === e.currentTarget) setSelectedExpenseCategory(null) }}
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 1000 }}
        >
          <div style={{ backgroundColor: '#fff', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: '800px', maxHeight: '70vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #F2F2F7' }}>
              <p style={{ fontSize: '17px', fontWeight: 700, margin: 0 }}>{selectedExpenseCategory}</p>
              <button onClick={() => setSelectedExpenseCategory(null)} style={{ padding: '6px 16px', borderRadius: '10px', border: 'none', backgroundColor: '#F2F2F7', fontSize: '15px', cursor: 'pointer', fontWeight: 500 }}>Kapat</button>
            </div>
            <div style={{ overflowY: 'auto', padding: '16px 20px' }}>
              {recurringDetails.filter(r => r.category_raw === selectedExpenseCategory && r.is_active).length > 0 && (
                <div style={{ marginBottom: '20px' }}>
                  <p style={{ fontSize: '13px', fontWeight: 600, color: '#8E8E93', margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Tekrarlayan Giderler</p>
                  {recurringDetails.filter(r => r.category_raw === selectedExpenseCategory && r.is_active).map((r, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', backgroundColor: '#F9F9FB', borderRadius: '12px', marginBottom: '8px' }}>
                      <div>
                        <p style={{ margin: 0, fontSize: '15px', fontWeight: 600 }}>Mayıs 2026</p>
                        {r.note && <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#8E8E93' }}>{r.note}</p>}
                      </div>
                      <p style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#FF3B30' }}>₺{fmtCurrency(parseFloat(r.amount))}</p>
                    </div>
                  ))}
                </div>
              )}
              {expenseDetails.filter(e => e.category_raw === selectedExpenseCategory).length > 0 && (
                <div>
                  <p style={{ fontSize: '13px', fontWeight: 600, color: '#8E8E93', margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Tek Seferlik Giderler</p>
                  {expenseDetails.filter(e => e.category_raw === selectedExpenseCategory).map((e, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', backgroundColor: '#F9F9FB', borderRadius: '12px', marginBottom: '8px' }}>
                      <div>
                        <p style={{ margin: 0, fontSize: '15px', fontWeight: 600 }}>{e.note || fmtDate(e.date)}</p>
                        {e.note && <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#8E8E93' }}>{fmtDate(e.date)}</p>}
                      </div>
                      <p style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#FF3B30' }}>₺{fmtCurrency(parseFloat(e.amount))}</p>
                    </div>
                  ))}
                </div>
              )}
              {expenseDetails.filter(e => e.category_raw === selectedExpenseCategory).length === 0 &&
               recurringDetails.filter(r => r.category_raw === selectedExpenseCategory && r.is_active).length === 0 && (
                <p style={{ textAlign: 'center', color: '#8E8E93', padding: '20px 0' }}>Bu kategoride kayıt yok.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
