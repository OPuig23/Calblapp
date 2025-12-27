// file: src/components/reports/vehicles/DriversTable.tsx
import type { DriverRow } from './types'

export function DriversTable({ rows }: { rows: DriverRow[] }) {
  const sorted = [...rows].sort((a, b) => b.assignments - a.assignments)

  return (
    <div className="rounded-lg border bg-white">
      <div className="px-4 py-3 border-b">
        <p className="font-semibold text-gray-800">Conductors</p>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3 p-3">
        {sorted.length === 0 && (
          <div className="text-center text-gray-500 text-sm border rounded-lg py-3">Sense dades en el rang seleccionat.</div>
        )}
        {sorted.map(row => (
          <div key={row.name} className="border rounded-lg p-3 text-sm">
            <div className="font-semibold text-gray-800">{row.name}</div>
            <div className="flex justify-between text-gray-600 mt-1">
              <span>Assignacions</span>
              <span>{row.assignments}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Matrícules</span>
              <span>{row.plates}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop table */}
      <div className="overflow-x-auto hidden md:block">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="px-4 py-2 text-left">Conductor</th>
              <th className="px-4 py-2 text-right">Assignacions</th>
              <th className="px-4 py-2 text-right">Matrícules</th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-3 text-center text-gray-500">
                  Sense dades en el rang seleccionat.
                </td>
              </tr>
            )}
            {sorted.map(row => (
              <tr key={row.name} className="border-t">
                <td className="px-4 py-2">{row.name}</td>
                <td className="px-4 py-2 text-right">{row.assignments}</td>
                <td className="px-4 py-2 text-right">{row.plates}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
