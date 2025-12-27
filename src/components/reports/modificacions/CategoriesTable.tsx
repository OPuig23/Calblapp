// file: src/components/reports/modificacions/CategoriesTable.tsx
import type { ModificationRow } from './types'

export function CategoriesTable({ data }: { data: ModificationRow[] }) {
  const agg = new Map<string, { total: number; last72: number }>()
  data.forEach(m => {
    const cat = m.category || 'Sense categoria'
    const current = agg.get(cat) || { total: 0, last72: 0 }
    current.total += 1
    if (m.last72h) current.last72 += 1
    agg.set(cat, current)
  })
  const rows = Array.from(agg.entries())
    .map(([category, v]) => ({ category, ...v }))
    .sort((a, b) => b.total - a.total)

  return (
    <div className="rounded-lg border bg-white">
      <div className="px-4 py-3 border-b">
        <p className="font-semibold text-gray-800">Modificacions per categoria</p>
      </div>

      <div className="md:hidden space-y-3 p-3">
        {rows.length === 0 && (
          <div className="text-center text-gray-500 text-sm border rounded-lg py-3">Sense dades en el rang seleccionat.</div>
        )}
        {rows.map(row => (
          <div key={row.category} className="border rounded-lg p-3 text-sm">
            <div className="font-semibold text-gray-800">{row.category}</div>
            <div className="flex justify-between text-gray-600 mt-1">
              <span>Total</span>
              <span>{row.total}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>&lt;72h</span>
              <span>{row.last72}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto hidden md:block">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="px-4 py-2 text-left">Categoria</th>
              <th className="px-4 py-2 text-right">Total</th>
              <th className="px-4 py-2 text-right">&lt;72h</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-3 text-center text-gray-500">
                  Sense dades en el rang seleccionat.
                </td>
              </tr>
            )}
            {rows.map(row => (
              <tr key={row.category} className="border-t">
                <td className="px-4 py-2">{row.category}</td>
                <td className="px-4 py-2 text-right">{row.total}</td>
                <td className="px-4 py-2 text-right">{row.last72}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
