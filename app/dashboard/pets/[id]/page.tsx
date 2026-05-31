'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useParams, useRouter } from 'next/navigation'

export default function PetDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const [pet, setPet] = useState<any>(null)
  const [petPhotos, setPetPhotos] = useState<string[]>([])
  const [contractPhoto, setContractPhoto] = useState<string | null>(null)
  const [lightbox, setLightbox] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => { loadPet() }, [id])

  async function loadPet() {
    const supabase = createClient()
    const { data } = await supabase
      .from('pets')
      .select('*, customers(full_name, phone, tckn)')
      .eq('id', id)
      .single()
    setPet(data)

    const { data: photoData } = await supabase
      .from('pet_photos')
      .select('*')
      .eq('pet_id', id)
      .order('sort_order', { ascending: true })

    if (photoData) {
      const petUrls: string[] = []
      let contractUrl: string | null = null

      for (const photo of photoData) {
        const { data: urlData } = await supabase.storage
          .from('pet-media')
          .createSignedUrl(photo.storage_path, 3600)
        if (urlData?.signedUrl) {
          if (photo.photo_type === 'contract') {
            contractUrl = urlData.signedUrl
          } else {
            petUrls.push(urlData.signedUrl)
          }
        }
      }
      setPetPhotos(petUrls)
      setContractPhoto(contractUrl)
    }

    setLoading(false)
  }

  async function handleDelete() {
    if (!confirm('Bu hayvanın kaydını silmek istediğinizden emin misiniz?')) return
    setDeleting(true)
    const supabase = createClient()
    await supabase.from('pets').delete().eq('id', id)
    router.back()
  }

  function speciesInfo(species: string) {
    const sp = (species ?? '').toLowerCase()
    if (sp.includes('dog') || sp.includes('kopek') || sp.includes('köpek')) return { emoji: '🐕', bgColor: '#EBF4FF', label: 'Köpek' }
    if (sp.includes('cat') || sp.includes('kedi')) return { emoji: '🐈', bgColor: '#FFF3E0', label: 'Kedi' }
    return { emoji: '🐇', bgColor: '#F3EFFF', label: species ?? 'Diğer' }
  }

  function calcAge(birthDate: string) {
    if (!birthDate) return null
    const birth = new Date(birthDate)
    const now = new Date()
    const totalMonths = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth())
    if (totalMonths < 12) return `${totalMonths} ay`
    return `${Math.floor(totalMonths / 12)} yaş`
  }

  const dash = (v: any) => (v !== null && v !== undefined && v !== '' ? String(v) : '—')
  const yesno = (v: any) => v === true || v === 'true' || v === 1 ? 'Evet' : v === false || v === 'false' || v === 0 ? 'Hayır' : '—'

  const card: React.CSSProperties = {
    backgroundColor: '#fff', borderRadius: '16px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)', marginBottom: '16px', padding: '16px 20px'
  }

  function InfoRow({ label, value }: { label: string; value: string }) {
    return (
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '10px 0', borderBottom: '1px solid #F2F2F7' }}>
        <span style={{ fontSize: '15px', color: '#8E8E93' }}>{label}</span>
        <span style={{ fontSize: '15px', color: '#000', textAlign: 'right', maxWidth: '60%' }}>{value}</span>
      </div>
    )
  }
  function InfoRowLast({ label, value }: { label: string; value: string }) {
    return (
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '10px 0' }}>
        <span style={{ fontSize: '15px', color: '#8E8E93' }}>{label}</span>
        <span style={{ fontSize: '15px', color: '#000', textAlign: 'right', maxWidth: '60%' }}>{value}</span>
      </div>
    )
  }

  if (loading) return <div style={{ padding: '32px' }}><p style={{ color: '#6C6C70' }}>Yükleniyor...</p></div>
  if (!pet) return <div style={{ padding: '32px' }}><p style={{ color: '#FF3B30' }}>Hayvan bulunamadı.</p></div>

  const { emoji, bgColor, label: specLabel } = speciesInfo(pet.species ?? '')
  const age = calcAge(pet.birth_date)
  const genderTR = pet.gender === 'male' || pet.gender === 'Erkek' ? 'Erkek' : pet.gender === 'female' || pet.gender === 'Dişi' || pet.gender === 'disi' ? 'Dişi' : dash(pet.gender)

  return (
    <div style={{ padding: '32px', maxWidth: '640px', paddingBottom: '64px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <button onClick={() => router.back()} style={{ width: '36px', height: '36px', borderRadius: '50%', border: 'none', backgroundColor: '#F2F2F7', fontSize: '18px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000' }}>
          ‹
        </button>
        <button onClick={() => router.push(`/dashboard/pets/${id}/edit`)} style={{ padding: '8px 18px', borderRadius: '20px', border: 'none', backgroundColor: '#F2F2F7', fontSize: '15px', fontWeight: 600, cursor: 'pointer', color: '#000' }}>
          Düzenle
        </button>
      </div>

      <h1 style={{ fontSize: '34px', fontWeight: 800, margin: '0 0 24px', color: '#000' }}>{pet.name}</h1>

      {/* Hayvan Kimlik Kartı */}
      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '52px', height: '52px', borderRadius: '14px', backgroundColor: bgColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', flexShrink: 0 }}>
            {emoji}
          </div>
          <div>
            <p style={{ fontSize: '17px', fontWeight: 700, margin: '0 0 2px', color: '#000' }}>{pet.name}</p>
            <p style={{ fontSize: '14px', color: '#8E8E93', margin: 0 }}>{specLabel}{pet.breed ? ` • ${pet.breed}` : ''}</p>
            {age && <p style={{ fontSize: '13px', color: '#8E8E93', margin: '2px 0 0' }}>{age}</p>}
          </div>
        </div>
      </div>

      {/* Sahip Bilgileri */}
      {pet.customers && (
        <div style={card}>
          <p style={{ fontSize: '17px', fontWeight: 700, margin: '0 0 4px' }}>Sahip Bilgileri</p>
          <InfoRow label="Ad Soyad" value={dash(pet.customers.full_name)} />
          <InfoRow label="TCKN" value={dash(pet.customers.tckn)} />
          <InfoRowLast label="Telefon" value={dash(pet.customers.phone)} />
        </div>
      )}

      {/* Kimlik Bilgileri */}
      <div style={card}>
        <p style={{ fontSize: '17px', fontWeight: 700, margin: '0 0 4px' }}>Kimlik Bilgileri</p>
        <InfoRow label="Cinsiyet" value={genderTR} />
        <InfoRow label="Kilo" value={pet.weight ? `${pet.weight} kg` : '—'} />
        <InfoRow label="Renk" value={dash(pet.color)} />
        <InfoRow label="Mikroçip No" value={dash(pet.microchip_number)} />
        <InfoRowLast label="Pasaport No" value={dash(pet.passport_number)} />
      </div>

{/* Sağlık ve Bakım */}
<div style={card}>
  <p style={{ fontSize: '17px', fontWeight: 700, margin: '0 0 4px' }}>Sağlık ve Bakım</p>
  <InfoRow label="Kısırlaştırılmış" value={yesno(pet.is_neutered)} />
  <InfoRow label="Agresif Eğilim" value={yesno(pet.is_aggressive)} />
  <InfoRow label="Alerji" value={pet.allergy || 'Yok'} />
  <InfoRow label="İlaç / Tedavi" value={pet.medication || 'Yok'} />
  <InfoRow label="Mama Markası" value={dash(pet.food_brand)} />
  <InfoRow label="Günlük Öğün" value={pet.meals_per_day ? `${pet.meals_per_day} öğün` : '—'} />
  <InfoRowLast label="Porsiyon" value={pet.portion_grams ? `${pet.portion_grams} gr` : '—'} />
</div>

      {/* Fotoğraflar */}
      {petPhotos.length > 0 && (
        <div style={card}>
          <p style={{ fontSize: '17px', fontWeight: 700, margin: '0 0 12px' }}>Fotoğraflar</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {petPhotos.map((url, i) => (
              <img
                key={i} src={url} alt="pet"
                onClick={() => setLightbox(url)}
                style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '10px', cursor: 'pointer' }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Sözleşme Görseli */}
      {contractPhoto && (
        <div style={card}>
          <p style={{ fontSize: '17px', fontWeight: 700, margin: '0 0 12px' }}>Sözleşme Görseli</p>
          <img
            src={contractPhoto} alt="sözleşme"
            onClick={() => setLightbox(contractPhoto)}
            style={{ width: '100%', borderRadius: '12px', objectFit: 'cover', cursor: 'pointer' }}
          />
        </div>
      )}

      {/* Kaydı Sil */}
      <div style={{ ...card, padding: '0' }}>
        <button
          onClick={handleDelete}
          disabled={deleting}
          style={{ width: '100%', padding: '16px', borderRadius: '16px', border: 'none', backgroundColor: '#fff', fontSize: '15px', fontWeight: 500, color: '#FF3B30', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
        >
          🗑 {deleting ? 'Siliniyor...' : 'Kaydı Sil'}
        </button>
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          onClick={() => setLightbox(null)}
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '24px' }}
        >
          <img src={lightbox} alt="büyük" style={{ maxWidth: '100%', maxHeight: '90vh', borderRadius: '12px', objectFit: 'contain' }} />
          <button
            onClick={() => setLightbox(null)}
            style={{ position: 'absolute', top: '20px', right: '20px', width: '36px', height: '36px', borderRadius: '50%', border: 'none', backgroundColor: 'rgba(255,255,255,0.2)', color: '#fff', fontSize: '18px', cursor: 'pointer' }}
          >
            ×
          </button>
        </div>
      )}
    </div>
  )
}