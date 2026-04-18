'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const navSections = [
  {
    title: null,
    items: [
      { href: '/dashboard', label: 'Kontrol Merkezi', icon: '📊' },
    ]
  },
  {
  title: 'AI',
  items: [
    { href: '/dashboard/ai', label: 'AI Asistan', icon: '✨' },
  ]
},
 {
  title: 'Pet Yonetimi',
  items: [
    { href: '/dashboard/pets', label: 'Evcil Hayvanlar', icon: '🐾' },
    { href: '/dashboard/photos', label: 'Fotograf Arsivi', icon: '📷' },
  ]
},
  {
    title: 'Konaklama Yonetimi',
    items: [
      { href: '/dashboard/stays/checkin', label: 'Check-in', icon: '⬇️' },
     { href: '/dashboard/stays', label: 'Uzun Konaklama', icon: '🏨' },
      { href: '/dashboard/stays/checkout', label: 'Check-out', icon: '⬆️' },
      { href: '/dashboard/stays/reservations', label: 'Rezervasyonlar', icon: '📅' },
    ]
  },
{
    title: 'Gunluk Bakim',
    items: [
      { href: '/dashboard/daycare/new', label: 'Yeni Plan', icon: '➕' },
      { href: '/dashboard/daycare/weekly', label: 'Haftalik Plan', icon: '📆' },
    ]
  },
{
    title: 'Bakim & Grooming',
    items: [
      { href: '/dashboard/grooming/wash', label: 'Yikama', icon: '💧' },
      { href: '/dashboard/grooming/trim', label: 'Tiras', icon: '✂️' },
      { href: '/dashboard/grooming/reservations', label: 'Rezervasyon', icon: '📅' },
      { href: '/dashboard/grooming/history', label: 'Gecmis', icon: '🕐' },
    ]
  },
  {
    title: 'Muhasebe',
    items: [
      { href: '/dashboard/accounting', label: 'Genel Durum', icon: '📋' },
      { href: '/dashboard/accounting/sales', label: 'Satislar', icon: '📄' },
      { href: '/dashboard/accounting/expenses', label: 'Giderler', icon: '➖' },
      { href: '/dashboard/accounting/payments', label: 'Musteriler', icon: '👥' },
    ]
  },
  {
    title: 'Satis & Stok',
    items: [
      { href: '/dashboard/sales', label: 'Hizli Satis', icon: '🛒' },
      { href: '/dashboard/stock', label: 'Urun Listesi', icon: '📦' },
    ]
  },
]

interface Props {
  user: { email?: string } | null
  business: { name?: string } | null
}

export default function Sidebar({ user, business }: Props) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <aside style={{width:'260px',backgroundColor:'#F2F2F7',borderRight:'1px solid #E5E5EA',display:'flex',flexDirection:'column',height:'100vh',flexShrink:0}}>
      <div style={{padding:'24px 20px 16px'}}>
        <h1 style={{fontSize:'22px',fontWeight:800,color:'#000',margin:0}}>PetOtelim</h1>
        {business?.name && <p style={{fontSize:'12px',color:'#6C6C70',marginTop:'2px'}}>{business.name}</p>}
      </div>

      <nav style={{flex:1,overflowY:'auto',padding:'0 12px 16px'}}>
        {navSections.map((section, si) => (
          <div key={si} style={{marginBottom:'16px'}}>
            {section.title && (
              <p style={{fontSize:'11px',fontWeight:600,color:'#6C6C70',padding:'0 12px',marginBottom:'4px',textTransform:'uppercase',letterSpacing:'0.5px'}}>
                {section.title}
              </p>
            )}
            <div style={{backgroundColor:'#fff',borderRadius:'12px',overflow:'hidden',boxShadow:'0 1px 2px rgba(0,0,0,0.06)'}}>
              {section.items.map((item, idx) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
                const notLast = idx < section.items.length - 1
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    style={{
                      display:'flex',
                      alignItems:'center',
                      gap:'12px',
                      padding:'11px 16px',
                      fontSize:'14px',
                      fontWeight:500,
                      textDecoration:'none',
                      backgroundColor: isActive ? '#EBF5FF' : 'transparent',
                      color: isActive ? '#007AFF' : '#000',
                      borderBottom: notLast ? '1px solid #E5E5EA' : 'none',
                    }}
                  >
                    <span style={{fontSize:'16px',width:'20px',textAlign:'center'}}>{item.icon}</span>
                    <span style={{flex:1}}>{item.label}</span>
                    <span style={{color:'#C7C7CC',fontSize:'12px'}}>›</span>
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      <div style={{padding:'16px',borderTop:'1px solid #E5E5EA'}}>
        <p style={{fontSize:'12px',color:'#6C6C70',marginBottom:'8px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{user?.email}</p>
        <button
          onClick={handleLogout}
          style={{width:'100%',fontSize:'13px',color:'#FF3B30',padding:'10px 16px',borderRadius:'10px',backgroundColor:'#fff',border:'none',cursor:'pointer',textAlign:'left',fontWeight:500}}
        >
          Cikis Yap
        </button>
      </div>
    </aside>
  )
}