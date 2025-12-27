type Row = {
  department: string
  hours: number
  people: number
}

export default function DeptSummaryTable({ rows }: { rows: Row[] }) {
  return (
    <div className="bg-white border rounded-xl p-4">
      <h2 className="text-lg font-semibold mb-3">Hores i persones per departament</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500">
              <th className="py-2 pr-4">Departament</th>
              <th className="py-2 pr-4">Hores</th>
              <th className="py-2 pr-4">Persones</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.department} className="border-t">
                <td className="py-2 pr-4 capitalize">{row.department || '—'}</td>
                <td className="py-2 pr-4 font-semibold">{row.hours.toFixed(1)}</td>
                <td className="py-2 pr-4">{row.people}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={3} className="py-3 text-center text-gray-500">
                  Sense dades en el rang seleccionat.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
