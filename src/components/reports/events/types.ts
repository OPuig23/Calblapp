export type EventRow = {
  id: string
  name: string
  ln: string
  pax: number
  location: string
  commercial: string
}

export type EventSummary = {
  totalEvents: number
  avgPax: number
  lnShare: Array<{ ln: string; count: number }>
  topCommercial?: { name: string; events: number }
}
