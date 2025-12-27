export type FinancialEvent = {
  id: string
  name: string
  ln: string
  importTotal: number
  pax: number
  hours: number
}

export type FinancialSummary = {
  revenue: number
  cost: number
  margin: number
  marginPct: number
  revenuePerEvent: number
}
