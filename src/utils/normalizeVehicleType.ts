import { normalizeTransportType } from '@/lib/transportTypes'

export const normalizeVehicleType = (val?: string) =>
  normalizeTransportType(val)
