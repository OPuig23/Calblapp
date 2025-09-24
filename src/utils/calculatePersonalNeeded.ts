// src/utils/calculatePersonalNeeded.ts

export type Driver = { name: string } | string

export interface PersonalRow {
  /** TOTAL de personal demanat per al servei (resp + conductors + treballadors) */
  staffCount: number
  /** Llista de conductors (només nom) */
  drivers: Driver[]
  /** Nom del responsable (pot ser null si encara no s’ha assignat) */
  responsableName?: string | null
}

const unaccent = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
const norm = (s?: string | null) => unaccent((s || '').toLowerCase().trim())
const getName = (d: Driver) => (typeof d === 'string' ? d : d.name)

/**
 * Treballadors a assignar = staffCount - (conductors reals + responsable)
 * Si el responsable també és conductor → resta 1 conductor.
 * Si NO hi ha responsable encara → no el restem.
 */
export function calculatePersonalNeeded(row: PersonalRow): number {
  const total = Number(row.staffCount) || 0
  const drivers = Array.isArray(row.drivers) ? row.drivers : []
  const numDrivers = drivers.length

  const resp = norm(row.responsableName || '')
  const responsableIsDriver = !!resp && drivers.some(d => norm(getName(d)) === resp)
  const driversReals = numDrivers - (responsableIsDriver ? 1 : 0)

  const hasResponsible = !!resp
  const needed = total - (driversReals + (hasResponsible ? 1 : 0))
  return needed > 0 ? needed : 0
}
