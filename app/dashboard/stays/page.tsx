import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function StaysPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: business } = await supabase
    .from('businesses')
    .select('id')
    .eq('user_id', user.id)
    .single()

  const { data: stays } = await supabase
    .from('stays')
    .select('*, pets(name, species), customers(name)')
    .eq('business_id', business?.id)
    .eq('status', 'active')
    .order('checkin_date', { ascending: false })

  const today = new Date().toISOString().split('T')[0]

  return (
    <div style={{padding:'32px',maxWidth:'900px'}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'24px'}}>
        <h1 style={{fontSize:'32px',fontWeight:800,color:'#000',margin:0}}>Aktif Konaklamalar</h1>
        <Link href='/dashboard/stays/checkin' style={{backgroundColor:'#007AFF',color:'#fff',padding:'10px 20px',borderRadius:'12px',textDecoration:'none',fontSize:'14px',fontWeight:600}}>
          + Check-in
        </Link>
      </div>

      <div style={{display:'flex',gap:'12px',marginBottom:'20px'}}>
        <Link href='/dashboard/stays/checkin' style={{flex:1,backgroundColor:'#fff',borderRadius:'16px',padding:'16px',textDecoration:'none',boxShadow:'0 1px 3px rgba(0,0,0,0.08)',display:'flex',alignItems:'center',gap:'12px'}}>
          <div style={{width:'40px',height:'40px',borderRadius:'50%',backgroundColor:'#007AFF',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'18px'}}>⬇️</div>
          <div>
            <p style={{fontSize:'13px',color:'#6C6C70',margin:0}}>Check-in</p>
            <p style={{fontSize:'15px',fontWeight:700,color:'#000',margin:'2px 0 0'}}>Giris Yap</p>
          </div>
          <span style={{color:'#C7C7CC',marginLeft:'auto'}}>›</span>
        </Link>
        <Link href='/dashboard/stays/checkout' style={{flex:1,backgroundColor:'#fff',borderRadius:'16px',padding:'16px',textDecoration:'none',boxShadow:'0 1px 3px rgba(0,0,0,0.08)',display:'flex',alignItems:'center',gap:'12px'}}>
          <div style={{width:'40px',height:'40px',borderRadius:'50%',backgroundColor:'#34C759',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'18px'}}>⬆️</div>
          <div>
            <p style={{fontSize:'13px',color:'#6C6C70',margin:0}}>Check-out</p>
            <p style={{fontSize:'15px',fontWeight:700,color:'#000',margin:'2px 0 0'}}>Cikis Yap</p>
          </div>
          <span style={{color:'#C7C7CC',marginLeft:'auto'}}>›</span>
        </Link>
      </div>

      <div style={{backgroundColor:'#fff',borderRadius:'16px',overflow:'hidden',boxShadow:'0 1px 3px rgba(0,0,0,0.08)'}}>
        {(!stays || stays.length === 0) ? (
          <div style={{padding:'48px',textAlign:'center'}}>
            <div style={{fontSize:'48px',marginBottom:'16px'}}>🏨</div>
            <p style={{fontSize:'16px',fontWeight:600,color:'#000',margin:0}}>Aktif konaklama yok</p>
            <p style={{fontSize:'14px',color:'#6C6C70',marginTop:'8px'}}>Check-in yaparak konaklama baslatın</p>
          </div>
        ) : stays.map((stay, idx) => {
          const isLate = stay.checkout_date < today
          const pet = (stay as any).pets
          const customer = (stay as any).customers
          const speciesIcon = pet?.species === 'cat' ? '🐱' : '🐶'
          return (
            <Link
              key={stay.id}
              href={`/dashboard/stays/${stay.id}`}
              style={{display:'flex',alignItems:'center',gap:'16px',padding:'14px 20px',textDecoration:'none',borderBottom:idx < stays.length-1?'1px solid #E5E5EA':'none'}}
            >
              <div style={{width:'44px',height:'44px',borderRadius:'50%',backgroundColor:isLate?'#FF3B30':pet?.species==='cat'?'#FF9500':'#007AFF',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'20px',flexShrink:0}}>
                {speciesIcon}
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                  <p style={{fontSize:'15px',fontWeight:600,color:'#000',margin:0}}>{pet?.name}</p>
                  {isLate && <span style={{fontSize:'11px',backgroundColor:'#FFF0F0',color:'#FF3B30',padding:'2px 8px',borderRadius:'20px',fontWeight:600}}>Gecikti</span>}
                </div>
                <p style={{fontSize:'13px',color:'#6C6C70',margin:'2px 0 0'}}>{customer?.name} • Cikis: {stay.checkout_date}</p>
              </div>
              <span style={{color:'#C7C7CC',fontSize:'16px'}}>›</span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}