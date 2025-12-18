export type TransportLine = {
  id: string
  conductorName?: string
  vehicleType?: string
  plate?: string
  startTime?: string
  endTime?: string
}

export type TransportEvent = {
  id: string
  day: string
  department: string
  eventName: string
  location?: string
  pax?: number
  eventStartTime?: string
  eventEndTime?: string
  transports: TransportLine[]
}
