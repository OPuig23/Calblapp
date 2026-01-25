// src/types/QuadrantEvent.ts
export interface QuadrantEvent {
  id: string
  summary: string
  start: string
  end: string
  horaInici?: string
  location?: string
  department?: string
  totalWorkers?: number
  numDrivers?: number
  state?: 'pending' | 'draft' | 'confirmed'
  eventCode?: string
  responsable?: string
  conductors?: string[]
  treballadors?: string[]
  code?: string
}
