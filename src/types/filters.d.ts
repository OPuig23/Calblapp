import type { SmartFiltersChange } from '@/components/filters/SmartFilters'

/**
 * 🧭 Tipus ampliat de filtres setmanals
 * -------------------------------------
 * - Estès a partir de SmartFiltersChange
 * - Afegeix camps personalitzats de la vista operativa
 */
export interface WeeklySmartFiltersChange extends SmartFiltersChange {
  responsable?: string
  finca?: string
}
