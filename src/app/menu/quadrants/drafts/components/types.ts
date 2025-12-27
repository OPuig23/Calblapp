// file: src/app/menu/quadrants/drafts/components/types.ts

export type Role = 'responsable' | 'conductor' | 'treballador' | 'brigada'

export type Row = {
  role: Role
  id: string
  name: string
  startDate: string
  startTime: string
  endDate: string
  endTime: string
  meetingPoint?: string
  arrivalTime?: string
  vehicleType?: string
  plate?: string
  workers?: number // només per brigades
}

// ✅ Input que arriba del backend per construir Drafts
export type DraftInput = {
  id: string
  code?: string
  eventName?: string
  location?: string
  department?: string
  startDate: string
  startTime: string
  endDate: string
  endTime: string
  arrivalTime?: string
  responsablesNeeded?: number
  numDrivers?: number
  totalWorkers?: number
  status?: string
  responsableId?: string
  responsableName?: string
  responsable?: Partial<Row>
  conductors?: Array<Partial<Row>>
  treballadors?: Array<Partial<Row>>
  brigades?: Array<Partial<Row>> // afegit per coherència amb DraftsTable
}
