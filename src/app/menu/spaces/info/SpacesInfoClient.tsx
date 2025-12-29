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
      if (tipus !== 'tots' && e.tipus !== tipus) return false

      const lnNorm = (e.ln || '').trim().toLowerCase()
      if (filterLn !== 'all' && lnNorm !== filterLn.toLowerCase()) return false

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
      <motion.h1
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-xl font-semibold text-gray-800 mb-4"
      >
        Consultar espais
      </motion.h1>

      {/* FILTRES */}
      <div className="flex flex-wrap gap-3 mb-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cercar per nom o codi..."
          className="border rounded-lg px-3 py-2 text-sm w-full sm:w-64"
        />

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

      {/* Llista mòbil */}
      <div className="md:hidden space-y-3">
        {filtrats.length === 0 && (
          <div className="text-center text-gray-500 text-sm border rounded-lg py-4">
            Cap espai trobat amb aquests filtres.
          </div>
        )}
        {filtrats.map((e) => (
          <button
            key={e.id}
            type="button"
            onClick={() => router.push(`/menu/spaces/info/${e.id}`)}
            className="w-full text-left border rounded-lg bg-white shadow-sm p-3 space-y-1"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="font-semibold text-gray-900">{e.nom}</div>
              <span
                className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                  e.tipus === 'Propi'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                    : 'bg-slate-100 text-slate-700 border border-slate-200'
                }`}
              >
                {e.tipus || '─'}
              </span>
            </div>
            <div className="text-xs text-gray-600">
              {e.code || '─'} · {e.ln || 'Sense LN'}
            </div>
          </button>
        ))}
      </div>

      {/* Taula desktop */}
      <div className="overflow-x-auto rounded-xl border bg-white hidden md:block">
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
                <td className="px-3 py-2 font-mono text-xs">{e.code || '─'}</td>
                <td className="px-3 py-2">{e.nom}</td>
                <td className="px-3 py-2">{e.ln || '─'}</td>
                <td className="px-3 py-2">
                  {e.tipus === 'Propi' ? '⌂ Propi' : '◎ Extern'}
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
