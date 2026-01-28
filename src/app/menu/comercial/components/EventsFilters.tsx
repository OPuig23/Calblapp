import React from 'react'
import { Search } from 'lucide-react'

interface Props {
  commercialOptions: string[]
  commercialFilter: string
  setCommercialFilter: (value: string) => void
  startDate: string
  endDate: string
  setStartDate: (value: string) => void
  setEndDate: (value: string) => void
  query: string
  setQuery: (value: string) => void
}

export default function EventsFilters({
  commercialOptions,
  commercialFilter,
  setCommercialFilter,
  startDate,
  endDate,
  setStartDate,
  setEndDate,
  query,
  setQuery,
}: Props) {
  return (
    <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 shadow-sm">
      <div className="space-y-1">
        <label className="text-[10px] text-slate-500">Comercial</label>
        <select
          className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm"
          value={commercialFilter}
          onChange={(e) => setCommercialFilter(e.target.value)}
        >
          <option value="__all__">Tots</option>
          {commercialOptions.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label className="text-[10px] text-slate-500">Des de</label>
        <input
          type="date"
          className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
        />
      </div>
      <div className="space-y-1">
        <label className="text-[10px] text-slate-500">Fins a</label>
        <input
          type="date"
          className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
        />
      </div>

      <div className="flex-1 min-w-[220px] space-y-1">
        <label className="text-[10px] text-slate-500">Cercar esdeveniment</label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            className="h-9 w-full rounded-md border border-slate-200 bg-white pl-9 pr-3 text-sm"
            placeholder="Nom o codi"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>
    </div>
  )
}
