// file: src/app/menu/spaces/info/SpacesInfoClient.tsx
'use client'

import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import type { Espai } from './page'
import { useRouter } from 'next/navigation'




type Props = {
  espais: Espai[]
}

export default function SpacesInfoClient({ espais }: Props) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [tipus, setTipus] = useState<'tots' | 'Propi' | 'Extern'>('tots')
  const [filterLn, setFilterLn] = useState<'all' | 'empresa' | 'casaments' | 'extern'>('all')

  const filtrats = useMemo(() => {
    return espais.filter((e) => {
      // 🔹 Filtre per tipus (propi / extern)
      if (tipus !== 'tots' && e.tipus !== tipus) return false

      // 🔹 Filtre LN
      const ln = (e.ln || '').toLowerCase()
      if (filterLn === 'empresa' && ln !== 'empresa') return false
      if (filterLn === 'casaments' && ln !== 'casaments') return false
      if (filterLn === 'extern' && e.ln) return false // extern = sense LN
      // 'all' → no filtra

      // 🔹 Filtre per text (nom o codi)
      if (search) {
        const s = search.toLowerCase()
        if (
          !e.nom.toLowerCase().includes(s) &&
          !(e.code || '').toLowerCase().includes(s)
        ) {
          return false
        }
      }

      return true
    })
  }, [espais, search, tipus, filterLn])

  return (
    <section className="w-full max-w-5xl mx-auto p-4">
      {/* Títol intern del submòdul */}
      <motion.h1
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-xl font-semibold text-gray-800 mb-4"
      >
        Consultar espais
      </motion.h1>

      {/* Filtres */}
      <div className="flex flex-wrap gap-3 mb-4">
        
        {/* 🔍 Cerca */}
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cercar per nom o codi..."
          className="border rounded-lg px-3 py-2 text-sm w-full sm:w-64"
        />

        {/* 🏷️ Tipus Propi / Extern */}
        <select
          value={tipus}
          onChange={(e) =>
            setTipus(e.target.value as 'tots' | 'Propi' | 'Extern')
          }
          className="border rounded-lg px-3 py-2 text-sm"
        >
          <option value="tots">Tots els espais</option>
          <option value="Propi">Masies / espais propis</option>
          <option value="Extern">Espais externs</option>
        </select>

        {/* 🟩 FILTRE PER LN (Empresa / Casaments / Externs) */}
        <select
          value={filterLn}
          onChange={(e) =>
            setFilterLn(e.target.value as 'all' | 'empresa' | 'casaments' | 'extern')
          }
          className="border rounded-lg px-3 py-2 text-sm"
        >
          <option value="all">Tots els LN</option>
          <option value="empresa">Empresa</option>
          <option value="casaments">Casaments</option>
          <option value="extern">Espais externs</option>
        </select>
      </div>

      {/* Taula de resultats */}
      <div className="overflow-x-auto rounded-xl border bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs font-semibold text-gray-600">
            <tr>
              <th className="px-3 py-2">Codi</th>
              <th className="px-3 py-2">Nom</th>
              <th className="px-3 py-2">LN</th>
              <th className="px-3 py-2">Tipus</th>
            </tr>
          </thead>

          <tbody>
            {filtrats.map((e) => (
              <tr
  key={e.id}
  className="border-t hover:bg-gray-50 transition-colors cursor-pointer"
  onClick={() => router.push(`/menu/spaces/info/${e.id}`)}
>

                <td className="px-3 py-2 font-mono text-xs">{e.code || '—'}</td>
                <td className="px-3 py-2">{e.nom}</td>
                <td className="px-3 py-2">{e.ln || '—'}</td>
                <td className="px-3 py-2">
                  {e.tipus === 'Propi' ? '🏠 Propi' : '📍 Extern'}
                </td>
              </tr>
            ))}

            {filtrats.length === 0 && (
              <tr>
                <td
                  colSpan={4}
                  className="px-3 py-6 text-center text-gray-400 text-sm"
                >
                  Cap espai trobat amb aquests filtres.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}
