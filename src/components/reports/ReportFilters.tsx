// /src/components/reports/ReportFilters.tsx
import { Button } from "@/components/ui/button"

export function ReportFilters({ filters, setFilters, depts, roles }) {
  return (
    <div className="flex flex-wrap gap-2">
      <select value={filters.department} onChange={e => setFilters(f => ({ ...f, department: e.target.value }))} className="input">
        <option value="">Tots els departaments</option>
        {depts.map(dep => <option key={dep} value={dep}>{dep}</option>)}
      </select>
      <select value={filters.role} onChange={e => setFilters(f => ({ ...f, role: e.target.value }))} className="input">
        <option value="">Tots els rols</option>
        {roles.map(role => <option key={role} value={role}>{role}</option>)}
      </select>
      <input type="date" value={filters.from} onChange={e => setFilters(f => ({ ...f, from: e.target.value }))} className="input" />
      <input type="date" value={filters.to} onChange={e => setFilters(f => ({ ...f, to: e.target.value }))} className="input" />
      <input type="text" placeholder="Codi/Nom esdeveniment" value={filters.event} onChange={e => setFilters(f => ({ ...f, event: e.target.value }))} className="input" />
      <Button variant="secondary" onClick={() => setFilters({ department: '', role: '', from: '', to: '', event: '' })}>Neteja</Button>
    </div>
  )
}
