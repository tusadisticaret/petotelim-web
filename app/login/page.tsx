'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError('E-posta veya sifre hatali.'); setLoading(false); return }
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div style={{minHeight:'100vh',backgroundColor:'#F2F2F7',display:'flex',alignItems:'center',justifyContent:'center',padding:'20px'}}>
      <div style={{width:'100%',maxWidth:'380px'}}>
        <div style={{textAlign:'center',marginBottom:'40px'}}>
          <div style={{width:'80px',height:'80px',backgroundColor:'#007AFF',borderRadius:'22px',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 16px',fontSize:'40px'}}>🐾</div>
          <h1 style={{fontSize:'28px',fontWeight:800,color:'#000'}}>PetOtelim</h1>
          <p style={{color:'#6C6C70',fontSize:'14px',marginTop:'4px'}}>Hesabiniza giris yapin</p>
        </div>
        <div style={{backgroundColor:'#fff',borderRadius:'16px',overflow:'hidden',boxShadow:'0 1px 3px rgba(0,0,0,0.1)'}}>
          <div style={{padding:'12px 16px',borderBottom:'1px solid #E5E5EA'}}>
            <label style={{display:'block',fontSize:'11px',color:'#6C6C70',marginBottom:'4px'}}>E-posta</label>
            <input type='email' value={email} onChange={e=>setEmail(e.target.value)} required style={{width:'100%',fontSize:'14px',border:'none',outline:'none',backgroundColor:'transparent'}} placeholder='ornek@email.com' />
          </div>
          <div style={{padding:'12px 16px'}}>
            <label style={{display:'block',fontSize:'11px',color:'#6C6C70',marginBottom:'4px'}}>Sifre</label>
            <input type='password' value={password} onChange={e=>setPassword(e.target.value)} required style={{width:'100%',fontSize:'14px',border:'none',outline:'none',backgroundColor:'transparent'}} placeholder='........' />
          </div>
        </div>
        {error && <div style={{marginTop:'12px',backgroundColor:'#FFF0F0',color:'#FF3B30',fontSize:'13px',padding:'12px 16px',borderRadius:'12px'}}>{error}</div>}
        <button onClick={handleLogin} disabled={loading} style={{width:'100%',marginTop:'20px',backgroundColor:'#007AFF',color:'#fff',fontWeight:600,padding:'14px',borderRadius:'12px',fontSize:'14px',border:'none',cursor:'pointer'}}>
          {loading ? 'Giris yapiliyor...' : 'Giris Yap'}
        </button>
        <p style={{textAlign:'center',fontSize:'13px',color:'#6C6C70',marginTop:'24px'}}>
          Hesabiniz yok mu? <Link href='/signup' style={{color:'#007AFF',fontWeight:500}}>Kayit olun</Link>
        </p>
      </div>
    </div>
  )
}
