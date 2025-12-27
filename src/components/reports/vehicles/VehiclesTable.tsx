// file: src/components/reports/vehicles/VehiclesTable.tsx
import type { VehicleRow } from './types'

export function VehiclesTable({ rows }: { rows: VehicleRow[] }) {
  const sorted = [...rows].sort((a, b) => b.assignments - a.assignments)

  return (
    <div className="rounded-lg border bg-white">
      <div className="px-4 py-3 border-b">
        <p className="font-semibold text-gray-800">Vehicles</p>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3 p-3">
        {sorted.length === 0 && (
          <div className="text-center text-gray-500 text-sm border rounded-lg py-3">Sense dades en el rang seleccionat.</div>
        )}
        {sorted.map(row => (
          <div key={row.plate + row.type} className="border rounded-lg p-3 text-sm">
            <div className="font-semibold text-gray-800">{row.plate || 'Sense matrícula'}</div>
            <div className="text-gray-600">{row.type || 'Tipus desconegut'}</div>
            <div className="flex justify-between text-gray-600 mt-1">
              <span>Assignacions</span>
              <span>{row.assignments}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Events</span>
              <span>{row.events}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Conductors</span>
              <span>{row.conductors}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Km (estimats)</span>
              <span>{(row.distanceKm || 0).toFixed(1)}</span>
            </div>
            <div className="flex justify-between text-gray-800 font-semibold">
              <span>Cost estimat</span>
              <span>{(row.cost || 0).toFixed(2)} €</span>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop table */}
      <div className="overflow-x-auto hidden md:block">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="px-4 py-2 text-left">Matrícula</th>
              <th className="px-4 py-2 text-left">Tipus</th>
              <th className="px-4 py-2 text-right">Assignacions</th>
              <th className="px-4 py-2 text-right">Events</th>
              <th className="px-4 py-2 text-right">Conductors</th>
              <th className="px-4 py-2 text-right">Km</th>
              <th className="px-4 py-2 text-right">Cost €</th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-3 text-center text-gray-500">
                  Sense dades en el rang seleccionat.
                </td>
              </tr>
            )}
            {sorted.map(row => (
              <tr key={row.plate + row.type} className="border-t">
                <td className="px-4 py-2">{row.plate || 'Sense matrícula'}</td>
                <td className="px-4 py-2">{row.type || '—'}</td>
                <td className="px-4 py-2 text-right">{row.assignments}</td>
                <td className="px-4 py-2 text-right">{row.events}</td>
                <td className="px-4 py-2 text-right">{row.conductors}</td>
                <td className="px-4 py-2 text-right">{(row.distanceKm || 0).toFixed(1)}</td>
                <td className="px-4 py-2 text-right">{(row.cost || 0).toFixed(2)} €</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
