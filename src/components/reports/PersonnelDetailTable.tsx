// /src/components/reports/PersonnelDetailTable.tsx


export function PersonnelDetailTable({ rows }) {
  return (
    <div className="overflow-x-auto my-2">
      <table className="min-w-full text-xs md:text-sm">
        <thead>
          <tr>
            <th className="text-left">Nom</th>
            <th>Dept.</th>
            <th>Rol</th>
            <th>Hores</th>
            <th>Extres</th>
            <th>#Resp</th>
            <th>#Events</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.id} className="border-b">
              <td>{r.name}</td>
              <td>{r.department}</td>
              <td>{r.role}</td>
              <td className="text-right">{r.hoursWorked}</td>
              <td className="text-right">{r.extraHours}</td>
              <td className="text-right">{r.responsableCount}</td>
              <td className="text-right">{r.eventsCount}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
