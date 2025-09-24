//file:src\app\menu\quadrants\drafts\components\types.ts
export type Role = 'responsable' | 'conductor' | 'treballador'

export type Row = {
  role: Role
  id: string
  name: string
  startDate: string
  startTime: string
  endDate: string
  endTime: string
  meetingPoint?: string
  vehicleType?: string
  plate?: string
}

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
  responsablesNeeded?: number
  numDrivers?: number
  totalWorkers?: number
  status?: string
  responsableId?: string
  responsableName?: string
  responsable?: Partial<Row>
  conductors?: Array<any>
  treballadors?: Array<any>
}
