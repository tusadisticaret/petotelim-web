import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: business } = await supabase
    .from('businesses')
    .select('*')
    .eq('owner_user_id', user.id)
    .single()

  return (
    <div style={{display:'flex',height:'100vh',backgroundColor:'#F2F2F7'}}>
      <Sidebar user={user} business={business} />
      <main style={{flex:1,overflowY:'auto'}}>
        {children}
      </main>
    </div>
  )
}