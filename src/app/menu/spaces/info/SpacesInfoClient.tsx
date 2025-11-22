// file: src/app/menu/spaces/info/SpacesInfoClient.tsx
'use client'

import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'

type Espai = {
  id: string
  code?: string
  nom: string
  ln?: string
  tipus?: string
  comercial?: any
  produccio?: any
}

type Props = {
  espais: Espai[]
  lnOptions: string[]
}

export default function SpacesInfoClient({ espais, lnOptions }: Props) {
  const router = useRouter()

  const [search, setSearch] = useState('')
  const [tipus, setTipus] = useState<'tots' | 'Propi' | 'Extern'>('tots')
  const [filterLn, setFilterLn] = useState<string>('all')

  const filtrats = useMemo(() => {
    return espais.filter((e) => {
      // ──────────────────────────────────────
      // TIPUS (Propi / Extern)
      // ──────────────────────────────────────
      if (tipus !== 'tots' && e.tipus !== tipus) return false

      // ──────────────────────────────────────
      // FILTRE LN (basat en lnOptions reals)
      // ──────────────────────────────────────
      const lnNorm = (e.ln || '').trim().toLowerCase()

      if (filterLn !== 'all') {
        if (lnNorm !== filterLn.toLowerCase()) return false
      }

      // ──────────────────────────────────────
      // CERCADOR
      // ──────────────────────────────────────
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
      {/* Títol */}
      <motion.h1
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-xl font-semibold text-gray-800 mb-4"
      >
        Consultar espais
      </motion.h1>

      {/* FILTRES */}
      <div className="flex flex-wrap gap-3 mb-4">

        {/* 🔍 Cerca */}
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cercar per nom o codi..."
          className="border rounded-lg px-3 py-2 text-sm w-full sm:w-64"
        />

        {/* 🏷️ Tipus */}
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

        {/* 🟦 LN reals de Firestore */}
        <select
          value={filterLn}
          onChange={(e) => setFilterLn(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm"
        >
          <option value="all">Tots els LN</option>
          {lnOptions.map((ln) => (
            <option key={ln} value={ln.toLowerCase()}>
              {ln}
            </option>
          ))}
        </select>
      </div>

      {/* TAULA RESULTATS */}
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
