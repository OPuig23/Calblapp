export type VehicleRow = {
  plate: string
  type: string
  assignments: number
  events: number
  conductors: number
  distanceKm?: number
  cost?: number
}

export type DriverRow = {
  name: string
  assignments: number
  plates: number
}
