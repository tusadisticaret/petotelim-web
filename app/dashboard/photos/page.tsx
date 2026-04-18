'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function PhotoArchivePage() {
  const [pets, setPets] = useState<any[]>([])
  const [photosByPet, setPhotosByPet] = useState<Record<string, any[]>>({})
  const [thumbURLs, setThumbURLs] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [speciesFilter, setSpeciesFilter] = useState<'all' | 'dog' | 'cat' | 'other'>('all')
  const [selectedPet, setSelectedPet] = useState<any>(null)
  const [galleryPhotos, setGalleryPhotos] = useState<any[]>([])
  const [contractPhotos, setContractPhotos] = useState<any[]>([])
  const [photoURLs, setPhotoURLs] = useState<Record<string, string>>({})
  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(null)
  const [galleryLoading, setGalleryLoading] = useState(false)
  const [fullscreenURL, setFullscreenURL] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [businessId, setBusinessId] = useState('')

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: biz } = await supabase.from('businesses').select('id').eq('user_id', user.id).single()
    setBusinessId(biz?.id ?? '')

    const { data: petsData } = await supabase
      .from('pets')
      .select('id, name, species, breed, owner_name, owner_phone, customers(id, full_name)')
      .eq('business_id', biz?.id)
      .order('name')

    const allPets = petsData ?? []

    // Her pet için fotoğrafları çek
    const byPet: Record<string, any[]> = {}
    const thumbs: Record<string, string> = {}

    await Promise.all(allPets.map(async (pet: any) => {
      const { data: photos } = await supabase
        .from('pet_photos')
        .select('*')
        .eq('pet_id', pet.id)
        .eq('photo_type', 'pet')
        .order('sort_order', { ascending: true })

      if (photos && photos.length > 0) {
        byPet[pet.id] = photos
        // İlk fotoğraf için thumb URL al
        try {
          const { data: urlData } = await supabase.storage
            .from('pet-media')
            .createSignedUrl(photos[0].storage_path, 3600)
          if (urlData?.signedUrl) thumbs[pet.id] = urlData.signedUrl
        } catch {}
      }
    }))

    setPets(allPets)
    setPhotosByPet(byPet)
    setThumbURLs(thumbs)
    setLoading(false)
  }

  async function openGallery(pet: any) {
    setSelectedPet(pet)
    setGalleryLoading(true)
    setGalleryPhotos([])
    setContractPhotos([])
    setPhotoURLs({})
    setSelectedPhotoId(null)

    const supabase = createClient()
    const [{ data: petPhotos }, { data: contracts }] = await Promise.all([
      supabase.from('pet_photos').select('*').eq('pet_id', pet.id).eq('photo_type', 'pet').order('sort_order', { ascending: true }),
      supabase.from('pet_photos').select('*').eq('pet_id', pet.id).eq('photo_type', 'contract').order('sort_order', { ascending: true }),
    ])

    const allPhotos = [...(petPhotos ?? []), ...(contracts ?? [])]
    const urls: Record<string, string> = {}

    await Promise.all(allPhotos.map(async (photo: any) => {
      try {
        const { data: urlData } = await supabase.storage
          .from('pet-media')
          .createSignedUrl(photo.storage_path, 3600)
        if (urlData?.signedUrl) urls[photo.id] = urlData.signedUrl
      } catch {}
    }))

    setGalleryPhotos(petPhotos ?? [])
    setContractPhotos(contracts ?? [])
    setPhotoURLs(urls)
    if (petPhotos && petPhotos.length > 0) setSelectedPhotoId(petPhotos[0].id)
    setGalleryLoading(false)
  }

  async function uploadPhoto(e: React.ChangeEvent<HTMLInputElement>, photoType = 'pet') {
    if (!e.target.files || !selectedPet || !businessId) return
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)

    const supabase = createClient()
    const fileId = crypto.randomUUID()
    const folder = photoType === 'contract' ? 'contract' : 'photos'
    const storagePath = `${businessId}/${selectedPet.id}/${folder}/${fileId}.jpg`

    const arrayBuffer = await file.arrayBuffer()
    const uint8Array = new Uint8Array(arrayBuffer)

    const { error: uploadError } = await supabase.storage
      .from('pet-media')
      .upload(storagePath, uint8Array, { contentType: 'image/jpeg' })

    if (!uploadError) {
      await supabase.from('pet_photos').insert({
        business_id: businessId,
        pet_id: selectedPet.id,
        storage_path: storagePath,
        photo_type: photoType,
        sort_order: 0,
      })
      await openGallery(selectedPet)
      await loadAll()
    }
    setUploading(false)
    e.target.value = ''
  }

  async function deletePhoto(photo: any) {
    const supabase = createClient()
    await supabase.storage.from('pet-media').remove([photo.storage_path])
    await supabase.from('pet_photos').delete().eq('id', photo.id)
    await openGallery(selectedPet)
    await loadAll()
  }

  const filteredPets = pets.filter(pet => {
    if (!photosByPet[pet.id] || photosByPet[pet.id].length === 0) return false
    const sp = pet.species?.toLowerCase() ?? ''
    if (speciesFilter === 'dog' && !sp.includes('dog') && !sp.includes('kopek')) return false
    if (speciesFilter === 'cat' && !sp.includes('cat') && !sp.includes('kedi')) return false
    if (speciesFilter === 'other' && (sp.includes('dog') || sp.includes('kopek') || sp.includes('cat') || sp.includes('kedi'))) return false
    const q = search.toLowerCase()
    if (!q) return true
    return pet.name.toLowerCase().includes(q) || (pet.owner_name ?? '').toLowerCase().includes(q) || (pet.customers?.full_name ?? '').toLowerCase().includes(q)
  })

  function speciesIcon(species: string) {
    const sp = (species ?? '').toLowerCase()
    if (sp.includes('dog') || sp.includes('kopek')) return { icon: '🐶', color: '#007AFF' }
    if (sp.includes('cat') || sp.includes('kedi')) return { icon: '🐱', color: '#FF9500' }
    return { icon: '🐾', color: '#6C6C70' }
  }

  const card: React.CSSProperties = { backgroundColor: '#fff', borderRadius: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', marginBottom: '12px', padding: '14px' }
  const inp: React.CSSProperties = { width: '100%', padding: '10px 14px', backgroundColor: '#F2F2F7', borderRadius: '10px', border: 'none', outline: 'none', fontSize: '15px', boxSizing: 'border-box', color: '#000' }

  // Galeri görünümü
  if (selectedPet) {
    const selectedURL = selectedPhotoId ? photoURLs[selectedPhotoId] : null
    const ownerName = selectedPet.owner_name || selectedPet.customers?.full_name || 'Sahip yok'

    return (
      <div style={{ padding: '32px', maxWidth: '700px', paddingBottom: '64px' }}>
        {/* Fullscreen */}
        {fullscreenURL && (
          <div onClick={() => setFullscreenURL(null)} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.92)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'zoom-out' }}>
            <img src={fullscreenURL} style={{ maxWidth: '95vw', maxHeight: '95vh', borderRadius: '12px', objectFit: 'contain' }} />
            <button onClick={() => setFullscreenURL(null)} style={{ position: 'absolute', top: '20px', right: '20px', background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', width: '40px', height: '40px', borderRadius: '50%', fontSize: '20px', cursor: 'pointer' }}>✕</button>
          </div>
        )}

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '24px' }}>
          <button onClick={() => setSelectedPet(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '24px', color: '#007AFF', padding: 0 }}>‹</button>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#000', margin: 0 }}>{selectedPet.name}</h1>
            <p style={{ fontSize: '13px', color: '#6C6C70', margin: '2px 0 0' }}>{ownerName}</p>
          </div>
        </div>

        {galleryLoading ? (
          <div style={{ padding: '48px', textAlign: 'center' }}><p style={{ color: '#6C6C70' }}>Yükleniyor...</p></div>
        ) : (
          <>
            {/* Ana fotoğraf */}
            {galleryPhotos.length > 0 && selectedURL && (
              <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
                <img
                  src={selectedURL}
                  onClick={() => setFullscreenURL(selectedURL)}
                  style={{ width: '100%', maxHeight: '360px', objectFit: 'cover', cursor: 'zoom-in', display: 'block' }}
                />
              </div>
            )}

            {/* Küçük resimler */}
            {galleryPhotos.length > 0 && (
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
                {galleryPhotos.map((photo: any) => {
                  const url = photoURLs[photo.id]
                  const isSelected = selectedPhotoId === photo.id
                  return (
                    <div key={photo.id} style={{ position: 'relative' }}>
                      <img
                        src={url}
                        onClick={() => setSelectedPhotoId(photo.id)}
                        style={{ width: '72px', height: '72px', borderRadius: '10px', objectFit: 'cover', cursor: 'pointer', border: isSelected ? '2px solid #007AFF' : '2px solid transparent', opacity: isSelected ? 1 : 0.7 }}
                      />
                      <button
                        onClick={() => deletePhoto(photo)}
                        style={{ position: 'absolute', top: '-6px', right: '-6px', width: '20px', height: '20px', borderRadius: '50%', backgroundColor: '#FF3B30', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >✕</button>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Fotoğraf Yükle */}
            <div style={card}>
              <p style={{ fontSize: '15px', fontWeight: 600, color: '#000', margin: '0 0 12px' }}>Fotoğraf Ekle</p>
              <div style={{ display: 'flex', gap: '10px' }}>
                <label style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', borderRadius: '12px', border: '1px dashed #007AFF', cursor: 'pointer', color: '#007AFF', fontSize: '14px', fontWeight: 500 }}>
                  📷 Fotoğraf Yükle
                  <input type='file' accept='image/*' onChange={e => uploadPhoto(e, 'pet')} style={{ display: 'none' }} />
                </label>
                <label style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', borderRadius: '12px', border: '1px dashed #AF52DE', cursor: 'pointer', color: '#AF52DE', fontSize: '14px', fontWeight: 500 }}>
                  📄 Sözleşme Ekle
                  <input type='file' accept='image/*' onChange={e => uploadPhoto(e, 'contract')} style={{ display: 'none' }} />
                </label>
              </div>
              {uploading && <p style={{ fontSize: '13px', color: '#6C6C70', marginTop: '8px', textAlign: 'center' }}>Yükleniyor...</p>}
            </div>

            {/* Sözleşmeler */}
            {contractPhotos.length > 0 && (
              <div style={card}>
                <p style={{ fontSize: '15px', fontWeight: 600, color: '#000', margin: '0 0 12px' }}>Sözleşme Görseli</p>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {contractPhotos.map((photo: any) => {
                    const url = photoURLs[photo.id]
                    return (
                      <div key={photo.id} style={{ position: 'relative' }}>
                        <img
                          src={url}
                          onClick={() => setFullscreenURL(url)}
                          style={{ width: '100px', height: '100px', borderRadius: '10px', objectFit: 'cover', cursor: 'zoom-in' }}
                        />
                        <button
                          onClick={() => deletePhoto(photo)}
                          style={{ position: 'absolute', top: '-6px', right: '-6px', width: '20px', height: '20px', borderRadius: '50%', backgroundColor: '#FF3B30', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >✕</button>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {galleryPhotos.length === 0 && contractPhotos.length === 0 && (
              <div style={{ padding: '48px', textAlign: 'center' }}>
                <p style={{ fontSize: '32px', margin: '0 0 12px' }}>📷</p>
                <p style={{ fontSize: '14px', color: '#6C6C70', margin: 0 }}>Bu evcil için henüz fotoğraf eklenmemiş.</p>
              </div>
            )}
          </>
        )}
      </div>
    )
  }

  // Ana arşiv listesi
  return (
    <div style={{ padding: '32px', maxWidth: '700px', paddingBottom: '64px' }}>
      <h1 style={{ fontSize: '32px', fontWeight: 800, color: '#000', margin: '0 0 24px' }}>Fotoğraf Arşivi</h1>

      {/* Arama */}
      <div style={{ position: 'relative', marginBottom: '12px' }}>
        <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#6C6C70' }}>🔍</span>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder='Hayvan adı veya sahip adı' style={{ ...inp, paddingLeft: '40px' }} />
      </div>

      {/* Tür filtreleri */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
        {[
          { key: 'all', label: 'Tümü', icon: '🐾', color: '#6C6C70' },
          { key: 'dog', label: 'Köpek', icon: '🐶', color: '#007AFF' },
          { key: 'cat', label: 'Kedi', icon: '🐱', color: '#FF9500' },
          { key: 'other', label: 'Diğer', icon: '🦜', color: '#34C759' },
        ].map(f => (
          <button key={f.key} onClick={() => setSpeciesFilter(f.key as any)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px', borderRadius: '20px', border: speciesFilter === f.key ? `1.5px solid ${f.color}` : '1.5px solid transparent', cursor: 'pointer', fontSize: '13px', fontWeight: 500, backgroundColor: speciesFilter === f.key ? f.color + '20' : '#F2F2F7', color: speciesFilter === f.key ? f.color : '#000' }}>
            <span>{f.icon}</span>{f.label}
          </button>
        ))}
      </div>

      {/* Liste */}
      {loading ? (
        <div style={{ padding: '48px', textAlign: 'center' }}>
          <p style={{ fontSize: '28px', margin: '0 0 12px' }}>📷</p>
          <p style={{ color: '#6C6C70' }}>Fotoğraflar yükleniyor...</p>
        </div>
      ) : filteredPets.length === 0 ? (
        <div style={{ padding: '48px', textAlign: 'center' }}>
          <p style={{ fontSize: '32px', margin: '0 0 12px' }}>🖼️</p>
          <p style={{ fontSize: '15px', fontWeight: 600, color: '#6C6C70', margin: '0 0 6px' }}>Fotoğraf arşivinde kayıt yok</p>
          <p style={{ fontSize: '13px', color: '#AEAEB2', margin: 0 }}>Evcil kaydına fotoğraf ekleyerek arşiv oluşturabilirsiniz.</p>
        </div>
      ) : filteredPets.map(pet => {
        const { icon, color } = speciesIcon(pet.species ?? '')
        const photoCount = photosByPet[pet.id]?.length ?? 0
        const ownerName = pet.owner_name || pet.customers?.full_name || 'Sahip yok'
        const thumbURL = thumbURLs[pet.id]

        return (
          <div key={pet.id} onClick={() => openGallery(pet)} style={{ ...card, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '14px' }}>
            {/* Thumbnail */}
            <div style={{ width: '64px', height: '64px', borderRadius: '12px', overflow: 'hidden', backgroundColor: '#F2F2F7', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px' }}>
              {thumbURL
                ? <img src={thumbURL} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : icon
              }
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: '16px', fontWeight: 600, color: '#000', margin: '0 0 3px' }}>{pet.name}</p>
              <p style={{ fontSize: '13px', color: '#6C6C70', margin: '0 0 3px' }}>{ownerName}</p>
              <p style={{ fontSize: '12px', color: '#AEAEB2', margin: 0 }}>{pet.species ?? 'Diğer'} • {photoCount} fotoğraf</p>
            </div>
            <span style={{ color: '#C7C7CC', fontSize: '18px' }}>›</span>
          </div>
        )
      })}
    </div>
  )
}