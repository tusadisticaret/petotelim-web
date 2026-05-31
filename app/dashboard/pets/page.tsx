'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

const SPECIES_FILTERS = ['Tümü', 'Köpek', 'Kedi', 'Diğer']

function speciesColor(species: string) {
  const s = (species ?? '').toLowerCase()
  if (s === 'dog' || s === 'köpek') return '#007AFF'
  if (s === 'cat' || s === 'kedi') return '#FF9500'
  return '#9B59B6'
}

function speciesLabel(species: string) {
  const s = (species ?? '').toLowerCase()
  if (s === 'dog' || s === 'köpek') return 'Köpek'
  if (s === 'cat' || s === 'kedi') return 'Kedi'
  return 'Diğer'
}

function speciesEmoji(species: string) {
  const s = (species ?? '').toLowerCase()
  if (s === 'dog' || s === 'köpek') return '🐕'
  if (s === 'cat' || s === 'kedi') return '🐈'
  return '🐾'
}

export default function PetsPage() {
  const [pets, setPets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterSpecies, setFilterSpecies] = useState('Tümü')

  useEffect(() => { load() }, [])

  async function load() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: biz } = await supabase.from('businesses').select('id').eq('owner_user_id', user.id).single()
    const { data } = await supabase
      .from('pets')
      .select('*, customers(full_name, phone)')
      .eq('business_id', biz?.id)
      .order('name')
    setPets(data ?? [])
    setLoading(false)
  }

  const filtered = pets.filter(p => {
    const matchSearch = !search.trim() ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.breed ?? '').toLowerCase().includes(search.toLowerCase())
    const s = (p.species ?? '').toLowerCase()
    const matchSpecies = filterSpecies === 'Tümü' ||
      (filterSpecies === 'Köpek' && (s === 'dog' || s === 'köpek')) ||
      (filterSpecies === 'Kedi' && (s === 'cat' || s === 'kedi')) ||
      (filterSpecies === 'Diğer' && s !== 'dog' && s !== 'köpek' && s !== 'cat' && s !== 'kedi')
    return matchSearch && matchSpecies
  })

  const inp: React.CSSProperties = {
    width: '100%', padding: '10px 14px', backgroundColor: '#F2F2F7',
    borderRadius: '10px', border: 'none', outline: 'none',
    fontSize: '15px', boxSizing: 'border-box', color: '#000'
  }

  return (
    <div style={{ padding: '32px', maxWidth: '900px', paddingBottom: '64px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 800, color: '#000', margin: 0 }}>Evcil Hayvanlar</h1>
        <Link href='/dashboard/pets/new' style={{ backgroundColor: '#007AFF', color: '#fff', padding: '10px 20px', borderRadius: '12px', textDecoration: 'none', fontSize: '14px', fontWeight: 600 }}>
          + Yeni Hayvan
        </Link>
      </div>

      {/* Arama */}
      <div style={{ marginBottom: '12px' }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder='🔍  Evcil Hayvan Ara'
          style={inp}
        />
      </div>

      {/* Filtre chips */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {SPECIES_FILTERS.map(f => {
          const icon = f === 'Köpek' ? '🐕' : f === 'Kedi' ? '🐈' : f === 'Diğer' ? '🐇' : '🐾'
          const isActive = filterSpecies === f
          return (
            <button
              key={f}
              onClick={() => setFilterSpecies(f)}
              style={{
                display: 'flex', alignItems: 'center', gap: '5px',
                padding: '7px 14px', borderRadius: '20px',
                border: isActive ? '2px solid #007AFF' : '1.5px solid #E5E5EA',
                cursor: 'pointer', fontSize: '13px', fontWeight: 500,
                backgroundColor: isActive ? '#EBF5FF' : '#fff',
                color: isActive ? '#007AFF' : '#000'
              }}
            >
              <span>{icon}</span>
              <span>{f}</span>
            </button>
          )
        })}
      </div>

      {/* Liste */}
      {loading ? (
        <div style={{ padding: '48px', textAlign: 'center', backgroundColor: '#fff', borderRadius: '16px' }}>
          <p style={{ color: '#6C6C70' }}>Yükleniyor...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: '48px', textAlign: 'center', backgroundColor: '#fff', borderRadius: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <p style={{ fontSize: '40px', margin: '0 0 12px' }}>🐾</p>
          <p style={{ fontSize: '16px', fontWeight: 600, color: '#000', margin: '0 0 6px' }}>Hayvan bulunamadı</p>
          <p style={{ fontSize: '14px', color: '#6C6C70', margin: 0 }}>İlk hayvanınızı ekleyin</p>
        </div>
      ) : (
        <div style={{ backgroundColor: '#fff', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          {filtered.map((pet, idx) => {
            const color = speciesColor(pet.species)
            return (
              <Link
                key={pet.id}
                href={`/dashboard/pets/${pet.id}`}
                style={{
                  display: 'flex', alignItems: 'center', gap: '14px',
                  padding: '14px 20px', textDecoration: 'none',
                  borderBottom: idx < filtered.length - 1 ? '1px solid #E5E5EA' : 'none',
                  backgroundColor: '#fff'
                }}
              >
                <div style={{
                  width: '44px', height: '44px', borderRadius: '12px',
                  backgroundColor: color + '20',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '24px', flexShrink: 0
                }}>
                  {speciesEmoji(pet.species)}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '15px', fontWeight: 700, color: '#000', margin: '0 0 2px' }}>{pet.name}</p>
                  <p style={{ fontSize: '13px', color: '#6C6C70', margin: 0 }}>
                    {speciesLabel(pet.species)}{pet.breed ? ` • ${pet.breed}` : ''}
                    {pet.customers?.full_name ? ` • ${pet.customers.full_name}` : ''}
                  </p>
                </div>
                <span style={{ color: '#C7C7CC', fontSize: '18px' }}>›</span>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}