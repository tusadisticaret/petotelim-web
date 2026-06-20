'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (password.length < 8) {
      setError('Şifre en az 8 karakter olmalı.')
      return
    }

    if (password !== confirmPassword) {
      setError('Şifreler eşleşmiyor.')
      return
    }

    setLoading(true)
    const supabase = createClient()
    const { error: updateError } = await supabase.auth.updateUser({ password })
    setLoading(false)

    if (updateError) {
      setError('Şifre güncellenemedi: ' + updateError.message)
      return
    }

    setSuccess(true)
    setTimeout(() => {
      router.push('/dashboard')
    }, 2000)
  }

  if (success) {
    return (
      <div style={{minHeight:'100vh',backgroundColor:'#F2F2F7',display:'flex',alignItems:'center',justifyContent:'center',padding:'20px'}}>
        <div style={{width:'100%',maxWidth:'380px',textAlign:'center'}}>
          <div style={{fontSize:'60px',marginBottom:'16px'}}>✅</div>
          <h2 style={{fontSize:'22px',fontWeight:700,color:'#000',marginBottom:'8px'}}>Şifren güncellendi!</h2>
          <p style={{color:'#6C6C70',fontSize:'14px',lineHeight:'1.5'}}>
            Yönlendiriliyorsun...
          </p>
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
          <p style={{color:'#6C6C70',fontSize:'14px',marginTop:'4px'}}>Yeni şifre belirle</p>
        </div>
        <div style={{backgroundColor:'#fff',borderRadius:'16px',overflow:'hidden',boxShadow:'0 1px 3px rgba(0,0,0,0.1)'}}>
          <div style={{padding:'12px 16px',borderBottom:'1px solid #E5E5EA'}}>
            <label style={{display:'block',fontSize:'11px',color:'#6C6C70',marginBottom:'4px'}}>Yeni Şifre</label>
            <input type='password' value={password} onChange={e=>setPassword(e.target.value)} required style={{width:'100%',fontSize:'14px',border:'none',outline:'none',backgroundColor:'transparent'}} placeholder='En az 8 karakter' />
          </div>
          <div style={{padding:'12px 16px'}}>
            <label style={{display:'block',fontSize:'11px',color:'#6C6C70',marginBottom:'4px'}}>Yeni Şifre (Tekrar)</label>
            <input type='password' value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} required style={{width:'100%',fontSize:'14px',border:'none',outline:'none',backgroundColor:'transparent'}} placeholder='Şifreni tekrar gir' />
          </div>
        </div>
        {error && <div style={{marginTop:'12px',backgroundColor:'#FFF0F0',color:'#FF3B30',fontSize:'13px',padding:'12px 16px',borderRadius:'12px'}}>{error}</div>}
        <button onClick={handleSubmit} disabled={loading} style={{width:'100%',marginTop:'20px',backgroundColor:'#007AFF',color:'#fff',fontWeight:600,padding:'14px',borderRadius:'12px',fontSize:'14px',border:'none',cursor:'pointer'}}>
          {loading ? 'Kaydediliyor...' : 'Şifreyi Güncelle'}
        </button>
      </div>
    </div>
  )
}