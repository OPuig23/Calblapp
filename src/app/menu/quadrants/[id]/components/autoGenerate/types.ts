export interface CuinaGroup {
  id: string
  meetingPoint: string
  startTime: string
  arrivalTime: string
  endTime: string
  workers: number
  drivers: number
  responsibleId: string
}

export type ServeiPhaseKey = 'muntatge' | 'event'

export interface ServeiGroup {
  id: string
  serviceDate: string
  dateLabel: string
  meetingPoint: string
  startTime: string
  endTime: string
  workers: number
  responsibleId: string
  needsDriver: boolean
  driverId: string
}
