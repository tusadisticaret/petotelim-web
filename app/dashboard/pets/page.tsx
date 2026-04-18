import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function PetsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: business } = await supabase
    .from('businesses')
    .select('id')
    .eq('owner_user_id', user.id)
    .single()

  const { data: pets } = await supabase
    .from('pets')
    .select('*, customers(name)')
    .eq('business_id', business?.id)
    .order('created_at', { ascending: false })

  return (
    <div style={{padding:'32px',maxWidth:'900px'}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'24px'}}>
        <h1 style={{fontSize:'32px',fontWeight:800,color:'#000',margin:0}}>Evcil Hayvanlar</h1>
        <Link href='/dashboard/pets/new' style={{backgroundColor:'#007AFF',color:'#fff',padding:'10px 20px',borderRadius:'12px',textDecoration:'none',fontSize:'14px',fontWeight:600}}>
          + Yeni Hayvan
        </Link>
      </div>

      <div style={{backgroundColor:'#fff',borderRadius:'16px',overflow:'hidden',boxShadow:'0 1px 3px rgba(0,0,0,0.08)'}}>
        {(!pets || pets.length === 0) ? (
          <div style={{padding:'48px',textAlign:'center'}}>
            <div style={{fontSize:'48px',marginBottom:'16px'}}>🐾</div>
            <p style={{fontSize:'16px',fontWeight:600,color:'#000',margin:0}}>Henuz hayvan yok</p>
            <p style={{fontSize:'14px',color:'#6C6C70',marginTop:'8px'}}>Ilk hayvaninizi ekleyin</p>
          </div>
        ) : pets.map((pet, idx) => {
          const speciesIcon = pet.species === 'cat' ? '🐱' : pet.species === 'dog' ? '🐶' : '🐾'
          const speciesColor = pet.species === 'cat' ? '#FF9500' : '#007AFF'
          return (
            <Link
              key={pet.id}
              href={`/dashboard/pets/${pet.id}`}
              style={{
                display:'flex',
                alignItems:'center',
                gap:'16px',
                padding:'14px 20px',
                textDecoration:'none',
                borderBottom: idx < pets.length - 1 ? '1px solid #E5E5EA' : 'none',
              }}
            >
              <div style={{width:'44px',height:'44px',borderRadius:'50%',backgroundColor:speciesColor,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'20px',flexShrink:0}}>
                {speciesIcon}
              </div>
              <div style={{flex:1,minWidth:0}}>
                <p style={{fontSize:'15px',fontWeight:600,color:'#000',margin:0}}>{pet.name}</p>
                <p style={{fontSize:'13px',color:'#6C6C70',margin:'2px 0 0'}}>
                  {pet.breed ? `${pet.breed} • ` : ''}{(pet as any).customers?.name ?? ''}
                </p>
              </div>
              <span style={{color:'#C7C7CC',fontSize:'16px'}}>›</span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}