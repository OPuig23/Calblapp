// src/services/premises.ts
export type Premises = {
  department: string
  defaultCharacteristics?: string[]
  restHours: number
  allowMultipleEventsSameDay: boolean
  maxFirstEventDurationHours?: number
  requireResponsible?: boolean
  conditions?: Array<{ locations: string[]; responsible: string }>
}

const DEFAULTS: Premises = {
  department: '',
  restHours: 8,
  allowMultipleEventsSameDay: true,
  maxFirstEventDurationHours: 24,
  requireResponsible: true,
  conditions: []
}

const norm = (s?: string | null) => (s || '').toLowerCase().trim()

export async function loadPremises(department: string): Promise<{ premises: Premises; warnings: string[] }> {
  const dept = norm(department)
  const warnings: string[] = []
  try {
    const mod = await import(`@/data/premises-${dept}.json`)
    const merged: Premises = { ...DEFAULTS, ...(mod.default as any), department }
    return { premises: merged, warnings }
  } catch {
    warnings.push('no_premises')
    return { premises: { ...DEFAULTS, department }, warnings }
  }
}
