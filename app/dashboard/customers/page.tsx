import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function CustomersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: business } = await supabase
    .from('businesses')
    .select('id')
    .eq('owner_user_id', user.id)
    .single()

  const { data: customers } = await supabase
    .from('customers')
    .select('*')
    .eq('business_id', business?.id)
    .order('created_at', { ascending: false })

  return (
    <div style={{padding:'32px',maxWidth:'900px'}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'24px'}}>
        <h1 style={{fontSize:'32px',fontWeight:800,color:'#000',margin:0}}>Musteriler</h1>
        <Link href='/dashboard/customers/new' style={{backgroundColor:'#007AFF',color:'#fff',padding:'10px 20px',borderRadius:'12px',textDecoration:'none',fontSize:'14px',fontWeight:600}}>
          + Yeni Musteri
        </Link>
      </div>

      <div style={{backgroundColor:'#fff',borderRadius:'16px',overflow:'hidden',boxShadow:'0 1px 3px rgba(0,0,0,0.08)'}}>
        {(!customers || customers.length === 0) ? (
          <div style={{padding:'48px',textAlign:'center'}}>
            <div style={{fontSize:'48px',marginBottom:'16px'}}>👥</div>
            <p style={{fontSize:'16px',fontWeight:600,color:'#000',margin:0}}>Henuz musteri yok</p>
            <p style={{fontSize:'14px',color:'#6C6C70',marginTop:'8px'}}>Ilk musterinizi ekleyin</p>
          </div>
        ) : customers.map((customer, idx) => (
          <Link
            key={customer.id}
            href={`/dashboard/customers/${customer.id}`}
            style={{
              display:'flex',
              alignItems:'center',
              gap:'16px',
              padding:'14px 20px',
              textDecoration:'none',
              borderBottom: idx < customers.length - 1 ? '1px solid #E5E5EA' : 'none',
              backgroundColor:'transparent',
            }}
          >
            <div style={{width:'44px',height:'44px',borderRadius:'50%',backgroundColor:'#007AFF',display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontSize:'16px',fontWeight:700,flexShrink:0}}>
              {customer.name?.charAt(0)?.toUpperCase() ?? '?'}
            </div>
            <div style={{flex:1,minWidth:0}}>
              <p style={{fontSize:'15px',fontWeight:600,color:'#000',margin:0}}>{customer.name}</p>
              <p style={{fontSize:'13px',color:'#6C6C70',margin:'2px 0 0',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{customer.phone ?? customer.email ?? ''}</p>
            </div>
            <span style={{color:'#C7C7CC',fontSize:'16px'}}>›</span>
          </Link>
        ))}
      </div>
    </div>
  )
}