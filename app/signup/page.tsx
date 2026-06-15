'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function SignupPage() {
  const router = useRouter()
  const [businessName, setBusinessName] = useState('')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, business_name: businessName }
      }
    })
    if (error) { setError(error.message); setLoading(false); return }
    setSuccess(true)
    setLoading(false)
  }

  if (success) {
    return (
      <div style={{minHeight:'100vh',backgroundColor:'#F2F2F7',display:'flex',alignItems:'center',justifyContent:'center',padding:'20px'}}>
        <div style={{width:'100%',maxWidth:'380px',textAlign:'center'}}>
          <div style={{fontSize:'60px',marginBottom:'16px'}}>✅</div>
          <h2 style={{fontSize:'22px',fontWeight:700,color:'#000',marginBottom:'8px'}}>Kaydınız alındı!</h2>
          <p style={{color:'#6C6C70',fontSize:'14px',lineHeight:'1.5'}}>
            <strong>{email}</strong> adresine bir onay e-postası gönderdik. Lütfen e-postanızı kontrol edip hesabınızı onaylayın.
          </p>
          <Link href='/login' style={{display:'block',marginTop:'24px',backgroundColor:'#007AFF',color:'#fff',fontWeight:600,padding:'14px',borderRadius:'12px',fontSize:'14px',textDecoration:'none',textAlign:'center'}}>
            Giriş Sayfasına Dön
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div style={{minHeight:'100vh',backgroundColor:'#F2F2F7',display:'flex',alignItems:'center',justifyContent:'center',padding:'20px'}}>
      <div style={{width:'100%',maxWidth:'380px'}}>
        <div style={{textAlign:'center',marginBottom:'40px'}}>
          <div style={{width:'80px',height:'80px',backgroundColor:'#007AFF',borderRadius:'22px',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 16px',fontSize:'40px'}}>🐾</div>
          <h1 style={{fontSize:'28px',fontWeight:800,color:'#000'}}>PetOtelim</h1>
          <p style={{color:'#6C6C70',fontSize:'14px',marginTop:'4px'}}>Yeni hesap oluşturun</p>
        </div>
        <div style={{backgroundColor:'#fff',borderRadius:'16px',overflow:'hidden',boxShadow:'0 1px 3px rgba(0,0,0,0.1)'}}>
          <div style={{padding:'12px 16px',borderBottom:'1px solid #E5E5EA'}}>
            <label style={{display:'block',fontSize:'11px',color:'#6C6C70',marginBottom:'4px'}}>Ad Soyad</label>
            <input type='text' value={fullName} onChange={e=>setFullName(e.target.value)} required style={{width:'100%',fontSize:'14px',border:'none',outline:'none',backgroundColor:'transparent'}} placeholder='Ad Soyad' />
          </div>
          <div style={{padding:'12px 16px',borderBottom:'1px solid #E5E5EA'}}>
            <label style={{display:'block',fontSize:'11px',color:'#6C6C70',marginBottom:'4px'}}>İşletme Adı</label>
            <input type='text' value={businessName} onChange={e=>setBusinessName(e.target.value)} required style={{width:'100%',fontSize:'14px',border:'none',outline:'none',backgroundColor:'transparent'}} placeholder='Pati Otel' />
          </div>
          <div style={{padding:'12px 16px',borderBottom:'1px solid #E5E5EA'}}>
            <label style={{display:'block',fontSize:'11px',color:'#6C6C70',marginBottom:'4px'}}>E-posta</label>
            <input type='email' value={email} onChange={e=>setEmail(e.target.value)} required style={{width:'100%',fontSize:'14px',border:'none',outline:'none',backgroundColor:'transparent'}} placeholder='ornek@email.com' />
          </div>
          <div style={{padding:'12px 16px'}}>
            <label style={{display:'block',fontSize:'11px',color:'#6C6C70',marginBottom:'4px'}}>Şifre</label>
            <input type='password' value={password} onChange={e=>setPassword(e.target.value)} required style={{width:'100%',fontSize:'14px',border:'none',outline:'none',backgroundColor:'transparent'}} placeholder='En az 8 karakter' />
          </div>
        </div>
        {error && <div style={{marginTop:'12px',backgroundColor:'#FFF0F0',color:'#FF3B30',fontSize:'13px',padding:'12px 16px',borderRadius:'12px'}}>{error}</div>}
        <button onClick={handleSignup} disabled={loading} style={{width:'100%',marginTop:'20px',backgroundColor:'#007AFF',color:'#fff',fontWeight:600,padding:'14px',borderRadius:'12px',fontSize:'14px',border:'none',cursor:'pointer'}}>
          {loading ? 'Kayıt yapılıyor...' : 'Kayıt Ol'}
        </button>
        <p style={{textAlign:'center',fontSize:'13px',color:'#6C6C70',marginTop:'24px'}}>
          Zaten hesabınız var mı? <Link href='/login' style={{color:'#007AFF',fontWeight:500}}>Giriş yapın</Link>
        </p>
      </div>
    </div>
  )
}